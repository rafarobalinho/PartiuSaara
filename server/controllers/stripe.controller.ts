import { Request, Response } from 'express';
import { db } from '../db'; // Certifique-se que db está disponível
import Stripe from 'stripe';
import { stores } from "@shared/schema";

// FUNÇÕES AUXILIARES DINÂMICAS
// Esta função lê as variáveis de ambiente atuais toda vez que é chamada.
function getCurrentStripeConfig() {
  const currentEnvStripeMode = process.env.STRIPE_MODE;
  const isTest = currentEnvStripeMode === 'test';

  const secretKey = isTest
    ? process.env.STRIPE_SECRET_KEY_TEST
    : process.env.STRIPE_SECRET_KEY_LIVE; // Usando _LIVE para clareza

  const publishableKey = isTest
    ? process.env.STRIPE_PUBLISHABLE_KEY_TEST // Padronizando para PUBLISHABLE
    : process.env.STRIPE_PUBLISHABLE_KEY_LIVE;

  // Log para depuração (pode ser removido ou comentado em produção)
  // console.log(
  //   `[getCurrentStripeConfig] Mode: ${currentEnvStripeMode}, isTest: ${isTest}, SecretKey Loaded: ${!!secretKey}, PublishableKey Loaded: ${!!publishableKey}`
  // );

  if (!secretKey || secretKey.trim() === '') {
    console.error(`ALERTA DINÂMICO: Chave Secreta Stripe ${isTest ? 'TEST' : 'LIVE'} não está definida!`);
  }
  if (!publishableKey || publishableKey.trim() === '') {
    console.error(`ALERTA DINÂMICO: Chave Publicável Stripe ${isTest ? 'TEST' : 'LIVE'} não está definida!`);
  }

  return {
    isTestMode: isTest,
    stripeSecretKey: secretKey,
    stripePublishableKey: publishableKey,
    rawStripeMode: currentEnvStripeMode,
  };
}

// Esta função retorna uma nova instância do cliente Stripe configurada dinamicamente.
function getStripeClient(): Stripe | null {
  const config = getCurrentStripeConfig();
  if (!config.stripeSecretKey) {
    console.error("getStripeClient: Não foi possível inicializar o Stripe, chave secreta ausente.");
    return null;
  }
  try {
    return new Stripe(config.stripeSecretKey, {
      apiVersion: '2023-10-16', // Mantenha a versão da API consistente
    });
  } catch (error) {
    console.error("Erro ao criar instância dinâmica do Stripe:", error);
    return null;
  }
}

// Transforma o priceMapping em uma função para que ele use o isTestMode dinâmico
const getPriceMapping = (isTestModeValue: boolean) => ({
  freemium: null, // Freemium não tem preço
  start: {
    monthly: isTestModeValue ? process.env.PRICE_ID_TEST_START_MONTHLY || 'price_TEST_START_MONTHLY' : process.env.PRICE_ID_LIVE_START_MONTHLY || 'price_LIVE_START_MONTHLY',
    yearly: isTestModeValue ? process.env.PRICE_ID_TEST_START_YEARLY || 'price_TEST_START_YEARLY' : process.env.PRICE_ID_LIVE_START_YEARLY || 'price_LIVE_START_YEARLY',
  },
  pro: {
    monthly: isTestModeValue ? process.env.PRICE_ID_TEST_PRO_MONTHLY || 'price_TEST_PRO_MONTHLY' : process.env.PRICE_ID_LIVE_PRO_MONTHLY || 'price_LIVE_PRO_MONTHLY',
    yearly: isTestModeValue ? process.env.PRICE_ID_TEST_PRO_YEARLY || 'price_TEST_PRO_YEARLY' : process.env.PRICE_ID_LIVE_PRO_YEARLY || 'price_LIVE_PRO_YEARLY',
  },
  premium: {
    monthly: isTestModeValue ? process.env.PRICE_ID_TEST_PREMIUM_MONTHLY || 'price_TEST_PREMIUM_MONTHLY' : process.env.PRICE_ID_LIVE_PREMIUM_MONTHLY || 'price_LIVE_PREMIUM_MONTHLY',
    yearly: isTestModeValue ? process.env.PRICE_ID_TEST_PREMIUM_YEARLY || 'price_TEST_PREMIUM_YEARLY' : process.env.PRICE_ID_LIVE_PREMIUM_YEARLY || 'price_LIVE_PREMIUM_YEARLY',
  },
  // Adicione seus Price IDs reais aqui ou defina-os como variáveis de ambiente
  // Ex: PRICE_ID_TEST_START_MONTHLY, PRICE_ID_LIVE_START_MONTHLY, etc.
  // No .env: PRICE_ID_TEST_START_MONTHLY=price_xxxx
  // Nos Secrets: PRICE_ID_LIVE_START_MONTHLY=price_yyyy
});


// LOGS DE INICIALIZAÇÃO DO MÓDULO (APENAS PARA INFORMAÇÃO DO CARREGAMENTO INICIAL)
// As decisões de modo e chaves para operações Stripe NÃO dependerão mais destes valores iniciais.
const initialModuleLoadStripeMode = process.env.STRIPE_MODE;
console.log("Stripe Controller: Módulo CARREGANDO...");
console.log("STRIPE_MODE no carregamento inicial do módulo:", initialModuleLoadStripeMode || "(não definido)");
console.log("Modo Inicial (baseado no carregamento do módulo):", (initialModuleLoadStripeMode === 'test') ? "TESTE" : "PRODUÇÃO");
console.log("FRONTEND_URL no carregamento inicial do módulo:", process.env.FRONTEND_URL || process.env.CLIENT_URL || "(não definido)");
// Fim dos logs de inicialização do módulo


export const createCheckoutSession = async (req: Request, res: Response) => {
  const { isTestMode } = getCurrentStripeConfig(); // Obtém o modo dinamicamente
  const localStripe = getStripeClient(); // Obtém o cliente Stripe dinamicamente
  const activePriceMapping = getPriceMapping(isTestMode); // Obtém o mapeamento de preços dinâmico

  console.log(`🚀 === STRIPE CHECKOUT DEBUG START (Modo Dinâmico: ${isTestMode ? "TESTE" : "PRODUÇÃO"}) ===`);

  if (!localStripe) {
    console.error('❌ CHECKPOINT 3 (Dinâmico): Stripe não pôde ser inicializado.');
    return res.status(500).json({ error: 'Serviço de pagamento indisponível.', checkpoint: 'STRIPE_CLIENT_INIT_ERROR', mode: isTestMode ? 'test' : 'live' });
  }

  try {
    // CHECKPOINT 1: Método HTTP
    console.log('🔍 CHECKPOINT 1: Verificando método HTTP');
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed', checkpoint: 'HTTP_METHOD' });
    }
    console.log('✅ CHECKPOINT 1: Método POST válido');

    // CHECKPOINT 2: Variáveis de ambiente
    console.log('🔍 CHECKPOINT 2: Verificando variáveis de ambiente (dinâmico)');
    console.log('🔧 STRIPE_MODE env (lido agora):', process.env.STRIPE_MODE);
    const { stripeSecretKey: currentStripeSecretKey } = getCurrentStripeConfig();

    if (!currentStripeSecretKey) {
      const missingKeyName = isTestMode ? 'STRIPE_SECRET_KEY_TEST' : 'STRIPE_SECRET_KEY_LIVE';
      console.error('❌ CHECKPOINT 2: Chave ausente (dinâmico):', missingKeyName);
      return res.status(500).json({
        error: `Missing ${missingKeyName}`,
        mode: isTestMode ? 'test' : 'live',
        checkpoint: 'STRIPE_KEY_MISSING_DYNAMIC',
      });
    }
    console.log('✅ CHECKPOINT 2: Chave Stripe disponível (dinâmico)');

    // CHECKPOINT 4: Validar dados da requisição
    console.log('🔍 CHECKPOINT 4: Validando dados da requisição');
    const { planId, interval = 'monthly', storeId } = req.body;
    if (!planId) {
      return res.status(400).json({ error: 'Plan ID is required', checkpoint: 'VALIDATION_ERROR' });
    }
    if (!storeId) {
      return res.status(400).json({ error: 'Store ID is required', checkpoint: 'VALIDATION_ERROR' });
    }
    console.log('✅ CHECKPOINT 4: Dados válidos - planId:', planId, 'storeId:', storeId);

    // CHECKPOINT 5: Verificar autenticação
    console.log('🔍 CHECKPOINT 5: Verificando autenticação');
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado', checkpoint: 'AUTH_ERROR', mode: isTestMode ? 'test' : 'live' });
    }
    console.log('✅ CHECKPOINT 5: Usuário autenticado, ID:', req.session.userId);

    // CHECKPOINT 6: Mapear Price IDs
    console.log('🔍 CHECKPOINT 6: Mapeando Price IDs (dinâmico)');
    if (planId === 'freemium') {
      console.log('✅ CHECKPOINT 6: Plano Freemium detectado - processando gratuitamente');
      return res.status(200).json({ success: true, message: 'Plano Freemium ativado', mode: isTestMode ? 'test' : 'live' });
    }
    const priceId = activePriceMapping[planId]?.[interval];
    if (!priceId) {
      console.log('❌ CHECKPOINT 6: Price ID inválido (dinâmico) para plano:', planId);
      return res.status(400).json({ error: 'Invalid plan or price ID not found', mode: isTestMode ? 'test' : 'live' });
    }
    console.log('✅ CHECKPOINT 6: Price ID mapeado com sucesso (dinâmico):', priceId);

    // CHECKPOINT 7: Buscar e validar a loja
    console.log('🔍 CHECKPOINT 7: Buscando dados da loja');
    const store = await db.query.stores.findFirst({ 
      where: (stores, { eq }) => eq(stores.id, storeId as number) 
    });
    if (!store) {
      return res.status(404).json({ error: 'Loja não encontrada', checkpoint: 'STORE_NOT_FOUND', mode: isTestMode ? 'test' : 'live' });
    }

    // Verificar se o usuário é o proprietário da loja
    if (store.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Acesso negado: usuário não é proprietário da loja', checkpoint: 'STORE_OWNERSHIP_ERROR', mode: isTestMode ? 'test' : 'live' });
    }
    console.log('✅ CHECKPOINT 7: Loja encontrada e propriedade validada');

    // CHECKPOINT 8: Buscar dados do usuário proprietário
    console.log('🔍 CHECKPOINT 8: Buscando dados do usuário proprietário');
    const user = await db.query.users.findFirst({ 
      where: (users, { eq }) => eq(users.id, store.userId) 
    });
    if (!user) {
      return res.status(404).json({ error: 'Usuário proprietário não encontrado', checkpoint: 'USER_NOT_FOUND', mode: isTestMode ? 'test' : 'live' });
    }
    console.log('✅ CHECKPOINT 8: Usuário proprietário encontrado');

    // CHECKPOINT 9: Gerenciar Customer Stripe na tabela stores
    console.log('🔍 CHECKPOINT 9: Gerenciando Customer Stripe (dinâmico)');
    let customerId = store.stripeCustomerId;
    if (!customerId) {
      const customer = await localStripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: { 
          userId: user.id.toString(),
          storeId: store.id.toString()
        }
      });
      customerId = customer.id;

      // Atualizar a tabela stores com o novo stripeCustomerId
      await db.update(stores).set({ stripeCustomerId: customerId }).where(eq(stores.id, store.id));
      console.log('✅ Novo customer criado e loja atualizada (dinâmico):', customerId);
    } else {
      console.log('✅ Customer ID existente na loja (dinâmico):', customerId);
    }

    // CHECKPOINT 10: Configurar URLs para redirecionamento
    console.log('🔍 CHECKPOINT 10: Configurando URLs');
    const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || req.headers.origin;
    const successUrl = `${baseUrl}/seller/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/seller/subscription?canceled=true`;
    console.log('✅ CHECKPOINT 10: URLs configuradas');

    // CHECKPOINT 11: Criar a sessão de checkout
    console.log('🔍 CHECKPOINT 11: Criando sessão de checkout (dinâmico)');
    const session = await localStripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: user.id.toString(),
        storeId: store.id.toString(),
        planId: planId.toString(),
        interval: interval,
        mode: isTestMode ? 'test' : 'live'
      }
    });
    console.log('✅ CHECKPOINT 11: Sessão criada com sucesso (dinâmico):', session.id);

    // CHECKPOINT 12: Retornar resposta
    console.log('🔍 CHECKPOINT 12: Preparando resposta (dinâmico)');
    return res.status(200).json({ success: true, url: session.url, sessionId: session.id, mode: isTestMode ? 'test' : 'live' });

  } catch (error) {
    console.error('💥 === STRIPE CHECKOUT GLOBAL ERROR (Dinâmico) ===', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message, mode: isTestMode ? 'test' : 'live', checkpoint: 'GLOBAL_ERROR_DYNAMIC' });
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  const localStripe = getStripeClient();
  const { isTestMode } = getCurrentStripeConfig(); // Pega o modo atual
  const sig = req.headers['stripe-signature'] as string;

  if (!localStripe) {
    console.error('Webhook: Stripe não pôde ser inicializado.');
    return res.status(500).send('Webhook Error: Payment service not available');
  }

  let event;
  try {
    const webhookSecret = isTestMode
      ? process.env.STRIPE_WEBHOOK_SECRET_TEST
      : process.env.STRIPE_WEBHOOK_SECRET_LIVE;

    if (!webhookSecret) {
      console.error(`Webhook Error: Webhook secret para modo ${isTestMode ? 'TESTE' : 'LIVE'} não encontrado.`);
      throw new Error('Webhook secret não configurado para o modo atual');
    }

    event = localStripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Erro no webhook Stripe (dinâmico):', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event (lógica do switch case permanece a mesma)
  switch (event.type) {
    case 'checkout.session.completed':
      // ... sua lógica ...
      break;
    case 'customer.subscription.updated':
      // ... sua lógica ...
      break;
    case 'customer.subscription.deleted':
      // ... sua lógica ...
      break;
    default:
      console.log(`Evento não tratado (dinâmico): ${event.type}`);
  }

  res.json({ received: true, mode: isTestMode ? 'test' : 'live' });
};

export const getSubscriptionDetails = async (req: Request, res: Response) => {
  const localStripe = getStripeClient();
  const { isTestMode } = getCurrentStripeConfig();

  if (!localStripe) {
    return res.status(500).json({ error: 'Serviço de pagamento não disponível', mode: isTestMode ? 'test' : 'live' });
  }

  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado', mode: isTestMode ? 'test' : 'live' });
    }

    const { storeId } = req.query;
    if (!storeId) {
      return res.status(400).json({ error: 'Store ID é obrigatório', mode: isTestMode ? 'test' : 'live' });
    }

    // Buscar a loja e verificar propriedade
    const store = await db.query.stores.findFirst({ 
      where: (stores, { eq }) => eq(stores.id, parseInt(storeId as string)) 
    });

    if (!store) {
      return res.status(404).json({ error: 'Loja não encontrada', mode: isTestMode ? 'test' : 'live' });
    }

    if (store.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Acesso negado: usuário não é proprietário da loja', mode: isTestMode ? 'test' : 'live' });
    }

    if (!store.stripeSubscriptionId) {
      return res.status(404).json({ error: 'Assinatura não encontrada para esta loja', mode: isTestMode ? 'test' : 'live' });
    }

    const subscription = await localStripe.subscriptions.retrieve(store.stripeSubscriptionId);
    res.json({ ...subscription, mode: isTestMode ? 'test' : 'live' });
  } catch (error) {
    console.error('Erro ao obter detalhes da assinatura (dinâmico):', error);
    res.status(500).json({ error: 'Erro ao obter detalhes da assinatura', mode: isTestMode ? 'test' : 'live' });
  }
};

export const cancelSubscription = async (req: Request, res: Response) => {
  const localStripe = getStripeClient();
  const { isTestMode } = getCurrentStripeConfig();

  if (!localStripe) {
    return res.status(500).json({ error: 'Serviço de pagamento não disponível', mode: isTestMode ? 'test' : 'live' });
  }

  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado', mode: isTestMode ? 'test' : 'live' });
    }

    const { storeId } = req.body;
    if (!storeId) {
      return res.status(400).json({ error: 'Store ID é obrigatório', mode: isTestMode ? 'test' : 'live' });
    }

    // Buscar a loja e verificar propriedade
    const store = await db.query.stores.findFirst({ 
      where: (stores, { eq }) => eq(stores.id, storeId) 
    });

    if (!store) {
      return res.status(404).json({ error: 'Loja não encontrada', mode: isTestMode ? 'test' : 'live' });
    }

    if (store.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Acesso negado: usuário não é proprietário da loja', mode: isTestMode ? 'test' : 'live' });
    }

    if (!store.stripeSubscriptionId) {
      return res.status(404).json({ error: 'Assinatura não encontrada para esta loja', mode: isTestMode ? 'test' : 'live' });
    }

    await localStripe.subscriptions.cancel(store.stripeSubscriptionId);

    // Atualizar status da assinatura na tabela stores
    await db.update(db.stores).set({ 
      subscriptionStatus: 'canceled', 
      subscriptionPlan: 'freemium' 
    }).where(db.eq(db.stores.id, store.id));

    res.json({ success: true, message: 'Assinatura cancelada com sucesso', mode: isTestMode ? 'test' : 'live' });
  } catch (error) {
    console.error('Erro ao cancelar assinatura (dinâmico):', error);
    res.status(500).json({ error: 'Erro ao cancelar assinatura', mode: isTestMode ? 'test' : 'live' });
  }
};

// Funções checkFlashPromotionEligibility e checkCouponEligibility não usam Stripe diretamente,
// então não precisam de localStripe, mas podem se beneficiar do isTestMode dinâmico se a lógica de elegibilidade mudar.
// Por enquanto, vou mantê-las como estão, mas se a elegibilidade depender do modo TEST/LIVE,
// você pegaria `const { isTestMode } = getCurrentStripeConfig();` dentro delas.

export const checkFlashPromotionEligibility = async (req: Request, res: Response) => {
  // const { isTestMode } = getCurrentStripeConfig(); // Se precisar do modo
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    // ...resto da lógica como estava...
    const user = await db.query.users.findFirst({ /* ... */ });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const isEligible = user.planId >= 3 && user.subscriptionStatus === 'active';
    res.json({ isEligible, /* ... */ });
  } catch (error) {
    console.error('Erro ao verificar elegibilidade:', error);
    res.status(500).json({ error: 'Erro ao verificar elegibilidade para promoções relâmpago' });
  }
};

export const checkCouponEligibility = async (req: Request, res: Response) => {
  // const { isTestMode } = getCurrentStripeConfig(); // Se precisar do modo
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    // ...resto da lógica como estava...
    const user = await db.query.users.findFirst({ /* ... */ });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const isEligible = user.planId >= 2 && user.subscriptionStatus === 'active';
    let couponLimit = 0;
    if (user.planId === 2) couponLimit = 5;
    else if (user.planId >= 3) couponLimit = -1;
    res.json({ isEligible, /* ... */ couponLimit });
  } catch (error) {
    console.error('Erro ao verificar elegibilidade:', error);
    res.status(500).json({ error: 'Erro ao verificar elegibilidade para criação de cupons' });
  }
};

// Função auxiliar para obter o nome do plano (sem alteração)
function getPlanName(planId: number): string {
  switch (planId) {
    case 1: return 'Freemium';
    case 2: return 'Start';
    case 3: return 'Pro';
    case 4: return 'Premium';
    default: return 'Desconhecido';
  }
}

export const getStripeConfig = async (req: Request, res: Response) => {
  try {
    const currentConfig = getCurrentStripeConfig(); // Usa a função dinâmica

    res.json({
      mode: currentConfig.isTestMode ? 'test' : 'live', // Derivado dinamicamente
      environment_STRIPE_MODE: currentConfig.rawStripeMode, // Valor direto do process.env via função
      hasTestKeys: !!(process.env.STRIPE_SECRET_KEY_TEST && process.env.STRIPE_PUBLISHABLE_KEY_TEST), // Ajuste para PUBLISHABLE se for seu padrão
      hasLiveKeys: !!(process.env.STRIPE_SECRET_KEY_LIVE && process.env.STRIPE_PUBLISHABLE_KEY_LIVE),
      appUrl: process.env.FRONTEND_URL || process.env.CLIENT_URL,
      nodeEnv: process.env.NODE_ENV
    });
  } catch (error) {
    console.error('Erro ao obter configuração do Stripe (dinâmico):', error);
    // Se getCurrentStripeConfig() lançar erro, isTestMode pode não estar definido.
    // É melhor não depender dele aqui no catch se a própria config falhou.
    res.status(500).json({ error: 'Erro ao obter configuração do Stripe' });
  }
};

export const testStripeConnection = async (req: Request, res: Response) => {
  const localStripe = getStripeClient();
  const { isTestMode, rawStripeMode } = getCurrentStripeConfig();

  if (!localStripe) {
    return res.status(500).json({
      success: false,
      error: 'Cliente Stripe não inicializado',
      mode: isTestMode ? 'test' : 'live'
    });
  }
  try {
    const products = await localStripe.products.list({ limit: 5 });
    const prices = await localStripe.prices.list({ limit: 10 });

    return res.status(200).json({
      success: true,
      message: `Stripe conectado com sucesso em modo ${isTestMode ? 'TEST' : 'LIVE'}!`,
      mode: isTestMode ? 'test' : 'live',
      environment_STRIPE_MODE: rawStripeMode,
      // ... (products e prices)
    });
  } catch (error) {
    console.error('Erro ao testar conexão com Stripe (dinâmico):', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      type: error.type,
      mode: isTestMode ? 'test' : 'live'
    });
  }
};
```