import { Request, Response } from 'express';
import { pool } from '../db';
import fs from 'fs';
import path from 'path';

/**
 * @route GET /api/products/:id/primary-image
 * @desc Retorna a imagem principal de um produto de forma segura
 * @access Público
 */
export const getProductPrimaryImage = async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id);
    
    if (isNaN(productId)) {
      return res.status(400).redirect('/placeholder-image.jpg');
    }
    
    // Buscar informações do produto para verificação de existência
    const productQuery = `
      SELECT p.id, p.store_id
      FROM products p
      WHERE p.id = $1
    `;
    
    const productResult = await pool.query(productQuery, [productId]);
    
    if (!productResult.rows.length) {
      console.error(`Produto não encontrado: ${productId}`);
      return res.redirect('/placeholder-image.jpg');
    }
    
    const storeId = productResult.rows[0].store_id;
    
    // Buscar a imagem principal do produto
    const imageQuery = `
      SELECT pi.image_url, pi.thumbnail_url
      FROM product_images pi
      WHERE pi.product_id = $1 AND pi.is_primary = true
      ORDER BY pi.display_order ASC, pi.id DESC
      LIMIT 1
    `;
    
    const imageResult = await pool.query(imageQuery, [productId]);
    
    // Se não houver imagem principal, verificar qualquer imagem
    if (!imageResult.rows.length) {
      const fallbackQuery = `
        SELECT pi.image_url, pi.thumbnail_url
        FROM product_images pi
        WHERE pi.product_id = $1
        ORDER BY pi.id DESC
        LIMIT 1
      `;
      
      const fallbackResult = await pool.query(fallbackQuery, [productId]);
      
      if (!fallbackResult.rows.length) {
        console.log(`Nenhuma imagem encontrada para produto ${productId}`);
        return res.redirect('/placeholder-image.jpg');
      }
      
      // Validar e construir caminho de imagem seguro
      let imageUrl = fallbackResult.rows[0].image_url;
      
      // Garantir que a URL use o formato seguro para o ID da loja e produto corretos
      if (!imageUrl.includes(`/uploads/stores/${storeId}/products/${productId}/`)) {
        // Extrair o nome do arquivo
        const fileName = imageUrl.split('/').pop();
        imageUrl = `/uploads/stores/${storeId}/products/${productId}/${fileName}`;
      }
      
      // Redirecionar para a URL segura da imagem
      return res.redirect(imageUrl);
    }
    
    // Validar e construir caminho de imagem seguro para imagem principal
    let imageUrl = imageResult.rows[0].image_url;
    
    // Garantir que a URL use o formato seguro para o ID da loja e produto corretos
    if (!imageUrl.includes(`/uploads/stores/${storeId}/products/${productId}/`)) {
      // Extrair o nome do arquivo
      const fileName = imageUrl.split('/').pop();
      imageUrl = `/uploads/stores/${storeId}/products/${productId}/${fileName}`;
    }
    
    // Redirecionar para a URL segura da imagem
    res.redirect(imageUrl);
  } catch (error) {
    console.error('Erro ao buscar imagem principal do produto:', error);
    res.redirect('/placeholder-image.jpg');
  }
};

/**
 * @route GET /api/products/:id/thumbnail
 * @desc Retorna a thumbnail da imagem principal de um produto
 * @access Público
 */
export const getProductThumbnail = async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id);
    
    if (isNaN(productId)) {
      return res.status(400).redirect('/placeholder-image.jpg');
    }
    
    // Buscar informações do produto para verificação de existência
    const productQuery = `
      SELECT p.id, p.store_id
      FROM products p
      WHERE p.id = $1
    `;
    
    const productResult = await pool.query(productQuery, [productId]);
    
    if (!productResult.rows.length) {
      console.error(`Produto não encontrado: ${productId}`);
      return res.redirect('/placeholder-image.jpg');
    }
    
    const storeId = productResult.rows[0].store_id;
    
    // Buscar a thumbnail da imagem principal
    const query = `
      SELECT pi.thumbnail_url
      FROM product_images pi
      WHERE pi.product_id = $1 AND pi.is_primary = true
      ORDER BY pi.display_order ASC, pi.id DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [productId]);
    
    if (!result.rows.length) {
      // Fallback para qualquer thumbnail
      const fallbackQuery = `
        SELECT pi.thumbnail_url
        FROM product_images pi
        WHERE pi.product_id = $1
        ORDER BY pi.id DESC
        LIMIT 1
      `;
      
      const fallbackResult = await pool.query(fallbackQuery, [productId]);
      
      if (!fallbackResult.rows.length) {
        return res.redirect('/placeholder-image.jpg');
      }
      
      // Validar e construir caminho de thumbnail seguro
      let thumbnailUrl = fallbackResult.rows[0].thumbnail_url;
      
      // Garantir que a URL use o formato seguro para o ID da loja e produto corretos
      if (!thumbnailUrl.includes(`/uploads/stores/${storeId}/products/${productId}/`)) {
        // Extrair o nome do arquivo
        const fileName = thumbnailUrl.split('/').pop();
        thumbnailUrl = `/uploads/stores/${storeId}/products/${productId}/thumb-${fileName.replace('thumb-', '')}`;
      }
      
      return res.redirect(thumbnailUrl);
    }
    
    // Validar e construir caminho de thumbnail seguro
    let thumbnailUrl = result.rows[0].thumbnail_url;
    
    // Garantir que a URL use o formato seguro para o ID da loja e produto corretos
    if (!thumbnailUrl.includes(`/uploads/stores/${storeId}/products/${productId}/`)) {
      // Extrair o nome do arquivo
      const fileName = thumbnailUrl.split('/').pop();
      thumbnailUrl = `/uploads/stores/${storeId}/products/${productId}/thumb-${fileName.replace('thumb-', '')}`;
    }
    
    res.redirect(thumbnailUrl);
  } catch (error) {
    console.error('Erro ao buscar thumbnail do produto:', error);
    res.redirect('/placeholder-image.jpg');
  }
};

/**
 * @route GET /api/products/:id/images
 * @desc Retorna todas as imagens de um produto
 * @access Público
 */
export const getProductImages = async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id);
    
    if (isNaN(productId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de produto inválido' 
      });
    }
    
    // Buscar produto para verificar existência
    const productQuery = `
      SELECT p.id, p.name, p.store_id
      FROM products p
      WHERE p.id = $1
    `;
    
    const productResult = await pool.query(productQuery, [productId]);
    
    if (!productResult.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado'
      });
    }
    
    const storeId = productResult.rows[0].store_id;
    
    // Buscar todas as imagens do produto, ordenadas por prioridade
    const imagesQuery = `
      SELECT 
        pi.id,
        pi.image_url,
        pi.thumbnail_url,
        pi.is_primary,
        pi.display_order
      FROM 
        product_images pi
      WHERE 
        pi.product_id = $1
      ORDER BY 
        pi.is_primary DESC,
        pi.display_order ASC,
        pi.id ASC
    `;
    
    const imagesResult = await pool.query(imagesQuery, [productId]);
    
    // Validar e garantir URLs seguras para todas as imagens
    const secureImages = imagesResult.rows.map(img => {
      let imageUrl = img.image_url;
      let thumbnailUrl = img.thumbnail_url;
      
      // Garantir que as URLs usem o formato seguro
      if (!imageUrl.includes(`/uploads/stores/${storeId}/products/${productId}/`)) {
        const fileName = imageUrl.split('/').pop();
        imageUrl = `/uploads/stores/${storeId}/products/${productId}/${fileName}`;
      }
      
      if (!thumbnailUrl.includes(`/uploads/stores/${storeId}/products/${productId}/`)) {
        const fileName = thumbnailUrl.split('/').pop();
        thumbnailUrl = `/uploads/stores/${storeId}/products/${productId}/thumb-${fileName.replace('thumb-', '')}`;
      }
      
      return {
        ...img,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        secure_url: `/api/products/${productId}/image/${img.id}` // URL da API segura
      };
    });
    
    return res.json({
      success: true,
      product: {
        id: productId,
        name: productResult.rows[0].name,
        store_id: storeId
      },
      images: secureImages || []
    });
  } catch (error) {
    console.error('Erro ao buscar imagens do produto:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar imagens do produto'
    });
  }
};

/**
 * @route GET /api/products/:id/image/:imageId
 * @desc Retorna uma imagem específica de um produto
 * @access Público
 */
export const getProductImage = async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id);
    const imageId = parseInt(req.params.imageId);
    
    if (isNaN(productId) || isNaN(imageId)) {
      return res.status(400).redirect('/placeholder-image.jpg');
    }
    
    // Buscar informações do produto para verificação
    const productQuery = `
      SELECT p.id, p.store_id
      FROM products p
      WHERE p.id = $1
    `;
    
    const productResult = await pool.query(productQuery, [productId]);
    
    if (!productResult.rows.length) {
      console.error(`Produto não encontrado: ${productId}`);
      return res.redirect('/placeholder-image.jpg');
    }
    
    const storeId = productResult.rows[0].store_id;
    
    // Buscar a imagem específica, garantindo que pertence ao produto
    const query = `
      SELECT pi.image_url
      FROM product_images pi
      WHERE pi.product_id = $1 AND pi.id = $2
    `;
    
    const result = await pool.query(query, [productId, imageId]);
    
    if (!result.rows.length) {
      console.log(`Imagem ${imageId} não encontrada para produto ${productId}`);
      return res.redirect('/placeholder-image.jpg');
    }
    
    // Validar e construir caminho de imagem seguro
    let imageUrl = result.rows[0].image_url;
    
    // Garantir que a URL use o formato seguro para o ID da loja e produto corretos
    if (!imageUrl.includes(`/uploads/stores/${storeId}/products/${productId}/`)) {
      const fileName = imageUrl.split('/').pop();
      imageUrl = `/uploads/stores/${storeId}/products/${productId}/${fileName}`;
    }
    
    res.redirect(imageUrl);
  } catch (error) {
    console.error('Erro ao buscar imagem específica:', error);
    res.redirect('/placeholder-image.jpg');
  }
};

/**
 * @route GET /api/stores/:id/primary-image
 * @desc Retorna a imagem principal de uma loja
 * @access Público
 */
export const getStorePrimaryImage = async (req: Request, res: Response) => {
  try {
    const storeId = parseInt(req.params.id);
    
    if (isNaN(storeId)) {
      return res.status(400).redirect('/placeholder-image.jpg');
    }
    
    // Verificar se a loja existe
    const storeQuery = `
      SELECT s.id
      FROM stores s
      WHERE s.id = $1
    `;
    
    const storeResult = await pool.query(storeQuery, [storeId]);
    
    if (!storeResult.rows.length) {
      console.error(`Loja não encontrada: ${storeId}`);
      return res.redirect('/placeholder-image.jpg');
    }
    
    // Buscar a imagem principal da loja
    const imageQuery = `
      SELECT si.image_url
      FROM store_images si
      WHERE si.store_id = $1 AND si.is_primary = true
      ORDER BY si.display_order ASC, si.id DESC
      LIMIT 1
    `;
    
    const imageResult = await pool.query(imageQuery, [storeId]);
    
    if (!imageResult.rows.length) {
      // Fallback para qualquer imagem
      const fallbackQuery = `
        SELECT si.image_url
        FROM store_images si
        WHERE si.store_id = $1
        ORDER BY si.id DESC
        LIMIT 1
      `;
      
      const fallbackResult = await pool.query(fallbackQuery, [storeId]);
      
      if (!fallbackResult.rows.length) {
        console.log(`Nenhuma imagem encontrada para loja ${storeId}`);
        return res.redirect('/placeholder-image.jpg');
      }
      
      // Validar e construir caminho de imagem seguro
      let imageUrl = fallbackResult.rows[0].image_url;
      
      // Garantir que a URL use o formato seguro para o ID da loja
      if (!imageUrl.includes(`/uploads/stores/${storeId}/`)) {
        const fileName = imageUrl.split('/').pop();
        imageUrl = `/uploads/stores/${storeId}/${fileName}`;
      }
      
      return res.redirect(imageUrl);
    }
    
    // Validar e construir caminho de imagem seguro
    let imageUrl = imageResult.rows[0].image_url;
    
    // Garantir que a URL use o formato seguro para o ID da loja
    if (!imageUrl.includes(`/uploads/stores/${storeId}/`)) {
      const fileName = imageUrl.split('/').pop();
      imageUrl = `/uploads/stores/${storeId}/${fileName}`;
    }
    
    res.redirect(imageUrl);
  } catch (error) {
    console.error('Erro ao buscar imagem principal da loja:', error);
    res.redirect('/placeholder-image.jpg');
  }
};

/**
 * @route GET /api/stores/:id/images
 * @desc Retorna todas as imagens de uma loja
 * @access Público
 */
export const getStoreImages = async (req: Request, res: Response) => {
  try {
    const storeId = parseInt(req.params.id);
    
    if (isNaN(storeId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de loja inválido' 
      });
    }
    
    // Verificar se a loja existe
    const storeQuery = `
      SELECT s.id, s.name
      FROM stores s
      WHERE s.id = $1
    `;
    
    const storeResult = await pool.query(storeQuery, [storeId]);
    
    if (!storeResult.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Loja não encontrada'
      });
    }
    
    // Buscar todas as imagens da loja, ordenadas por prioridade
    const imagesQuery = `
      SELECT 
        si.id,
        si.image_url,
        si.thumbnail_url,
        si.is_primary,
        si.display_order
      FROM 
        store_images si
      WHERE 
        si.store_id = $1
      ORDER BY 
        si.is_primary DESC,
        si.display_order ASC,
        si.id ASC
    `;
    
    const imagesResult = await pool.query(imagesQuery, [storeId]);
    
    // Validar e garantir URLs seguras para todas as imagens
    const secureImages = imagesResult.rows.map(img => {
      let imageUrl = img.image_url;
      let thumbnailUrl = img.thumbnail_url;
      
      // Garantir que as URLs usem o formato seguro
      if (!imageUrl.includes(`/uploads/stores/${storeId}/`)) {
        const fileName = imageUrl.split('/').pop();
        imageUrl = `/uploads/stores/${storeId}/${fileName}`;
      }
      
      if (!thumbnailUrl.includes(`/uploads/stores/${storeId}/`)) {
        const fileName = thumbnailUrl.split('/').pop();
        thumbnailUrl = `/uploads/stores/${storeId}/thumb-${fileName.replace('thumb-', '')}`;
      }
      
      return {
        ...img,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        secure_url: `/api/stores/${storeId}/image/${img.id}` // URL da API segura
      };
    });
    
    return res.json({
      success: true,
      store: {
        id: storeId,
        name: storeResult.rows[0].name
      },
      images: secureImages || []
    });
  } catch (error) {
    console.error('Erro ao buscar imagens da loja:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar imagens da loja'
    });
  }
};

/**
 * @route GET /api/reservations/:id/image
 * @desc Retorna a imagem principal de um produto reservado, com verificação de segurança extra
 * @access Authenticado
 */
export const getReservationImage = async (req: Request, res: Response) => {
  try {
    const reservationId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    if (isNaN(reservationId) || !userId) {
      return res.status(400).redirect('/placeholder-image.jpg');
    }
    
    // Verificar a reserva e obter informações com joins para verificação de segurança
    const query = `
      SELECT 
        r.id as reservation_id,
        r.product_id,
        p.store_id,
        pi.image_url
      FROM 
        reservations r
      JOIN 
        products p ON r.product_id = p.id
      LEFT JOIN 
        product_images pi ON p.id = pi.product_id AND pi.is_primary = true
      WHERE 
        r.id = $1 AND r.user_id = $2
      ORDER BY
        pi.display_order ASC, pi.id ASC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [reservationId, userId]);
    
    if (!result.rows.length) {
      console.error(`Reserva ${reservationId} não encontrada ou não pertence ao usuário ${userId}`);
      return res.redirect('/placeholder-image.jpg');
    }
    
    const { product_id, store_id, image_url } = result.rows[0];
    
    // Se não tiver imagem, tente qualquer imagem do produto
    if (!image_url) {
      const fallbackQuery = `
        SELECT pi.image_url
        FROM product_images pi
        WHERE pi.product_id = $1
        LIMIT 1
      `;
      
      const fallbackResult = await pool.query(fallbackQuery, [product_id]);
      
      if (!fallbackResult.rows.length) {
        return res.redirect('/placeholder-image.jpg');
      }
      
      // Validar e construir caminho de imagem seguro
      let secureImageUrl = fallbackResult.rows[0].image_url;
      
      // Garantir que a URL use o formato seguro para o ID da loja e produto corretos
      if (!secureImageUrl.includes(`/uploads/stores/${store_id}/products/${product_id}/`)) {
        const fileName = secureImageUrl.split('/').pop();
        secureImageUrl = `/uploads/stores/${store_id}/products/${product_id}/${fileName}`;
      }
      
      return res.redirect(secureImageUrl);
    }
    
    // Validar e construir caminho de imagem seguro
    let secureImageUrl = image_url;
    
    // Garantir que a URL use o formato seguro para o ID da loja e produto corretos
    if (!secureImageUrl.includes(`/uploads/stores/${store_id}/products/${product_id}/`)) {
      const fileName = secureImageUrl.split('/').pop();
      secureImageUrl = `/uploads/stores/${store_id}/products/${product_id}/${fileName}`;
    }
    
    res.redirect(secureImageUrl);
  } catch (error) {
    console.error('Erro ao buscar imagem da reserva:', error);
    res.redirect('/placeholder-image.jpg');
  }
};

export default {
  getProductPrimaryImage,
  getProductThumbnail,
  getProductImages,
  getProductImage,
  getStorePrimaryImage,
  getStoreImages,
  getReservationImage
};