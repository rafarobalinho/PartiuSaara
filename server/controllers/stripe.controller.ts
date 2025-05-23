
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
  console.log('🚀 STRIPE CHECKOUT INICIADO');
  console.log('📋 Method:', req.method);
  console.log('📋 Body:', req.body);

  try {
    // Verificar se o Stripe foi inicializado corretamente
    if (!stripe) {
      console.error("❌ Checkout falhou: Cliente Stripe não inicializado");
      console.error("❌ STRIPE_MODE:", process.env.STRIPE_MODE);
      console.error("❌ Secret key configurada:", stripeSecretKey ? "Sim (primeiros caracteres: " + stripeSecretKey.substring(0, 5) + "...)" : "Não");
      
      // Tentar reinicializar o Stripe
      try {
        if (stripeSecretKey) {
          console.log("🔄 Tentando reinicializar o Stripe...");
          const tempStripe = new Stripe(stripeSecretKey, {
            apiVersion: '2023-10-16',
          });
          console.log("✅ Stripe reinicializado com sucesso!");
          
          // Se conseguiu inicializar, use essa instância para esta requisição
          const session = await tempStripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
              price: 'price_TEST_PRO_MONTHLY', // Use um dos IDs de teste
              quantity: 1,
            }],
            mode: 'subscription',
            success_url: `${process.env.FRONTEND_URL || process.env.CLIENT_URL || req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || process.env.CLIENT_URL || req.headers.origin}/pricing`,
            metadata: {
              test: 'true'
            }
          });
          
          console.log("✅ Sessão de teste criada:", session.id);
          return res.json({
            success: true,
            message: "Sessão criada em modo de recuperação",
            url: session.url,
            sessionId: session.id,
            mode: isTestMode ? 'test' : 'live'
          });
        }
      } catch (reinitError) {
        console.error("❌ Erro ao reinicializar Stripe:", reinitError);
      }
      
      return res.status(500).json({ 
        error: 'Serviço de pagamento não disponível no momento', 
        details: 'Configuração do Stripe incompleta',
        mode: isTestMode ? 'test' : 'live',
        diagnostico: {
          STRIPE_MODE: process.env.STRIPE_MODE,
          hasTestKey: !!process.env.STRIPE_SECRET_KEY_TEST,
          hasLiveKey: !!process.env.STRIPE_SECRET_KEY_LIVE,
          activeKey: !!stripeSecretKey
        }
      });
    }

    // Extrair dados do request
    const { planId, interval = 'monthly' } = req.body;
    console.log(`🔧 Stripe Mode: ${isTestMode ? 'TEST' : 'LIVE'}`);
    console.log("📦 Criando sessão de checkout para planId:", planId, "interval:", interval);

    if (!planId) {
      console.log("❌ Erro: ID do plano não fornecido");
      return res.status(400).json({ 
        error: 'ID do plano é obrigatório',
        mode: isTestMode ? 'test' : 'live'
      });
    }

    // Plano freemium não tem pagamento
    if (planId === 'freemium') {
      console.log("✅ Plano Freemium selecionado - sem pagamento necessário");
      return res.status(200).json({ 
        success: true, 
        message: 'Plano Freemium ativado',
        redirect: false,
        mode: isTestMode ? 'test' : 'live'
      });
    }

    // Obter o Price ID com base no plano e intervalo
    const priceId = priceMapping[planId]?.[interval];
    
    if (!priceId) {
      console.log("❌ Erro: Plano ou intervalo inválido:", planId, interval);
      console.log("❌ PriceMapping disponível:", JSON.stringify(priceMapping));
      return res.status(400).json({ 
        error: 'Plano ou intervalo inválido', 
        mode: isTestMode ? 'test' : 'live',
        plansDisponiveis: Object.keys(priceMapping)
      });
    }

    console.log(`💰 Usando Price ID: ${priceId}`);

    if (!req.session.userId) {
      console.log("❌ Erro: Usuário não autenticado");
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        mode: isTestMode ? 'test' : 'live'
      });
    }

    // Buscar dados do usuário
    let user;
    try {
      user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, req.session.userId as number)
      });
      console.log("✅ Usuário encontrado:", user ? `ID: ${user.id}, Email: ${user.email}` : "Não encontrado");
    } catch (dbError) {
      console.error("❌ Erro ao buscar usuário:", dbError);
      return res.status(500).json({
        error: 'Erro ao buscar dados do usuário',
        details: dbError.message,
        mode: isTestMode ? 'test' : 'live'
      });
    }

    if (!user) {
      console.log("❌ Erro: Usuário não encontrado no banco");
      return res.status(404).json({ 
        error: 'Usuário não encontrado',
        mode: isTestMode ? 'test' : 'live'
      });
    }

    // Criar ou recuperar o Customer no Stripe
    let customerId = user.stripeCustomerId;
    console.log("🔍 Customer ID existente:", customerId || "Nenhum");

    if (!customerId) {
      try {
        console.log("🔄 Criando novo customer no Stripe...");
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          metadata: {
            userId: user.id.toString()
          }
        });

        customerId = customer.id;
        console.log("✅ Novo customer criado:", customerId);

        // Atualizar o usuário com o customerId do Stripe
        await db.update(db.users).set({
          stripeCustomerId: customerId
        }).where(db.eq(db.users.id, user.id));
        console.log("✅ Usuário atualizado com o Customer ID");
      } catch (customerError) {
        console.error("❌ Erro ao criar customer:", customerError);
        return res.status(500).json({
          error: 'Erro ao criar cliente no Stripe',
          details: customerError.message,
          mode: isTestMode ? 'test' : 'live'
        });
      }
    }

    // URL base para redirecionamentos
    const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || req.headers.origin;
    console.log("🔗 URL base para redirecionamentos:", baseUrl);

    // Criar a sessão de checkout
    let session;
    try {
      console.log("🔄 Criando sessão de checkout...");
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${baseUrl}/seller/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/seller/subscription?canceled=true`,
        metadata: {
          userId: user.id.toString(),
          planId: planId.toString(),
          interval: interval,
          mode: isTestMode ? 'test' : 'live'
        }
      });
      console.log('✅ Sessão criada com sucesso:', session.id);
    } catch (sessionError) {
      console.error("❌ Erro ao criar sessão:", sessionError);
      return res.status(500).json({
        error: 'Erro ao criar sessão no Stripe',
        details: sessionError.message,
        code: sessionError.code,
        mode: isTestMode ? 'test' : 'live'
      });
    }

    console.log('✅ Retornando resposta de sucesso');
    return res.json({
      success: true,
      url: session.url,
      sessionId: session.id,
      mode: isTestMode ? 'test' : 'live'
    });
  } catch (error) {
    console.error('❌ Erro ao criar sessão de checkout:');
    console.error('❌ Mensagem:', error.message);
    console.error('❌ Tipo:', error.type);
    console.error('❌ Código:', error.code);
    console.error('❌ Stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Erro ao criar sessão de checkout', 
      details: error.message,
      type: error.type,
      code: error.code,
      mode: isTestMode ? 'test' : 'live'
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
