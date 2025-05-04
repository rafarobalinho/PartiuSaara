import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { sellerMiddleware } from '../middleware/auth';

// Subscription plans data
const subscriptionPlans = [
  {
    id: 'freemium',
    name: 'Freemium',
    description: 'Funcionalidades básicas para começar a vender',
    price: {
      monthly: 0,
      yearly: 0
    },
    features: [
      'Cadastrar até 5 produtos',
      'Criar 1 promoção simples por mês',
      'Dashboard básico',
      'Listagem nas buscas e categorias'
    ],
    limits: {
      products: 5,
      promotions: 1,
      flashPromotions: 0,
      coupons: 0
    }
  },
  {
    id: 'start',
    name: 'Start',
    description: 'Perfeito para quem está começando',
    price: {
      monthly: 149.90,
      yearly: 1439.00
    },
    features: [
      'Cadastrar até 10 produtos',
      'Criar até 5 cupons',
      'Notificações push para seguidores',
      'Analytics parcial',
      'Suporte prioritário'
    ],
    limits: {
      products: 10,
      promotions: 5,
      flashPromotions: 1,
      coupons: 5
    }
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Ideal para lojas em crescimento',
    price: {
      monthly: 249.90,
      yearly: 2399.00
    },
    features: [
      'Cadastrar até 50 produtos',
      'Cupons ilimitados',
      'Promoções relâmpago',
      'Analytics completo',
      'Destaque na página de categoria'
    ],
    limits: {
      products: 50,
      promotions: 20,
      flashPromotions: 5,
      coupons: -1 // Unlimited
    }
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Para lojistas que querem dominar o mercado',
    price: {
      monthly: 349.90,
      yearly: 3359.00
    },
    features: [
      'Produtos ilimitados',
      'Cupons e promoções ilimitados',
      'Analytics completo com exportação',
      'Destaque em toda a plataforma',
      'Suporte VIP'
    ],
    limits: {
      products: -1, // Unlimited
      promotions: -1, // Unlimited
      flashPromotions: -1, // Unlimited
      coupons: -1 // Unlimited
    }
  }
];

// Get all subscription plans
export async function getSubscriptionPlans(req: Request, res: Response) {
  try {
    res.json(subscriptionPlans);
  } catch (error) {
    console.error('Error getting subscription plans:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Purchase a subscription plan (sellers only)
export async function purchaseSubscription(req: Request, res: Response) {
  try {
    // Ensure user is a seller
    sellerMiddleware(req, res, async () => {
      const user = req.user!;
      
      // Validate request body
      const purchaseSchema = z.object({
        planId: z.enum(['freemium', 'start', 'pro', 'premium']),
        interval: z.enum(['monthly', 'yearly']),
        // In a real app, we would have payment details here
      });
      
      const validationResult = purchaseSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: validationResult.error.errors 
        });
      }
      
      const { planId, interval } = validationResult.data;
      
      // Get the plan
      const plan = subscriptionPlans.find(p => p.id === planId);
      if (!plan) {
        return res.status(404).json({ message: 'Subscription plan not found' });
      }
      
      // In a real app, we would process payment here
      
      // Get the user's store
      const stores = await storage.getStores({ search: '' });
      const userStore = stores.find(store => store.userId === user.id);
      
      if (!userStore) {
        return res.status(404).json({ message: 'Store not found. Please create a store first.' });
      }
      
      // Calculate end date (1 month or 1 year from now)
      const now = new Date();
      const endDate = new Date(now);
      if (interval === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }
      
      // Update the store's subscription
      const updatedStore = await storage.updateStore(userStore.id, {
        subscriptionPlan: planId,
        subscriptionEndDate: endDate
      });
      
      res.json({
        message: 'Subscription purchased successfully',
        plan: planId,
        interval,
        endDate,
        store: updatedStore
      });
    });
  } catch (error) {
    console.error('Error purchasing subscription:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Get current user's subscription
export async function getMySubscription(req: Request, res: Response) {
  try {
    // Ensure user is a seller
    sellerMiddleware(req, res, async () => {
      const user = req.user!;
      
      // Get the user's store
      const stores = await storage.getStores({ search: '' });
      const userStore = stores.find(store => store.userId === user.id);
      
      if (!userStore) {
        return res.status(404).json({ message: 'Store not found. Please create a store first.' });
      }
      
      // Get the plan
      const plan = subscriptionPlans.find(p => p.id === userStore.subscriptionPlan);
      
      res.json({
        plan,
        endDate: userStore.subscriptionEndDate,
        store: {
          id: userStore.id,
          name: userStore.name
        }
      });
    });
  } catch (error) {
    console.error('Error getting subscription:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
