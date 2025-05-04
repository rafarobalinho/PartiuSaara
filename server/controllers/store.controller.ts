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
      
      // Validate store data
      const storeSchema = insertStoreSchema.extend({
        userId: z.number().optional()
      });
      
      const validationResult = storeSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: validationResult.error.errors 
        });
      }
      
      const storeData = validationResult.data;
      
      // Set the user ID to the current user
      storeData.userId = user.id;
      
      const store = await storage.createStore(storeData);
      res.status(201).json(store);
    });
  } catch (error) {
    console.error('Error creating store:', error);
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
      
      // Update the store
      const updatedStore = await storage.updateStore(Number(id), req.body);
      res.json(updatedStore);
    });
  } catch (error) {
    console.error('Error updating store:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
