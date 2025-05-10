import { Request, Response } from 'express';
import { storage } from '../storage';
import { pool } from '../db';
import { z } from 'zod';

// Get user reservations
export async function getReservations(req: Request, res: Response) {
  try {
    const user = req.user!;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    // Consulta SQL personalizada para obter reservas com produtos e imagens
    // Adicionando store_id como parte da consulta para isolamento de dados
    const query = `
      SELECT 
        r.*,
        p.id AS p_id,
        p.name AS p_name,
        p.description AS p_description,
        p.category AS p_category,
        p.price AS p_price,
        p.discounted_price AS p_discounted_price,
        p.stock AS p_stock,
        p.store_id AS p_store_id,
        s.name AS store_name,
        pi.id AS pi_id,
        pi.image_url AS pi_image_url,
        pi.thumbnail_url AS pi_thumbnail_url,
        pi.is_primary AS pi_is_primary,
        pi.product_id AS pi_product_id
      FROM 
        reservations r
      LEFT JOIN 
        products p ON r.product_id = p.id
      LEFT JOIN 
        stores s ON p.store_id = s.id
      LEFT JOIN 
        product_images pi ON p.id = pi.product_id
      WHERE 
        r.user_id = $1
      ORDER BY 
        r.created_at DESC, pi.is_primary DESC
      ${limit ? `LIMIT ${limit}` : ''}
    `;

    const result = await pool.query(query, [user.id]);

    // Inicialize um Map para agrupar imagens por reserva
    const reservationsMap = new Map();

    // Processe cada linha retornada do banco
    result.rows.forEach(row => {
      const reservationId = row.id;
      
      // Se esta reserva ainda não foi processada, inicialize-a
      if (!reservationsMap.has(reservationId)) {
        // Crie o objeto base da reserva
        const reservation = {
          id: row.id,
          userId: row.user_id,
          productId: row.product_id,
          quantity: row.quantity,
          status: row.status,
          expiresAt: row.expires_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          // Campos planos para uso direto no front-end
          product_id: row.p_id,
          product_name: row.p_name,
          product_price: row.p_price,
          product_image: null, // será preenchido apenas com imagens validadas
          // Objeto aninhado product
          product: {
            id: row.p_id,
            name: row.p_name,
            description: row.p_description,
            category: row.p_category,
            price: row.p_price,
            discountedPrice: row.p_discounted_price,
            stock: row.p_stock,
            images: []
          }
        };
        
        reservationsMap.set(reservationId, reservation);
      }
      
      // Adicione a imagem ao array de imagens do produto (se existir)
      if (row.pi_id) {
        const reservation = reservationsMap.get(reservationId);
        
        // Validação rigorosa: a imagem deve pertencer ao produto E ser do produto da reserva específica
        if (row.pi_product_id === row.p_id && row.p_id === reservation.productId) {
          console.log(`Validando imagem: product_id=${row.p_id}, image.product_id=${row.pi_product_id}, store_id=${row.p_store_id}, reservation.productId=${reservation.productId}`);
          
          // Verifique se esta imagem já foi adicionada
          const imageExists = reservation.product.images.some((img: any) => img.id === row.pi_id);
          
          if (!imageExists) {
            // Gerar caminho seguro baseado na estrutura: /uploads/[id do timestamp]-[id aleatório].jpg
            // Se a URL original já tiver o formato esperado com store_id, usá-la diretamente
            let fileName = '';
            
            if (row.pi_image_url.includes('/')) {
              fileName = row.pi_image_url.split('/').pop() || '';
            } else {
              fileName = row.pi_image_url;
            }
            
            // Construir caminho de imagem seguro com isolamento de loja
            const secureImagePath = `/uploads/${fileName}`;
            
            // Thumbnail também usa o nome do arquivo original mas com prefixo "thumb-"
            let thumbFileName = '';
            if (row.pi_thumbnail_url.includes('/')) {
              thumbFileName = row.pi_thumbnail_url.split('/').pop() || '';
            } else {
              thumbFileName = row.pi_thumbnail_url;
            }
            
            const secureThumbnailPath = `/uploads/thumbnails/${thumbFileName}`;
            
            // Adicionar imagem ao produto com caminhos seguros
            reservation.product.images.push({
              id: row.pi_id,
              image_url: secureImagePath,
              thumbnail_url: secureThumbnailPath,
              is_primary: row.pi_is_primary,
              store_id: row.p_store_id,
              product_id: row.p_id
            });
            
            // Ordene as imagens para que a imagem principal apareça primeiro
            reservation.product.images.sort((a: any, b: any) => {
              if (a.is_primary && !b.is_primary) return -1;
              if (!a.is_primary && b.is_primary) return 1;
              return 0;
            });

            // Se esta é a imagem principal, definir a imagem plana com o caminho seguro
            if (row.pi_is_primary) {
              reservation.product_image = secureImagePath;
              reservation.store_id = row.p_store_id; // Adicionar store_id para referência
            }
          }
        } else {
          console.error(`Validação falhou: Imagem ID ${row.pi_id} não pertence ao produto ${row.p_id} (pertence a ${row.pi_product_id}) ou não corresponde à reserva do produto ${reservation.productId}`);
        }
      }
    });

    // Converta o Map em um array para a resposta
    const reservations = Array.from(reservationsMap.values());

    // Adicione validação e tratamento de erros
    const validReservations = reservations.filter(res => 
      res.product && res.product.id && 
      (res.product.images.length > 0 || res.status === 'cancelled')
    );

    // Adicione placeholders para produtos que possam estar faltando imagens
    validReservations.forEach(res => {
      if (res.product.images.length === 0) {
        res.product.images.push({
          id: 0,
          image_url: '/placeholder-image.jpg',
          thumbnail_url: '/placeholder-image.jpg',
          is_primary: true
        });
        // Também atualize o campo plano
        res.product_image = '/placeholder-image.jpg';
      }
    });

    res.json(validReservations);
  } catch (error) {
    console.error('Error getting reservations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Create a new reservation
export async function createReservation(req: Request, res: Response) {
  try {
    const user = req.user!;
    
    // Validate request body
    const reservationSchema = z.object({
      productId: z.number(),
      quantity: z.number().optional()
    });
    
    const validationResult = reservationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: validationResult.error.errors 
      });
    }
    
    const { productId, quantity } = validationResult.data;
    
    // Verify the product exists
    const product = await storage.getProduct(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if product is in stock
    if (product.stock !== undefined && product.stock !== null && product.stock <= 0) {
      return res.status(400).json({ message: 'Product is out of stock' });
    }
    
    if (quantity && product.stock !== undefined && product.stock !== null && quantity > product.stock) {
      return res.status(400).json({ message: 'Not enough stock available' });
    }
    
    // Create the reservation
    const reservation = await storage.createReservation(user.id, productId, quantity);

    // Obter informações do produto para enriquecer a resposta com controle de segurança
    const query = `
      SELECT 
        p.id AS p_id,
        p.name AS p_name,
        p.description AS p_description,
        p.category AS p_category,
        p.price AS p_price,
        p.discounted_price AS p_discounted_price,
        p.stock AS p_stock,
        p.store_id AS p_store_id,
        s.name AS store_name,
        pi.id AS pi_id,
        pi.image_url AS pi_image_url,
        pi.thumbnail_url AS pi_thumbnail_url,
        pi.is_primary AS pi_is_primary,
        pi.product_id AS pi_product_id
      FROM 
        products p
      LEFT JOIN 
        stores s ON p.store_id = s.id
      LEFT JOIN 
        product_images pi ON p.id = pi.product_id
      WHERE 
        p.id = $1
      ORDER BY 
        pi.is_primary DESC
    `;

    const result = await pool.query(query, [productId]);
    
    // Se não temos resultados, retorne apenas a reserva
    if (result.rows.length === 0) {
      return res.status(201).json(reservation);
    }

    // Prepare o objeto de reserva enriquecido com validação de segurança
    const productInfo = result.rows[0];
    const images = result.rows
      .filter(row => row.pi_id && row.pi_product_id === row.p_id)
      .map(row => {
        // Construir caminhos de imagem seguros com isolamento de loja
        const secureImagePath = row.pi_image_url.startsWith('/uploads/stores/') 
          ? row.pi_image_url 
          : `/uploads/stores/${row.p_store_id}/products/${row.p_id}/${row.pi_image_url.split('/').pop()}`;
          
        const secureThumbnailPath = row.pi_thumbnail_url.startsWith('/uploads/stores/')
          ? row.pi_thumbnail_url
          : `/uploads/stores/${row.p_store_id}/products/${row.p_id}/thumb-${row.pi_thumbnail_url.split('/').pop()}`;
        
        console.log(`Validando imagem em createReservation: product_id=${row.p_id}, image.product_id=${row.pi_product_id}, store_id=${row.p_store_id}`);
        
        return {
          id: row.pi_id,
          image_url: secureImagePath,
          thumbnail_url: secureThumbnailPath,
          is_primary: row.pi_is_primary,
          store_id: row.p_store_id,
          product_id: row.p_id
        };
      });
      
    // Ordene as imagens para que a principal venha primeiro
    images.sort((a: any, b: any) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return 0;
    });

    // Crie o objeto enriquecido
    const enrichedReservation = {
      ...reservation,
      // Campos planos
      product_id: productInfo.p_id,
      product_name: productInfo.p_name,
      product_price: productInfo.p_price,
      product_image: images.length > 0 && images[0].is_primary ? images[0].image_url : null,
      store_id: productInfo.p_store_id,
      // Objeto aninhado
      product: {
        id: productInfo.p_id,
        name: productInfo.p_name,
        description: productInfo.p_description,
        category: productInfo.p_category,
        price: productInfo.p_price,
        discountedPrice: productInfo.p_discounted_price,
        stock: productInfo.p_stock,
        images: images
      }
    };
    
    res.status(201).json(enrichedReservation);
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Update reservation status
export async function updateReservationStatus(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { id } = req.params;
    
    // Validate request body
    const updateSchema = z.object({
      status: z.enum(['pending', 'completed', 'expired', 'cancelled'])
    });
    
    const validationResult = updateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: validationResult.error.errors 
      });
    }
    
    const { status } = validationResult.data;
    
    // Get the reservation
    const reservation = await storage.getReservation(Number(id));
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    
    // Check if this is the user's reservation
    if (reservation.userId !== user.id) {
      // If the user is a seller, check if they own the store with the product
      if (user.role === 'seller') {
        const product = await storage.getProduct(reservation.productId);
        if (!product) {
          return res.status(404).json({ message: 'Product not found' });
        }
        
        const store = await storage.getStore(product.storeId);
        if (!store || store.userId !== user.id) {
          return res.status(403).json({ message: 'Not authorized to modify this reservation' });
        }
      } else {
        return res.status(403).json({ message: 'Not authorized to modify this reservation' });
      }
    }
    
    // Update the reservation status
    const updatedReservation = await storage.updateReservationStatus(Number(id), status);
    if (!updatedReservation) {
      return res.status(500).json({ message: 'Failed to update reservation status' });
    }
    
    // Obter informações do produto para enriquecer a resposta com controle de segurança
    const query = `
      SELECT 
        p.id AS p_id,
        p.name AS p_name,
        p.description AS p_description,
        p.category AS p_category,
        p.price AS p_price,
        p.discounted_price AS p_discounted_price,
        p.stock AS p_stock,
        p.store_id AS p_store_id,
        s.name AS store_name,
        pi.id AS pi_id,
        pi.image_url AS pi_image_url,
        pi.thumbnail_url AS pi_thumbnail_url,
        pi.is_primary AS pi_is_primary,
        pi.product_id AS pi_product_id
      FROM 
        products p
      LEFT JOIN 
        stores s ON p.store_id = s.id
      LEFT JOIN 
        product_images pi ON p.id = pi.product_id
      WHERE 
        p.id = $1
      ORDER BY 
        pi.is_primary DESC
    `;

    const result = await pool.query(query, [updatedReservation.productId]);
    
    // Se não temos resultados, retorne apenas a reserva
    if (result.rows.length === 0) {
      return res.json(updatedReservation);
    }

    // Prepare o objeto de reserva enriquecido com validação de segurança
    const productInfo = result.rows[0];
    const images = result.rows
      .filter(row => row.pi_id && row.pi_product_id === row.p_id)
      .map(row => {
        // Construir caminhos de imagem seguros com isolamento de loja
        const secureImagePath = row.pi_image_url.startsWith('/uploads/stores/') 
          ? row.pi_image_url 
          : `/uploads/stores/${row.p_store_id}/products/${row.p_id}/${row.pi_image_url.split('/').pop()}`;
          
        const secureThumbnailPath = row.pi_thumbnail_url.startsWith('/uploads/stores/')
          ? row.pi_thumbnail_url
          : `/uploads/stores/${row.p_store_id}/products/${row.p_id}/thumb-${row.pi_thumbnail_url.split('/').pop()}`;
        
        console.log(`Validando imagem em updateReservation: product_id=${row.p_id}, image.product_id=${row.pi_product_id}, store_id=${row.p_store_id}`);
        
        return {
          id: row.pi_id,
          image_url: secureImagePath,
          thumbnail_url: secureThumbnailPath,
          is_primary: row.pi_is_primary,
          store_id: row.p_store_id,
          product_id: row.p_id
        };
      });
      
    // Ordene as imagens para que a principal venha primeiro
    images.sort((a: any, b: any) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return 0;
    });

    // Crie o objeto enriquecido
    const enrichedReservation = {
      ...updatedReservation,
      // Campos planos
      product_id: productInfo.p_id,
      product_name: productInfo.p_name,
      product_price: productInfo.p_price,
      product_image: images.length > 0 && images[0].is_primary ? images[0].image_url : null,
      store_id: productInfo.p_store_id,
      // Objeto aninhado
      product: {
        id: productInfo.p_id,
        name: productInfo.p_name,
        description: productInfo.p_description,
        category: productInfo.p_category,
        price: productInfo.p_price,
        discountedPrice: productInfo.p_discounted_price,
        stock: productInfo.p_stock,
        images: images
      }
    };
    
    res.json(enrichedReservation);
  } catch (error) {
    console.error('Error updating reservation status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}