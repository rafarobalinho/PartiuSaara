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
import { Request, Response } from 'express';
import { db } from '../db';

// Definir planos estáticos de acordo com o PRD
const plans = [
  {
    id: 1,
    name: 'Freemium',
    price: 0,
    priceYearly: 0,
    description: 'Plano básico gratuito para testar a plataforma',
    features: [
      'Cadastro da loja (informações básicas, até 1 imagem)',
      'Cadastro até 5 produtos',
      'Criar 1 promoção simples por mês',
      'Acessar mini-dashboard (visualizações da loja)',
      'Responder mensagens no chat com consumidores',
      'Ser listado nas buscas e categorias, sem destaque'
    ],
    limitations: [
      'Não pode publicar cupons promocionais',
      'Não pode criar promoções relâmpago',
      'Sem notificações push para clientes',
      'Sem destaque na página inicial ou em categorias'
    ],
    productLimit: 5,
    promotionLimit: 1,
    couponLimit: 0,
    hasFlashPromotions: false,
    hasAnalytics: false,
    stripePriceId: {
      monthly: null,
      yearly: null
    }
  },
  {
    id: 2,
    name: 'Start',
    price: 149.9,
    priceYearly: 1439.0,
    description: 'Ideal para pequenos lojistas começando no digital',
    features: [
      'Cadastro da loja (informações completas, até 5 imagens)',
      'Cadastro até 10 produtos',
      'Até 5 cupons por mês',
      'Criar promoções regulares ilimitadas',
      'Notificações push para seguidores da loja',
      'Acesso ao painel de marketing básico',
      'Dashboard com indicadores básicos de comportamento',
      'Relatórios por e-mail',
      'Acesso prioritário ao suporte'
    ],
    productLimit: 10,
    promotionLimit: -1, // -1 significa ilimitado
    couponLimit: 5,
    hasFlashPromotions: false,
    hasAnalytics: true,
    stripePriceId: {
      monthly: process.env.STRIPE_PRICE_START_MONTHLY || 'price_start_monthly',
      yearly: process.env.STRIPE_PRICE_START_YEARLY || 'price_start_yearly'
    }
  },
  {
    id: 3,
    name: 'Pro',
    price: 249.9,
    priceYearly: 2399.0,
    description: 'Para lojistas que buscam crescimento digital',
    features: [
      'Cadastro da loja (informações completas, até 10 imagens)',
      'Cadastro até 50 produtos',
      'Cupons ilimitados',
      'Promoções relâmpago',
      'Analytics parcial com dados demográficos',
      'Notificações direcionadas para clientes próximos',
      'Destaque rotativo na página de categoria',
      'Acesso ao painel de marketing avançado',
      'Dashboard com todos indicadores de comportamento',
      'Relatórios detalhados por e-mail',
      'Acesso VIP ao suporte'
    ],
    productLimit: 50,
    promotionLimit: -1,
    couponLimit: -1,
    hasFlashPromotions: true,
    hasAnalytics: true,
    stripePriceId: {
      monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
      yearly: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly'
    }
  },
  {
    id: 4,
    name: 'Premium',
    price: 349.9,
    priceYearly: 3359.0,
    description: 'Experiência completa para lojistas estabelecidos',
    features: [
      'Cadastro da loja (informações completas, até 20 imagens)',
      'Produtos ilimitados',
      'Cupons ilimitados',
      'Promoções relâmpago ilimitadas',
      'Analytics completo com comparativos de mercado',
      'Notificações automáticas para todos usuários',
      'Destaque fixo na página inicial',
      'Destaque especial em resultados de busca',
      'Badge "Premium" na vitrine da loja',
      'Acesso ao painel de marketing premium',
      'Dashboard com todos indicadores + previsões',
      'Relatórios personalizados',
      'Suporte preferencial com gerente dedicado'
    ],
    productLimit: -1,
    promotionLimit: -1, 
    couponLimit: -1,
    hasFlashPromotions: true,
    hasAnalytics: true,
    stripePriceId: {
      monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || 'price_premium_monthly',
      yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY || 'price_premium_yearly'
    }
  }
];

// Obter todos os planos
export const getPlans = async (req: Request, res: Response) => {
  try {
    res.json(plans);
  } catch (error) {
    console.error('Erro ao obter planos:', error);
    res.status(500).json({ error: 'Erro ao obter planos' });
  }
};

// Obter plano atual do lojista
export const getCurrentPlan = async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, req.session.userId as number),
      columns: {
        planId: true,
        subscriptionStatus: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const userPlan = plans.find(plan => plan.id === user.planId) || plans[0];

    res.json({
      ...userPlan,
      subscriptionStatus: user.subscriptionStatus || 'inactive'
    });
  } catch (error) {
    console.error('Erro ao obter plano atual:', error);
    res.status(500).json({ error: 'Erro ao obter plano atual' });
  }
};

// Verificar limites do plano (produtos, promoções, cupons)
export const checkPlanLimits = async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { type } = req.params; // 'products', 'promotions', 'coupons'

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, req.session.userId as number),
      columns: {
        id: true,
        planId: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const userPlan = plans.find(plan => plan.id === user.planId) || plans[0];

    let currentCount = 0;
    let limit = 0;

    // Buscar contagem atual
    switch (type) {
      case 'products':
        const products = await db.query.products.findMany({
          where: (products, { eq }) => eq(products.userId, user.id)
        });
        currentCount = products.length;
        limit = userPlan.productLimit;
        break;

      case 'promotions':
        const promotions = await db.query.promotions.findMany({
          where: (promotions, { eq }) => eq(promotions.userId, user.id)
        });
        currentCount = promotions.length;
        limit = userPlan.promotionLimit;
        break;

      case 'coupons':
        // Implementação futura - quando tabela de cupons for criada
        limit = userPlan.couponLimit;
        break;

      default:
        return res.status(400).json({ error: 'Tipo inválido' });
    }

    // -1 significa ilimitado
    const isWithinLimit = limit === -1 || currentCount < limit;

    res.json({
      currentCount,
      limit: limit === -1 ? 'Ilimitado' : limit,
      isWithinLimit,
      planName: userPlan.name
    });
  } catch (error) {
    console.error('Erro ao verificar limites do plano:', error);
    res.status(500).json({ error: 'Erro ao verificar limites do plano' });
  }
};
import { and, eq } from 'drizzle-orm';
import { stores } from '../db/schema';

export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const { planId, interval, storeId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
    }

    // Validações
    if (!planId || !interval || !storeId) {
      return res.status(400).json({ 
        success: false, 
        error: 'planId, interval e storeId são obrigatórios' 
      });
    }

    // Validar se a loja pertence ao usuário
    const store = await db.query.stores.findFirst({
      where: and(eq(stores.id, storeId), eq(stores.userId, userId))
    });

    if (!store) {
      return res.status(403).json({ 
        success: false, 
        error: 'Loja não encontrada ou não pertence ao usuário' 
      });
    }
};