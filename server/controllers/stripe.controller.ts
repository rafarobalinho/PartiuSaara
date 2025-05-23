import { Request, Response } from 'express';
import { db } from '../db';
import Stripe from 'stripe';

// Log para depuração
console.log("Stripe Controller: Inicializando...");
console.log("STRIPE_SECRET_KEY configurada:", process.env.STRIPE_SECRET_KEY ? "Sim" : "Não");
console.log("FRONTEND_URL configurado:", process.env.FRONTEND_URL || process.env.CLIENT_URL || "(não definido)");

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("ALERTA: STRIPE_SECRET_KEY não está definida no ambiente!");
}

// Inicialize o cliente Stripe com sua chave secreta
try {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey || stripeKey.trim() === '') {
    throw new Error('Chave do Stripe não configurada');
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2023-10-16',
  });
  
  console.log("Stripe inicializado com sucesso!");
} catch (error) {
  console.error("Erro ao inicializar o Stripe:", error);
  // Não lance o erro aqui, para que o servidor possa iniciar mesmo com erro no Stripe
  // Apenas emita um log de erro
}

// Variável global para o cliente Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) 
  : null;

export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    // Verificar se o Stripe foi inicializado corretamente
    if (!stripe) {
      console.error("Checkout falhou: Cliente Stripe não inicializado");
      return res.status(500).json({ 
        error: 'Serviço de pagamento não disponível no momento', 
        details: 'Configuração do Stripe incompleta'
      });
    }

    const { priceId, planId } = req.body;
    console.log("Criando sessão de checkout para priceId:", priceId, "planId:", planId);

    if (!req.session.userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Buscar dados do usuário e da loja
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, req.session.userId as number)
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Criar ou recuperar o Customer no Stripe
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: user.id.toString()
        }
      });

      customerId = customer.id;

      // Atualizar o usuário com o customerId do Stripe
      await db.update(db.users).set({
        stripeCustomerId: customerId
      }).where(db.eq(db.users.id, user.id));
    }

    // Criar a sessão de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/seller/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/seller/subscription?canceled=true`,
      metadata: {
        userId: user.id.toString(),
        planId: planId.toString()
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error);
    res.status(500).json({ error: 'Erro ao criar sessão de checkout' });
  }
};

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