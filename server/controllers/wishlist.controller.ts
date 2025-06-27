import { Request, Response } from 'express';
import { storage } from '../storage';
import { pool } from '../db';

// Interfaces para ajudar com tipagem
interface ProductImage {
  id: number;
  filename: string;
  thumbnail_filename: string;
  image_url: string;
  thumbnail_url: string;
  is_primary: boolean;
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

// Get user wishlist
export async function getWishlistItems(req: Request, res: Response) {
  try {
    const user = req.user!;

    // Consulta SQL personalizada para obter itens da lista de desejos com produtos, 
    // imagens e informações de promoção para preservar o formato de exibição
    const query = `
      SELECT 
        w.*,
        p.id AS p_id,
        p.name AS p_name,
        p.description AS p_description,
        p.category AS p_category,
        p.price AS p_price,
        p.discounted_price AS p_discounted_price,
        p.stock AS p_stock,
        p.store_id AS p_store_id,
        s.id AS s_id,
        s.name AS s_name,
        s.description AS s_description,
        pi.id AS pi_id,
        pi.filename AS pi_filename,
        pi.thumbnail_filename AS pi_thumbnail_filename,
        pi.is_primary AS pi_is_primary,
        -- Dados de promoção para preservar o formato
        prom.id as promotion_id,
        prom.type as promotion_type,
        prom.discount_percentage,
        CAST(NULL AS INTEGER) as discount_amount,
        CAST(NULL AS INTEGER) as price_override,
        prom.start_time as promotion_starts_at,
        prom.end_time as promotion_ends_at
      FROM 
        wishlists w
      LEFT JOIN 
        products p ON w.product_id = p.id
      LEFT JOIN 
        stores s ON p.store_id = s.id
      LEFT JOIN 
        product_images pi ON p.id = pi.product_id
      LEFT JOIN
        promotions prom ON p.id = prom.product_id AND 
        (prom.end_time IS NULL OR prom.end_time > NOW())
      WHERE 
        w.user_id = $1
      ORDER BY 
        w.created_at DESC, 
        prom.type = 'flash' DESC,  -- Prioriza promoções relâmpago
        prom.id DESC,              -- Promoção mais recente
        pi.is_primary DESC         -- Depois imagem principal
    `;

    const result = await pool.query(query, [user.id]);

    // Inicialize um Map para agrupar imagens por wishlist item
    const wishlistMap = new Map();

    // Processe cada linha retornada do banco
    result.rows.forEach(row => {
      const wishlistId = row.id;
      
      // Se este item ainda não foi processado, inicialize-o
      if (!wishlistMap.has(wishlistId)) {
        // Verifique se o produto tem uma promoção ativa
        const hasPromotion = row.promotion_id ? true : false;
        
        // Crie o objeto base do item da wishlist
        const wishlistItem = {
          id: row.id,
          userId: row.user_id,
          productId: row.product_id,
          createdAt: row.created_at,
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
            storeId: row.p_store_id,
            images: [],
            // Objeto aninhado store
            store: {
              id: row.s_id,
              name: row.s_name,
              description: row.s_description
            }
          }
        };
        
        wishlistMap.set(wishlistId, wishlistItem);
      }
      
      // Adicione a imagem ao array de imagens do produto (se existir)
      if (row.pi_id) {
        const wishlistItem = wishlistMap.get(wishlistId);
        
        // Verifique se esta imagem já foi adicionada
        const imageExists = wishlistItem.product.images.some(
          (img: ProductImage) => img.id === row.pi_id
        );
        
        if (!imageExists) {
          wishlistItem.product.images.push({
            id: row.pi_id,
            filename: row.pi_filename,
            thumbnail_filename: row.pi_thumbnail_filename,
            image_url: `/api/products/${row.product_id}/image/${row.pi_filename}`,
            thumbnail_url: `/api/products/${row.product_id}/thumbnail/${row.pi_filename}`,
            is_primary: row.pi_is_primary
          });
        }
      }
    });

    // Converta o Map em um array para a resposta
    const wishlistItems = Array.from(wishlistMap.values());

    // Adicione validação e tratamento de erros
    const validWishlistItems = wishlistItems.filter(item => 
      item.product && item.product.id && 
      (item.product.images.length > 0)
    );

    // Adicione placeholders para produtos que possam estar faltando imagens
    validWishlistItems.forEach(item => {
      if (item.product.images.length === 0) {
        item.product.images.push({
          id: 0,
          filename: 'placeholder-image.jpg',
          thumbnail_filename: 'placeholder-image.jpg',
          image_url: '/placeholder-image.jpg',
          thumbnail_url: '/placeholder-image.jpg',
          is_primary: true
        });
      }
    });

    // Ordene as imagens para que a principal venha primeiro em cada produto
    validWishlistItems.forEach(item => {
      item.product.images.sort((a: ProductImage, b: ProductImage) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return 0;
      });
    });

    res.json(validWishlistItems);
  } catch (error) {
    console.error('Error getting wishlist items:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Add to wishlist
export async function addToWishlist(req: Request, res: Response) {
  try {
    const user = req.user!;
    const productId = Number(req.params.productId);

    // Verificar se o produto existe
    const product = await storage.getProduct(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Adicionar à wishlist
    const wishlistItem = await storage.addToWishlist(user.id, productId);

    // Obter informações detalhadas do produto para a resposta
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
        s.id AS s_id,
        s.name AS s_name,
        s.description AS s_description,
        pi.id AS pi_id,
        pi.filename AS pi_filename,
        pi.thumbnail_filename AS pi_thumbnail_filename,
        pi.is_primary AS pi_is_primary
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
    
    // Se não temos resultados, retorne apenas o item base
    if (result.rows.length === 0) {
      return res.json(wishlistItem);
    }

    // Prepare a resposta enriquecida
    const productInfo = result.rows[0];
    const images = result.rows
      .filter(row => row.pi_id)
      .map(row => ({
        id: row.pi_id,
        filename: row.pi_filename,
        thumbnail_filename: row.pi_thumbnail_filename,
        image_url: `/api/products/${productId}/image/${row.pi_filename}`,
        thumbnail_url: `/api/products/${productId}/thumbnail/${row.pi_filename}`,
        is_primary: row.pi_is_primary
      }));
      
    // Ordene as imagens
    images.sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return 0;
    });

    const enrichedItem = {
      ...wishlistItem,
      product: {
        id: productInfo.p_id,
        name: productInfo.p_name,
        description: productInfo.p_description,
        category: productInfo.p_category,
        price: productInfo.p_price,
        discountedPrice: productInfo.p_discounted_price,
        stock: productInfo.p_stock,
        storeId: productInfo.p_store_id,
        images: images,
        store: {
          id: productInfo.s_id,
          name: productInfo.s_name,
          description: productInfo.s_description
        }
      }
    };

    res.json(enrichedItem);
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Remove from wishlist
export async function removeFromWishlist(req: Request, res: Response) {
  try {
    const user = req.user!;
    const productId = Number(req.params.productId);

    const success = await storage.removeFromWishlist(user.id, productId);
    
    if (!success) {
      return res.status(404).json({ message: 'Wishlist item not found' });
    }
    
    res.json({ success });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}