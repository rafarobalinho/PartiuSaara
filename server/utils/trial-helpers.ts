// server/utils/trial-helpers.ts

export interface TrialInfo {
  isActive: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  benefits: string[];
  upgradeUrl: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface PlanLimits {
  products: number; // -1 = ilimitado
  coupons: number;
  promotions: number;
  storeImages: number;
  hasAnalytics: boolean;
  hasHighlights: boolean;
  hasPushNotifications: boolean;
  hasFlashPromotions: boolean;
}

/**
 * Calcular informações detalhadas do trial para display
 */
export function calculateTrialInfo(store: any): TrialInfo {
  const now = new Date();
  const isTrialActive = store.isInTrial && store.trialEndDate && new Date(store.trialEndDate) > now;

  let daysRemaining = 0;
  let hoursRemaining = 0;
  let urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

  if (isTrialActive && store.trialEndDate) {
    const timeRemaining = new Date(store.trialEndDate).getTime() - now.getTime();
    daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    hoursRemaining = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    // Definir nível de urgência
    if (daysRemaining <= 1) urgencyLevel = 'critical';
    else if (daysRemaining <= 3) urgencyLevel = 'high';
    else if (daysRemaining <= 7) urgencyLevel = 'medium';
    else urgencyLevel = 'low';
  }

  return {
    isActive: isTrialActive,
    daysRemaining,
    hoursRemaining,
    urgencyLevel,
    benefits: [
      'Produtos ilimitados',
      'Cupons ilimitados',
      'Promoções relâmpago',
      'Analytics completo',
      'Destaque premium na home',
      'Notificações push automáticas',
      'Badge "Testando Premium"',
      'Peso extra no algoritmo de destaques'
    ],
    upgradeUrl: `/seller/subscription?store=${store.id}&trial=true&utm_source=trial_reminder`
  };
}

/**
 * Verificar se loja pode acessar funcionalidade premium
 */
export function canAccessPremiumFeature(store: any, feature: string): boolean {
  // Durante trial ativo, acesso total às funcionalidades premium
  if (store.isInTrial && store.trialEndDate && new Date(store.trialEndDate) > new Date()) {
    return true;
  }

  // Verificar baseado no plano atual
  const premiumFeatures: { [key: string]: string[] } = {
    unlimited_products: ['start', 'pro', 'premium'],
    unlimited_coupons: ['pro', 'premium'],
    flash_promotions: ['pro', 'premium'],
    advanced_analytics: ['pro', 'premium'],
    home_highlights: ['premium'],
    category_highlights: ['pro', 'premium'],
    push_notifications: ['start', 'pro', 'premium'],
    priority_support: ['start', 'pro', 'premium'],
    custom_reports: ['premium'],
    api_access: ['premium']
  };

  const allowedPlans = premiumFeatures[feature] || [];
  return allowedPlans.includes(store.subscriptionPlan);
}

/**
 * Obter limites baseados no plano atual (considerando trial ativo)
 */
export function getPlanLimits(store: any): PlanLimits {
  // Durante trial ativo, sem limites (experiência premium completa)
  if (store.isInTrial && store.trialEndDate && new Date(store.trialEndDate) > new Date()) {
    return {
      products: -1, // Ilimitado
      coupons: -1,
      promotions: -1,
      storeImages: 20,
      hasAnalytics: true,
      hasHighlights: true,
      hasPushNotifications: true,
      hasFlashPromotions: true
    };
  }

  // Limites por plano normal
  const limits: { [key: string]: PlanLimits } = {
    freemium: { 
      products: 5, 
      coupons: 0, 
      promotions: 1, 
      storeImages: 1, 
      hasAnalytics: false, 
      hasHighlights: false, 
      hasPushNotifications: false,
      hasFlashPromotions: false
    },
    start: { 
      products: 10, 
      coupons: 5, 
      promotions: -1, 
      storeImages: 5, 
      hasAnalytics: true, 
      hasHighlights: false, 
      hasPushNotifications: true,
      hasFlashPromotions: false
    },
    pro: { 
      products: 50, 
      coupons: -1, 
      promotions: -1, 
      storeImages: 10, 
      hasAnalytics: true, 
      hasHighlights: true, 
      hasPushNotifications: true,
      hasFlashPromotions: true
    },
    premium: { 
      products: -1, 
      coupons: -1, 
      promotions: -1, 
      storeImages: 20, 
      hasAnalytics: true, 
      hasHighlights: true, 
      hasPushNotifications: true,
      hasFlashPromotions: true
    }
  };

  return limits[store.subscriptionPlan] || limits.freemium;
}

/**
 * Gerar mensagem de trial baseada no tempo restante
 */
export function getTrialMessage(trialInfo: TrialInfo): string {
  if (!trialInfo.isActive) {
    return 'Trial expirado. Faça upgrade para continuar com as funcionalidades premium.';
  }

  const { daysRemaining, hoursRemaining, urgencyLevel } = trialInfo;

  switch (urgencyLevel) {
    case 'critical':
      if (daysRemaining === 0) {
        return `⚠️ ÚLTIMO DIA! Seu trial expira em ${hoursRemaining}h. Upgrade agora!`;
      }
      return `🚨 CRÍTICO: Apenas ${daysRemaining} dia${daysRemaining > 1 ? 's' : ''} restante${daysRemaining > 1 ? 's' : ''}!`;

    case 'high':
      return `⚡ URGENTE: ${daysRemaining} dias restantes do seu trial Premium!`;

    case 'medium':
      return `⏰ ${daysRemaining} dias restantes do trial. Considere fazer upgrade!`;

    case 'low':
    default:
      return `✨ Você está no trial Premium! ${daysRemaining} dias restantes.`;
  }
}

/**
 * Calcular desconto baseado no tempo restante de trial (para incentivar conversão)
 */
export function getTrialConversionDiscount(trialInfo: TrialInfo): { hasDiscount: boolean; percentage: number; message: string } {
  if (!trialInfo.isActive) {
    return { hasDiscount: false, percentage: 0, message: '' };
  }

  const { daysRemaining, urgencyLevel } = trialInfo;

  switch (urgencyLevel) {
    case 'critical':
      return {
        hasDiscount: true,
        percentage: 30,
        message: '🔥 ÚLTIMA CHANCE: 30% OFF no primeiro mês!'
      };

    case 'high':
      return {
        hasDiscount: true,
        percentage: 20,
        message: '⚡ Oferta especial: 20% OFF no primeiro mês!'
      };

    case 'medium':
      return {
        hasDiscount: true,
        percentage: 15,
        message: '💫 Upgrade agora e ganhe 15% OFF!'
      };

    default:
      return { hasDiscount: false, percentage: 0, message: '' };
  }
}

/**
 * Obter próxima notificação de trial a ser enviada
 */
export function getNextTrialNotification(store: any): string | null {
  if (!store.isInTrial || !store.trialEndDate) return null;

  const now = new Date();
  const endDate = new Date(store.trialEndDate);
  const daysUntilEnd = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  const notifications = store.trialNotificationsSent || {};

  if (daysUntilEnd <= 8 && daysUntilEnd > 6 && !notifications.day7) {
    return 'day7';
  }
  if (daysUntilEnd <= 4 && daysUntilEnd > 2 && !notifications.day12) {
    return 'day12';
  }
  if (daysUntilEnd <= 2 && daysUntilEnd > 1 && !notifications.day14) {
    return 'day14';
  }
  if (daysUntilEnd <= 1 && daysUntilEnd > 0 && !notifications.day15) {
    return 'day15';
  }

  return null;
}

/**
 * Verificar se trial deve ser exibido com destaque visual
 */
export function shouldShowTrialHighlight(trialInfo: TrialInfo): boolean {
  return trialInfo.isActive && (trialInfo.urgencyLevel === 'high' || trialInfo.urgencyLevel === 'critical');
}

/**
 * Gerar dados para widget de trial no dashboard
 */
export function getTrialWidgetData(store: any) {
  const trialInfo = calculateTrialInfo(store);
  const limits = getPlanLimits(store);
  const discount = getTrialConversionDiscount(trialInfo);

  return {
    trial: trialInfo,
    limits,
    discount,
    message: getTrialMessage(trialInfo),
    showHighlight: shouldShowTrialHighlight(trialInfo),
    nextNotification: getNextTrialNotification(store)
  };
}