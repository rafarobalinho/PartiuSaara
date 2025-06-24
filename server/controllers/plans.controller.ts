// server/controllers/plans.controller.ts
import { Request, Response } from 'express';
import { db } from '../db';
import { stores } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { PLAN_LIMITS, getPlanLimits } from '../middleware/plan-limits.middleware';

// Definição dos planos com preços
export const SUBSCRIPTION_PLANS = {
  freemium: {
    id: 'freemium',
    name: 'Freemium',
    description: 'Ideal para começar',
    price: 0,
    currency: 'BRL',
    interval: 'forever',
    features: [
      'Até 5 produtos',
      '1 promoção por mês',
      'Dashboard básico',
      'Suporte por email'
    ],
    limits: PLAN_LIMITS.freemium,
    popular: false,
    trialDays: 14
  },
  start: {
    id: 'start',
    name: 'Start',
    description: 'Para lojas em crescimento',
    price: 29.90,
    currency: 'BRL',
    interval: 'monthly',
    features: [
      'Até 15 produtos',
      '5 promoções por mês',
      '5 cupons por mês',
      'Promoções relâmpago',
      'Dashboard básico',
      'Suporte prioritário'
    ],
    limits: PLAN_LIMITS.start,
    popular: true,
    trialDays: 14,
    savings: {
      annually: 20 // 20% de desconto anual
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Para lojas estabelecidas',
    price: 59.90,
    currency: 'BRL',
    interval: 'monthly',
    features: [
      'Até 50 produtos',
      '20 promoções por mês',
      '20 cupons por mês',
      'Promoções relâmpago',
      'Analytics avançado',
      'Destaques na plataforma',
      'Suporte prioritário'
    ],
    limits: PLAN_LIMITS.pro,
    popular: false,
    trialDays: 14,
    savings: {
      annually: 25 // 25% de desconto anual
    }
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'Para grandes operações',
    price: 99.90,
    currency: 'BRL',
    interval: 'monthly',
    features: [
      'Produtos ilimitados',
      'Promoções ilimitadas',
      'Cupons ilimitados',
      'Promoções relâmpago',
      'Analytics completo',
      'Máximo destaque',
      'Suporte 24/7',
      'Consultoria mensal'
    ],
    limits: PLAN_LIMITS.premium,
    popular: false,
    trialDays: 14,
    savings: {
      annually: 30 // 30% de desconto anual
    }
  }
};

// Obter todos os planos disponíveis
export const getAvailablePlans = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    let currentPlan = 'freemium';

    // Se usuário logado, buscar seu plano atual
    if (user) {
      const userStore = await db.query.stores.findFirst({
        where: eq(stores.userId, user.id)
      });
      currentPlan = userStore?.subscriptionPlan || 'freemium';
    }

    // Calcular preços anuais com desconto
    const plansWithPricing = Object.values(SUBSCRIPTION_PLANS).map(plan => {
      const monthlyPrice = plan.price;
      const yearlyDiscount = plan.savings?.annually || 0;
      const yearlyPrice = monthlyPrice > 0 
        ? Math.round(monthlyPrice * 12 * (1 - yearlyDiscount / 100)) 
        : 0;
      const monthlySavings = monthlyPrice > 0 
        ? Math.round((monthlyPrice * 12 - yearlyPrice) / 12) 
        : 0;

      return {
        ...plan,
        isCurrent: plan.id === currentPlan,
        pricing: {
          monthly: {
            price: monthlyPrice,
            total: monthlyPrice,
            interval: 'mês'
          },
          yearly: {
            price: Math.round(yearlyPrice / 12),
            total: yearlyPrice,
            interval: 'ano',
            savings: monthlySavings,
            savingsPercentage: yearlyDiscount
          }
        }
      };
    });

    res.json({
      success: true,
      plans: plansWithPricing,
      currentPlan,
      currency: 'BRL'
    });
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar planos disponíveis' 
    });
  }
};

// Iniciar trial de um plano
export const startTrial = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const { planId } = req.body;

    // Validar se o plano existe
    if (!SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS]) {
      return res.status(400).json({
        success: false,
        message: 'Plano inválido'
      });
    }

    // Buscar loja do usuário
    const userStore = await db.query.stores.findFirst({
      where: eq(stores.userId, user.id)
    });

    if (!userStore) {
      return res.status(404).json({
        success: false,
        message: 'Loja não encontrada'
      });
    }

    // Verificar se já está em trial ou já teve trial
    if (userStore.isInTrial) {
      return res.status(400).json({
        success: false,
        message: 'Já existe um trial ativo'
      });
    }

    if (userStore.trialEndDate && new Date(userStore.trialEndDate) > new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Trial já foi utilizado anteriormente'
      });
    }

    // Iniciar trial
    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14); // 14 dias de trial

    await db.update(stores)
      .set({
        subscriptionPlan: planId,
        isInTrial: true,
        trialStartDate: trialStartDate.toISOString(),
        trialEndDate: trialEndDate.toISOString(),
        trialNotificationsSent: 0
      })
      .where(eq(stores.id, userStore.id));

    console.log(`[TRIAL] Usuário ${user.id} iniciou trial do plano ${planId} até ${trialEndDate.toLocaleDateString()}`);

    res.json({
      success: true,
      message: 'Trial iniciado com sucesso!',
      trial: {
        planId,
        startDate: trialStartDate.toISOString(),
        endDate: trialEndDate.toISOString(),
        daysRemaining: 14
      }
    });
  } catch (error) {
    console.error('Erro ao iniciar trial:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao iniciar trial'
    });
  }
};

// Obter informações de comparação entre planos
export const getPlansComparison = async (req: Request, res: Response) => {
  try {
    const comparison = {
      features: [
        {
          category: 'Produtos',
          items: [
            {
              name: 'Número de produtos',
              freemium: '5 produtos',
              start: '15 produtos',
              pro: '50 produtos',
              premium: 'Ilimitado'
            },
            {
              name: 'Upload de imagens',
              freemium: '1 por produto',
              start: '3 por produto',
              pro: '5 por produto',
              premium: 'Ilimitado'
            }
          ]
        },
        {
          category: 'Promoções',
          items: [
            {
              name: 'Promoções por mês',
              freemium: '1',
              start: '5',
              pro: '20',
              premium: 'Ilimitado'
            },
            {
              name: 'Cupons por mês',
              freemium: '0',
              start: '5',
              pro: '20',
              premium: 'Ilimitado'
            },
            {
              name: 'Promoções relâmpago',
              freemium: '❌',
              start: '✅',
              pro: '✅',
              premium: '✅'
            }
          ]
        },
        {
          category: 'Analytics',
          items: [
            {
              name: 'Dashboard básico',
              freemium: '✅',
              start: '✅',
              pro: '✅',
              premium: '✅'
            },
            {
              name: 'Analytics avançado',
              freemium: '❌',
              start: '❌',
              pro: '✅',
              premium: '✅'
            },
            {
              name: 'Relatórios exportáveis',
              freemium: '❌',
              start: '❌',
              pro: '✅',
              premium: '✅'
            }
          ]
        },
        {
          category: 'Visibilidade',
          items: [
            {
              name: 'Listagem normal',
              freemium: '✅',
              start: '✅',
              pro: '✅',
              premium: '✅'
            },
            {
              name: 'Destaques',
              freemium: '❌',
              start: 'Básico',
              pro: 'Avançado',
              premium: 'Máximo'
            },
            {
              name: 'Peso nos destaques',
              freemium: '1x',
              start: '2x',
              pro: '4x',
              premium: '5x'
            }
          ]
        },
        {
          category: 'Suporte',
          items: [
            {
              name: 'Suporte por email',
              freemium: '✅',
              start: '✅',
              pro: '✅',
              premium: '✅'
            },
            {
              name: 'Suporte prioritário',
              freemium: '❌',
              start: '✅',
              pro: '✅',
              premium: '✅'
            },
            {
              name: 'Consultoria mensal',
              freemium: '❌',
              start: '❌',
              pro: '❌',
              premium: '✅'
            }
          ]
        }
      ]
    };

    res.json({
      success: true,
      comparison
    });
  } catch (error) {
    console.error('Erro ao buscar comparação de planos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar comparação de planos'
    });
  }
};

// Verificar status do trial
export const getTrialStatus = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const userStore = await db.query.stores.findFirst({
      where: eq(stores.userId, user.id)
    });

    if (!userStore) {
      return res.status(404).json({
        success: false,
        message: 'Loja não encontrada'
      });
    }

    const now = new Date();
    const isInTrial = userStore.isInTrial || false;
    const trialEndDate = userStore.trialEndDate ? new Date(userStore.trialEndDate) : null;
    const trialExpired = trialEndDate ? now > trialEndDate : false;

    // Calcular dias restantes
    let daysRemaining = 0;
    if (trialEndDate && !trialExpired) {
      daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Se trial expirou, atualizar status
    if (isInTrial && trialExpired) {
      await db.update(stores)
        .set({
          isInTrial: false,
          subscriptionPlan: 'freemium'
        })
        .where(eq(stores.id, userStore.id));
    }

    res.json({
      success: true,
      trial: {
        isActive: isInTrial && !trialExpired,
        isExpired: trialExpired,
        hasUsedTrial: !!trialEndDate,
        endDate: trialEndDate?.toISOString(),
        daysRemaining: Math.max(0, daysRemaining),
        currentPlan: trialExpired ? 'freemium' : (userStore.subscriptionPlan || 'freemium')
      }
    });
  } catch (error) {
    console.error('Erro ao verificar status do trial:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar status do trial'
    });
  }
};