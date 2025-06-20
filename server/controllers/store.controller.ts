import { Request, Response } from 'express';
import { pool } from '../db';
import { storage } from '../storage';
import { z } from 'zod';
import { insertStoreSchema } from '@shared/schema';
import { sellerMiddleware } from '../middleware/auth';

/**
 * @route GET /api/stores
 * @desc Retorna uma lista de lojas, incluindo o logotipo principal.
 */
export async function getStores(req: Request, res: Response) {
  try {
    const { category, search, limit } = req.query;

    const query = `
      SELECT 
        s.*,
        img.filename AS primary_image_filename
      FROM 
        stores s
      LEFT JOIN LATERAL (
        SELECT filename 
        FROM store_images si
        WHERE si.store_id = s.id
        ORDER BY si.is_primary DESC, si.id DESC
        LIMIT 1
      ) img ON true
      WHERE s.is_active = true
      ORDER BY s.created_at DESC
      LIMIT $1;
    `;
    const resultLimit = limit ? parseInt(String(limit), 10) : 50; // Limite padrão de 50
    const { rows } = await pool.query(query, [resultLimit]);

    const finalStores = rows.map(store => ({
      ...store,
      primary_image_api_url: store.primary_image_filename 
        ? `/api/stores/${store.id}/primary-image` 
        : null,
    }));

    res.json(finalStores);
  } catch (error) {
    console.error('Erro ao buscar lojas:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * @route GET /api/stores/nearby
 * @desc Retorna lojas próximas, incluindo o logotipo.
 */
export async function getNearbyStores(req: Request, res: Response) {
  try {
    const { lat, lng, radius } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude e longitude são obrigatórias' });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const radiusInKm = radius ? Number(radius) : 5;

    const query = `
      SELECT *, (
        6371 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        )
      ) AS distance
      FROM (
        SELECT 
          s.*,
          img.filename AS primary_image_filename
        FROM 
          stores s
        LEFT JOIN LATERAL (
          SELECT filename FROM store_images si WHERE si.store_id = s.id
          ORDER BY si.is_primary DESC, si.id DESC LIMIT 1
        ) img ON true
        WHERE s.is_active = true
      ) AS stores_with_images
      WHERE distance < $3
      ORDER BY distance;
    `;
    const { rows } = await pool.query(query, [latitude, longitude, radiusInKm]);

    const finalStores = rows.map(store => ({
        ...store,
        primary_image_api_url: store.primary_image_filename ? `/api/stores/${store.id}/primary-image` : null,
    }));

    res.json(finalStores);
  } catch (error) {
    console.error('Error getting nearby stores:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * @route GET /api/stores/:id
 * @desc Retorna uma única loja com detalhes e galeria de imagens.
 */
export async function getStore(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const storeId = parseInt(id, 10);
    if (isNaN(storeId)) return res.status(400).json({ message: 'ID de loja inválido' });

    const storeResult = await pool.query(`SELECT * FROM stores WHERE id = $1;`, [storeId]);
    if (storeResult.rows.length === 0) return res.status(404).json({ message: 'Store not found' });

    const imagesResult = await pool.query(`SELECT id, filename, is_primary FROM store_images WHERE store_id = $1 ORDER BY is_primary DESC, id ASC;`, [storeId]);

    const imageGallery = imagesResult.rows.map(img => ({
      id: img.id,
      filename: img.filename,
      is_primary: img.is_primary,
      secure_url: `/api/stores/${storeId}/image/${img.id}` // Requer uma rota para imagem específica
    }));

    const finalStore = { ...storeResult.rows[0], images: imageGallery };
    res.json(finalStore);
  } catch (error) {
    console.error('Error getting store:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * @route POST /api/stores
 * @desc Cria uma nova loja, com validação de dados.
 */
export async function createStore(req: Request, res: Response) {
  try {
    sellerMiddleware(req, res, async () => {
      const user = req.user!;
      const rawData = { ...req.body, userId: user.id };

      // Sua lógica de validação robusta com Zod
      const validationResult = insertStoreSchema.safeParse(rawData);

      if (!validationResult.success) {
        console.error('❌ [STORE-CREATE] Erro de validação:', validationResult.error.errors);
        return res.status(400).json({ 
          message: 'Dados inválidos.', 
          errors: validationResult.error.errors 
        });
      }

      const storeData = validationResult.data;

      // A chamada para a camada de storage que você já tinha.
      // Garanta que `storage.createStore` esteja funcionando corretamente com os dados validados.
      const store = await storage.createStore(storeData);

      console.log('✅ [STORE-CREATE] Loja criada com sucesso:', store);
      res.status(201).json(store);
    });
  } catch (error) {
    console.error('🚨 [STORE-CREATE] Erro no controller:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * @route PUT /api/stores/:id
 * @desc Atualiza uma loja existente.
 */
export async function updateStore(req: Request, res: Response) {
    try {
        sellerMiddleware(req, res, async () => {
            const { id } = req.params;
            const user = req.user!;

            const store = await storage.getStore(Number(id));
            if (!store) {
                return res.status(404).json({ message: 'Store not found' });
            }
            if (store.userId !== user.id) {
                return res.status(403).json({ message: 'Not authorized to modify this store' });
            }

            // A sua lógica de atualização original
            const updatedStore = await storage.updateStore(Number(id), req.body);
            res.json(updatedStore);
        });
    } catch (error) {
        console.error('Error updating store:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}


// Mantendo as outras funções que seu código original tinha
export async function getStoreProducts(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const products = await storage.getProductsByStore(Number(id));
    res.json(products);
  } catch (error) {
    console.error('Error getting store products:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getStoreCoupons(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const coupons = await storage.getCouponsByStore(Number(id));
    res.json(coupons);
  } catch (error) {
    console.error('Error getting store coupons:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}