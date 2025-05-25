import { Request, Response } from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';
import { z } from 'zod';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY é obrigatória');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Configuração dos planos de assinatura
const SUBSCRIPTION_PLANS = {
  start: {
    name: 'Start',
    priceId: process.env.STRIPE_START_PRICE_ID || 'price_start_default',
    features: ['Até 50 produtos', 'Dashboard básico', 'Suporte via email'],
  },
  pro: {
    name: 'Pro', 
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_default',
    features: ['Até 500 produtos', 'Dashboard avançado', 'Analytics', 'Suporte prioritário'],
  },
  premium: {
    name: 'Premium',
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium_default', 
    features: ['Produtos ilimitados', 'Dashboard completo', 'Analytics avançado', 'Suporte 24/7'],
  },
};

// Schema para validação de criação de checkout
const createCheckoutSchema = z.object({
  plan: z.enum(['start', 'pro', 'premium']),
  storeId: z.number(),
});

/**
 * Criar sessão de checkout do Stripe
 */
export async function createCheckoutSession(req: Request, res: Response) {
  try {
    const user = req.user!;
    
    // Validar dados da requisição
    const validation = createCheckoutSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validation.error.errors
      });
    }

    const { plan, storeId } = validation.data;

    // Verificar se a loja pertence ao usuário
    const store = await storage.getStore(storeId);
    if (!store || store.userId !== user.id) {
      return res.status(403).json({ error: 'Loja não encontrada ou sem permissão' });
    }

    // Verificar se já tem uma assinatura ativa
    if (store.stripeSubscriptionId) {
      return res.status(400).json({ 
        error: 'Esta loja já possui uma assinatura ativa' 
      });
    }

    const selectedPlan = SUBSCRIPTION_PLANS[plan];
    if (!selectedPlan) {
      return res.status(400).json({ error: 'Plano inválido' });
    }

    // Criar ou obter cliente do Stripe
    let customerId = store.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id.toString(),
          storeId: storeId.toString(),
        },
      });
      customerId = customer.id;
      
      // Salvar customer ID no banco
      await storage.updateStoreStripeInfo(storeId, {
        stripeCustomerId: customerId,
      });
    }

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: selectedPlan.priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${req.headers.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/subscription/plans`,
      metadata: {
        userId: user.id.toString(),
        storeId: storeId.toString(),
        plan: plan,
      },
    });

    res.json({ 
      url: session.url,
      sessionId: session.id 
    });

  } catch (error) {
    console.error('Erro ao criar checkout session:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor' 
    });
  }
}

/**
 * Webhook do Stripe para fulfillment
 */
export async function stripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('STRIPE_WEBHOOK_SECRET não configurada');
    return res.status(400).send('Webhook secret não configurada');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error('Erro na verificação do webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Processar eventos do Stripe
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
        
      default:
        console.log(`Evento não tratado: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
}

/**
 * Criar portal de cobrança do cliente
 */
export async function createPortalSession(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { storeId } = req.body;

    // Verificar se a loja pertence ao usuário
    const store = await storage.getStore(storeId);
    if (!store || store.userId !== user.id) {
      return res.status(403).json({ error: 'Loja não encontrada ou sem permissão' });
    }

    if (!store.stripeCustomerId) {
      return res.status(400).json({ error: 'Nenhuma assinatura encontrada' });
    }

    // Criar sessão do portal
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: store.stripeCustomerId,
      return_url: `${req.headers.origin}/subscription/manage`,
    });

    res.json({ url: portalSession.url });
  } catch (error) {
    console.error('Erro ao criar portal session:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Funções auxiliares para processar webhooks

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { userId, storeId, plan } = session.metadata!;
  
  // Obter a assinatura
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  
  // Atualizar loja no banco de dados
  await storage.updateStoreStripeInfo(parseInt(storeId), {
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: subscription.id,
    subscriptionPlan: plan as 'start' | 'pro' | 'premium',
    subscriptionStatus: 'active',
    subscriptionStartDate: new Date(subscription.current_period_start * 1000),
    subscriptionEndDate: new Date(subscription.current_period_end * 1000),
  });

  console.log(`Assinatura ${plan} ativada para loja ${storeId}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;
  
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  const customerId = subscription.customer as string;
  
  // Encontrar loja pelo customer ID
  const store = await storage.getStoreByStripeCustomerId(customerId);
  if (!store) return;

  // Atualizar status e período da assinatura
  await storage.updateStoreStripeInfo(store.id, {
    subscriptionStatus: 'active',
    subscriptionEndDate: new Date(subscription.current_period_end * 1000),
  });

  console.log(`Pagamento bem-sucedido para loja ${store.id}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;
  
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  const customerId = subscription.customer as string;
  
  // Encontrar loja pelo customer ID
  const store = await storage.getStoreByStripeCustomerId(customerId);
  if (!store) return;

  // Atualizar status da assinatura
  await storage.updateStoreStripeInfo(store.id, {
    subscriptionStatus: 'past_due',
  });

  console.log(`Falha no pagamento para loja ${store.id}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  // Encontrar loja pelo customer ID
  const store = await storage.getStoreByStripeCustomerId(customerId);
  if (!store) return;

  // Atualizar informações da assinatura
  await storage.updateStoreStripeInfo(store.id, {
    subscriptionStatus: subscription.status as 'active' | 'canceled' | 'past_due' | 'unpaid',
    subscriptionEndDate: new Date(subscription.current_period_end * 1000),
  });

  console.log(`Assinatura atualizada para loja ${store.id}: ${subscription.status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  // Encontrar loja pelo customer ID
  const store = await storage.getStoreByStripeCustomerId(customerId);
  if (!store) return;

  // Reverter para plano freemium
  await storage.updateStoreStripeInfo(store.id, {
    subscriptionPlan: 'freemium',
    subscriptionStatus: 'canceled',
    stripeSubscriptionId: null,
  });

  console.log(`Assinatura cancelada para loja ${store.id}, revertendo para freemium`);
}

/**
 * Obter informações dos planos disponíveis
 */
export async function getPlans(req: Request, res: Response) {
  res.json({
    freemium: {
      name: 'Freemium',
      price: 0,
      features: ['Até 10 produtos', 'Dashboard básico'],
    },
    ...SUBSCRIPTION_PLANS,
  });
}