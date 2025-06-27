import { Request, Response } from 'express';
import { storage } from '../storage';
import { pool } from '../db';
import { z } from 'zod';

// Definir interfaces para melhorar o TypeScript
interface ProductImage {
  id: number;
  image_url: string;
  thumbnail_url: string;
  is_primary: boolean;
  store_id?: number;
  product_id?: number;
}

interface Promotion {
  id: number;
  type: string;
  discountPercentage: number | null;
  discountAmount: number | null;
  priceOverride: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
}

// Limpar todas as reservas canceladas do usuário
export async function clearCancelledReservations(req: Request, res: Response) {
  try {
    const user = req.user!;

    console.log(`Limpando reservas canceladas para o usuário ${user.id}`);

    // Executar query para excluir todas as reservas canceladas do usuário
    const result = await pool.query(
      `DELETE FROM reservations 
       WHERE user_id = $1 AND status = 'cancelled'
       RETURNING id`,
      [user.id]
    );

    const deletedCount = result.rowCount;
    console.log(`${deletedCount} reservas canceladas foram removidas`);

    return res.status(200).json({
      success: true,
      message: `${deletedCount} reservas canceladas foram removidas`,
      count: deletedCount
    });
  } catch (error) {
    console.error('Erro ao limpar reservas canceladas:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao limpar reservas canceladas'
    });
  }
}

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
        pi.filename AS pi_filename,
        pi.thumbnail_filename AS pi_thumbnail_filename,
        pi.is_primary AS pi_is_primary,
        pi.product_id AS pi_product_id,
        -- Dados de promoção para preservar o formato
        prom.id as promotion_id,
        prom.type as promotion_type,
        prom.discount_percentage,
        CAST(NULL AS INTEGER) as discount_amount,
        CAST(NULL AS INTEGER) as price_override,
        prom.start_time as promotion_starts_at,
        prom.end_time as promotion_ends_at
      FROM 
        reservations r
      LEFT JOIN 
        products p ON r.product_id = p.id
      LEFT JOIN 
        stores s ON p.store_id = s.id
      LEFT JOIN 
        product_images pi ON p.id = pi.product_id
      LEFT JOIN
        promotions prom ON p.id = prom.product_id AND 
        (prom.end_time IS NULL OR prom.end_time > NOW())
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
        // Verificar se o produto tem uma promoção ativa
        const hasPromotion = row.promotion_id ? true : false;

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
          product_image: row.pi_is_primary ? row.pi_filename : null,
          // Informações sobre promoção para formatação visual correta
          promotion: hasPromotion ? {
            id: row.promotion_id,
            type: row.promotion_type, // 'regular' ou 'flash'
            discountPercentage: row.discount_percentage,
            discountAmount: row.discount_amount,
            priceOverride: row.price_override,
            startsAt: row.promotion_starts_at,
            endsAt: row.promotion_ends_at
          } : null,
          // URL da imagem com o formato de visualização correto baseado no tipo
          imageUrl: hasPromotion ? 
            (row.promotion_type === 'flash' ? 
              `/api/promotions/${row.promotion_id}/flash-image` : 
              `/api/promotions/${row.promotion_id}/image`) :
            `/api/products/${row.product_id}/primary-image`,
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

        // Verificar se a imagem pertence ao produto correto
        if (row.pi_product_id === row.p_id) {
          console.log(`Validando imagem: product_id=${row.p_id}, image.product_id=${row.pi_product_id}, store_id=${row.p_store_id}`);

          // Verifique se esta imagem já foi adicionada
          const imageExists = reservation.product.images.some((img: ProductImage) => img.id === row.pi_id);

          if (!imageExists) {
            // Usar caminho da API para imagens
            const secureImagePath = `/api/products/${row.p_id}/primary-image`;

            const secureThumbnailPath = `/api/products/${row.p_id}/thumbnail`;

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
            reservation.product.images.sort((a: ProductImage, b: ProductImage) => {
              if (a.is_primary && !b.is_primary) return -1;
              if (!a.is_primary && b.is_primary) return 1;
              return 0;
            });

            // Se esta é a imagem principal e ainda não temos uma imagem plana definida
            if (row.pi_is_primary && !reservation.product_image) {
              reservation.product_image = `/api/products/${row.p_id}/primary-image`;
              reservation.store_id = row.p_store_id; // Adicionar store_id para referência
            }
          }
        } else {
          console.error(`Imagem com ID ${row.pi_id} não pertence ao produto ${row.p_id} (pertence a ${row.pi_product_id})`);
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
          image_url: `/api/products/${res.product_id}/primary-image`,
          thumbnail_url: `/api/products/${res.product_id}/thumbnail`,
          is_primary: true
        });
        // Também atualize o campo plano
        res.product_image = `/api/products/${res.product_id}/primary-image`;
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
    const productStock = product.stock || 0;

    if (productStock <= 0) {
      return res.status(400).json({ message: 'Product is out of stock' });
    }

    if (quantity && quantity > productStock) {
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
        pi.filename AS pi_filename,
        pi.thumbnail_filename AS pi_thumbnail_filename,
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

    // Prepare o objeto de reserva enriquecido
    const productInfo = result.rows[0];
    const store_id = productInfo.p_store_id;

    // Filtrar imagens por produto correto e construir caminhos seguros
    const images = result.rows
      .filter(row => row.pi_id && row.pi_product_id === row.p_id)
      .map(row => {
        // Construir caminho de imagem seguro com isolamento de loja
        const secureImagePath = `/api/products/${row.p_id}/image/${row.pi_filename}`;

        const secureThumbnailPath = `/api/products/${row.p_id}/thumbnail/${row.pi_filename}`;

        console.log(`Criando reserva: imagem segura: ${secureImagePath} para produto ${row.p_id}`);

        return {
          id: row.pi_id,
          filename: row.pi_filename,
          thumbnail_filename: row.pi_thumbnail_filename,
          image_url: `/api/products/${productId}/image/${row.pi_filename}`,
          thumbnail_url: `/api/products/${productId}/thumbnail/${row.pi_filename}`,
          is_primary: row.pi_is_primary,
          store_id: store_id,
          product_id: row.p_id
        };
      });

    // Ordene as imagens para que a principal venha primeiro
    images.sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return 0;
    });

    // Selecione a imagem principal de forma segura
    const primaryImage = images.length > 0 && images[0].is_primary ? images[0].image_url : 
                        (images.length > 0 ? images[0].image_url : null);

    // Crie o objeto enriquecido
    const enrichedReservation = {
      ...reservation,
      // Campos planos
      product_id: productInfo.p_id,
      product_name: productInfo.p_name,
      product_price: productInfo.p_price,
      product_image: primaryImage,
      store_id: store_id,
      // Objeto aninhado
      product: {
        id: productInfo.p_id,
        name: productInfo.p_name,
        description: productInfo.p_description,
        category: productInfo.p_category,
        price: productInfo.p_price,
        discountedPrice: productInfo.p_discounted_price,
        stock: productInfo.p_stock,
        store_id: store_id,
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

    // Se não conseguimos atualizar a reserva, retorna erro
    if (!updatedReservation) {
      return res.status(404).json({
        success: false,
        message: 'Reserva não encontrada ou não atualizada'
      });
    }

    // Obter informações do produto para enriquecer a resposta com melhoria de segurança
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
        pi.filename AS pi_filename,
        pi.thumbnail_filename AS pi_thumbnail_filename,
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

    const productId = updatedReservation?.productId || Number(req.params.id);
    const result = await pool.query(query, [productId]);

    // Se não temos resultados, retorne apenas a reserva
    if (result.rows.length === 0) {
      return res.json(updatedReservation);
    }

    // Prepare o objeto de reserva enriquecido
    const productInfo = result.rows[0];
    const store_id = productInfo.p_store_id;

    // Filtrar imagens por produto correto e construir caminhos seguros
    const images = result.rows
      .filter(row => row.pi_id && row.pi_product_id === row.p_id)
      .map(row => {
        // Construir caminho de imagem seguro com isolamento de loja
        const secureImagePath = `/api/products/${productInfo.p_id}/image/${row.pi_filename}`;

        const secureThumbnailPath = `/api/products/${productInfo.p_id}/thumbnail/${row.pi_filename}`;

        console.log(`Atualizando reserva: imagem segura: ${secureImagePath} para produto ${productInfo.p_id}`);

        return {
          id: row.pi_id,
          filename: row.pi_filename,
          thumbnail_filename: row.pi_thumbnail_filename,
          image_url: secureImagePath,
          thumbnail_url: secureThumbnailPath,
          is_primary: row.pi_is_primary,
          store_id: store_id,
          product_id: row.p_id
        };
      });

    // Ordene as imagens para que a principal venha primeiro
    images.sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return 0;
    });

    // Selecione a imagem principal de forma segura
    const primaryImage = images.length > 0 && images[0].is_primary ? images[0].image_url : 
                        (images.length > 0 ? images[0].image_url : null);

    // Crie o objeto enriquecido com verificação de nulo
    const baseReservation = updatedReservation || {
      id: Number(id),
      userId: user.id,
      productId: Number(productInfo.p_id),
      quantity: 1,
      status: 'pending',
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const enrichedReservation = {
      ...baseReservation,
      // Campos planos
      product_id: productInfo.p_id,
      product_name: productInfo.p_name,
      product_price: productInfo.p_price,
      product_image: primaryImage,
      store_id: store_id,
      // Objeto aninhado
      product: {
        id: productInfo.p_id,
        name: productInfo.p_name,
        description: productInfo.p_description,
        category: productInfo.p_category,
        price: productInfo.p_price,
        discountedPrice: productInfo.p_discounted_price,
        stock: productInfo.p_stock,
        store_id: store_id,
        images: images
      }
    };

    res.json(enrichedReservation);
  } catch (error) {
    console.error('Error updating reservation status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}