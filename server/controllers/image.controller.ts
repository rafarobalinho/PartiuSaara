import { Request, Response, NextFunction } from 'express';
import { pool } from '../db';
import fs from 'fs';
import path from 'path';

// Estender a interface Request para incluir validatedEntity
declare global {
  namespace Express {
    interface Request {
      validatedEntity?: {
        productId: number;
        storeId: number;
        storeName: string;
      };
    }
  }
}

/**
 * Middleware de validação para garantir segurança entre lojas e produtos
 */
export const validateEntityRelationship = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const productId = req.params.id ? parseInt(req.params.id) : null;
    const imageId = req.params.imageId ? parseInt(req.params.imageId) : null;
    
    // Se não temos ID de produto, não há como validar
    if (!productId) {
      return next();
    }
    
    // Buscar informações do produto incluindo a loja
    const productQuery = `
      SELECT p.id, p.store_id, s.name as store_name
      FROM products p
      JOIN stores s ON p.store_id = s.id
      WHERE p.id = $1
    `;
    
    const productResult = await pool.query(productQuery, [productId]);
    
    if (productResult.rows.length === 0) {
      console.error(`Produto não encontrado: ${productId}`);
      return res.redirect('/placeholder-image.jpg');
    }
    
    const product = productResult.rows[0];
    
    // Se temos um ID de imagem, verificar se pertence a este produto
    if (imageId) {
      const imageQuery = `
        SELECT id, product_id 
        FROM product_images 
        WHERE id = $1
      `;
      
      const imageResult = await pool.query(imageQuery, [imageId]);
      
      // VALIDAÇÃO CRÍTICA: Verificar se a imagem pertence ao produto correto
      if (imageResult.rows.length === 0 || imageResult.rows[0].product_id !== productId) {
        console.error(`⚠️ VIOLAÇÃO DE SEGURANÇA: Imagem ${imageId} não pertence ao produto ${productId}`);
        return res.redirect('/placeholder-image.jpg');
      }
    }
    
    // Armazenar as informações do produto/loja no request para uso posterior
    req.validatedEntity = {
      productId: product.id,
      storeId: product.store_id,
      storeName: product.store_name
    };
    
    next();
  } catch (error) {
    console.error('Erro na validação de relacionamento:', error);
    return res.redirect('/placeholder-image.jpg');
  }
};

/**
 * @route GET /api/products/:id/primary-image
 * @desc Retorna a imagem principal de um produto de forma segura
 * @access Público
 */
export const getProductPrimaryImageHandler = async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id);
    
    if (isNaN(productId)) {
      console.error(`ID de produto inválido: ${req.params.id}`);
      return res.redirect('/placeholder-image.jpg');
    }
    
    // Usar os dados validados pelo middleware
    const { storeId } = req.validatedEntity || {};
    
    if (!storeId) {
      console.error(`Dados validados não encontrados para o produto ${productId}`);
      return res.redirect('/placeholder-image.jpg');
    }
    
    // Buscar a imagem principal do produto
    const imageQuery = `
      SELECT image_url, thumbnail_url
      FROM product_images
      WHERE product_id = $1 AND is_primary = true
      ORDER BY display_order ASC, id DESC
      LIMIT 1
    `;
    
    const imageResult = await pool.query(imageQuery, [productId]);
    
    if (imageResult.rows.length === 0) {
      // Se não houver imagem principal, buscar qualquer imagem
      const fallbackQuery = `
        SELECT image_url, thumbnail_url
        FROM product_images
        WHERE product_id = $1
        ORDER BY display_order ASC, id DESC
        LIMIT 1
      `;
      
      const fallbackResult = await pool.query(fallbackQuery, [productId]);
      
      if (fallbackResult.rows.length === 0) {
        // Se não houver nenhuma imagem, verificar um caminho padrão
        const defaultPath = path.join(process.cwd(), `public/uploads/stores/${storeId}/products/${productId}/main.jpg`);
        
        if (fs.existsSync(defaultPath)) {
          return res.sendFile(defaultPath);
        }
        
        // Se tudo falhar, usar o placeholder
        return res.redirect('/placeholder-image.jpg');
      }
      
      // Usar a imagem encontrada
      const imageUrl = fallbackResult.rows[0].image_url;
      
      // VALIDAÇÃO ADICIONAL: Verificar se o caminho da imagem inclui o store_id correto
      const expectedPathPattern = `/uploads/stores/${storeId}/products/${productId}/`;
      
      // Se o caminho não estiver no formato seguro, verificar ou reconstruir
      if (!imageUrl.includes(expectedPathPattern)) {
        console.warn(`⚠️ Caminho de imagem suspeito detectado: ${imageUrl}`);
        console.warn(`⚠️ Era esperado um caminho contendo: ${expectedPathPattern}`);
        
        // Reconstruir o caminho usando os IDs validados
        const fileName = imageUrl.split('/').pop();
        const secureImageUrl = `${expectedPathPattern}${fileName}`;
        
        // Verificar se o arquivo existe no caminho seguro
        const securePhysicalPath = path.join(process.cwd(), `public${secureImageUrl}`);
        
        if (fs.existsSync(securePhysicalPath)) {
          return res.sendFile(securePhysicalPath);
        }
        
        // Se o arquivo não existir no caminho seguro, verificar o caminho original
        const originalPath = path.join(process.cwd(), `public${imageUrl}`);
        
        if (fs.existsSync(originalPath)) {
          // Log de aviso, mas servir o arquivo original
          console.warn(`⚠️ Servindo arquivo de caminho não seguro: ${originalPath}`);
          return res.sendFile(originalPath);
        }
        
        // Se tudo falhar, usar o placeholder
        return res.redirect('/placeholder-image.jpg');
      }
      
      // Verificar se o arquivo existe fisicamente
      const imagePath = path.join(process.cwd(), `public${imageUrl}`);
      
      if (fs.existsSync(imagePath)) {
        return res.sendFile(imagePath);
      }
      
      // Se tudo falhar, usar o placeholder
      return res.redirect('/placeholder-image.jpg');
    }
    
    // Usar a imagem principal encontrada
    const imageUrl = imageResult.rows[0].image_url;
    
    // VALIDAÇÃO ADICIONAL: Verificar se o caminho da imagem inclui o store_id correto
    const expectedPathPattern = `/uploads/stores/${storeId}/products/${productId}/`;
    
    // Se o caminho não estiver no formato seguro, verificar ou reconstruir
    if (!imageUrl.includes(expectedPathPattern)) {
      console.warn(`⚠️ Caminho de imagem suspeito detectado: ${imageUrl}`);
      console.warn(`⚠️ Era esperado um caminho contendo: ${expectedPathPattern}`);
      
      // Reconstruir o caminho usando os IDs validados
      const fileName = imageUrl.split('/').pop();
      const secureImageUrl = `${expectedPathPattern}${fileName}`;
      
      // Verificar se o arquivo existe no caminho seguro
      const securePhysicalPath = path.join(process.cwd(), `public${secureImageUrl}`);
      
      if (fs.existsSync(securePhysicalPath)) {
        return res.sendFile(securePhysicalPath);
      }
      
      // Se o arquivo não existir no caminho seguro, verificar o caminho original
      const originalPath = path.join(process.cwd(), `public${imageUrl}`);
      
      if (fs.existsSync(originalPath)) {
        // Log de aviso, mas servir o arquivo original
        console.warn(`⚠️ Servindo arquivo de caminho não seguro: ${originalPath}`);
        return res.sendFile(originalPath);
      }
      
      // Se tudo falhar, usar o placeholder
      return res.redirect('/placeholder-image.jpg');
    }
    
    // Verificar se o arquivo existe fisicamente
    const imagePath = path.join(process.cwd(), `public${imageUrl}`);
    
    if (fs.existsSync(imagePath)) {
      return res.sendFile(imagePath);
    }
    
    // Se tudo falhar, usar o placeholder
    return res.redirect('/placeholder-image.jpg');
  } catch (error) {
    console.error('Erro ao servir imagem do produto:', error);
    return res.redirect('/placeholder-image.jpg');
  }
};

// Combinando middleware com handler
export const getProductPrimaryImage = [validateEntityRelationship, getProductPrimaryImageHandler];

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
      console.error(`ID de loja inválido: ${req.params.id}`);
      return res.redirect('/placeholder-image.jpg');
    }
    
    // Verificar se a loja existe
    const storeQuery = `SELECT id FROM stores WHERE id = $1`;
    const storeResult = await pool.query(storeQuery, [storeId]);
    
    if (storeResult.rows.length === 0) {
      console.error(`Loja não encontrada: ${storeId}`);
      return res.redirect('/placeholder-image.jpg');
    }
    
    // Buscar a imagem principal da loja
    const imageQuery = `
      SELECT image_url, thumbnail_url
      FROM store_images
      WHERE store_id = $1 AND is_primary = true
      ORDER BY display_order ASC, id DESC
      LIMIT 1
    `;
    
    const imageResult = await pool.query(imageQuery, [storeId]);
    
    if (imageResult.rows.length === 0) {
      // Se não houver imagem principal, buscar qualquer imagem
      const fallbackQuery = `
        SELECT image_url, thumbnail_url
        FROM store_images
        WHERE store_id = $1
        ORDER BY display_order ASC, id DESC
        LIMIT 1
      `;
      
      const fallbackResult = await pool.query(fallbackQuery, [storeId]);
      
      if (fallbackResult.rows.length === 0) {
        // Se não houver nenhuma imagem, verificar se existe um arquivo físico padrão
        const defaultPath = path.join(process.cwd(), `public/uploads/stores/${storeId}/logo.jpg`);
        
        if (fs.existsSync(defaultPath)) {
          return res.sendFile(defaultPath);
        }
        
        // Se tudo falhar, usar o placeholder
        return res.redirect('/placeholder-image.jpg');
      }
      
      // Usar a imagem encontrada
      const imageUrl = fallbackResult.rows[0].image_url;
      
      // Verificar se o arquivo existe fisicamente
      const imagePath = path.join(process.cwd(), `public${imageUrl}`);
      
      if (fs.existsSync(imagePath)) {
        return res.sendFile(imagePath);
      }
      
      // Se o arquivo não existir, tentar o caminho correto baseado no ID da loja
      const specificPath = path.join(process.cwd(), `public/uploads/stores/${storeId}/logo.jpg`);
      
      if (fs.existsSync(specificPath)) {
        return res.sendFile(specificPath);
      }
      
      // Se tudo falhar, usar o placeholder
      return res.redirect('/placeholder-image.jpg');
    }
    
    // Usar a imagem principal encontrada
    const imageUrl = imageResult.rows[0].image_url;
    
    // Verificar se o arquivo existe fisicamente
    const imagePath = path.join(process.cwd(), `public${imageUrl}`);
    
    if (fs.existsSync(imagePath)) {
      return res.sendFile(imagePath);
    }
    
    // Se o arquivo não existir, tentar o caminho correto baseado no ID da loja
    const specificPath = path.join(process.cwd(), `public/uploads/stores/${storeId}/logo.jpg`);
    
    if (fs.existsSync(specificPath)) {
      return res.sendFile(specificPath);
    }
    
    // Se tudo falhar, usar o placeholder
    return res.redirect('/placeholder-image.jpg');
  } catch (error) {
    console.error('Erro ao servir imagem da loja:', error);
    return res.redirect('/placeholder-image.jpg');
  }
};

/**
 * @route GET /api/placeholder-image.jpg
 * @desc Retorna uma imagem de placeholder
 * @access Público
 */
export const getPlaceholderImage = (req: Request, res: Response) => {
  try {
    const placeholderPath = path.join(process.cwd(), 'public/placeholder-image.jpg');
    
    if (fs.existsSync(placeholderPath)) {
      return res.sendFile(placeholderPath);
    }
    
    // Se não conseguir encontrar o placeholder, retornar 404
    return res.status(404).send('Placeholder image not found');
  } catch (error) {
    console.error('Erro ao servir imagem de placeholder:', error);
    return res.status(500).send('Error serving placeholder image');
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
export const getReservationImageHandler = async (req: Request, res: Response) => {
  try {
    const reservationId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    if (isNaN(reservationId) || !userId) {
      console.error(`Parâmetros inválidos: reservationId=${reservationId}, userId=${userId}`);
      return res.status(400).redirect('/placeholder-image.jpg');
    }
    
    // Verificar a reserva e obter informações detalhadas incluindo dados de promoção
    // para preservar o formato de exibição correto
    const query = `
      SELECT 
        r.id as reservation_id,
        r.product_id,
        r.created_at,
        p.store_id,
        p.name as product_name,
        p.price as product_price,
        p.discounted_price,
        pi.id as image_id,
        pi.image_url,
        pi.thumbnail_url,
        pi.is_primary,
        pi.display_order,
        s.name as store_name,
        -- Dados de promoção para preservar o formato
        prom.id as promotion_id,
        prom.type as promotion_type,
        prom.discount_percentage,
        prom.discount_amount,
        prom.price_override,
        prom.starts_at as promotion_starts_at,
        prom.ends_at as promotion_ends_at
      FROM 
        reservations r
      JOIN 
        products p ON r.product_id = p.id
      JOIN
        stores s ON p.store_id = s.id
      LEFT JOIN 
        product_images pi ON p.id = pi.product_id
      LEFT JOIN
        promotions prom ON p.id = prom.product_id AND 
        (prom.ends_at IS NULL OR prom.ends_at > NOW())
      WHERE 
        r.id = $1 AND r.user_id = $2
      ORDER BY
        prom.type = 'flash' DESC,  -- Prioriza promoções relâmpago
        prom.id DESC,              -- Promoção mais recente
        pi.is_primary DESC,        -- Depois imagem principal
        pi.display_order ASC, 
        pi.id ASC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [reservationId, userId]);
    
    if (!result.rows.length) {
      console.error(`Reserva ${reservationId} não encontrada ou não pertence ao usuário ${userId}`);
      return res.redirect('/placeholder-image.jpg');
    }
    
    const { 
      product_id, 
      store_id, 
      image_url, 
      promotion_id, 
      promotion_type 
    } = result.rows[0];
    
    // Verificar se este produto tem uma promoção ativa
    if (promotion_id) {
      console.log(`Produto ${product_id} com promoção ${promotion_id} tipo ${promotion_type}`);
      
      // Para promoções relâmpago e regulares, usamos rotas específicas para 
      // preservar o formato de exibição definido para cada tipo
      if (promotion_type === 'flash') {
        // Encaminha para a imagem da promoção relâmpago com seu padrão de exibição especial
        return res.redirect(`/api/promotions/${promotion_id}/flash-image`);
      } else {
        // Encaminha para a imagem de promoção normal com seu padrão de exibição
        return res.redirect(`/api/promotions/${promotion_id}/image`);
      }
    }
    
    // Se chegou aqui, é um produto sem promoção - servir imagem normal do produto
    
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
        console.warn(`⚠️ Caminho de imagem suspeito detectado: ${secureImageUrl}`);
        console.warn(`⚠️ Era esperado um caminho contendo: /uploads/stores/${store_id}/products/${product_id}/`);
        
        const fileName = secureImageUrl.split('/').pop();
        secureImageUrl = `/uploads/stores/${store_id}/products/${product_id}/${fileName}`;
      }
      
      return res.redirect(secureImageUrl);
    }
    
    // Validar e construir caminho de imagem seguro
    let secureImageUrl = image_url;
    
    // Garantir que a URL use o formato seguro para o ID da loja e produto corretos
    if (!secureImageUrl.includes(`/uploads/stores/${store_id}/products/${product_id}/`)) {
      console.warn(`⚠️ Caminho de imagem suspeito detectado: ${secureImageUrl}`);
      console.warn(`⚠️ Era esperado um caminho contendo: /uploads/stores/${store_id}/products/${product_id}/`);
      
      const fileName = secureImageUrl.split('/').pop();
      secureImageUrl = `/uploads/stores/${store_id}/products/${product_id}/${fileName}`;
    }
    
    return res.redirect(secureImageUrl);
  } catch (error) {
    console.error('Erro ao buscar imagem da reserva:', error);
    return res.redirect('/placeholder-image.jpg');
  }
};

// Usando a função como um handler para permitir uso como middleware
export const getReservationImage = getReservationImageHandler;

/**
 * @route GET /api/promotions/:id/image
 * @desc Retorna a imagem de uma promoção regular com seu formato específico
 * @access Público
 */
export const getPromotionImage = async (req: Request, res: Response) => {
  try {
    const promotionId = parseInt(req.params.id);
    
    if (isNaN(promotionId)) {
      console.error(`ID de promoção inválido: ${req.params.id}`);
      return res.redirect('/placeholder-image.jpg');
    }
    
    // Buscar informações da promoção e produto para verificação
    const promotionQuery = `
      SELECT 
        prom.id as promotion_id,
        prom.product_id,
        prom.type as promotion_type,
        p.store_id,
        pi.id as image_id,
        pi.image_url,
        pi.thumbnail_url,
        pi.is_primary
      FROM 
        promotions prom
      JOIN 
        products p ON prom.product_id = p.id
      LEFT JOIN 
        product_images pi ON p.id = pi.product_id
      WHERE 
        prom.id = $1 AND prom.type = 'regular'
      ORDER BY
        pi.is_primary DESC,
        pi.display_order ASC, 
        pi.id ASC
      LIMIT 1
    `;
    
    const promotionResult = await pool.query(promotionQuery, [promotionId]);
    
    if (promotionResult.rows.length === 0) {
      console.error(`Promoção regular não encontrada: ${promotionId}`);
      return res.redirect('/placeholder-image.jpg');
    }
    
    const { product_id, store_id, image_url } = promotionResult.rows[0];
    
    // Validar e construir caminho de imagem seguro
    let secureImageUrl = image_url;
    
    // Garantir que a URL use o formato seguro para o ID da loja e produto corretos
    if (!secureImageUrl || !secureImageUrl.includes(`/uploads/stores/${store_id}/products/${product_id}/`)) {
      console.warn(`⚠️ Caminho de imagem suspeito detectado para promoção ${promotionId}: ${secureImageUrl}`);
      
      if (!secureImageUrl) {
        return res.redirect(`/api/products/${product_id}/primary-image`);
      }
      
      const fileName = secureImageUrl.split('/').pop();
      secureImageUrl = `/uploads/stores/${store_id}/products/${product_id}/${fileName}`;
    }
    
    // Para promoções regulares, redirecionamos para a imagem do produto
    // Isso garantirá que o produto seja exibido com o padrão visual de promoção regular
    return res.redirect(secureImageUrl);
  } catch (error) {
    console.error('Erro ao buscar imagem da promoção regular:', error);
    return res.redirect('/placeholder-image.jpg');
  }
};

/**
 * @route GET /api/promotions/:id/flash-image
 * @desc Retorna a imagem de uma promoção relâmpago com seu formato específico
 * @access Público
 */
export const getFlashPromotionImage = async (req: Request, res: Response) => {
  try {
    const promotionId = parseInt(req.params.id);
    
    if (isNaN(promotionId)) {
      console.error(`ID de promoção relâmpago inválido: ${req.params.id}`);
      return res.redirect('/placeholder-image.jpg');
    }
    
    // Buscar informações da promoção relâmpago e produto para verificação
    const promotionQuery = `
      SELECT 
        prom.id as promotion_id,
        prom.product_id,
        prom.type as promotion_type,
        p.store_id,
        pi.id as image_id,
        pi.image_url,
        pi.thumbnail_url,
        pi.is_primary
      FROM 
        promotions prom
      JOIN 
        products p ON prom.product_id = p.id
      LEFT JOIN 
        product_images pi ON p.id = pi.product_id
      WHERE 
        prom.id = $1 AND prom.type = 'flash'
      ORDER BY
        pi.is_primary DESC,
        pi.display_order ASC, 
        pi.id ASC
      LIMIT 1
    `;
    
    const promotionResult = await pool.query(promotionQuery, [promotionId]);
    
    if (promotionResult.rows.length === 0) {
      console.error(`Promoção relâmpago não encontrada: ${promotionId}`);
      return res.redirect('/placeholder-image.jpg');
    }
    
    const { product_id, store_id, image_url } = promotionResult.rows[0];
    
    // Validar e construir caminho de imagem seguro
    let secureImageUrl = image_url;
    
    // Garantir que a URL use o formato seguro para o ID da loja e produto corretos
    if (!secureImageUrl || !secureImageUrl.includes(`/uploads/stores/${store_id}/products/${product_id}/`)) {
      console.warn(`⚠️ Caminho de imagem suspeito detectado para promoção relâmpago ${promotionId}: ${secureImageUrl}`);
      
      if (!secureImageUrl) {
        return res.redirect(`/api/products/${product_id}/primary-image`);
      }
      
      const fileName = secureImageUrl.split('/').pop();
      secureImageUrl = `/uploads/stores/${store_id}/products/${product_id}/${fileName}`;
    }
    
    // Para promoções relâmpago, redirecionamos para a imagem do produto
    // Isso garantirá que o produto seja exibido com o padrão visual de promoção relâmpago 
    return res.redirect(secureImageUrl);
  } catch (error) {
    console.error('Erro ao buscar imagem da promoção relâmpago:', error);
    return res.redirect('/placeholder-image.jpg');
  }
};

export default {
  getProductPrimaryImage,
  getProductThumbnail,
  getProductImages,
  getProductImage,
  getStorePrimaryImage,
  getStoreImages,
  getReservationImage,
  getPlaceholderImage,
  getPromotionImage,
  getFlashPromotionImage
};