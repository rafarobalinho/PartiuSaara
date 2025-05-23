import { Request, Response } from 'express';
import { db } from '../db';
import Stripe from 'stripe';

// Lógica de alternância entre teste e produção
const isTestMode = process.env.STRIPE_MODE === 'test';

// Log para depuração
console.log("Stripe Controller: Inicializando...");
console.log("STRIPE_MODE configurado:", process.env.STRIPE_MODE || "(não definido)");
console.log("Modo atual:", isTestMode ? "TESTE" : "PRODUÇÃO");

// Seleciona a chave correta com base no modo
const stripeSecretKey = isTestMode 
  ? process.env.STRIPE_SECRET_KEY_TEST 
  : process.env.STRIPE_SECRET_KEY_LIVE;

console.log("Chave Stripe configurada:", stripeSecretKey ? "Sim" : "Não");
console.log("FRONTEND_URL configurado:", process.env.FRONTEND_URL || process.env.CLIENT_URL || "(não definido)");

if (!stripeSecretKey) {
  console.error(`ALERTA: Chave Stripe ${isTestMode ? 'TEST' : 'LIVE'} não está definida no ambiente!`);
}

// Inicialize o cliente Stripe com a chave apropriada
let stripe: Stripe | null = null;

try {
  if (!stripeSecretKey || stripeSecretKey.trim() === '') {
    throw new Error('Chave do Stripe não configurada');
  }

  stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
  });

  console.log("Stripe inicializado com sucesso no modo", isTestMode ? "TESTE" : "PRODUÇÃO");
} catch (error) {
  console.error("Erro ao inicializar o Stripe:", error);
  // Não lance o erro aqui, para que o servidor possa iniciar mesmo com erro no Stripe
}

// Mapeamento de planos para Price IDs com base no ambiente
const priceMapping = {
  freemium: null,
  start: {
    monthly: isTestMode ? 'price_TEST_START_MONTHLY' : 'price_LIVE_START_MONTHLY',
    yearly: isTestMode ? 'price_TEST_START_YEARLY' : 'price_LIVE_START_YEARLY'
  },
  pro: {
    monthly: isTestMode ? 'price_TEST_PRO_MONTHLY' : 'price_LIVE_PRO_MONTHLY',
    yearly: isTestMode ? 'price_TEST_PRO_YEARLY' : 'price_LIVE_PRO_YEARLY'
  },
  premium: {
    monthly: isTestMode ? 'price_TEST_PREMIUM_MONTHLY' : 'price_LIVE_PREMIUM_MONTHLY',
    yearly: isTestMode ? 'price_TEST_PREMIUM_YEARLY' : 'price_LIVE_PREMIUM_YEARLY'
  }
};

export const createCheckoutSession = async (req: Request, res: Response) => {
  const startTime = Date.now();
  let userId = null;

  try {
    console.log('🚀 === STRIPE CHECKOUT DEBUG START ===');
    console.log('📋 Method:', req.method);
    console.log('📋 Headers:', {
      "host": req.headers.host,
      "origin": req.headers.origin,
      "referer": req.headers.referer
    });
    console.log('📋 Body:', req.body);
    console.log('📋 Query:', req.query);

    // CHECKPOINT 1: Verificar método HTTP
    console.log('🔍 CHECKPOINT 1: Verificando método HTTP');
    if (req.method !== 'POST') {
      console.log('❌ CHECKPOINT 1: Método inválido:', req.method);
      return res.status(405).json({ error: 'Method not allowed' });
    }
    console.log('✅ CHECKPOINT 1: Método POST válido');

    // CHECKPOINT 2: Verificar autenticação
    console.log('🔍 CHECKPOINT 2: Verificando variáveis de ambiente');
    const isTestMode = process.env.STRIPE_MODE === 'test';
    console.log('🔧 Test Mode:', isTestMode);
    console.log('🔧 STRIPE_MODE env:', process.env.STRIPE_MODE);

    if (!req.session.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    userId = req.session.userId;

    // Validar body da requisição
    const { planId, interval } = req.body;
    if (!planId) {
      return res.status(400).json({ error: 'ID do plano é obrigatório' });
    }

    // Configurar Stripe
    const secretKey = isTestMode 
      ? process.env.STRIPE_SECRET_KEY_TEST 
      : process.env.STRIPE_SECRET_KEY_LIVE;

    console.log('🔑 Using key type:', isTestMode ? 'TEST' : 'LIVE');
    console.log('🔑 Key exists:', !!secretKey);
    console.log('🔑 Key prefix:', secretKey ? secretKey.substring(0, 7) : 'MISSING');

    if (!secretKey) {
      const errorMessage = isTestMode 
        ? 'Missing STRIPE_SECRET_KEY_TEST environment variable' 
        : 'Missing STRIPE_SECRET_KEY_LIVE environment variable';

      console.log('❌ CHECKPOINT 2: Chave ausente:', errorMessage);
      return res.status(500).json({ error: errorMessage });
    }

    const stripe = new Stripe(secretKey);

    // Buscar usuário
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId as number)
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Definir priceId baseado no plano e intervalo
    let priceId;

    if (interval === 'monthly') {
      if (planId === 'start') {
        priceId = isTestMode ? 'price_start_monthly_test' : 'price_start_monthly_live';
      } else if (planId === 'pro') {
        priceId = isTestMode ? 'price_pro_monthly_test' : 'price_pro_monthly_live';
      }
    } else if (interval === 'yearly') {
      if (planId === 'start') {
        priceId = isTestMode ? 'price_start_yearly_test' : 'price_start_yearly_live';
      } else if (planId === 'pro') {
        priceId = isTestMode ? 'price_pro_yearly_test' : 'price_pro_yearly_live';
      }
    }

    if (!priceId) {
      return res.status(400).json({ error: 'Plano ou intervalo inválido' });
    }

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/seller/subscription?success=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/seller/subscription`,
      customer: user.stripeCustomerId,
      metadata: {
        userId: user.id.toString(),
        planId: planId
      }
    });

    // Log de sucesso (com informações não sensíveis)
    const processingTime = Date.now() - startTime;
    console.log(`✅ Sessão Stripe criada com sucesso em ${processingTime}ms para o plano ${planId}`);

    res.json({ url: session.url });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Erro ao criar sessão de checkout:', error);
    console.log(`❌ Falha após ${processingTime}ms`);

    res.status(500).json({ error: 'Erro ao criar sessão de checkout' });
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  let event;

  try {
    const webhookSecret = isTestMode 
      ? process.env.STRIPE_WEBHOOK_SECRET_TEST 
      : process.env.STRIPE_WEBHOOK_SECRET_LIVE;

    if (!stripe || !webhookSecret) {
      throw new Error('Configuração do Stripe incompleta');
    }

    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
  } catch (err: any) {
    console.error('Erro no webhook Stripe:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      // Atualizar o status da assinatura no banco de dados
      if (session.metadata?.userId && session.metadata?.planId) {
        const userId = parseInt(session.metadata.userId);
        const planId = parseInt(session.metadata.planId);

        // Atualizar usuário com detalhes da assinatura
        await db.update(db.users).set({
          subscriptionId: session.subscription as string,
          planId: planId,
          subscriptionStatus: 'active'
        }).where(db.eq(db.users.id, userId));
      }
      break;
    case 'customer.subscription.updated':
      const subscription = event.data.object as Stripe.Subscription;
      // Atualizar status da assinatura (renovada, alterada, etc)
      await db.update(db.users).set({
        subscriptionStatus: subscription.status
      }).where(db.eq(db.users.stripeCustomerId, subscription.customer as string));
      break;
    case 'customer.subscription.deleted':
      const canceledSubscription = event.data.object as Stripe.Subscription;
      // Cancelar assinatura do usuário
      await db.update(db.users).set({
        subscriptionStatus: 'canceled',
        planId: 1  // Volta para o plano gratuito
      }).where(db.eq(db.users.stripeCustomerId, canceledSubscription.customer as string));
      break;
    default:
      console.log(`Evento não tratado: ${event.type}`);
  }

  res.json({ 
    received: true,
    mode: isTestMode ? 'test' : 'live'
  });
};

export const getSubscriptionDetails = async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        mode: isTestMode ? 'test' : 'live'
      });
    }

    if (!stripe) {
      return res.status(500).json({ 
        error: 'Serviço de pagamento não disponível',
        mode: isTestMode ? 'test' : 'live'
      });
    }

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, req.session.userId as number)
    });

    if (!user || !user.subscriptionId) {
      return res.status(404).json({ 
        error: 'Assinatura não encontrada',
        mode: isTestMode ? 'test' : 'live'
      });
    }

    const subscription = await stripe.subscriptions.retrieve(user.subscriptionId);

    res.json({
      ...subscription,
      mode: isTestMode ? 'test' : 'live'
    });
  } catch (error) {
    console.error('Erro ao obter detalhes da assinatura:', error);
    res.status(500).json({ 
      error: 'Erro ao obter detalhes da assinatura',
      mode: isTestMode ? 'test' : 'live'
    });
  }
};

export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        mode: isTestMode ? 'test' : 'live'
      });
    }

    if (!stripe) {
      return res.status(500).json({ 
        error: 'Serviço de pagamento não disponível',
        mode: isTestMode ? 'test' : 'live'
      });
    }

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, req.session.userId as number)
    });

    if (!user || !user.subscriptionId) {
      return res.status(404).json({ 
        error: 'Assinatura não encontrada',
        mode: isTestMode ? 'test' : 'live'
      });
    }

    await stripe.subscriptions.cancel(user.subscriptionId);

    // Atualizar usuário no banco de dados
    await db.update(db.users).set({
      subscriptionStatus: 'canceled',
      planId: 1  // Volta para o plano gratuito
    }).where(db.eq(db.users.id, user.id));

    res.json({ 
      success: true, 
      message: 'Assinatura cancelada com sucesso',
      mode: isTestMode ? 'test' : 'live'
    });
  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error);
    res.status(500).json({ 
      error: 'Erro ao cancelar assinatura',
      mode: isTestMode ? 'test' : 'live'
    });
  }
};

// Verificar se o usuário pode usar promoções relâmpago com base no plano
export const checkFlashPromotionEligibility = async (req: Request, res: Response) => {
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

    // Planos: 1 = Freemium, 2 = Start, 3 = Pro, 4 = Premium
    // No plano Freemium e Start não pode criar promoções relâmpago
    const isEligible = user.planId >= 3 && user.subscriptionStatus === 'active';

    res.json({ 
      isEligible, 
      currentPlan: user.planId,
      planName: getPlanName(user.planId),
      message: isEligible 
        ? 'Você pode criar promoções relâmpago' 
        : 'Faça upgrade para o plano Pro ou Premium para criar promoções relâmpago'
    });
  } catch (error) {
    console.error('Erro ao verificar elegibilidade:', error);
    res.status(500).json({ error: 'Erro ao verificar elegibilidade para promoções relâmpago' });
  }
};

// Verificar se o usuário pode criar cupons com base no plano
export const checkCouponEligibility = async (req: Request, res: Response) => {
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

    // Planos: 1 = Freemium, 2 = Start, 3 = Pro, 4 = Premium
    // No plano Freemium não pode criar cupons
    const isEligible = user.planId >= 2 && user.subscriptionStatus === 'active';

    // Limite de cupons por plano
    let couponLimit = 0;
    if (user.planId === 2) couponLimit = 5; // Start: 5 cupons
    else if (user.planId >= 3) couponLimit = -1; // Pro e Premium: ilimitado

    res.json({ 
      isEligible, 
      currentPlan: user.planId,
      planName: getPlanName(user.planId),
      couponLimit,
      message: isEligible 
        ? couponLimit === -1 
          ? 'Você pode criar cupons ilimitados' 
          : `Você pode criar até ${couponLimit} cupons por mês`
        : 'Faça upgrade para o plano Start ou superior para criar cupons'
    });
  } catch (error) {
    console.error('Erro ao verificar elegibilidade:', error);
    res.status(500).json({ error: 'Erro ao verificar elegibilidade para criação de cupons' });
  }
};

// Função auxiliar para obter o nome do plano
function getPlanName(planId: number): string {
  switch (planId) {
    case 1: return 'Freemium';
    case 2: return 'Start';
    case 3: return 'Pro';
    case 4: return 'Premium';
    default: return 'Desconhecido';
  }
}

// Endpoint para verificar configuração atual do Stripe
export const getStripeConfig = async (req: Request, res: Response) => {
  try {
    res.json({
      mode: isTestMode ? 'test' : 'live',
      environment: process.env.STRIPE_MODE,
      hasTestKeys: !!(process.env.STRIPE_SECRET_KEY_TEST && process.env.STRIPE_PUBLIC_KEY_TEST),
      hasLiveKeys: !!(process.env.STRIPE_SECRET_KEY_LIVE && process.env.STRIPE_PUBLISHABLE_KEY_LIVE),
      appUrl: process.env.FRONTEND_URL || process.env.CLIENT_URL,
      nodeEnv: process.env.NODE_ENV
    });
  } catch (error) {
    console.error('Erro ao obter configuração do Stripe:', error);
    res.status(500).json({ 
      error: 'Erro ao obter configuração do Stripe',
      mode: isTestMode ? 'test' : 'live'
    });
  }
};

// Endpoint para testar conectividade do Stripe
export const testStripeConnection = async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(500).json({ 
        success: false,
        error: 'Cliente Stripe não inicializado',
        mode: isTestMode ? 'test' : 'live'
      });
    }

    const products = await stripe.products.list({ limit: 5 });
    const prices = await stripe.prices.list({ limit: 10 });

    return res.status(200).json({
      success: true,
      message: `Stripe conectado com sucesso em modo ${isTestMode ? 'TEST' : 'LIVE'}!`,
      mode: isTestMode ? 'test' : 'live',
      environment: process.env.STRIPE_MODE,
      products: products.data.map(p => ({
        id: p.id,
        name: p.name,
        active: p.active
      })),
      prices: prices.data.map(p => ({
        id: p.id,
        product: p.product,
        unit_amount: p.unit_amount,
        currency: p.currency,
        recurring: p.recurring
      }))
    });
  } catch (error) {
    console.error('Erro ao testar conexão com Stripe:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      type: error.type,
      mode: isTestMode ? 'test' : 'live'
    });
  }
};