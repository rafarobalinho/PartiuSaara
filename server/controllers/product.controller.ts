import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { insertProductSchema } from '@shared/schema';
import { sellerMiddleware } from '../middleware/auth';

// Get products with filtering options
export async function getProducts(req: Request, res: Response) {
  try {
    const { 
      category, 
      search, 
      minPrice,
      maxPrice,
      sortBy,
      promotion,
      limit,
      type
    } = req.query;
    
    console.log('Controller received price filters:', { 
      minPrice, 
      maxPrice,
      minPriceType: typeof minPrice,
      maxPriceType: typeof maxPrice
    });
    
    // Convert price filters to numbers
    const minPriceNum = minPrice ? Number(minPrice) : undefined;
    const maxPriceNum = maxPrice ? Number(maxPrice) : undefined;
    
    console.log('Converted price filters:', { 
      minPriceNum, 
      maxPriceNum,
      minPriceNumType: typeof minPriceNum,
      maxPriceNumType: typeof maxPriceNum
    });
    
    const products = await storage.getProducts({
      category: category as string,
      search: search as string,
      minPrice: minPriceNum,
      maxPrice: maxPriceNum,
      sortBy: sortBy as string,
      promotion: promotion === 'true',
      limit: limit ? Number(limit) : undefined,
      type: type as string
    });
    
    console.log(`Controller returning ${products.length} products after filtering`);
    
    res.json(products);
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Get featured products
export async function getFeaturedProducts(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 8;
    const products = await storage.getFeaturedProducts(limit);
    res.json(products);
  } catch (error) {
    console.error('Error getting featured products:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Get a single product by ID
export async function getProduct(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const product = await storage.getProduct(Number(id));
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Get related products
export async function getRelatedProducts(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : 4;
    
    const relatedProducts = await storage.getRelatedProducts(Number(id), limit);
    res.json(relatedProducts);
  } catch (error) {
    console.error('Error getting related products:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Create a new product (sellers only)
export async function createProduct(req: Request, res: Response) {
  try {
    // Ensure user is a seller
    sellerMiddleware(req, res, async () => {
      const user = req.user!;
      
      // Validate product data
      const productSchema = insertProductSchema.extend({
        storeId: z.number()
      });
      
      const validationResult = productSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: validationResult.error.errors 
        });
      }
      
      const productData = validationResult.data;
      
      // Verify the store belongs to the user
      const store = await storage.getStore(productData.storeId);
      if (!store || store.userId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to add products to this store' });
      }
      
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Update a product (sellers only)
export async function updateProduct(req: Request, res: Response) {
  try {
    // Ensure user is a seller
    sellerMiddleware(req, res, async () => {
      const { id } = req.params;
      const user = req.user!;
      
      // Get the product
      const product = await storage.getProduct(Number(id));
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      // Verify the store belongs to the user
      const store = await storage.getStore(product.storeId);
      if (!store || store.userId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to modify this product' });
      }
      
      // Update the product
      const updatedProduct = await storage.updateProduct(Number(id), req.body);
      res.json(updatedProduct);
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
