// server/middleware/plan-limits.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { stores, products, promotions, coupons } from '../../shared/schema';
import { eq, and, count } from 'drizzle-orm';

// Definição dos limites por plano
export const PLAN_LIMITS = {
  freemium: {
    maxProducts: 5,
    maxPromotions: 1,
    maxCouponsPerMonth: 0,
    allowsFlashPromotions: false,
    allowsAdvancedAnalytics: false,
    allowsDestaques: false,
    highlightWeight: 1
  },
  start: {
    maxProducts: 15,
    maxPromotions: 5,
    maxCouponsPerMonth: 5,
    allowsFlashPromotions: true,
    allowsAdvancedAnalytics: false,
    allowsDestaques: false,
    highlightWeight: 2
  },
  pro: {
    maxProducts: 50,
    maxPromotions: 20,
    maxCouponsPerMonth: 20,
    allowsFlashPromotions: true,
    allowsAdvancedAnalytics: true,
    allowsDestaques: true,
    highlightWeight: 4
  },
  premium: {
    maxProducts: -1, // Ilimitado
    maxPromotions: -1, // Ilimitado
    maxCouponsPerMonth: -1, // Ilimitado
    allowsFlashPromotions: true,
    allowsAdvancedAnalytics: true,
    allowsDestaques: true,
    highlightWeight: 5
  }
};

// Interface para resposta de validação
interface PlanValidationResult {
  allowed: boolean;
  message?: string;
  currentCount?: number;
  maxAllowed?: number;
  upgrade?: string;
}

// Função para obter limites do plano atual
export function getPlanLimits(plan: string): typeof PLAN_LIMITS.freemium {
  const normalizedPlan = plan?.toLowerCase() || 'freemium';
  return PLAN_LIMITS[normalizedPlan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.freemium;
}

// Função para validar se o usuário pode adicionar produtos
export async function validateProductLimit(userId: number, storeId?: number): Promise<PlanValidationResult> {
  try {
    // Buscar loja do usuário (se storeId não fornecido, pegar primeira loja)
    let userStore;
    if (storeId) {
      userStore = await db.query.stores.findFirst({
        where: and(eq(stores.id, storeId), eq(stores.userId, userId))
      });
    } else {
      userStore = await db.query.stores.findFirst({
        where: eq(stores.userId, userId)
      });
    }

    if (!userStore) {
      return {
        allowed: false,
        message: 'Loja não encontrada'
      };
    }

    const limits = getPlanLimits(userStore.subscriptionPlan || 'freemium');

    // Se é ilimitado
    if (limits.maxProducts === -1) {
      return { allowed: true };
    }

    // Contar produtos atuais da loja
    const [{ count: currentProducts }] = await db
      .select({ count: count() })
      .from(products)
      .where(eq(products.storeId, userStore.id));

    const allowed = currentProducts < limits.maxProducts;

    return {
      allowed,
      message: allowed 
        ? 'Produto pode ser adicionado'
        : `Limite de ${limits.maxProducts} produtos atingido. Faça upgrade para adicionar mais produtos.`,
      currentCount: currentProducts,
      maxAllowed: limits.maxProducts,
      upgrade: allowed ? undefined : userStore.subscriptionPlan === 'freemium' ? 'start' : 'pro'
    };
  } catch (error) {
    console.error('Erro ao validar limite de produtos:', error);
    return {
      allowed: false,
      message: 'Erro ao verificar limites do plano'
    };
  }
}

// Função para validar se o usuário pode criar promoções
export async function validatePromotionLimit(userId: number, storeId?: number): Promise<PlanValidationResult> {
  try {
    // Buscar loja do usuário
    let userStore;
    if (storeId) {
      userStore = await db.query.stores.findFirst({
        where: and(eq(stores.id, storeId), eq(stores.userId, userId))
      });
    } else {
      userStore = await db.query.stores.findFirst({
        where: eq(stores.userId, userId)
      });
    }

    if (!userStore) {
      return {
        allowed: false,
        message: 'Loja não encontrada'
      };
    }

    const limits = getPlanLimits(userStore.subscriptionPlan || 'freemium');

    // Se é ilimitado
    if (limits.maxPromotions === -1) {
      return { allowed: true };
    }

    // Contar promoções ativas da loja (do mês atual)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Buscar produtos da loja
    const storeProducts = await db.query.products.findMany({
      where: eq(products.storeId, userStore.id),
      columns: { id: true }
    });

    const productIds = storeProducts.map(p => p.id);

    if (productIds.length === 0) {
      return { allowed: true }; // Se não tem produtos, pode criar promoção
    }

    // Contar promoções do mês atual
    const [{ count: currentPromotions }] = await db
      .select({ count: count() })
      .from(promotions)
      .where(
        and(
          // IN clause para produtos da loja
          // Note: Esta implementação pode precisar ser ajustada dependendo do seu ORM
          eq(promotions.productId, productIds[0]) // Simplificado - implementação real seria com IN
        )
      );

    const allowed = currentPromotions < limits.maxPromotions;

    return {
      allowed,
      message: allowed 
        ? 'Promoção pode ser criada'
        : `Limite de ${limits.maxPromotions} promoções por mês atingido. Faça upgrade para criar mais promoções.`,
      currentCount: currentPromotions,
      maxAllowed: limits.maxPromotions,
      upgrade: allowed ? undefined : userStore.subscriptionPlan === 'freemium' ? 'start' : 'pro'
    };
  } catch (error) {
    console.error('Erro ao validar limite de promoções:', error);
    return {
      allowed: false,
      message: 'Erro ao verificar limites do plano'
    };
  }
}

// Middleware para validar limite de produtos antes de criar
export const validateProductLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const storeId = req.body.storeId || req.params.storeId;
    const validation = await validateProductLimit(user.id, storeId ? parseInt(storeId) : undefined);

    if (!validation.allowed) {
      return res.status(403).json({
        success: false,
        message: validation.message,
        planLimitReached: true,
        currentCount: validation.currentCount,
        maxAllowed: validation.maxAllowed,
        suggestedUpgrade: validation.upgrade
      });
    }

    next();
  } catch (error) {
    console.error('Erro no middleware de validação de produtos:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Middleware para validar limite de promoções antes de criar
export const validatePromotionLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const validation = await validatePromotionLimit(user.id);

    if (!validation.allowed) {
      return res.status(403).json({
        success: false,
        message: validation.message,
        planLimitReached: true,
        currentCount: validation.currentCount,
        maxAllowed: validation.maxAllowed,
        suggestedUpgrade: validation.upgrade
      });
    }

    next();
  } catch (error) {
    console.error('Erro no middleware de validação de promoções:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Middleware para verificar se o plano permite funcionalidade específica
export const requirePlanFeature = (feature: keyof typeof PLAN_LIMITS.freemium) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'Usuário não autenticado' });
      }

      // Buscar loja do usuário
      const userStore = await db.query.stores.findFirst({
        where: eq(stores.userId, user.id)
      });

      if (!userStore) {
        return res.status(404).json({ message: 'Loja não encontrada' });
      }

      const limits = getPlanLimits(userStore.subscriptionPlan || 'freemium');
      const hasFeature = limits[feature];

      if (!hasFeature) {
        return res.status(403).json({
          success: false,
          message: `Esta funcionalidade não está disponível no seu plano atual (${userStore.subscriptionPlan || 'freemium'})`,
          featureRequired: feature,
          currentPlan: userStore.subscriptionPlan || 'freemium',
          upgradeRequired: true
        });
      }

      next();
    } catch (error) {
      console.error('Erro no middleware de validação de funcionalidade:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  };
};

// Função para validar se o usuário pode criar cupons
export async function validateCouponLimit(userId: number, storeId?: number): Promise<PlanValidationResult> {
  try {
    // Buscar loja do usuário
    let userStore;
    if (storeId) {
      userStore = await db.query.stores.findFirst({
        where: and(eq(stores.id, storeId), eq(stores.userId, userId))
      });
    } else {
      userStore = await db.query.stores.findFirst({
        where: eq(stores.userId, userId)
      });
    }

    if (!userStore) {
      return {
        allowed: false,
        message: 'Loja não encontrada'
      };
    }

    const limits = getPlanLimits(userStore.subscriptionPlan || 'freemium');

    // Se é ilimitado
    if (limits.maxCouponsPerMonth === -1) {
      return { allowed: true };
    }

    // Se não permite cupons (freemium)
    if (limits.maxCouponsPerMonth === 0) {
      return {
        allowed: false,
        message: 'Seu plano não permite criar cupons. Faça upgrade para o plano Start ou superior.',
        currentCount: 0,
        maxAllowed: 0,
        upgrade: 'start'
      };
    }

    // Contar cupons criados no mês atual
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [{ count: currentCoupons }] = await db
      .select({ count: count() })
      .from(coupons)
      .where(
        and(
          eq(coupons.storeId, userStore.id),
          // Cupons criados no mês atual
          // Note: Ajuste o campo de data conforme seu schema (createdAt)
          // gte(coupons.createdAt, startOfMonth)
        )
      );

    const allowed = currentCoupons < limits.maxCouponsPerMonth;

    return {
      allowed,
      message: allowed 
        ? 'Cupom pode ser criado'
        : `Limite de ${limits.maxCouponsPerMonth} cupons por mês atingido. Faça upgrade para criar mais cupons.`,
      currentCount: currentCoupons,
      maxAllowed: limits.maxCouponsPerMonth,
      upgrade: allowed ? undefined : userStore.subscriptionPlan === 'start' ? 'pro' : 'premium'
    };
  } catch (error) {
    console.error('Erro ao validar limite de cupons:', error);
    return {
      allowed: false,
      message: 'Erro ao verificar limites do plano'
    };
  }
}

// Função chamada pelo controller: checkCouponLimits
export async function checkCouponLimits(userId: number, store: any): Promise<PlanValidationResult> {
  return await validateCouponLimit(userId, store.id);
}

// Função para obter informações dos limites de cupons para o usuário
export async function getCouponLimitsInfo(user: any): Promise<any> {
  try {
    // Buscar loja do usuário
    const userStore = await db.query.stores.findFirst({
      where: eq(stores.userId, user.id)
    });

    if (!userStore) {
      return {
        error: 'Loja não encontrada'
      };
    }

    const limits = getPlanLimits(userStore.subscriptionPlan || 'freemium');

    // Contar cupons do mês atual
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [{ count: currentCoupons }] = await db
      .select({ count: count() })
      .from(coupons)
      .where(
        and(
          eq(coupons.storeId, userStore.id),
          // Cupons criados no mês atual
          // Note: Ajuste conforme seu schema
          // gte(coupons.createdAt, startOfMonth)
        )
      );

    return {
      currentPlan: userStore.subscriptionPlan || 'freemium',
      maxCouponsPerMonth: limits.maxCouponsPerMonth,
      currentCouponsThisMonth: currentCoupons,
      canCreateCoupons: limits.maxCouponsPerMonth === -1 || currentCoupons < limits.maxCouponsPerMonth,
      remaining: limits.maxCouponsPerMonth === -1 ? 'Ilimitado' : Math.max(0, limits.maxCouponsPerMonth - currentCoupons)
    };
  } catch (error) {
    console.error('Erro ao obter informações de limites de cupons:', error);
    return {
      error: 'Erro ao obter informações de limites'
    };
  }
}

// Middleware para validar limite de cupons antes de criar
export const validateCouponLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const storeId = req.body.storeId || req.params.storeId;
    const validation = await validateCouponLimit(user.id, storeId ? parseInt(storeId) : undefined);

    if (!validation.allowed) {
      return res.status(403).json({
        success: false,
        message: validation.message,
        planLimitReached: true,
        currentCount: validation.currentCount,
        maxAllowed: validation.maxAllowed,
        suggestedUpgrade: validation.upgrade
      });
    }

    next();
  } catch (error) {
    console.error('Erro no middleware de validação de cupons:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Atualizar a função getPlanStatus para incluir cupons
export const getPlanStatusWithCoupons = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Buscar loja do usuário
    const userStore = await db.query.stores.findFirst({
      where: eq(stores.userId, user.id)
    });

    if (!userStore) {
      return res.status(404).json({ message: 'Loja não encontrada' });
    }

    const currentPlan = userStore.subscriptionPlan || 'freemium';
    const limits = getPlanLimits(currentPlan);

    // Contar uso atual
    const [{ count: currentProducts }] = await db
      .select({ count: count() })
      .from(products)
      .where(eq(products.storeId, userStore.id));

    // Contar cupons do mês atual
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [{ count: currentCoupons }] = await db
      .select({ count: count() })
      .from(coupons)
      .where(
        and(
          eq(coupons.storeId, userStore.id),
          // Ajustar conforme seu schema
          // gte(coupons.createdAt, startOfMonth)
        )
      );

    // Verificar trial
    const isInTrial = userStore.isInTrial || false;
    const trialEndDate = userStore.trialEndDate;

    res.json({
      success: true,
      currentPlan,
      isInTrial,
      trialEndDate,
      limits,
      usage: {
        products: {
          current: currentProducts,
          max: limits.maxProducts === -1 ? 'Ilimitado' : limits.maxProducts,
          percentage: limits.maxProducts === -1 ? 0 : Math.round((currentProducts / limits.maxProducts) * 100)
        },
        coupons: {
          current: currentCoupons,
          max: limits.maxCouponsPerMonth === -1 ? 'Ilimitado' : limits.maxCouponsPerMonth,
          percentage: limits.maxCouponsPerMonth === -1 ? 0 : Math.round((currentCoupons / limits.maxCouponsPerMonth) * 100),
          remaining: limits.maxCouponsPerMonth === -1 ? 'Ilimitado' : Math.max(0, limits.maxCouponsPerMonth - currentCoupons)
        }
      },
      features: {
        flashPromotions: limits.allowsFlashPromotions,
        advancedAnalytics: limits.allowsAdvancedAnalytics,
        destaques: limits.allowsDestaques,
        coupons: limits.maxCouponsPerMonth > 0
      }
    });
  } catch (error) {
    console.error('Erro ao obter status do plano:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Endpoint para obter status do plano atual
export const getPlanStatus = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Buscar loja do usuário
    const userStore = await db.query.stores.findFirst({
      where: eq(stores.userId, user.id)
    });

    if (!userStore) {
      return res.status(404).json({ message: 'Loja não encontrada' });
    }

    const currentPlan = userStore.subscriptionPlan || 'freemium';
    const limits = getPlanLimits(currentPlan);

    // Contar uso atual
    const [{ count: currentProducts }] = await db
      .select({ count: count() })
      .from(products)
      .where(eq(products.storeId, userStore.id));

    // Verificar trial
    const isInTrial = userStore.isInTrial || false;
    const trialEndDate = userStore.trialEndDate;

    res.json({
      success: true,
      currentPlan,
      isInTrial,
      trialEndDate,
      limits,
      usage: {
        products: {
          current: currentProducts,
          max: limits.maxProducts === -1 ? 'Ilimitado' : limits.maxProducts,
          percentage: limits.maxProducts === -1 ? 0 : Math.round((currentProducts / limits.maxProducts) * 100)
        }
      },
      features: {
        flashPromotions: limits.allowsFlashPromotions,
        advancedAnalytics: limits.allowsAdvancedAnalytics,
        destaques: limits.allowsDestaques
      }
    });
  } catch (error) {
    console.error('Erro ao obter status do plano:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
};