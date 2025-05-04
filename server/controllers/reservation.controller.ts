import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';

// Get user reservations
export async function getReservations(req: Request, res: Response) {
  try {
    const user = req.user!;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    
    const reservations = await storage.getReservations(user.id, limit);
    res.json(reservations);
  } catch (error) {
    console.error('Error getting reservations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Create a new reservation
export async function createReservation(req: Request, res: Response) {
  try {
    const user = req.user!;
    
    // Validate request body
    const reservationSchema = z.object({
      productId: z.number(),
      quantity: z.number().optional()
    });
    
    const validationResult = reservationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: validationResult.error.errors 
      });
    }
    
    const { productId, quantity } = validationResult.data;
    
    // Verify the product exists
    const product = await storage.getProduct(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Check if product is in stock
    if (product.stock !== undefined && product.stock <= 0) {
      return res.status(400).json({ message: 'Product is out of stock' });
    }
    
    if (quantity && product.stock !== undefined && quantity > product.stock) {
      return res.status(400).json({ message: 'Not enough stock available' });
    }
    
    // Create the reservation
    const reservation = await storage.createReservation(user.id, productId, quantity);
    res.status(201).json(reservation);
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Update reservation status
export async function updateReservationStatus(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { id } = req.params;
    
    // Validate request body
    const updateSchema = z.object({
      status: z.enum(['pending', 'completed', 'expired', 'cancelled'])
    });
    
    const validationResult = updateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: validationResult.error.errors 
      });
    }
    
    const { status } = validationResult.data;
    
    // Get the reservation
    const reservation = await storage.getReservation(Number(id));
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    
    // Check if this is the user's reservation
    if (reservation.userId !== user.id) {
      // If the user is a seller, check if they own the store with the product
      if (user.role === 'seller') {
        const product = await storage.getProduct(reservation.productId);
        if (!product) {
          return res.status(404).json({ message: 'Product not found' });
        }
        
        const store = await storage.getStore(product.storeId);
        if (!store || store.userId !== user.id) {
          return res.status(403).json({ message: 'Not authorized to modify this reservation' });
        }
      } else {
        return res.status(403).json({ message: 'Not authorized to modify this reservation' });
      }
    }
    
    // Update the reservation status
    const updatedReservation = await storage.updateReservationStatus(Number(id), status);
    res.json(updatedReservation);
  } catch (error) {
    console.error('Error updating reservation status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
