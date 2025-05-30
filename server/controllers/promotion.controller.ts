import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { insertPromotionSchema } from '@shared/schema';
import { sellerMiddleware, authMiddleware } from '../middleware/auth';

// Get flash promotions
export async function getFlashPromotions(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const promotions = await storage.getPromotions('flash', limit);
    res.json(promotions);
  } catch (error) {
    console.error('Error getting flash promotions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Get a promotion by ID
export async function getPromotion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const promotion = await storage.getPromotion(Number(id));
    
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }
    
    res.json(promotion);
  } catch (error) {
    console.error('Error getting promotion:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Create a new promotion (sellers only)
export async function createPromotion(req: Request, res: Response) {
  try {
    // Ensure user is a seller
    sellerMiddleware(req, res, async () => {
      const user = req.user!;
      
      // Logs para debug
      console.log("======= CORPO DA REQUISIÇÃO RECEBIDO =======");
      console.log(JSON.stringify(req.body, null, 2));
      console.log("============================================");
      
      console.log("======= SCHEMA DE VALIDAÇÃO =======");
      console.log(JSON.stringify(insertPromotionSchema, null, 2));
      console.log("===================================");
      
      // Adaptação dos dados recebidos para o formato esperado pelo schema
      // Se o cliente enviar os dados originais do formulário, convertemos para o formato do schema
      let adaptedData = {...req.body};
      
      // Se temos discountType e discountValue, precisamos convertê-los para discountPercentage
      if (req.body.discountType && req.body.discountValue) {
        // Se o tipo for percentage, simplesmente usamos o valor
        if (req.body.discountType === 'percentage') {
          adaptedData.discountPercentage = Number(req.body.discountValue);
        } else {
          // Teria que calcular a percentagem com base no preço do produto
          // mas não temos acesso direto a ele aqui, então vamos usar o valor direto
          adaptedData.discountPercentage = Number(req.body.discountValue);
        }
        
        // Remover campos não utilizados pelo schema
        delete adaptedData.discountType;
        delete adaptedData.discountValue;
      }
      
      // Convertemos as strings de data para objetos Date
      if (typeof adaptedData.startTime === 'string') {
        adaptedData.startTime = new Date(adaptedData.startTime);
      }
      
      if (typeof adaptedData.endTime === 'string') {
        adaptedData.endTime = new Date(adaptedData.endTime);
      }
      
      console.log("======= DADOS ADAPTADOS =======");
      console.log(JSON.stringify(adaptedData, null, 2));
      console.log("==============================");

      // Validate promotion data com os dados adaptados
      const validationResult = insertPromotionSchema.safeParse(adaptedData);
      if (!validationResult.success) {
        console.log("======= ERROS DE VALIDAÇÃO =======");
        console.log(JSON.stringify(validationResult.error.errors, null, 2));
        console.log("==================================");
        
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: validationResult.error.errors 
        });
      }
      
      const promotionData = validationResult.data;
      
      // Get the product
      const product = await storage.getProduct(promotionData.productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      // Verify the product belongs to the user's store
      const store = await storage.getStore(product.storeId);
      if (!store || store.userId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to create promotions for this product' });
      }
      
      // Check subscription plan limits for flash promotions
      if (promotionData.type === 'flash' && store.subscriptionPlan === 'freemium') {
        return res.status(403).json({ 
          message: 'Upgrade your subscription plan to create flash promotions',
          subscriptionRequired: true
        });
      }
      
      // Create the promotion
      const promotion = await storage.createPromotion(promotionData);
      res.status(201).json(promotion);
    });
  } catch (error) {
    console.error('Error creating promotion:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Get seller's promotions
export async function getSellerPromotions(req: Request, res: Response) {
  try {
    // Ensure user is authenticated and is a seller
    sellerMiddleware(req, res, async () => {
      const user = req.user!;
      
      // Log para debug
      console.log(`[GET SELLER PROMOTIONS] Buscando promoções do vendedor ${user.id}`);
      
      // Obter todas as lojas do vendedor
      const stores = await storage.getUserStores(user.id);
      
      if (!stores || stores.length === 0) {
        return res.json([]);
      }
      
      const storeIds = stores.map(store => store.id);
      console.log(`[GET SELLER PROMOTIONS] IDs de lojas encontradas: ${storeIds.join(', ')}`);
      
      // Obter todos os produtos dessas lojas
      const products = await storage.getStoresProducts(storeIds);
      
      if (!products || products.length === 0) {
        return res.json([]);
      }
      
      const productIds = products.map(product => product.id);
      console.log(`[GET SELLER PROMOTIONS] IDs de produtos encontrados: ${productIds.join(', ')}`);
      
      // Obter promoções para esses produtos
      const promotions = await storage.getProductsPromotions(productIds);
      console.log(`[GET SELLER PROMOTIONS] ${promotions.length} promoções encontradas`);
      
      // Enriquecer as promoções com dados dos produtos
      const enrichedPromotions = await Promise.all(promotions.map(async (promo) => {
        const product = products.find(p => p.id === promo.productId);
        
        return {
          ...promo,
          product: product
        };
      }));
      
      res.json(enrichedPromotions);
    });
  } catch (error) {
    console.error('Error getting seller promotions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Update a promotion (sellers only)
export async function updatePromotion(req: Request, res: Response) {
  try {
    // Ensure user is a seller
    sellerMiddleware(req, res, async () => {
      const { id } = req.params;
      const user = req.user!;
      
      console.log(`Tentando atualizar promoção ID: ${id}`);
      console.log("Dados recebidos:", JSON.stringify(req.body, null, 2));
      
      // Get the promotion
      const promotion = await storage.getPromotion(Number(id));
      if (!promotion) {
        return res.status(404).json({ message: 'Promotion not found' });
      }
      
      // Get the product
      const product = await storage.getProduct(promotion.productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      // Verify the product belongs to the user's store
      const store = await storage.getStore(product.storeId);
      if (!store || store.userId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to modify this promotion' });
      }
      
      // Process the incoming data
      let processedData = {...req.body};
      
      // Handle discount type conversion (from frontend to database format)
      if (req.body.type === 'normal') {
        processedData.type = 'regular';
      }
      
      if (req.body.discountType && req.body.discountValue) {
        if (req.body.discountType === 'percentage') {
          processedData.discountPercentage = Number(req.body.discountValue);
          delete processedData.discountAmount;
        } else if (req.body.discountType === 'amount') {
          processedData.discountAmount = Number(req.body.discountValue);
          delete processedData.discountPercentage;
        }
        
        // Remove fields not in the schema
        delete processedData.discountType;
        delete processedData.discountValue;
      }
      
      // CRITICAL: Proper date handling to fix toISOString errors
      // Handle dates as strings explicitly in formats Postgres will accept
      if (processedData.startTime) {
        try {
          // Convert to string format that Postgres will accept directly
          if (processedData.startTime instanceof Date) {
            processedData.startTime = processedData.startTime.toISOString();
          } else if (typeof processedData.startTime === 'string') {
            // Make sure it's a valid date and convert to ISO format
            const dateObj = new Date(processedData.startTime);
            if (isNaN(dateObj.getTime())) {
              throw new Error('Invalid date format');
            }
            processedData.startTime = dateObj.toISOString();
          } else {
            throw new Error(`Unsupported startTime type: ${typeof processedData.startTime}`);
          }
          console.log(`Converted startTime to: ${processedData.startTime} (${typeof processedData.startTime})`);
        } catch (e) {
          console.error("Error processing startTime:", e);
          return res.status(400).json({ 
            message: 'Invalid startTime format or value',
            error: e instanceof Error ? e.message : 'Unknown error'
          });
        }
      }
      
      if (processedData.endTime) {
        try {
          // Convert to string format that Postgres will accept directly
          if (processedData.endTime instanceof Date) {
            processedData.endTime = processedData.endTime.toISOString();
          } else if (typeof processedData.endTime === 'string') {
            // Make sure it's a valid date and convert to ISO format
            const dateObj = new Date(processedData.endTime);
            if (isNaN(dateObj.getTime())) {
              throw new Error('Invalid date format');
            }
            processedData.endTime = dateObj.toISOString();
          } else {
            throw new Error(`Unsupported endTime type: ${typeof processedData.endTime}`);
          }
          console.log(`Converted endTime to: ${processedData.endTime} (${typeof processedData.endTime})`);
        } catch (e) {
          console.error("Error processing endTime:", e);
          return res.status(400).json({ 
            message: 'Invalid endTime format or value',
            error: e instanceof Error ? e.message : 'Unknown error'
          });
        }
      }
      
      console.log("Dados processados para atualização:", JSON.stringify(processedData, null, 2));
      
      try {
        // Update the promotion with processed data
        const updatedPromotion = await storage.updatePromotion(Number(id), processedData);
        console.log("Promoção atualizada com sucesso:", updatedPromotion);
        res.json(updatedPromotion);
      } catch (updateError) {
        console.error("Erro durante a atualização da promoção:", updateError);
        return res.status(500).json({ 
          message: 'Failed to update promotion', 
          error: updateError instanceof Error ? updateError.message : 'Unknown error'
        });
      }
    });
  } catch (error) {
    console.error('Error updating promotion:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// New simplified method for promotion update
export async function simpleUpdatePromotion(req: Request, res: Response) {
  try {
    // Ensure user is a seller
    sellerMiddleware(req, res, async () => {
      const { id } = req.params;
      const user = req.user!;
      
      console.log(`[SimpleUpdate] Atualizando promoção ${id} com dados:`, req.body);
      
      // Get the promotion
      const promotion = await storage.getPromotion(Number(id));
      if (!promotion) {
        return res.status(404).json({ message: 'Promotion not found' });
      }
      
      // Get the product
      const product = await storage.getProduct(promotion.productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      // Verify the product belongs to the user's store
      const store = await storage.getStore(product.storeId);
      if (!store || store.userId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to modify this promotion' });
      }
      
      // Extract fields from request body
      const { 
        type,
        discountType, 
        discountValue,
        startTime, 
        endTime 
      } = req.body;
      
      // Process discount fields - convert from frontend format to DB format
      let discountPercentage = promotion.discountPercentage;
      
      if (discountType && discountValue) {
        if (discountType === 'percentage') {
          discountPercentage = Number(discountValue);
        }
      }
      
      // Format dates as needed
      let formattedStartTime = startTime ? new Date(startTime).toISOString() : promotion.startTime;
      let formattedEndTime = endTime ? new Date(endTime).toISOString() : promotion.endTime;
      
      // Using direct database query with snake_case column names
      const { pool } = await import('../db');
      
      const query = `
        UPDATE promotions 
        SET 
          type = $1,
          discount_percentage = $2,
          start_time = $3::timestamp,
          end_time = $4::timestamp,
          updated_at = NOW()
        WHERE id = $5
        RETURNING *;
      `;
      
      const values = [
        type || promotion.type,
        discountPercentage,
        formattedStartTime,
        formattedEndTime,
        Number(id)
      ];
      
      console.log('[SimpleUpdate] Executing query with values:', {
        query,
        values
      });
      
      const result = await pool.query(query, values);
      console.log('[SimpleUpdate] Update result rows:', result.rows);
      
      if (!result.rows || result.rows.length === 0) {
        return res.status(500).json({ message: 'Failed to update promotion' });
      }
      
      const updatedPromotion = result.rows[0];
      
      // Transform snake_case back to camelCase for the response
      const formattedPromotion = {
        id: updatedPromotion.id,
        productId: updatedPromotion.product_id,
        type: updatedPromotion.type,
        discountPercentage: updatedPromotion.discount_percentage,
        startTime: updatedPromotion.start_time,
        endTime: updatedPromotion.end_time,
        createdAt: updatedPromotion.created_at,
        updatedAt: updatedPromotion.updated_at
      };
      
      console.log('[SimpleUpdate] Formatted promotion:', formattedPromotion);
      
      return res.json(formattedPromotion);
    });
  } catch (error) {
    console.error('[SimpleUpdate] Error:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function deletePromotion(req: Request, res: Response) {
  try {
    // Ensure user is a seller
    sellerMiddleware(req, res, async () => {
      const { id } = req.params;
      const user = req.user!;
      
      // Log for debugging
      console.log(`Tentando excluir promoção com ID: ${id}`);
      
      // Get the promotion
      const promotion = await storage.getPromotion(Number(id));
      if (!promotion) {
        return res.status(404).json({ message: 'Promotion not found' });
      }
      
      // Get the product
      const product = await storage.getProduct(promotion.productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      // Verify the product belongs to the user's store
      const store = await storage.getStore(product.storeId);
      if (!store || store.userId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to delete this promotion' });
      }
      
      // Delete the promotion
      const success = await storage.deletePromotion(Number(id));
      
      if (success) {
        console.log(`Promoção ${id} excluída com sucesso`);
        res.json({ success: true, message: 'Promotion deleted successfully' });
      } else {
        console.error(`Falha ao excluir promoção ${id}`);
        res.status(500).json({ message: 'Failed to delete promotion' });
      }
    });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
