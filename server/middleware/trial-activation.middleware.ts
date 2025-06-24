// server/middleware/trial-activation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { activateTrial } from '../controllers/trial.controller';

/**
 * Middleware para ativar trial automaticamente após criação de loja
 */
export const autoActivateTrialMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Se uma loja foi criada com sucesso, ativar trial
    if (res.locals.createdStoreId) {
      await activateTrial(res.locals.createdStoreId);

      // Adicionar informação do trial na resposta
      if (res.locals.storeData) {
        res.locals.storeData.trial = {
          activated: true,
          duration: '15 dias',
          benefits: [
            'Produtos ilimitados',
            'Cupons ilimitados', 
            'Promoções relâmpago',
            'Analytics completo',
            'Destaque premium',
            'Notificações push'
          ]
        };
      }
    }

    next();
  } catch (error) {
    console.error('Erro ao ativar trial automático:', error);
    // Não falhar o cadastro se trial falhar
    next();
  }
};

// Atualização no controller de stores existente
// server/controllers/store.controller.ts - MODIFICAÇÃO

// ANTES (código existente):
export const createStore = async (req: Request, res: Response) => {
  try {
    // ... código de criação da loja ...

    const newStore = await db.insert(stores).values(storeData).returning();

    res.status(201).json({
      success: true,
      data: newStore[0]
    });
  } catch (error) {
    // ... tratamento de erro ...
  }
};

// DEPOIS (código modificado):
export const createStore = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ... código de criação da loja existente ...

    const newStore = await db.insert(stores).values(storeData).returning();

    // Marcar para ativação de trial
    res.locals.createdStoreId = newStore[0].id;
    res.locals.storeData = newStore[0];

    // Continuar para middleware de trial
    next();

  } catch (error) {
    // ... tratamento de erro ...
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

// Middleware final para resposta
export const sendStoreResponse = (req: Request, res: Response) => {
  res.status(201).json({
    success: true,
    data: res.locals.storeData,
    message: res.locals.storeData?.trial?.activated 
      ? 'Loja criada com sucesso! Trial Premium de 15 dias ativado.' 
      : 'Loja criada com sucesso!'
  });
};

// Na rota de cadastro de loja:
// router.post('/stores', createStore, autoActivateTrialMiddleware, sendStoreResponse);

// server/utils/trial-helpers.ts
// Funções utilitárias para trial

export interface TrialInfo {
  isActive: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  benefits: string[];
  upgradeUrl: string;
}

/**
 * Calcular informações do trial para display
 */
export function calculateTrialInfo(store: any): TrialInfo {
  const now = new Date();
  const isTrialActive = store.isInTrial && store.trialEndDate && new Date(store.trialEndDate) > now;

  let daysRemaining = 0;
  let hoursRemaining = 0;

  if (isTrialActive && store.trialEndDate) {
    const timeRemaining = new Date(store.trialEndDate).getTime() - now.getTime();
    daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    hoursRemaining = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  }

  return {
    isActive: isTrialActive,
    daysRemaining,
    hoursRemaining,
    benefits: [
      'Produtos ilimitados',
      'Cupons ilimitados',
      'Promoções relâmpago',
      'Analytics completo',
      'Destaque premium na home',
      'Notificações push automáticas',
      'Badge "Testando Premium"'
    ],
    upgradeUrl: `/seller/subscription?store=${store.id}&trial=true`
  };
}

/**
 * Verificar se loja pode acessar funcionalidade premium
 */
export function canAccessPremiumFeature(store: any, feature: string): boolean {
  // Durante trial, acesso total
  if (store.isInTrial && store.trialEndDate && new Date(store.trialEndDate) > new Date()) {
    return true;
  }

  // Verificar baseado no plano
  const premiumFeatures = {
    unlimited_products: ['start', 'pro', 'premium'],
    unlimited_coupons: ['pro', 'premium'],
    flash_promotions: ['pro', 'premium'],
    advanced_analytics: ['pro', 'premium'],
    home_highlights: ['premium'],
    push_notifications: ['start', 'pro', 'premium']
  };

  const allowedPlans = premiumFeatures[feature as keyof typeof premiumFeatures] || [];
  return allowedPlans.includes(store.subscriptionPlan);
}

/**
 * Obter limites baseados no plano (considerando trial)
 */
export function getPlanLimits(store: any) {
  // Durante trial, sem limites
  if (store.isInTrial && store.trialEndDate && new Date(store.trialEndDate) > new Date()) {
    return {
      products: -1, // Ilimitado
      coupons: -1,
      promotions: -1,
      storeImages: 20,
      hasAnalytics: true,
      hasHighlights: true,
      hasPushNotifications: true
    };
  }

  // Limites por plano normal
  const limits = {
    freemium: { products: 5, coupons: 0, promotions: 1, storeImages: 1, hasAnalytics: false, hasHighlights: false, hasPushNotifications: false },
    start: { products: 10, coupons: 5, promotions: -1, storeImages: 5, hasAnalytics: true, hasHighlights: false, hasPushNotifications: true },
    pro: { products: 50, coupons: -1, promotions: -1, storeImages: 10, hasAnalytics: true, hasHighlights: true, hasPushNotifications: true },
    premium: { products: -1, coupons: -1, promotions: -1, storeImages: 20, hasAnalytics: true, hasHighlights: true, hasPushNotifications: true }
  };

  return limits[store.subscriptionPlan as keyof typeof limits] || limits.freemium;
}