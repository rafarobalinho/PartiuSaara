import { Request, Response } from 'express';
import { pool } from '../db';
import { storage } from '../storage';
import { z } from 'zod';
import { insertStoreSchema } from '@shared/schema';
import { sellerMiddleware } from '../middleware/auth';
import fs from 'fs';
import path from 'path';

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
      WHERE s.is_open = true
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

    // CORREÇÃO: Mover o filtro de distância para dentro da subconsulta usando CTE
    const query = `
      WITH stores_with_distance AS (
        SELECT 
          s.*,
          img.filename AS primary_image_filename,
          (
            6371 * acos(
              cos(radians($1)) * cos(radians((location->>'latitude')::float)) *
              cos(radians((location->>'longitude')::float) - radians($2)) +
              sin(radians($1)) * sin(radians((location->>'latitude')::float))
            )
          ) AS distance
        FROM 
          stores s
        LEFT JOIN LATERAL (
          SELECT filename FROM store_images si WHERE si.store_id = s.id
          ORDER BY si.is_primary DESC, si.id DESC LIMIT 1
        ) img ON true
        WHERE s.is_open = true 
          AND s.location IS NOT NULL
          AND s.location->>'latitude' IS NOT NULL 
          AND s.location->>'longitude' IS NOT NULL
          AND (s.location->>'latitude')::float BETWEEN -90 AND 90
          AND (s.location->>'longitude')::float BETWEEN -180 AND 180
      )
      SELECT * FROM stores_with_distance
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
 * @route GET /api/stores/debug/locations
 * @desc Debug: Retorna coordenadas e status das lojas
 */
export async function debugStoreLocations(req: Request, res: Response) {
  try {
    const { limit = 10 } = req.query;

    const query = `
      SELECT 
        s.id,
        s.name,
        s.is_open,
        s.location->>'latitude' as latitude,
        s.location->>'longitude' as longitude,
        s.location,
        img.filename AS primary_image_filename,
        CASE 
          WHEN img.filename IS NOT NULL THEN 'HAS_IMAGE'
          ELSE 'NO_IMAGE'
        END as image_status
      FROM 
        stores s
      LEFT JOIN LATERAL (
        SELECT filename FROM store_images si WHERE si.store_id = s.id
        ORDER BY si.is_primary DESC, si.id DESC LIMIT 1
      ) img ON true
      ORDER BY s.id
      LIMIT $1;
    `;

    const { rows } = await pool.query(query, [limit]);

    // Calcular estatísticas
    const stats = {
      total_stores: rows.length,
      stores_with_coordinates: rows.filter(r => r.latitude && r.longitude).length,
      stores_with_images: rows.filter(r => r.image_status === 'HAS_IMAGE').length,
      open_stores: rows.filter(r => r.is_open).length,
    };

    // Exemplo de como testar distância de uma coordenada específica
    const testCoords = { lat: -22.9068, lng: -43.1729 }; // Rio de Janeiro

    const storesWithDistance = rows.map(store => {
      if (store.latitude && store.longitude) {
        const lat1 = parseFloat(store.latitude);
        const lng1 = parseFloat(store.longitude);
        const lat2 = testCoords.lat;
        const lng2 = testCoords.lng;

        // Fórmula de Haversine
        const R = 6371; // Raio da Terra em km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        return {
          ...store,
          distance_from_rio: Math.round(distance * 100) / 100 // Arredondar para 2 casas decimais
        };
      }
      return { ...store, distance_from_rio: null };
    });

    res.json({
      debug_info: {
        test_coordinates: testCoords,
        stats,
        suggestion: "Use estas coordenadas para testar o endpoint nearby"
      },
      stores: storesWithDistance
    });

  } catch (error) {
    console.error('Error in debug locations:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
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
 * Cria estrutura de pastas para uma loja
 */
function createStoreDirectories(storeId: number) {
  try {
    const baseUploadPath = path.join('public', 'uploads');
    const storeDir = path.join(baseUploadPath, 'stores', storeId.toString());
    const productsDir = path.join(storeDir, 'products');
    const thumbnailsDir = path.join(storeDir, 'thumbnails');

    // Criar estrutura de pastas
    if (!fs.existsSync(storeDir)) {
      fs.mkdirSync(storeDir, { recursive: true });
      console.log(`📁 [STORE-CREATE] Criada pasta: stores/${storeId}/`);
    }

    if (!fs.existsSync(productsDir)) {
      fs.mkdirSync(productsDir, { recursive: true });
      console.log(`📁 [STORE-CREATE] Criada pasta: stores/${storeId}/products/`);
    }

    if (!fs.existsSync(thumbnailsDir)) {
      fs.mkdirSync(thumbnailsDir, { recursive: true });
      console.log(`📁 [STORE-CREATE] Criada pasta: stores/${storeId}/thumbnails/`);
    }

    return true;
  } catch (error) {
    console.error(`❌ [STORE-CREATE] Erro ao criar pastas para loja ${storeId}:`, error);
    return false;
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
      
      // Criar loja no banco
      const store = await storage.createStore(validationResult.data);
      
      // Criar estrutura de pastas automaticamente
      console.log(`🏪 [STORE-CREATE] Criando estrutura de pastas para loja ${store.id}...`);
      const foldersCreated = createStoreDirectories(store.id);
      
      if (!foldersCreated) {
        console.warn(`⚠️ [STORE-CREATE] Falha ao criar pastas para loja ${store.id}, mas loja foi criada com sucesso`);
      }
      
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

// Get user's stores
export async function getMyStores(req: Request, res: Response) {
  try {
    const user = req.user!;

    console.log(`🔍 [SECURITY] Buscando lojas apenas do usuário: ${user.id}`);

    const stores = await storage.getStoresByUserId(user.id);

    console.log(`🔍 [SECURITY] Lojas encontradas: ${stores.length}`);

    res.json(stores);
  } catch (error) {
    console.error('Error getting user stores:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Get products for a specific store (with security validation)
export async function getMyStoreProducts(req: Request, res: Response) {
  try {
    const { storeId } = req.params;
    const user = req.user!;

    console.log(`🔍 [SECURITY] Verificando acesso aos produtos da loja ${storeId} pelo usuário ${user.id}`);

    // First verify that the store belongs to the authenticated user
    const store = await storage.getStore(Number(storeId));
    if (!store) {
      console.log(`❌ [SECURITY] Loja ${storeId} não encontrada`);
      return res.status(404).json({ message: 'Store not found' });
    }

    if (store.userId !== user.id) {
      console.log(`❌ [SECURITY] Usuário ${user.id} tentou acessar produtos da loja ${storeId} que pertence ao usuário ${store.userId}`);
      return res.status(403).json({ message: 'Access denied: Store does not belong to you' });
    }

    // Get products for this specific store
    const products = await storage.getProductsByStore(Number(storeId));

    console.log(`✅ [SECURITY] Retornando ${products.length} produtos da loja ${storeId} para o usuário ${user.id}`);

    res.json({ products });
  } catch (error) {
    console.error('Error getting store products:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}