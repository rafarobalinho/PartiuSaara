import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { insertPromotionSchema } from '@shared/schema';
import { sellerMiddleware } from '../middleware/auth';

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
      
      // Validate promotion data
      const validationResult = insertPromotionSchema.safeParse(req.body);
      if (!validationResult.success) {
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

// Update a promotion (sellers only)
export async function updatePromotion(req: Request, res: Response) {
  try {
    // Ensure user is a seller
    sellerMiddleware(req, res, async () => {
      const { id } = req.params;
      const user = req.user!;
      
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
      
      // Update the promotion
      const updatedPromotion = await storage.updatePromotion(Number(id), req.body);
      res.json(updatedPromotion);
    });
  } catch (error) {
    console.error('Error updating promotion:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
