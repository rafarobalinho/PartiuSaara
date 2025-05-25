
import { Request, Response } from 'express';
import Stripe from 'stripe';
import * as db from '../db';
import safeLog from '../utils/safe-logger';

/**
 * Controller para processar webhooks do Stripe
 * 
 * Este controller é responsável por:
 * 1. Verificar a assinatura do webhook
 * 2. Processar eventos de pagamento
 * 3. Atualizar o status de assinaturas e usuários no banco de dados
 */
export async function handleWebhook(req: Request, res: Response) {
  const isTestMode = process.env.STRIPE_MODE === 'test';
  
  // Log seguro para depuração
  safeLog('🪝 Webhook recebido', {
    mode: isTestMode ? 'test' : 'live',
    timestamp: new Date().toISOString(),
    headers: {
      'stripe-signature': req.headers['stripe-signature'] ? '✓ presente' : '✗ ausente'
    }
  });

  // Inicialização do Stripe com a chave correta baseada no modo
  const stripeSecretKey = isTestMode 
    ? process.env.STRIPE_SECRET_KEY_TEST 
    : process.env.STRIPE_SECRET_KEY_LIVE;
  
  if (!stripeSecretKey) {
    safeLog('❌ Chave Stripe não configurada', { 
      mode: isTestMode ? 'test' : 'live', 
      key_env: isTestMode ? 'STRIPE_SECRET_KEY_TEST' : 'STRIPE_SECRET_KEY_LIVE' 
    });
    return res.status(500).json({ error: 'Configuração do Stripe incompleta' });
  }

  // Inicializar cliente Stripe
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
  });

  // Verificar assinatura do webhook
  let event: Stripe.Event;
  
  try {
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      safeLog('❌ Webhook sem assinatura', { mode: isTestMode ? 'test' : 'live' });
      return res.status(400).send('Webhook Error: No Stripe-Signature header');
    }
    
    // Recuperar a chave secreta do webhook baseada no modo
    const webhookSecret = isTestMode 
      ? process.env.STRIPE_WEBHOOK_SECRET_TEST 
      : process.env.STRIPE_WEBHOOK_SECRET_LIVE;
    
    if (!webhookSecret) {
      safeLog('❌ Chave secreta do webhook não configurada', { 
        mode: isTestMode ? 'test' : 'live', 
        key_env: isTestMode ? 'STRIPE_WEBHOOK_SECRET_TEST' : 'STRIPE_WEBHOOK_SECRET_LIVE' 
      });
      return res.status(500).json({ error: 'Configuração do webhook incompleta' });
    }
    
    safeLog('🔐 Verificando assinatura do webhook', { mode: isTestMode ? 'test' : 'live' });
    
    // Construir evento a partir da requisição
    event = stripe.webhooks.constructEvent(
      req.rawBody || req.body, // Importante: use req.rawBody se disponível (body-parser configurado para raw)
      sig,
      webhookSecret
    );
    
    safeLog('✅ Assinatura do webhook válida', { 
      event_type: event.type,
      event_id: event.id
    });
    
  } catch (err: any) {
    safeLog('❌ Erro na verificação da assinatura do webhook', { 
      error: err.message,
      mode: isTestMode ? 'test' : 'live'
    });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Processar o evento
  try {
    safeLog('⚙️ Processando evento', { 
      type: event.type,
      id: event.id,
      mode: isTestMode ? 'test' : 'live'
    });
    
    // Processar diferentes tipos de eventos
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }
        
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
        
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
        
      // Outros eventos que você deseja tratar
      default:
        safeLog('ℹ️ Evento não processado', { 
          type: event.type,
          id: event.id
        });
    }
    
    // Confirmar recebimento do webhook
    safeLog('✅ Evento processado com sucesso', { 
      type: event.type,
      id: event.id
    });
    return res.json({ received: true, event_id: event.id });
    
  } catch (err: any) {
    safeLog('❌ Erro ao processar evento', { 
      error: err.message,
      event_type: event.type,
      event_id: event.id
    });
    return res.status(500).json({ error: 'Erro ao processar evento', details: err.message });
  }
}

/**
 * Processa um evento de checkout.session.completed
 * Atualiza o plano do usuário com base na assinatura criada
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  safeLog('🛒 Processando checkout completado', {
    session_id: session.id,
    customer_id: session.customer as string,
    payment_status: session.payment_status
  });
  
  if (session.payment_status !== 'paid') {
    safeLog('⚠️ Checkout não pago, ignorando', { 
      session_id: session.id,
      payment_status: session.payment_status
    });
    return;
  }
  
  try {
    // Recuperar metadados da sessão
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;
    
    if (!userId || !planId) {
      safeLog('❌ Dados incompletos no checkout', { 
        session_id: session.id,
        has_user_id: !!userId,
        has_plan_id: !!planId
      });
      return;
    }
    
    // Atualizar o plano do usuário no banco de dados
    await db.update(db.users)
      .set({
        subscriptionPlanId: planId,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        subscriptionStatus: 'active',
        subscriptionUpdatedAt: new Date()
      })
      .where(db.eq(db.users.id, parseInt(userId)));
    
    safeLog('✅ Assinatura ativada com sucesso', {
      user_id: userId,
      plan_id: planId,
      subscription_id: session.subscription
    });
    
  } catch (err: any) {
    safeLog('❌ Erro ao processar checkout completado', {
      error: err.message,
      session_id: session.id
    });
    throw err;
  }
}

/**
 * Processa um evento de customer.subscription.updated
 * Atualiza o status da assinatura do usuário
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  safeLog('🔄 Processando atualização de assinatura', {
    subscription_id: subscription.id,
    customer_id: subscription.customer as string,
    status: subscription.status
  });
  
  try {
    // Buscar usuário pelo customer ID
    const users = await db.select()
      .from(db.users)
      .where(db.eq(db.users.stripeCustomerId, subscription.customer as string));
    
    if (users.length === 0) {
      safeLog('⚠️ Usuário não encontrado para customer_id', {
        customer_id: subscription.customer
      });
      return;
    }
    
    const user = users[0];
    
    // Atualizar status da assinatura
    await db.update(db.users)
      .set({
        subscriptionStatus: subscription.status,
        subscriptionUpdatedAt: new Date()
      })
      .where(db.eq(db.users.id, user.id));
    
    safeLog('✅ Status da assinatura atualizado', {
      user_id: user.id,
      subscription_id: subscription.id,
      new_status: subscription.status
    });
    
  } catch (err: any) {
    safeLog('❌ Erro ao atualizar assinatura', {
      error: err.message,
      subscription_id: subscription.id
    });
    throw err;
  }
}

/**
 * Processa um evento de customer.subscription.deleted
 * Atualiza o usuário para o plano gratuito
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  safeLog('🗑️ Processando cancelamento de assinatura', {
    subscription_id: subscription.id,
    customer_id: subscription.customer as string
  });
  
  try {
    // Buscar usuário pelo customer ID
    const users = await db.select()
      .from(db.users)
      .where(db.eq(db.users.stripeCustomerId, subscription.customer as string));
    
    if (users.length === 0) {
      safeLog('⚠️ Usuário não encontrado para customer_id', {
        customer_id: subscription.customer
      });
      return;
    }
    
    const user = users[0];
    
    // Atualizar para plano gratuito
    await db.update(db.users)
      .set({
        subscriptionPlanId: 'freemium', // Plano gratuito padrão
        subscriptionStatus: 'canceled',
        subscriptionUpdatedAt: new Date()
      })
      .where(db.eq(db.users.id, user.id));
    
    safeLog('✅ Assinatura cancelada, usuário voltou ao plano gratuito', {
      user_id: user.id,
      subscription_id: subscription.id
    });
    
  } catch (err: any) {
    safeLog('❌ Erro ao processar cancelamento de assinatura', {
      error: err.message,
      subscription_id: subscription.id
    });
    throw err;
  }
}

export default {
  handleWebhook
};
