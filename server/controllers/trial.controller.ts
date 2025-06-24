// server/controllers/trial.controller.ts
import { Request, Response } from 'express';
import { db } from '../db';
import { stores, users } from '../../shared/schema';
import { eq, and, lte, sql } from 'drizzle-orm';

/**
 * Ativar trial premium automaticamente no cadastro de loja
 */
export const activateTrial = async (storeId: number): Promise<void> => {
  try {
    const now = new Date();
    const trialEndDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 dias

    await db
      .update(stores)
      .set({
        isInTrial: true,
        trialStartDate: now.toISOString(),
        trialEndDate: trialEndDate.toISOString(),
        highlightWeight: 2, // Peso especial para trial
        subscriptionPlan: 'freemium', // Mantém freemium, mas com trial ativo
        trialNotificationsSent: {}
      })
      .where(eq(stores.id, storeId));

    console.log(`✅ Trial de 15 dias ativado para loja ${storeId}`);
  } catch (error) {
    console.error(`❌ Erro ao ativar trial para loja ${storeId}:`, error);
    throw error;
  }
};

/**
 * Verificar status do trial de uma loja
 */
export const getTrialStatus = async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { storeId } = req.params;

    const store = await db.query.stores.findFirst({
      where: and(
        eq(stores.id, parseInt(storeId)),
        eq(stores.userId, req.session.userId as number)
      ),
      columns: {
        id: true,
        name: true,
        isInTrial: true,
        trialStartDate: true,
        trialEndDate: true,
        subscriptionPlan: true,
        trialNotificationsSent: true
      }
    });

    if (!store) {
      return res.status(404).json({ error: 'Loja não encontrada' });
    }

    const now = new Date();
    const isTrialActive = store.isInTrial && store.trialEndDate && new Date(store.trialEndDate) > now;

    let daysRemaining = 0;
    let hoursRemaining = 0;

    if (isTrialActive && store.trialEndDate) {
      const timeRemaining = new Date(store.trialEndDate).getTime() - now.getTime();
      daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
      hoursRemaining = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    }

    res.json({
      success: true,
      data: {
        store: {
          id: store.id,
          name: store.name,
          plan: store.subscriptionPlan
        },
        trial: {
          isActive: isTrialActive,
          startDate: store.trialStartDate,
          endDate: store.trialEndDate,
          daysRemaining,
          hoursRemaining,
          notificationsSent: store.trialNotificationsSent || {}
        },
        benefits: {
          productsLimit: -1, // Ilimitado durante trial
          couponsLimit: -1,
          flashPromotions: true,
          analytics: true,
          highlights: true,
          pushNotifications: true
        }
      }
    });

  } catch (error) {
    console.error('Erro ao verificar status do trial:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

/**
 * Processar notificações de fim de trial
 */
export const processTrialNotifications = async (): Promise<void> => {
  try {
    const now = new Date();

    // Buscar lojas em trial que precisam de notificações
    const trialsToNotify = await db
      .select({
        id: stores.id,
        name: stores.name,
        userId: stores.userId,
        trialEndDate: stores.trialEndDate,
        trialNotificationsSent: stores.trialNotificationsSent,
        userEmail: users.email,
        userFirstName: users.firstName
      })
      .from(stores)
      .innerJoin(users, eq(stores.userId, users.id))
      .where(
        and(
          eq(stores.isInTrial, true),
          sql`trial_end_date > NOW()` // Trial ainda ativo
        )
      );

    for (const trial of trialsToNotify) {
      if (!trial.trialEndDate) continue;

      const endDate = new Date(trial.trialEndDate);
      const timeUntilEnd = endDate.getTime() - now.getTime();
      const daysUntilEnd = timeUntilEnd / (1000 * 60 * 60 * 24);

      const notifications = trial.trialNotificationsSent || {};

      // Notificação 7 dias antes
      if (daysUntilEnd <= 8 && daysUntilEnd > 6 && !notifications.day7) {
        await sendTrialNotification(trial, 'day7');
        await updateNotificationStatus(trial.id, 'day7');
      }

      // Notificação 3 dias antes
      if (daysUntilEnd <= 4 && daysUntilEnd > 2 && !notifications.day12) {
        await sendTrialNotification(trial, 'day12');
        await updateNotificationStatus(trial.id, 'day12');
      }

      // Notificação 1 dia antes
      if (daysUntilEnd <= 2 && daysUntilEnd > 1 && !notifications.day14) {
        await sendTrialNotification(trial, 'day14');
        await updateNotificationStatus(trial.id, 'day14');
      }

      // Notificação final (último dia)
      if (daysUntilEnd <= 1 && daysUntilEnd > 0 && !notifications.day15) {
        await sendTrialNotification(trial, 'day15');
        await updateNotificationStatus(trial.id, 'day15');
      }
    }

    console.log(`✅ Processadas notificações de trial para ${trialsToNotify.length} lojas`);

  } catch (error) {
    console.error('❌ Erro ao processar notificações de trial:', error);
    throw error;
  }
};

/**
 * Enviar notificação de trial (integrar com sistema de email/push)
 */
async function sendTrialNotification(trial: any, stage: string): Promise<void> {
  const messages = {
    day7: {
      subject: `${trial.userFirstName}, 7 dias restantes do seu teste Premium!`,
      content: `Olá ${trial.userFirstName}! Seu teste Premium da loja "${trial.name}" termina em 7 dias. Aproveite todas as funcionalidades exclusivas antes que seja tarde!`
    },
    day12: {
      subject: `${trial.userFirstName}, últimos 3 dias do teste Premium!`,
      content: `Atenção ${trial.userFirstName}! Restam apenas 3 dias do seu teste Premium. Não perca a oportunidade de manter todos os benefícios!`
    },
    day14: {
      subject: `${trial.userFirstName}, amanhã seu teste Premium expira!`,
      content: `Último aviso, ${trial.userFirstName}! Seu teste Premium expira amanhã. Faça o upgrade agora e mantenha sua loja em destaque!`
    },
    day15: {
      subject: `${trial.userFirstName}, seu teste Premium expira hoje!`,
      content: `Hoje é o último dia do seu teste Premium! Faça o upgrade antes da meia-noite ou sua loja voltará ao plano Freemium.`
    }
  };

  const message = messages[stage as keyof typeof messages];

  // TODO: Integrar com sistema de email (SendGrid, SES, etc.)
  console.log(`📧 Enviando notificação ${stage} para ${trial.userEmail}:`, message.subject);

  // TODO: Integrar com push notifications
  // await sendPushNotification(trial.userId, message.content);
}

/**
 * Atualizar status de notificação enviada
 */
async function updateNotificationStatus(storeId: number, stage: string): Promise<void> {
  await db
    .update(stores)
    .set({
      trialNotificationsSent: sql`jsonb_set(COALESCE(trial_notifications_sent, '{}'), '{${stage}}', 'true')`
    })
    .where(eq(stores.id, storeId));
}

/**
 * Processar downgrade automático de trials expirados
 */
export const processExpiredTrials = async (): Promise<void> => {
  try {
    const now = new Date();

    // Buscar trials expirados
    const expiredTrials = await db
      .select({
        id: stores.id,
        name: stores.name,
        userId: stores.userId,
        trialEndDate: stores.trialEndDate
      })
      .from(stores)
      .where(
        and(
          eq(stores.isInTrial, true),
          lte(stores.trialEndDate, now.toISOString())
        )
      );

    for (const trial of expiredTrials) {
      // Fazer downgrade para freemium
      await db
        .update(stores)
        .set({
          isInTrial: false,
          highlightWeight: 1, // Peso normal do freemium
          subscriptionPlan: 'freemium'
        })
        .where(eq(stores.id, trial.id));

      console.log(`📉 Downgrade automático realizado para loja ${trial.id} (${trial.name})`);

      // TODO: Enviar email de downgrade com oferta especial
      // await sendDowngradeEmail(trial);
    }

    console.log(`✅ Processados ${expiredTrials.length} downgrades automáticos`);

  } catch (error) {
    console.error('❌ Erro ao processar trials expirados:', error);
    throw error;
  }
};

/**
 * Converter trial para plano pago
 */
export const convertTrialToPaid = async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { storeId } = req.params;
    const { planId, stripeSubscriptionId } = req.body;

    // Validar se a loja pertence ao usuário e está em trial
    const store = await db.query.stores.findFirst({
      where: and(
        eq(stores.id, parseInt(storeId)),
        eq(stores.userId, req.session.userId as number),
        eq(stores.isInTrial, true)
      )
    });

    if (!store) {
      return res.status(404).json({ 
        error: 'Loja não encontrada ou não está em trial' 
      });
    }

    // Mapear planId para subscription_plan
    const planMapping: { [key: number]: string } = {
      2: 'start',
      3: 'pro', 
      4: 'premium'
    };

    const subscriptionPlan = planMapping[planId];
    if (!subscriptionPlan) {
      return res.status(400).json({ error: 'Plano inválido' });
    }

    // Mapear plano para highlight_weight
    const weightMapping: { [key: string]: number } = {
      start: 3,
      pro: 4,
      premium: 5
    };

    // Atualizar loja para plano pago
    await db
      .update(stores)
      .set({
        isInTrial: false,
        subscriptionPlan: subscriptionPlan as any,
        subscriptionStatus: 'active',
        stripeSubscriptionId,
        subscriptionStartDate: new Date().toISOString(),
        highlightWeight: weightMapping[subscriptionPlan]
      })
      .where(eq(stores.id, parseInt(storeId)));

    res.json({
      success: true,
      message: 'Trial convertido para plano pago com sucesso',
      data: {
        storeId: parseInt(storeId),
        newPlan: subscriptionPlan,
        highlightWeight: weightMapping[subscriptionPlan]
      }
    });

  } catch (error) {
    console.error('Erro ao converter trial para pago:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

/**
 * Obter estatísticas de conversão de trials (admin)
 */
export const getTrialStatistics = async (req: Request, res: Response) => {
  try {
    // TODO: Adicionar verificação de admin

    const stats = await db
      .select({
        totalTrials: sql`COUNT(*)`.as('totalTrials'),
        activeTrials: sql`COUNT(*) FILTER (WHERE is_in_trial = true)`.as('activeTrials'),
        expiredTrials: sql`COUNT(*) FILTER (WHERE is_in_trial = false AND trial_end_date IS NOT NULL)`.as('expiredTrials'),
        convertedTrials: sql`COUNT(*) FILTER (WHERE subscription_plan != 'freemium' AND trial_end_date IS NOT NULL)`.as('convertedTrials')
      })
      .from(stores)
      .where(sql`trial_start_date IS NOT NULL`);

    const conversionRate = stats[0].expiredTrials > 0 
      ? (Number(stats[0].convertedTrials) / Number(stats[0].expiredTrials)) * 100 
      : 0;

    res.json({
      success: true,
      data: {
        ...stats[0],
        conversionRate: Math.round(conversionRate * 100) / 100
      }
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas de trial:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};