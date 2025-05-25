
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
  console.log('🚀 === STRIPE CHECKOUT DEBUG START ===');
  console.log('📋 Method:', req.method);
  console.log('📋 Headers:', JSON.stringify({
    host: req.headers.host,
    origin: req.headers.origin,
    referer: req.headers.referer
  }, null, 2));
  console.log('📋 Body:', JSON.stringify(req.body, null, 2));
  console.log('📋 Query:', JSON.stringify(req.query, null, 2));

  try {
    // CHECKPOINT 1: Verificar método
    console.log('🔍 CHECKPOINT 1: Verificando método HTTP');
    if (req.method !== 'POST') {
      console.log('❌ Método não permitido:', req.method);
      return res.status(405).json({ 
        error: 'Method not allowed',
        checkpoint: 'HTTP_METHOD' 
      });
    }
    console.log('✅ CHECKPOINT 1: Método POST válido');

    // CHECKPOINT 2: Verificar variáveis de ambiente
    console.log('🔍 CHECKPOINT 2: Verificando variáveis de ambiente');
    const isTestMode = process.env.STRIPE_MODE === 'test';
    console.log('🔧 Test Mode:', isTestMode);
    console.log('🔧 STRIPE_MODE env:', process.env.STRIPE_MODE);

    const stripeSecretKey = isTestMode 
      ? process.env.STRIPE_SECRET_KEY_TEST 
      : process.env.STRIPE_SECRET_KEY_LIVE;

    console.log('🔑 Using key type:', isTestMode ? 'TEST' : 'LIVE');
    console.log('🔑 Key exists:', !!stripeSecretKey);
    if (stripeSecretKey) {
      console.log('🔑 Key prefix:', stripeSecretKey.substring(0, 8) + '...');
    } else {
      console.log('🔑 Key prefix: MISSING');
    }

    if (!stripeSecretKey) {
      const missingKey = isTestMode ? 'STRIPE_SECRET_KEY_TEST' : 'STRIPE_SECRET_KEY_LIVE';
      console.error('❌ CHECKPOINT 2: Chave ausente:', missingKey);
      return res.status(500).json({ 
        error: `Missing ${missingKey}`,
        mode: isTestMode ? 'test' : 'live',
        checkpoint: 'STRIPE_KEY_MISSING',
        environment: {
          STRIPE_MODE: process.env.STRIPE_MODE,
          NODE_ENV: process.env.NODE_ENV,
          hasTestKey: !!process.env.STRIPE_SECRET_KEY_TEST,
          hasLiveKey: !!process.env.STRIPE_SECRET_KEY_LIVE
        }
      });
    }
    console.log('✅ CHECKPOINT 2: Chave Stripe disponível');

    // CHECKPOINT 3: Inicializar Stripe
    console.log('🔍 CHECKPOINT 3: Inicializando Stripe');
    let localStripe;
    try {
      localStripe = new Stripe(stripeSecretKey, {
        apiVersion: '2023-10-16',
      });
      console.log('✅ CHECKPOINT 3: Stripe inicializado com sucesso');
    } catch (stripeInitError) {
      console.error('❌ CHECKPOINT 3: Erro ao inicializar Stripe:', stripeInitError);
      return res.status(500).json({
        error: 'Failed to initialize Stripe',
        details: stripeInitError.message,
        checkpoint: 'STRIPE_INIT_ERROR'
      });
    }

    // CHECKPOINT 4: Validar dados da requisição
    console.log('🔍 CHECKPOINT 4: Validando dados da requisição');
    const { planId, interval = 'monthly' } = req.body;
    console.log('📦 Plan ID:', planId);
    console.log('📦 Interval:', interval);

    if (!planId) {
      console.log('❌ CHECKPOINT 4: Plan ID ausente');
      return res.status(400).json({ 
        error: 'Plan ID is required',
        checkpoint: 'VALIDATION_ERROR'
      });
    }
    console.log('✅ CHECKPOINT 4: Dados válidos');

    // CHECKPOINT 5: Verificar autenticação
    console.log('🔍 CHECKPOINT 5: Verificando autenticação');
    if (!req.session.userId) {
      console.log('❌ CHECKPOINT 5: Usuário não autenticado');
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        mode: isTestMode ? 'test' : 'live',
        checkpoint: 'AUTH_ERROR'
      });
    }
    console.log('✅ CHECKPOINT 5: Usuário autenticado, ID:', req.session.userId);

    // CHECKPOINT 6: Mapear Price IDs
    console.log('🔍 CHECKPOINT 6: Mapeando Price IDs');
    
    // Plano freemium não tem pagamento
    if (planId === 'freemium') {
      console.log('✅ CHECKPOINT 6: Plano freemium selecionado - sem pagamento necessário');
      return res.status(200).json({ 
        success: true, 
        message: 'Plano Freemium ativado',
        redirect: false,
        mode: isTestMode ? 'test' : 'live',
        checkpoint: 'FREEMIUM_SUCCESS'
      });
    }

    // Obter o Price ID com base no plano e intervalo
    const priceId = priceMapping[planId]?.[interval];
    console.log('💰 Price ID mapeado:', priceId);
    
    if (!priceId) {
      console.log('❌ CHECKPOINT 6: Price ID inválido para plano:', planId);
      console.log('❌ PriceMapping disponível:', JSON.stringify(priceMapping));
      return res.status(400).json({ 
        error: 'Invalid plan or price ID not found',
        planId,
        interval,
        mode: isTestMode ? 'test' : 'live',
        checkpoint: 'PRICE_MAPPING_ERROR',
        plansDisponiveis: Object.keys(priceMapping)
      });
    }
    console.log('✅ CHECKPOINT 6: Price ID mapeado com sucesso:', priceId);

    // CHECKPOINT 7: Buscar dados do usuário
    console.log('🔍 CHECKPOINT 7: Buscando dados do usuário');
    let user;
    try {
      user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, req.session.userId as number)
      });
      console.log('✅ CHECKPOINT 7: Usuário encontrado:', user ? `ID: ${user.id}, Email: ${user.email}` : 'Não encontrado');
    } catch (dbError) {
      console.error('❌ CHECKPOINT 7: Erro ao buscar usuário:', dbError);
      return res.status(500).json({
        error: 'Erro ao buscar dados do usuário',
        details: dbError.message,
        mode: isTestMode ? 'test' : 'live',
        checkpoint: 'DB_ERROR'
      });
    }

    if (!user) {
      console.log('❌ CHECKPOINT 7: Usuário não encontrado no banco');
      return res.status(404).json({ 
        error: 'Usuário não encontrado',
        mode: isTestMode ? 'test' : 'live',
        checkpoint: 'USER_NOT_FOUND'
      });
    }

    // CHECKPOINT 8: Criar ou recuperar o Customer no Stripe
    console.log('🔍 CHECKPOINT 8: Gerenciando Customer Stripe');
    let customerId = user.stripeCustomerId;
    console.log('🔍 Customer ID existente:', customerId || 'Nenhum');

    if (!customerId) {
      try {
        console.log('🔄 Criando novo customer no Stripe...');
        const customer = await localStripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          metadata: {
            userId: user.id.toString()
          }
        });

        customerId = customer.id;
        console.log('✅ Novo customer criado:', customerId);

        // Atualizar o usuário com o customerId do Stripe
        await db.update(db.users).set({
          stripeCustomerId: customerId
        }).where(db.eq(db.users.id, user.id));
        console.log('✅ Usuário atualizado com o Customer ID');
      } catch (customerError) {
        console.error('❌ CHECKPOINT 8: Erro ao criar customer:', customerError);
        return res.status(500).json({
          error: 'Erro ao criar cliente no Stripe',
          details: customerError.message,
          mode: isTestMode ? 'test' : 'live',
          checkpoint: 'CUSTOMER_CREATION_ERROR'
        });
      }
    }
    console.log('✅ CHECKPOINT 8: Customer ID disponível:', customerId);

    // CHECKPOINT 9: Configurar URLs para redirecionamento
    console.log('🔍 CHECKPOINT 9: Configurando URLs');
    // URL base para redirecionamentos
    const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || req.headers.origin;
    console.log('🔗 URL base para redirecionamentos:', baseUrl);
    
    const successUrl = `${baseUrl}/seller/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/seller/subscription?canceled=true`;
    
    console.log('🔗 Success URL:', successUrl);
    console.log('🔗 Cancel URL:', cancelUrl);
    console.log('✅ CHECKPOINT 9: URLs configuradas');

    // CHECKPOINT 10: Criar a sessão de checkout
    console.log('🔍 CHECKPOINT 10: Criando sessão de checkout');
    console.log('📊 Session params:', {
      customer: customerId,
      price: priceId,
      quantity: 1,
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl
    });
    
    let session;
    try {
      session = await localStripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: user.id.toString(),
          planId: planId.toString(),
          interval: interval,
          mode: isTestMode ? 'test' : 'live'
        }
      });
      console.log('✅ CHECKPOINT 10: Sessão criada com sucesso:', session.id);
    } catch (sessionError) {
      console.error('❌ CHECKPOINT 10: Erro ao criar sessão:', sessionError);
      console.error('Session error type:', sessionError.type);
      console.error('Session error code:', sessionError.code);
      console.error('Session error message:', sessionError.message);
      
      return res.status(500).json({
        error: 'Failed to create Stripe session',
        details: sessionError.message,
        type: sessionError.type,
        code: sessionError.code,
        mode: isTestMode ? 'test' : 'live',
        checkpoint: 'STRIPE_SESSION_ERROR'
      });
    }

    // CHECKPOINT 11: Retornar resposta
    console.log('🔍 CHECKPOINT 11: Preparando resposta');
    const response = {
      success: true,
      url: session.url,
      sessionId: session.id,
      mode: isTestMode ? 'test' : 'live'
    };
    console.log('📤 Response:', JSON.stringify(response, null, 2));
    console.log('✅ CHECKPOINT 11: Resposta preparada');

    console.log('🎉 === STRIPE CHECKOUT DEBUG SUCCESS ===');
    return res.status(200).json(response);

  } catch (globalError) {
    console.error('💥 === STRIPE CHECKOUT GLOBAL ERROR ===');
    console.error('Global error message:', globalError.message);
    console.error('Global error name:', globalError.name);
    console.error('Global error stack:', globalError.stack);
    
    return res.status(500).json({
      error: 'Internal server error',
      details: globalError.message,
      name: globalError.name,
      mode: isTestMode ? 'test' : 'live',
      checkpoint: 'GLOBAL_ERROR'
    });
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
