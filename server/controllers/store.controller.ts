import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { insertStoreSchema } from '@shared/schema';
import { sellerMiddleware } from '../middleware/auth';

// Get all stores with filtering options
export async function getStores(req: Request, res: Response) {
  try {
    const { category, search, limit } = req.query;

    const stores = await storage.getStores({
      category: category as string,
      search: search as string,
      limit: limit ? Number(limit) : undefined
    });

    res.json(stores);
  } catch (error) {
    console.error('Error getting stores:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Get nearby stores based on user location
export async function getNearbyStores(req: Request, res: Response) {
  try {
    const { lat, lng, radius } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const radiusValue = radius ? Number(radius) : 5; // Default 5km

    const stores = await storage.getNearbyStores(latitude, longitude, radiusValue);
    res.json(stores);
  } catch (error) {
    console.error('Error getting nearby stores:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Get a single store by ID
export async function getStore(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const store = await storage.getStore(Number(id));

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    // Record store impression for analytics
    await storage.recordStoreImpression(Number(id));

    res.json(store);
  } catch (error) {
    console.error('Error getting store:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Get all products from a store
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

// Get all coupons from a store
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

// Create a new store (sellers only)
export async function createStore(req: Request, res: Response) {
  try {
    // Ensure user is a seller
    sellerMiddleware(req, res, async () => {
      const user = req.user!;

      console.log('🔍 [STORE-CREATE] Dados recebidos do frontend:', req.body);
      console.log('🔍 [STORE-CREATE] Usuário:', { id: user.id, role: user.role });

      // Validação preventiva para prevenir salvamento de URLs blob
      if (req.body.logo && req.body.logo.startsWith('blob:')) {
        console.warn('Bloqueando tentativa de salvar URL blob como logo');
        delete req.body.logo;
      }

      if (req.body.images && Array.isArray(req.body.images)) {
        const originalLength = req.body.images.length;
        req.body.images = req.body.images.filter(img => 
          !(typeof img === 'string' && img.startsWith('blob:'))
        );
        if (originalLength !== req.body.images.length) {
          console.log(`🔍 [STORE-CREATE] Removidas ${originalLength - req.body.images.length} URLs blob`);
        }
      }

      console.log('🔍 [STORE-CREATE] Dados após limpeza de blobs:', req.body);

      // Processar categories para category (compatibilidade)
      if (req.body.categories && Array.isArray(req.body.categories) && req.body.categories.length > 0) {
        req.body.category = req.body.categories[0]; // Usar primeira categoria como principal
        console.log('🔍 [STORE-CREATE] Convertendo categories para category:', req.body.categories[0]);
      }

      // CORREÇÃO CRÍTICA: Converter campos string para array quando necessário
      console.log('🔍 [STORE-CREATE] Dados antes da correção de arrays:', {
        tags: req.body.tags,
        tagsType: typeof req.body.tags,
        categories: req.body.categories,
        images: req.body.images
      });

      // Corrigir o campo tags - converter string vazia para array vazio
      if (typeof req.body.tags === 'string') {
        if (req.body.tags.trim() === '') {
          req.body.tags = []; // Array vazio em vez de string vazia
          console.log('🔍 [STORE-CREATE] Convertido tags string vazia para array vazio');
        } else {
          // Se houver tags como string, converter para array
          req.body.tags = req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
          console.log('🔍 [STORE-CREATE] Convertido tags string para array:', req.body.tags);
        }
      }

      // Garantir que outros campos de array estejam corretos
      if (!Array.isArray(req.body.categories)) {
        req.body.categories = [];
        console.log('🔍 [STORE-CREATE] Corrigido categories para array vazio');
      }

      if (!Array.isArray(req.body.images)) {
        req.body.images = [];
        console.log('🔍 [STORE-CREATE] Corrigido images para array vazio');
      }

      console.log('🔍 [STORE-CREATE] Dados após correção de arrays:', {
        tags: req.body.tags,
        tagsType: typeof req.body.tags,
        tagsIsArray: Array.isArray(req.body.tags),
        categories: req.body.categories,
        categoriesType: typeof req.body.categories,
        images: req.body.images,
        imagesType: typeof req.body.images
      });

      // Validate store data - usando schema atualizado com campos adicionais
      const storeSchema = insertStoreSchema.extend({
        userId: z.number().optional(),
        images: z.array(z.string()).optional().default([]),
        place_id: z.string().optional(),
        // Permitir location com latitude e longitude
        location: z.object({
          latitude: z.number(),
          longitude: z.number(),
          place_id: z.string().optional()
        }).optional(),
        // Garantir que address seja um objeto válido
        address: z.object({
          street: z.string(),
          city: z.string(),
          state: z.string(),
          zipCode: z.string(),
          neighborhood: z.string().optional(),
          number: z.string().optional(),
          complement: z.string().optional()
        }).optional()
      });

      // === DIAGNÓSTICO COMPLETO ===
      console.log('🔍 [STORE-CREATE] === DIAGNÓSTICO COMPLETO ===');
      console.log('🔍 [STORE-CREATE] Content-Type:', req.headers['content-type']);
      console.log('🔍 [STORE-CREATE] Dados recebidos:', JSON.stringify(req.body, null, 2));
      console.log('🔍 [STORE-CREATE] Tamanho do body:', JSON.stringify(req.body).length);
      console.log('🔍 [STORE-CREATE] Headers relevantes:', {
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length']
      });
      console.log('🔍 [STORE-CREATE] Usuário:', { id: user.id, role: user.role });
      console.log('🔍 [STORE-CREATE] Campos recebidos:', Object.keys(req.body));
      console.log('🔍 [STORE-CREATE] Tipos dos campos:', Object.entries(req.body).map(([key, value]) => 
        `${key}: ${typeof value} ${Array.isArray(value) ? '(array)' : ''}`
      ));

      const validationResult = storeSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.log('❌ [STORE-CREATE] ERRO DE VALIDAÇÃO DETALHADO:');
        console.log('❌ [STORE-CREATE] Dados enviados:', JSON.stringify(req.body, null, 2));
        console.log('❌ [STORE-CREATE] Erros encontrados:', JSON.stringify(validationResult.error.errors, null, 2));
        console.log('❌ [STORE-CREATE] Schema esperado:', Object.keys(insertStoreSchema.shape || {}));
        console.log('❌ [STORE-CREATE] Campos ausentes ou inválidos:', validationResult.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ));

        return res.status(400).json({ 
          message: 'Validation error', 
          errors: validationResult.error.errors,
          receivedFields: Object.keys(req.body),
          expectedFields: Object.keys(insertStoreSchema.shape || {}),
          debugData: req.body // Para debugging
        });
      }

      const storeData = validationResult.data;
      console.log('🔍 [STORE-CREATE] Dados validados:', storeData);
      console.log('🔍 [STORE-CREATE] Tags como array validado:', {
        tags: storeData.tags,
        isArray: Array.isArray(storeData.tags),
        length: storeData.tags?.length || 0
      });

      // Set the user ID to the current user
      storeData.userId = user.id;

      console.log('🔍 [STORE-CREATE] Criando loja com dados finais:', storeData);
      
      // LOGS CRÍTICOS para debug do PostgreSQL
      console.log('🔍 [STORAGE] Dados antes da inserção no BD:', {
        tags: storeData.tags,
        tagsType: typeof storeData.tags,
        tagsIsArray: Array.isArray(storeData.tags),
        categories: storeData.categories,
        categoriesType: typeof storeData.categories,
        categoriesIsArray: Array.isArray(storeData.categories),
        images: storeData.images,
        imagesType: typeof storeData.images,
        imagesIsArray: Array.isArray(storeData.images)
      });

      const store = await storage.createStore(storeData);
      console.log('✅ [STORE-CREATE] Loja criada com sucesso:', store);

      res.status(201).json(store);
    });
  } catch (error) {
    console.error('🚨 [STORE-CREATE] Erro no controller:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Update a store (sellers only)
export async function updateStore(req: Request, res: Response) {
  try {
    // Ensure user is a seller
    sellerMiddleware(req, res, async () => {
      const { id } = req.params;
      const user = req.user!;

      // Get the store
      const store = await storage.getStore(Number(id));
      if (!store) {
        return res.status(404).json({ message: 'Store not found' });
      }

      // Verify the store belongs to the user
      if (store.userId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to modify this store' });
      }

      // Processar os dados atualizados
      const updateData = {...req.body};

      // Se houver imagens e o primeiro elemento é um blob, não salvar
      if (updateData.images && Array.isArray(updateData.images) && updateData.images.length > 0) {
        // Verificamos se é um URL de blob
        if (typeof updateData.images[0] === 'string' && updateData.images[0].startsWith('blob:')) {
          // Mantém o valor antigo
          delete updateData.images;
        } else if (typeof updateData.images[0] === 'string' && !updateData.images[0].startsWith('blob:')) {
          // Se não for blob e for uma string (URL de imagem válida), definir como logo
          updateData.logo = updateData.images[0];
          // Removemos do array de imagens para evitar duplicação
          updateData.images = [];
        }
      }

      // Update the store
      const updatedStore = await storage.updateStore(Number(id), updateData);
      res.json(updatedStore);
    });
  } catch (error) {
    console.error('Error updating store:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}