import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { insertCouponSchema } from '@shared/schema';
import { sellerMiddleware, authMiddleware } from '../middleware/auth';
import { planLimitsMiddleware } from '../middleware/plan-limits.middleware';

// Validation schema for coupon usage
const useCouponSchema = z.object({
  couponId: z.number(),
  storeId: z.number()
});

// Get coupons by store (public)
export async function getStoreCoupons(req: Request, res: Response) {
  try {
    const { storeId } = req.params;
    const coupons = await storage.getCouponsByStore(Number(storeId));
    res.json(coupons);
  } catch (error) {
    console.error('Error getting store coupons:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Get all active coupons (public)
export async function getActiveCoupons(req: Request, res: Response) {
  try {
    const search = req.query.search as string;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const coupons = await storage.getCoupons(search, limit);
    res.json(coupons);
  } catch (error) {
    console.error('Error getting active coupons:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Get a specific coupon by ID
export async function getCoupon(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const coupon = await storage.getCoupon(Number(id));

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.json(coupon);
  } catch (error) {
    console.error('Error getting coupon:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Get seller's coupons (sellers only)
export async function getSellerCoupons(req: Request, res: Response) {
  try {
    sellerMiddleware(req, res, async () => {
      const user = req.user!;

      // Get user's stores
      const stores = await storage.getStoresByUserId(user.id);

      if (stores.length === 0) {
        return res.json([]);
      }

      // Get coupons for all user's stores
      const allCoupons = [];
      for (const store of stores) {
        const storeCoupons = await storage.getCouponsByStore(store.id);
        allCoupons.push(...storeCoupons);
      }

      // Sort by creation date (newest first)
      allCoupons.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json(allCoupons);
    });
  } catch (error) {
    console.error('Error getting seller coupons:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Create a new coupon (sellers only)
export async function createCoupon(req: Request, res: Response) {
  try {
    sellerMiddleware(req, res, async () => {
      const user = req.user!;

      console.log("======= DADOS RECEBIDOS PARA CRIAÇÃO DE CUPOM =======");
      console.log(JSON.stringify(req.body, null, 2));
      console.log("===================================================");

      // Validate coupon data
      const validationResult = insertCouponSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.log("======= ERROS DE VALIDAÇÃO =======");
        console.log(JSON.stringify(validationResult.error.errors, null, 2));
        console.log("==================================");

        return res.status(400).json({ 
          message: 'Validation error', 
          errors: validationResult.error.errors 
        });
      }

      const couponData = validationResult.data;

      // Verify the store belongs to the user
      const store = await storage.getStore(couponData.storeId);
      if (!store || store.userId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to create coupons for this store' });
      }

      // Check subscription plan limits via middleware
      await planLimitsMiddleware.checkCouponLimits(user.id, store);

      // Validate dates
      const startTime = new Date(couponData.startTime);
      const endTime = new Date(couponData.endTime);

      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return res.status(400).json({ message: 'Invalid dates provided' });
      }

      if (endTime <= startTime) {
        return res.status(400).json({ message: 'End time must be after start time' });
      }

      // Check if coupon code already exists for this store
      const existingCoupons = await storage.getCouponsByStore(couponData.storeId);
      const codeExists = existingCoupons.some(c => c.code.toLowerCase() === couponData.code.toLowerCase());

      if (codeExists) {
        return res.status(409).json({ message: 'Coupon code already exists for this store' });
      }

      // Create the coupon
      const coupon = await storage.createCoupon(couponData);

      console.log("======= CUPOM CRIADO COM SUCESSO =======");
      console.log(JSON.stringify(coupon, null, 2));
      console.log("=======================================");

      res.status(201).json(coupon);
    });
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Update a coupon (sellers only)
export async function updateCoupon(req: Request, res: Response) {
  try {
    sellerMiddleware(req, res, async () => {
      const user = req.user!;
      const { id } = req.params;

      console.log("======= DADOS RECEBIDOS PARA ATUALIZAÇÃO =======");
      console.log(JSON.stringify(req.body, null, 2));
      console.log("===============================================");

      // Get the existing coupon
      const existingCoupon = await storage.getCoupon(Number(id));
      if (!existingCoupon) {
        return res.status(404).json({ message: 'Coupon not found' });
      }

      // Verify the store belongs to the user
      const store = await storage.getStore(existingCoupon.storeId);
      if (!store || store.userId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to update this coupon' });
      }

      // Validate update data (partial validation)
      const updateSchema = insertCouponSchema.partial();
      const validationResult = updateSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: validationResult.error.errors 
        });
      }

      const updateData = validationResult.data;

      // Validate dates if provided
      if (updateData.startTime || updateData.endTime) {
        const startTime = new Date(updateData.startTime || existingCoupon.startTime);
        const endTime = new Date(updateData.endTime || existingCoupon.endTime);

        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          return res.status(400).json({ message: 'Invalid dates provided' });
        }

        if (endTime <= startTime) {
          return res.status(400).json({ message: 'End time must be after start time' });
        }
      }

      // Check if new coupon code conflicts (if code is being updated)
      if (updateData.code && updateData.code !== existingCoupon.code) {
        const existingCoupons = await storage.getCouponsByStore(existingCoupon.storeId);
        const codeExists = existingCoupons.some(c => 
          c.id !== existingCoupon.id && 
          c.code.toLowerCase() === updateData.code.toLowerCase()
        );

        if (codeExists) {
          return res.status(409).json({ message: 'Coupon code already exists for this store' });
        }
      }

      // Update the coupon
      const updatedCoupon = await storage.updateCoupon(Number(id), updateData);

      if (!updatedCoupon) {
        return res.status(404).json({ message: 'Coupon not found or could not be updated' });
      }

      console.log("======= CUPOM ATUALIZADO COM SUCESSO =======");
      console.log(JSON.stringify(updatedCoupon, null, 2));
      console.log("==========================================");

      res.json(updatedCoupon);
    });
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Mark coupon as used (for physical store validation)
export async function useCoupon(req: Request, res: Response) {
  try {
    sellerMiddleware(req, res, async () => {
      const user = req.user!;

      console.log("======= VALIDAÇÃO DE USO DE CUPOM =======");
      console.log(JSON.stringify(req.body, null, 2));
      console.log("========================================");

      // Validate request data
      const validationResult = useCouponSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: validationResult.error.errors 
        });
      }

      const { couponId, storeId } = validationResult.data;

      // Verify the store belongs to the user
      const store = await storage.getStore(storeId);
      if (!store || store.userId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to validate coupons for this store' });
      }

      // Get the coupon
      const coupon = await storage.getCoupon(couponId);
      if (!coupon) {
        return res.status(404).json({ message: 'Coupon not found' });
      }

      // Verify coupon belongs to the store
      if (coupon.storeId !== storeId) {
        return res.status(400).json({ message: 'Coupon does not belong to this store' });
      }

      // Check if coupon is active
      if (!coupon.isActive) {
        return res.status(400).json({ message: 'Coupon is not active' });
      }

      // Check if coupon is still valid (dates)
      const now = new Date();
      const startTime = new Date(coupon.startTime);
      const endTime = new Date(coupon.endTime);

      if (now < startTime) {
        return res.status(400).json({ message: 'Coupon is not yet valid' });
      }

      if (now > endTime) {
        return res.status(400).json({ message: 'Coupon has expired' });
      }

      // Check usage limits
      if (coupon.maxUsageCount && coupon.usageCount >= coupon.maxUsageCount) {
        return res.status(400).json({ message: 'Coupon usage limit reached' });
      }

      // Mark coupon as used (increment usage count)
      const updatedCoupon = await storage.updateCoupon(couponId, {
        usageCount: coupon.usageCount + 1
      });

      if (!updatedCoupon) {
        return res.status(500).json({ message: 'Failed to update coupon usage' });
      }

      console.log("======= CUPOM UTILIZADO COM SUCESSO =======");
      console.log(`Cupom ID: ${couponId}, Novo uso count: ${updatedCoupon.usageCount}`);
      console.log("==========================================");

      res.json({ 
        message: 'Coupon used successfully',
        coupon: updatedCoupon,
        usageCount: updatedCoupon.usageCount,
        remainingUses: updatedCoupon.maxUsageCount ? updatedCoupon.maxUsageCount - updatedCoupon.usageCount : null
      });
    });
  } catch (error) {
    console.error('Error using coupon:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Validate coupon code (for customers to check before visiting store)
export async function validateCouponCode(req: Request, res: Response) {
  try {
    const { storeId, code } = req.params;

    console.log(`======= VALIDAÇÃO DE CÓDIGO DE CUPOM =======`);
    console.log(`Store ID: ${storeId}, Code: ${code}`);
    console.log("==========================================");

    // Get store coupons
    const coupons = await storage.getCouponsByStore(Number(storeId));

    // Find coupon by code (case insensitive)
    const coupon = coupons.find(c => c.code.toLowerCase() === code.toLowerCase());

    if (!coupon) {
      return res.status(404).json({ 
        valid: false,
        message: 'Coupon code not found' 
      });
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return res.status(400).json({ 
        valid: false,
        message: 'Coupon is not active' 
      });
    }

    // Check if coupon is still valid (dates)
    const now = new Date();
    const startTime = new Date(coupon.startTime);
    const endTime = new Date(coupon.endTime);

    if (now < startTime) {
      return res.status(400).json({ 
        valid: false,
        message: 'Coupon is not yet valid',
        validFrom: startTime
      });
    }

    if (now > endTime) {
      return res.status(400).json({ 
        valid: false,
        message: 'Coupon has expired',
        expiredAt: endTime
      });
    }

    // Check usage limits
    const hasUsageLimit = coupon.maxUsageCount && coupon.maxUsageCount > 0;
    const usageLimitReached = hasUsageLimit && coupon.usageCount >= coupon.maxUsageCount;

    if (usageLimitReached) {
      return res.status(400).json({ 
        valid: false,
        message: 'Coupon usage limit reached',
        maxUsage: coupon.maxUsageCount,
        currentUsage: coupon.usageCount
      });
    }

    // Coupon is valid
    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discountAmount: coupon.discountAmount,
        discountPercentage: coupon.discountPercentage,
        endTime: coupon.endTime,
        usageCount: coupon.usageCount,
        maxUsageCount: coupon.maxUsageCount,
        remainingUses: hasUsageLimit ? coupon.maxUsageCount - coupon.usageCount : null
      },
      store: coupon.store
    });

  } catch (error) {
    console.error('Error validating coupon code:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Delete/deactivate a coupon (sellers only)
export async function deleteCoupon(req: Request, res: Response) {
  try {
    sellerMiddleware(req, res, async () => {
      const user = req.user!;
      const { id } = req.params;

      // Get the existing coupon
      const existingCoupon = await storage.getCoupon(Number(id));
      if (!existingCoupon) {
        return res.status(404).json({ message: 'Coupon not found' });
      }

      // Verify the store belongs to the user
      const store = await storage.getStore(existingCoupon.storeId);
      if (!store || store.userId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to delete this coupon' });
      }

      // Instead of deleting, deactivate the coupon (better for analytics)
      const deactivatedCoupon = await storage.updateCoupon(Number(id), {
        isActive: false
      });

      if (!deactivatedCoupon) {
        return res.status(500).json({ message: 'Failed to deactivate coupon' });
      }

      console.log(`======= CUPOM DESATIVADO =======`);
      console.log(`Cupom ID: ${id} foi desativado`);
      console.log("===============================");

      res.json({ 
        message: 'Coupon deactivated successfully',
        coupon: deactivatedCoupon 
      });
    });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}