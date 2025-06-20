import { Request, Response } from 'express';
import { pool } from '../db';
import { storage } from '../storage';
import { z } from 'zod';
import { insertStoreSchema } from '@shared/schema';
import { sellerMiddleware } from '../middleware/auth';

/**
 * @route GET /api/stores
 * @desc Retorna uma lista de lojas, com logotipos, e prioriza as com planos pagos.
 */
export async function getStores(req: Request, res: Response) {
  try {
    const { limit } = req.query;
    const resultLimit = limit ? parseInt(String(limit), 10) : 50;

    const query = `
      SELECT 
        s.*,
        img.filename AS primary_image_filename,
        CASE
          WHEN s.subscription_status = 'active' AND s.subscription_plan != 'freemium' THEN 1
          WHEN s.subscription_status = 'active' AND s.subscription_plan = 'freemium' THEN 2
          ELSE 3
        END as plan_priority
      FROM 
        stores s
      LEFT JOIN LATERAL (
        SELECT filename FROM store_images si WHERE si.store_id = s.id
        ORDER BY si.is_primary DESC, si.id DESC LIMIT 1
      ) img ON true
      WHERE s.is_open = true -- Corrigido de is_active para is_open
      ORDER BY plan_priority ASC, s.created_at DESC
      LIMIT $1;
    `;

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
 * @desc Retorna lojas próximas, incluindo o logotipo. (VERSÃO CORRIGIDA)
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
        WHERE s.is_open = true -- Corrigido de is_active para is_open
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
 * @desc Retorna uma única loja com detalhes.
 */
export async function getStore(req: Request, res: Response) {
try {
const { id } = req.params;
const store = await storage.getStore(Number(id));
if (!store) return res.status(404).json({ message: 'Store not found' });
await storage.recordStoreImpression(Number(id));
res.json(store);
} catch (error) {
console.error('Error getting store:', error);
res.status(500).json({ message: 'Internal server error' });
}
}

/**
 * @route GET /api/stores/:id/products
 * @desc Retorna os produtos de uma loja.
 */
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

/**
 * @route GET /api/stores/:id/coupons
 * @desc Retorna os cupons de uma loja.
 */
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

/**
 * @route POST /api/stores
 * @desc Cria uma nova loja.
 */
export async function createStore(req: Request, res: Response) {
try {
sellerMiddleware(req, res, async () => {
const user = req.user!;
      const storeData = { ...req.body, userId: user.id };
      const validationResult = insertStoreSchema.safeParse(storeData);
      if (!validationResult.success) {
        return res.status(400).json({ message: 'Validation error', errors: validationResult.error.errors });
      }
      const store = await storage.createStore(validationResult.data);
res.status(201).json(store);
});
} catch (error) {
console.error('🚨 [STORE-CREATE] Erro no controller:', error);
res.status(500).json({ message: 'Internal server error' });
}
}

/**
 * @route PUT /api/stores/:id
 * @desc Atualiza uma loja.
 */
export async function updateStore(req: Request, res: Response) {
try {
sellerMiddleware(req, res, async () => {
const { id } = req.params;
const user = req.user!;
const store = await storage.getStore(Number(id));
if (!store || store.userId !== user.id) {
return res.status(403).json({ message: 'Not authorized to modify this store' });
}
const updatedStore = await storage.updateStore(Number(id), req.body);
res.json(updatedStore);
});
} catch (error) {
console.error('Error updating store:', error);
res.status(500).json({ message: 'Internal server error' });
}
}