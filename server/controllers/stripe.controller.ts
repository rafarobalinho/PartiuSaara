import { Request, Response } from 'express';
import { db } from '../db';
import Stripe from 'stripe';
import { users, stores } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

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

// Função para atualizar assinatura de uma loja específica
async function updateStoreSubscription(userId: number, storeId: number, subscriptionData: any) {
  try {
    console.log(`🔄 Atualizando assinatura - User: ${userId}, Store: ${storeId}, Plan: ${subscriptionData.plan}`);

    // === VALIDAÇÃO E DEBUG DA LOJA ===
    console.log(`[updateStoreSubscription] 🔍 Procurando loja com ID: ${storeId} para usuário: ${userId}`);

    // Validar se a loja pertence ao usuário
    const store = await db.query.stores.findFirst({
      where: and(eq(stores.id, storeId), eq(stores.userId, userId))
    });

    if (!store) {
      console.error(`❌ Loja ${storeId} não encontrada ou não pertence ao usuário ${userId}`);

      // === DEBUG: Listar todas as lojas do usuário ===
      const userStores = await db.query.stores.findMany({
        where: eq(stores.userId, userId),
        columns: { id: true, name: true, subscriptionPlan: true }
      });
      console.log(`[DEBUG] Lojas encontradas para usuário ${userId}:`, userStores);

      throw new Error(`Loja ${storeId} não encontrada ou não pertence ao usuário ${userId}`);
    }

    console.log(`[updateStoreSubscription] ✅ Loja encontrada:`, {
      id: store.id,
      name: store.name,
      currentPlan: store.subscriptionPlan,
      newPlan: subscriptionData.plan
    });

    // Calcular data de término da assinatura
    const now = new Date();
    const endDate = new Date(now);
    if (subscriptionData.interval === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // === LOG DA QUERY DE ATUALIZAÇÃO ===
    console.log(`[updateStoreSubscription] 📝 Executando UPDATE para:`, {
      storeId,
      userId,
      newPlan: subscriptionData.plan,
      endDate: endDate.toISOString()
    });

    // Atualizar apenas a loja específica
    const updateResult = await db.update(stores)
      .set({
        subscriptionPlan: subscriptionData.plan,
        subscriptionStatus: 'active',
        subscriptionEndDate: endDate.toISOString(),
        subscriptionStartDate: now.toISOString(),
        stripeCustomerId: subscriptionData.customerId,
        stripeSubscriptionId: subscriptionData.subscriptionId,
        updatedAt: now.toISOString()
      })
      .where(and(eq(stores.id, storeId), eq(stores.userId, userId)))
      .returning();

    console.log(`✅ Assinatura atualizada com sucesso para loja ${storeId}`);
    console.log('📊 Resultado da atualização:', updateResult);

    // === VERIFICAÇÃO PÓS-ATUALIZAÇÃO ===
    const updatedStores = await db.query.stores.findMany({
      where: eq(stores.userId, userId),
      columns: { id: true, name: true, subscriptionPlan: true }
    });
    console.log(`[VERIFICAÇÃO] Estado de todas as lojas do usuário ${userId} após atualização:`, updatedStores);

    return updateResult[0];
  } catch (error) {
    console.error(`❌ Erro ao atualizar assinatura:`, error);
    throw error;
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, userId: number, storeId: number) {
  try {
    console.log(`🔍 Processando checkout completo para usuário ${userId}, loja ${storeId}`);

    // Buscar detalhes da assinatura
    const localStripe = getStripeClient();
    if (!localStripe) {
      console.error('Stripe não pôde ser inicializado.');
      return;
    }
    const subscription = await localStripe.subscriptions.retrieve(session.subscription as string);

    const subscriptionData = {
      plan: session.metadata?.plan || 'unknown',
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: new Date(subscription.current_period_end * 1000).toISOString(),
      customerId: session.customer as string,
      subscriptionId: subscription.id
    };

    // Atualizar assinatura APENAS da loja específica
    await updateStoreSubscription(userId, storeId, subscriptionData);

    console.log(`✅ Checkout processado com sucesso para loja ${storeId} do usuário ${userId}`);
  } catch (error) {
    console.error(`❌ Erro ao processar checkout da loja ${storeId}:`, error);
  }
}

async function handlePaymentSucceeded(subscription: Stripe.Subscription, userId: number, storeId: number) {
  try {
    console.log(`✅ Renovação bem-sucedida para usuário ${userId}, loja ${storeId}`);

    const subscriptionData = {
      plan: subscription.metadata?.plan || 'unknown',
      status: 'active',
      startDate: new Date(subscription.current_period_start * 1000).toISOString(),
      endDate: new Date(subscription.current_period_end * 1000).toISOString(),
      customerId: subscription.customer as string,
      subscriptionId: subscription.id
    };

    await updateStoreSubscription(userId, storeId, subscriptionData);
  } catch (error) {
    console.error(`❌ Erro ao processar renovação da loja ${storeId}:`, error);
  }
}

async function handlePaymentFailed(subscription: Stripe.Subscription, userId: number, storeId: number) {
  try {
    console.log(`❌ Falha no pagamento para usuário ${userId}, loja ${storeId}`);

    const subscriptionData = {
      plan: subscription.metadata?.plan || 'unknown',
      status: 'past_due',
      startDate: new Date(subscription.current_period_start * 1000).toISOString(),
      endDate: new Date(subscription.current_period_end * 1000).toISOString(),
      customerId: subscription.customer as string,
      subscriptionId: subscription.id
    };

    await updateStoreSubscription(userId, storeId, subscriptionData);
  } catch (error) {
    console.error(`❌ Erro ao processar falha de pagamento da loja ${storeId}:`, error);
  }
}


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
    const userId = req.session.userId;
    if (!planId) {
      return res.status(400).json({ error: 'Plan ID is required', checkpoint: 'VALIDATION_ERROR' });
    }
    if (!storeId) {
      return res.status(400).json({ error: 'Store ID is required', checkpoint: 'VALIDATION_ERROR' });
    }
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado', checkpoint: 'AUTH_ERROR', mode: isTestMode ? 'test' : 'live' });
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

      console.log('[DEBUG Drizzle] Chaves do objeto schema "stores":', Object.keys(stores));
      console.log('[DEBUG Drizzle] Definição de stores.stripeCustomerId:', stores.stripeCustomerId);
      console.log('[DEBUG Drizzle] Tentando atualizar storeId:', store.id, 'com stripeCustomerId:', customerId);

      try {
        await db.update(stores).set({ stripeCustomerId: customerId }).where(eq(stores.id, store.id));
        console.log('✅ Novo customer criado e loja atualizada (dinâmico):', customerId);
      } catch (drizzleError) {
        console.error('❌ ERRO NA OPERAÇÃO DB.UPDATE:', drizzleError);
        // Re-lançar o erro ou tratar conforme necessário para que ele ainda apareça no log global se não for pego
        throw drizzleError; 
      }
    } else {
      console.log('✅ Customer ID existente na loja (dinâmico):', customerId);
    }

    // CHECKPOINT 10: Configurar URLs para redirecionamento
    console.log('🔍 CHECKPOINT 10: Configurando URLs');
    const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || req.headers.origin;
    // Validar se storeId foi enviado

    // Validar se a loja pertence ao usuário

    // === LOGS ANTES DA CRIAÇÃO DA SESSÃO ===
    const sessionData = {
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${baseUrl}/seller/stores/${storeId}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/seller/stores/${storeId}/subscription?canceled=true`,
      client_reference_id: `${userId}:${storeId}`,
      metadata: {
        userId: userId.toString(),
        storeId: store.id.toString(),
        plan: planId,
        interval: interval
      }
    };

    console.log(`[createCheckout] 📝 Dados da sessão que será criada:`, {
      client_reference_id: sessionData.client_reference_id,
      metadata: sessionData.metadata,
      success_url: sessionData.success_url,
      cancel_url: sessionData.cancel_url
    });

    // Criar sessão de checkout
    const session = await localStripe.checkout.sessions.create(sessionData);

    // === LOGS APÓS CRIAÇÃO DA SESSÃO ===
    console.log(`[createCheckout] ✅ Sessão criada com ID: ${session.id}`);
    console.log(`[createCheckout] 📋 Metadata da sessão criada:`, session.metadata);
    console.log(`[createCheckout] 📋 Client reference ID da sessão criada:`, session.client_reference_id);

    // CHECKPOINT 12: Retornar resposta
    console.log('🔍 CHECKPOINT 12: Preparando resposta (dinâmico)');
    return res.status(200).json({ success: true, url: session.url, sessionId: session.id, mode: isTestMode ? 'test' : 'live' });

  } catch (error) {
    console.error('💥 === STRIPE CHECKOUT GLOBAL ERROR (Dinâmico) ===', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message, mode: isTestMode ? 'test' : 'live', checkpoint: 'GLOBAL_ERROR_DYNAMIC' });
  }
};

function extractSessionData(session: any) {
  console.log(`[extractSessionData] 🔍 Iniciando extração de dados da sessão`);
  console.log(`[extractSessionData] client_reference_id:`, session.client_reference_id);
  console.log(`[extractSessionData] metadata:`, session.metadata);

  // Primeiro, tentar extrair do client_reference_id (formato: userId:storeId)
  if (session.client_reference_id) {
    console.log(`[extractSessionData] 📋 Processando client_reference_id: ${session.client_reference_id}`);
    const parts = session.client_reference_id.split(':');
    console.log(`[extractSessionData] 📋 Parts do split:`, parts);

    if (parts.length >= 2) {
      const userId = parseInt(parts[0]);
      const storeId = parseInt(parts[1]);
      const metadata = session.metadata || {};

      console.log(`[extractSessionData] ✅ Dados extraídos do client_reference_id:`, {
        userId: !isNaN(userId) ? userId : null,
        storeId: !isNaN(storeId) ? storeId : null,
        plan: metadata.plan || null,
        interval: metadata.interval || null
      });

      return {
        userId: !isNaN(userId) ? userId : null,
        storeId: !isNaN(storeId) ? storeId : null,
        plan: metadata.plan || null,
        interval: metadata.interval || null
      };
    } else {
      console.log(`[extractSessionData] ⚠️ client_reference_id não tem formato esperado (userId:storeId)`);
    }
  } else {
    console.log(`[extractSessionData] ⚠️ client_reference_id não encontrado`);
  }

  // Fallback: tentar extrair apenas do metadata
  console.log(`[extractSessionData] 📋 Fallback: tentando extrair apenas do metadata`);
  const metadata = session.metadata || {};

  const fallbackData = {
    userId: metadata.userId ? parseInt(metadata.userId) : null,
    storeId: metadata.storeId ? parseInt(metadata.storeId) : null,
    plan: metadata.plan || null,
    interval: metadata.interval || null
  };

  console.log(`[extractSessionData] 📋 Dados do fallback:`, fallbackData);

  return fallbackData;
}

export const handleWebhook = async (req: Request, res: Response) => {
  // === LOGS DETALHADOS DE DEBUG DO WEBHOOK ===
  console.log('🚨 WEBHOOK STRIPE CHAMADO! 🚨');
  console.log('=== WEBHOOK DEBUG COMPLETO ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers completos:', JSON.stringify(req.headers, null, 2));
  console.log('Body type:', typeof req.body);
  console.log('Body length:', req.body ? req.body.length : 'undefined');
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Stripe-Signature presente:', !!req.headers['stripe-signature']);
  console.log('Event Type (se disponível):', req.body?.type || 'N/A');
  console.log('🔍 DEBUGGING: Webhook foi chamado após checkout!');
  console.log('===============================');

  const localStripe = getStripeClient();
  const { isTestMode } = getCurrentStripeConfig(); // Pega o modo atual
  const sig = req.headers['stripe-signature'] as string;

  if (!localStripe) {
    console.error('❌ Webhook: Stripe não pôde ser inicializado.');
    return res.status(500).send('Webhook Error: Payment service not available');
  }

  let event;
  try {
    const webhookSecret = isTestMode
      ? process.env.STRIPE_WEBHOOK_SECRET_TEST
      : process.env.STRIPE_WEBHOOK_SECRET_LIVE;

    console.log(`🔑 Webhook Secret para modo ${isTestMode ? 'TEST' : 'LIVE'}:`, webhookSecret ? 'PRESENTE' : 'AUSENTE');

    if (!webhookSecret) {
      console.error(`❌ Webhook Error: Webhook secret para modo ${isTestMode ? 'TESTE' : 'LIVE'} não encontrado.`);
      throw new Error('Webhook secret não configurado para o modo atual');
    }

    console.log('🔄 Tentando construir evento do Stripe...');
    event = localStripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log('✅ Evento construído com sucesso!', event.type);
  } catch (err: any) {
    console.error('❌ ERRO CRÍTICO no webhook Stripe (dinâmico):', err.message);
    console.error('❌ Stack trace:', err.stack);
    console.error('❌ Signature recebida:', sig);
    console.error('❌ Body recebido (primeiros 200 chars):', req.body ? req.body.toString().substring(0, 200) : 'VAZIO');
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  console.log(`[Webhook] Processando evento: ${event.type} (modo: ${isTestMode ? 'test' : 'live'})`);

  switch (event.type) {
    case 'checkout.session.completed':
      try {
        const session = event.data.object;

        // === LOGS DE DEBUG DETALHADOS ===
        console.log('=== WEBHOOK DEBUG ===');
        console.log('Event type:', event.type);
        console.log('Session metadata:', session.metadata);
        console.log('Client reference ID:', session.client_reference_id);
        console.log('Session ID:', session.id);
        console.log('Customer ID:', session.customer);
        console.log('Subscription ID:', session.subscription);
        console.log('Session object completo:', JSON.stringify(session, null, 2));
        console.log('===================');

        console.log('[Webhook] checkout.session.completed - Session ID:', session.id);

        // Extrair informações da sessão
        const { userId, storeId, plan, interval } = extractSessionData(session);

        // === LOGS DE DEBUG PARA DADOS EXTRAÍDOS ===
        console.log('=== DADOS EXTRAÍDOS DEBUG ===');
        console.log('userId extraído:', userId);
        console.log('storeId extraído:', storeId);
        console.log('plan extraído:', plan);
        console.log('interval extraído:', interval);
        console.log('==============================');

        if (!userId || !storeId || !plan) {
          console.error('[Webhook] ❌ Dados incompletos na sessão:', { userId, storeId, plan });
          console.error('[Webhook] ❌ Session metadata era:', session.metadata);
          console.error('[Webhook] ❌ Client reference ID era:', session.client_reference_id);
          break;
        }

        // === LOG ANTES DA ATUALIZAÇÃO ===
        console.log(`[Webhook] 🔄 INICIANDO atualização - User: ${userId}, Store: ${storeId}, Plan: ${plan}`);

        // Atualizar assinatura da loja específica
        await updateStoreSubscription(userId, storeId, {
          plan,
          interval,
          subscriptionId: session.subscription,
          customerId: session.customer
        });

        // === LOG APÓS A ATUALIZAÇÃO ===
        console.log(`[Webhook] ✅ CONCLUÍDA atualização - User: ${userId}, Store: ${storeId}, Plan: ${plan}`);
      } catch (error) {
        console.error('[Webhook] ❌ Erro ao processar checkout.session.completed:', error);
        console.error('[Webhook] ❌ Stack trace:', error.stack);
      }
      break;

    case 'customer.subscription.updated':
      try {
        const subscription = event.data.object;
        console.log('[Webhook] customer.subscription.updated - Subscription ID:', subscription.id);

        // Encontrar a loja pelo stripeSubscriptionId
        const store = await db.query.stores.findFirst({
          where: (stores, { eq }) => eq(stores.stripeSubscriptionId, subscription.id)
        });

        if (store) {
          await db.update(stores)
            .set({
              subscriptionStatus: subscription.status === 'active' ? 'active' : subscription.status
            })
            .where(eq(stores.id, store.id));

          console.log(`[Webhook] ✅ Status da assinatura da loja ${store.id} atualizado para ${subscription.status}`);
        } else {
          console.warn('[Webhook] ⚠️ Loja não encontrada para subscription ID:', subscription.id);
        }
      } catch (error) {
        console.error('[Webhook] ❌ Erro ao processar customer.subscription.updated:', error);
      }
      break;

    case 'customer.subscription.deleted':
      try {
        const subscription = event.data.object;
        console.log('[Webhook] customer.subscription.deleted - Subscription ID:', subscription.id);

        // Encontrar a loja pelo stripeSubscriptionId
        const store = await db.query.stores.findFirst({
          where: (stores, { eq }) => eq(stores.stripeSubscriptionId, subscription.id)
        });

        if (store) {
          await db.update(stores)
            .set({
              subscriptionPlan: 'freemium',
              subscriptionStatus: 'canceled',
              stripeSubscriptionId: null
            })
            .where(eq(stores.id, store.id));

          console.log(`[Webhook] ✅ Assinatura da loja ${store.id} cancelada, revertida para freemium`);
        } else {
          console.warn('[Webhook] ⚠️ Loja não encontrada para subscription ID:', subscription.id);
        }
      } catch (error) {
        console.error('[Webhook] ❌ Erro ao processar customer.subscription.deleted:', error);
      }
      break;

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('💰 Payment succeeded for invoice:', invoice.id);

        if (invoice.subscription) {
          const localStripe = getStripeClient();
          if (!localStripe) {
            console.error('Stripe não pôde ser inicializado.');
            return res.status(500).send('Webhook Error: Payment service not available');
          }
          const subscription = await localStripe.subscriptions.retrieve(invoice.subscription as string);
          const userId = parseInt(subscription.metadata?.userId || '');
          const storeId = parseInt(subscription.metadata?.storeId || '');

          if (userId && storeId) {
            console.log(`💰 Processando pagamento bem-sucedido - User: ${userId}, Store: ${storeId}`);
            await handlePaymentSucceeded(subscription, userId, storeId);
          } else {
            console.error('❌ UserId ou StoreId não encontrado no metadata da subscription');
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('❌ Payment failed for invoice:', invoice.id);

        if (invoice.subscription) {
          const localStripe = getStripeClient();
          if (!localStripe) {
            console.error('Stripe não pôde ser inicializado.');
            return res.status(500).send('Webhook Error: Payment service not available');
          }
          const subscription = await localStripe.subscriptions.retrieve(invoice.subscription as string);
          const userId = parseInt(subscription.metadata?.userId || '');
          const storeId = parseInt(subscription.metadata?.storeId || '');

          if (userId && storeId) {
            console.log(`❌ Processando falha de pagamento - User: ${userId}, Store: ${storeId}`);
            await handlePaymentFailed(subscription, userId, storeId);
          } else {
            console.error('❌ UserId ou StoreId não encontrado no metadata da subscription');
          }
        }
        break;
      }

    default:
      console.log(`[Webhook] Evento não tratado (dinâmico): ${event.type}`);
  }

  console.log(`🏁 WEBHOOK PROCESSADO COMPLETAMENTE - Modo: ${isTestMode ? 'test' : 'live'}`);
  res.json({ received: true, mode: isTestMode ? 'test' : 'live' });
};

export const testWebhook = async (req: Request, res: Response) => {
  console.log('🧪 TESTE DE WEBHOOK CHAMADO!');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);

  res.json({ 
    success: true, 
    message: 'Webhook endpoint está acessível',
    timestamp: new Date().toISOString(),
    method: req.method
  });
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
    await db.update(stores).set({ 
      subscriptionStatus: 'canceled', 
      subscriptionPlan: 'freemium' 
    }).where(eq(stores.id, store.id));

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

    const user = await db.query.users.findFirst({ 
      where: (users, { eq }) => eq(users.id, req.session.userId as number) 
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Assumindo que existe um campo planId ou similar para determinar o plano
    const isEligible = true; // Implementar lógica baseada no plano da loja

    res.json({ isEligible });
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

    const user = await db.query.users.findFirst({ 
      where: (users, { eq }) => eq(users.id, req.session.userId as number) 
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Assumindo que existe um campo planId ou similar para determinar o plano
    const isEligible = true; // Implementar lógica baseada no plano da loja
    let couponLimit = 0;

    // Implementar lógica baseada no plano
    couponLimit = -1; // Sem limite por enquanto

    res.json({ isEligible, couponLimit });
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
        recurring: p.recurring?.interval
      }))
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