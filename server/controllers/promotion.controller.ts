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
      
      // Ensure dates are proper Date objects or strings in ISO format
      if (processedData.startTime) {
        if (typeof processedData.startTime === 'string') {
          try {
            // Convert to ISO string to ensure proper format
            processedData.startTime = new Date(processedData.startTime).toISOString();
          } catch (e) {
            console.error("Error converting startTime:", e);
            return res.status(400).json({ 
              message: 'Invalid startTime format',
              error: e instanceof Error ? e.message : 'Unknown error'
            });
          }
        }
      }
      
      if (processedData.endTime) {
        if (typeof processedData.endTime === 'string') {
          try {
            // Convert to ISO string to ensure proper format
            processedData.endTime = new Date(processedData.endTime).toISOString();
          } catch (e) {
            console.error("Error converting endTime:", e);
            return res.status(400).json({ 
              message: 'Invalid endTime format',
              error: e instanceof Error ? e.message : 'Unknown error'
            });
          }
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

// Delete a promotion (sellers only)
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
