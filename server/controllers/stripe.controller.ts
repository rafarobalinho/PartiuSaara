import { Request, Response } from 'express';
import Stripe from 'stripe';

// Verifica se a chave do Stripe está definida no ambiente
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || null;

// Logs para diagnóstico
console.log('Stripe Controller: Inicializando...');
console.log(`STRIPE_SECRET_KEY configurada: ${STRIPE_SECRET_KEY ? 'Sim' : 'Não'}`);
console.log(`FRONTEND_URL configurado: ${FRONTEND_URL || '(não definido)'}`);

// Inicializa o Stripe somente se a chave secreta estiver disponível
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null;

if (stripe) {
  console.log('Stripe inicializado com sucesso!');
} else {
  console.error('ERRO: Stripe não pôde ser inicializado. Verifique a variável STRIPE_SECRET_KEY.');
}

export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    // Verifica se o Stripe foi inicializado
    if (!stripe) {
      throw new Error('Stripe não está configurado. Verifique a variável STRIPE_SECRET_KEY.');
    }

    const { items, currency = 'brl' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Itens inválidos para checkout' });
    }

    // URL de redirecionamento após pagamento
    const successUrl = FRONTEND_URL
      ? `${FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`
      : `${req.protocol}://${req.get('host')}/payment/success?session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl = FRONTEND_URL
      ? `${FRONTEND_URL}/payment/canceled`
      : `${req.protocol}://${req.get('host')}/payment/canceled`;

    // Cria a sessão de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map((item: any) => ({
        price_data: {
          currency,
          product_data: {
            name: item.name,
            images: item.image ? [item.image] : [],
          },
          unit_amount: Math.round(item.price * 100), // Stripe usa centavos
        },
        quantity: item.quantity || 1,
      })),
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error);
    res.status(500).json({
      error: 'Falha ao processar o checkout',
      details: error.message
    });
  }
};

export const getStripePublicKey = (req: Request, res: Response) => {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return res.status(500).json({ error: 'Chave pública do Stripe não configurada' });
  }

  res.json({ publishableKey });
};

import { db } from '../db';

export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
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

  res.json({ received: true });
};

export const getSubscriptionDetails = async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, req.session.userId as number)
    });

    if (!user || !user.subscriptionId) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    const subscription = await stripe.subscriptions.retrieve(user.subscriptionId);
    res.json(subscription);
  } catch (error) {
    console.error('Erro ao obter detalhes da assinatura:', error);
    res.status(500).json({ error: 'Erro ao obter detalhes da assinatura' });
  }
};

export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, req.session.userId as number)
    });

    if (!user || !user.subscriptionId) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    await stripe.subscriptions.cancel(user.subscriptionId);

    // Atualizar usuário no banco de dados
    await db.update(db.users).set({
      subscriptionStatus: 'canceled',
      planId: 1  // Volta para o plano gratuito
    }).where(db.eq(db.users.id, user.id));

    res.json({ success: true, message: 'Assinatura cancelada com sucesso' });
  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error);
    res.status(500).json({ error: 'Erro ao cancelar assinatura' });
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