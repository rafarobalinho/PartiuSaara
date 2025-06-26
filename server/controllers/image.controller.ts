import { Request, Response } from 'express';
import { pool } from '../db';
import fs from 'fs';
import path from 'path';

// --- FUNÇÃO HELPER DE FALLBACK ---

/**
 * Envia uma imagem de placeholder padrão como resposta em caso de erro ou imagem não encontrada.
 */
const sendPlaceholder = (res: Response) => {
  const placeholderPath = path.join(process.cwd(), 'public', 'placeholder-image.jpg');
  if (fs.existsSync(placeholderPath)) {
    return res.sendFile(placeholderPath);
  }
  return res.status(404).send('Image not found and placeholder is missing.');
};

// --- FUNÇÕES HELPER DE CONSTRUÇÃO DE CAMINHO ---

const buildProductImagePath = (storeId: number | string, productId: number | string, filename: string): string => {
  return path.join(process.cwd(), 'public', 'uploads', 'stores', String(storeId), 'products', String(productId), filename);
};

const buildProductThumbnailPath = (storeId: number | string, productId: number | string, thumbnailFilename: string): string => {
  return path.join(process.cwd(), 'public', 'uploads', 'stores', String(storeId), 'products', String(productId), 'thumbnails', thumbnailFilename);
};

const buildStoreImagePath = (storeId: number | string, filename: string): string => {
  return path.join(process.cwd(), 'public', 'uploads', 'stores', String(storeId), filename);
};


// --- CONTROLLERS ---

/**
 * @route GET /api/products/:id/primary-image
 */
const getProductPrimaryImage = async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (isNaN(productId)) return sendPlaceholder(res);

    const query = `
      SELECT pi.filename, p.store_id
      FROM product_images AS pi
      JOIN products AS p ON pi.product_id = p.id
      WHERE pi.product_id = $1 ORDER BY pi.is_primary DESC, pi.id DESC LIMIT 1;
    `;
    const result = await pool.query(query, [productId]);
    if (result.rows.length === 0) return sendPlaceholder(res);

    const { filename, store_id } = result.rows[0];
    const secureFilePath = buildProductImagePath(store_id, productId, filename);

    if (fs.existsSync(secureFilePath)) return res.sendFile(secureFilePath);

    console.warn(`[INCONSISTÊNCIA] Arquivo não encontrado: ${secureFilePath}`);
    return sendPlaceholder(res);
  } catch (error) {
    console.error(`[ERRO] getProductPrimaryImage (ID: ${req.params.id}):`, error);
    return sendPlaceholder(res);
  }
};

/**
 * @route GET /api/products/:id/thumbnail
 */
const getProductThumbnail = async (req: Request, res: Response) => {
    try {
        const productId = parseInt(req.params.id, 10);
        if (isNaN(productId)) return sendPlaceholder(res);

        const query = `
            SELECT pi.thumbnail_filename, p.store_id
            FROM product_images AS pi
            JOIN products AS p ON pi.product_id = p.id
            WHERE pi.product_id = $1 ORDER BY pi.is_primary DESC, pi.id DESC LIMIT 1;
        `;
        const result = await pool.query(query, [productId]);
        if (result.rows.length === 0 || !result.rows[0].thumbnail_filename) return sendPlaceholder(res);

        const { thumbnail_filename, store_id } = result.rows[0];
        const secureFilePath = buildProductThumbnailPath(store_id, productId, thumbnail_filename);

        if (fs.existsSync(secureFilePath)) return res.sendFile(secureFilePath);

        console.warn(`[INCONSISTÊNCIA] Thumbnail não encontrada: ${secureFilePath}`);
        return sendPlaceholder(res);
    } catch (error) {
        console.error(`[ERRO] getProductThumbnail (ID: ${req.params.id}):`, error);
        return sendPlaceholder(res);
    }
};

/**
 * @route GET /api/products/:id/images
 */
const getProductImages = async (req: Request, res: Response) => {
    try {
        const productId = parseInt(req.params.id, 10);
        if (isNaN(productId)) return res.status(400).json({ success: false, message: 'ID de produto inválido.' });

        const imagesQuery = `
            SELECT id, filename, thumbnail_filename, is_primary, display_order
            FROM product_images WHERE product_id = $1
            ORDER BY is_primary DESC, display_order ASC, id ASC;
        `;
        const imagesResult = await pool.query(imagesQuery, [productId]);

        const secureImages = imagesResult.rows.map(img => ({
            id: img.id,
            filename: img.filename,
            is_primary: img.is_primary,
            secure_url: `/api/products/${productId}/image/${img.id}`,
        }));

        return res.status(200).json({ success: true, images: secureImages });
    } catch (error) {
        console.error(`[ERRO] getProductImages (ID: ${req.params.id}):`, error);
        return res.status(500).json({ success: false, message: 'Erro interno ao buscar as imagens do produto.' });
    }
};

/**
 * @route GET /api/products/:id/image/:imageId
 */
const getProductImage = async (req: Request, res: Response) => {
    try {
        const productId = parseInt(req.params.id, 10);
        const imageParam = req.params.imageId;

        if (isNaN(productId)) return sendPlaceholder(res);

        // Verificar se é um ID numérico válido
        const imageId = parseInt(imageParam, 10);

        let query: string;
        let queryParams: any[];

        if (!isNaN(imageId) && imageId.toString() === imageParam && imageId <= 2147483647) {
            // É um ID válido
            query = `
                SELECT pi.filename, p.store_id
                FROM product_images AS pi
                JOIN products AS p ON pi.product_id = p.id
                WHERE pi.id = $1 AND pi.product_id = $2;
            `;
            queryParams = [imageId, productId];
        } else {
            // É um filename
            query = `
                SELECT pi.filename, p.store_id
                FROM product_images AS pi
                JOIN products AS p ON pi.product_id = p.id
                WHERE pi.filename = $1 AND pi.product_id = $2;
            `;
            queryParams = [imageParam, productId];
        }

        const result = await pool.query(query, queryParams);
        if (result.rows.length === 0) return sendPlaceholder(res);

        const { filename, store_id } = result.rows[0];
        const secureFilePath = buildProductImagePath(store_id, productId, filename);

        if (fs.existsSync(secureFilePath)) return res.sendFile(secureFilePath);

        console.warn(`[INCONSISTÊNCIA] Arquivo não encontrado: ${secureFilePath}`);
        return sendPlaceholder(res);
    } catch (error) {
        console.error(`[ERRO] getProductImage (Param: ${req.params.imageId}):`, error);
        return sendPlaceholder(res);
    }
};

/**
 * @route GET /api/stores/:id/primary-image
 */
const getStorePrimaryImage = async (req: Request, res: Response) => {
    try {
        const storeId = parseInt(req.params.id, 10);
        if (isNaN(storeId)) return sendPlaceholder(res);

        const query = `SELECT filename FROM store_images WHERE store_id = $1 ORDER BY is_primary DESC, id DESC LIMIT 1;`;
        const result = await pool.query(query, [storeId]);
        if (result.rows.length === 0) return sendPlaceholder(res);

        const { filename } = result.rows[0];
        const secureFilePath = buildStoreImagePath(storeId, filename);

        if (fs.existsSync(secureFilePath)) return res.sendFile(secureFilePath);

        console.warn(`[INCONSISTÊNCIA] Arquivo de loja não encontrado: ${secureFilePath}`);
        return sendPlaceholder(res);
    } catch (error) {
        console.error(`[ERRO] getStorePrimaryImage (ID: ${req.params.id}):`, error);
        return sendPlaceholder(res);
    }
};

/**
 * @route GET /api/stores/:id/images
 */
const getStoreImages = async (req: Request, res: Response) => {
    try {
        const storeId = parseInt(req.params.id, 10);
        if (isNaN(storeId)) return res.status(400).json({ success: false, message: 'ID de loja inválido.' });

        const imagesQuery = `
            SELECT id, filename, is_primary, display_order FROM store_images
            WHERE store_id = $1 ORDER BY is_primary DESC, display_order ASC, id ASC;
        `;
        const imagesResult = await pool.query(imagesQuery, [storeId]);

        const secureImages = imagesResult.rows.map(img => ({
            id: img.id,
            filename: img.filename,
            is_primary: img.is_primary,
            secure_url: `/api/stores/${storeId}/image/${img.id}`, // Requer uma rota /api/stores/:id/image/:imageId
        }));

        return res.status(200).json({ success: true, images: secureImages });
    } catch (error) {
        console.error(`[ERRO] getStoreImages (ID: ${req.params.id}):`, error);
        return res.status(500).json({ success: false, message: 'Erro interno ao buscar as imagens da loja.' });
    }
};

/**
 * @route DELETE /api/images/:id
 */
const deleteImage = async (req: Request, res: Response) => {
    const imageId = parseInt(req.params.id, 10);
    const { type } = req.query as { type: 'product' | 'store' };

    if (isNaN(imageId) || !['product', 'store'].includes(type)) {
        return res.status(400).json({ success: false, message: 'Parâmetros inválidos.' });
    }

    try {
        let fileToDelete: { path: string, thumbPath?: string } | null = null;

        if (type === 'product') {
            const result = await pool.query(`SELECT pi.filename, pi.thumbnail_filename, p.id as product_id, p.store_id FROM product_images pi JOIN products p ON pi.product_id = p.id WHERE pi.id = $1`, [imageId]);
            if (result.rows.length > 0) {
                const { filename, thumbnail_filename, product_id, store_id } = result.rows[0];
                fileToDelete = {
                    path: buildProductImagePath(store_id, product_id, filename),
                    thumbPath: thumbnail_filename ? buildProductThumbnailPath(store_id, product_id, thumbnail_filename) : undefined
                };
                await pool.query('DELETE FROM product_images WHERE id = $1', [imageId]);
            }
        } else { // type === 'store'
            const result = await pool.query(`SELECT filename, thumbnail_filename, store_id FROM store_images WHERE id = $1`, [imageId]);
            if (result.rows.length > 0) {
                const { filename, thumbnail_filename, store_id } = result.rows[0];
                fileToDelete = {
                    path: buildStoreImagePath(store_id, filename),
                    thumbPath: thumbnail_filename ? path.join(process.cwd(), 'public', 'uploads', 'stores', String(store_id), 'thumbnails', thumbnail_filename) : undefined
                };
                await pool.query('DELETE FROM store_images WHERE id = $1', [imageId]);
            }
        }

        if (fileToDelete) {
            if (fs.existsSync(fileToDelete.path)) fs.unlinkSync(fileToDelete.path);
            if (fileToDelete.thumbPath && fs.existsSync(fileToDelete.thumbPath)) fs.unlinkSync(fileToDelete.thumbPath);
        }

        return res.status(200).json({ success: true, message: 'Imagem excluída.' });
    } catch (error) {
        console.error(`[ERRO] deleteImage (ID: ${imageId}):`, error);
        return res.status(500).json({ success: false, message: 'Erro ao excluir imagem.' });
    }
};

// Funções de promoção e reserva precisam ser refatoradas da mesma forma
// Por enquanto, elas retornarão placeholder para evitar erros.
const getPromotionImage = (req: Request, res: Response) => sendPlaceholder(res);
const getFlashPromotionImage = (req: Request, res: Response) => sendPlaceholder(res);
const getReservationImage = (req: Request, res: Response) => sendPlaceholder(res);

// --- EXPORTAÇÃO FINAL ---

export default {
    getPlaceholderImage: sendPlaceholder,
    getProductPrimaryImage,
    getProductThumbnail,
    getProductImages,
    getProductImage,
    getStorePrimaryImage,
    getStoreImages,
    getPromotionImage,
    getFlashPromotionImage,
    getReservationImage,
    deleteImage,
};