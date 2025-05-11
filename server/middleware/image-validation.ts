import { Request, Response, NextFunction } from 'express';
import { pool } from '../db';

/**
 * Interface para extensão do Request com informações validadas
 */
declare global {
  namespace Express {
    interface Request {
      validatedProduct?: {
        id: number;
        storeId: number;
        storeName?: string;
      };
    }
  }
}

/**
 * Middleware para validar relacionamentos de imagens com produtos e lojas
 * - Garante que a imagem solicitada pertence ao produto/loja correto
 * - Adiciona informações validadas ao objeto request para uso em controllers
 * - Fornece fallback seguro para casos de erro ou relacionamento inválido
 */
export const validateImageRelationship = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = req.params.id ? parseInt(req.params.id) : null;
    const imageId = req.params.imageId ? parseInt(req.params.imageId) : null;
    
    // Se não temos ID de produto, não há como validar
    if (!productId) {
      return next();
    }
    
    // Verificar se o produto existe e a que loja pertence
    const productQuery = `
      SELECT p.id, p.store_id, s.name AS store_name
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
    const storeId = product.store_id;
    
    // Se temos um ID de imagem, verificar se pertence a este produto
    if (imageId) {
      const imageQuery = `
        SELECT pi.id, pi.product_id 
        FROM product_images pi
        WHERE pi.id = $1
      `;
      
      const imageResult = await pool.query(imageQuery, [imageId]);
      
      // VALIDAÇÃO CRÍTICA: Verificar se a imagem pertence ao produto correto
      if (imageResult.rows.length === 0 || imageResult.rows[0].product_id !== productId) {
        console.error(`⚠️ VIOLAÇÃO DE SEGURANÇA: Imagem ${imageId} não pertence ao produto ${productId}`);
        return res.redirect('/placeholder-image.jpg');
      }
    }
    
    // Armazenar as informações validadas no request para uso posterior
    req.validatedProduct = {
      id: productId,
      storeId: storeId,
      storeName: product.store_name
    };
    
    next();
  } catch (error) {
    console.error('Erro na validação de relacionamento de imagem:', error);
    return res.redirect('/placeholder-image.jpg');
  }
};

export default validateImageRelationship;