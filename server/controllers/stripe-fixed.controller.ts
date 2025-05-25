import { Request, Response } from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';

// Verificar se a chave do Stripe existe
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY não está configurada');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia'
});

// Definição dos planos de assinatura
const SUBSCRIPTION_PLANS = {
  freemium: {
    name: 'Freemium',
    price: 0,
    interval: 'month',
    features: ['Até 5 produtos', 'Suporte básico'],
    stripePriceId: null // Plano gratuito
  },
  start: {
    name: 'Start',
    price: 2990, // R$ 29,90 em centavos
    interval: 'month',
    features: ['Até 50 produtos', 'Analytics básicas', 'Suporte email'],
    stripePriceId: 'price_start_plan'
  },
  pro: {
    name: 'Pro',
    price: 5990, // R$ 59,90 em centavos
    interval: 'month',
    features: ['Produtos ilimitados', 'Analytics avançadas', 'Suporte prioritário'],
    stripePriceId: 'price_pro_plan'
  },
  premium: {
    name: 'Premium',
    price: 9990, // R$ 99,90 em centavos
    interval: 'month',
    features: ['Tudo do Pro', 'API personalizada', 'Suporte 24/7'],
    stripePriceId: 'price_premium_plan'
  }
};

export const getPlans = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      plans: SUBSCRIPTION_PLANS
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar planos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    console.log('🚀 Função createCheckoutSession chamada');
    console.log('📦 Dados recebidos:', req.body);
    
    const { plan, storeId } = req.body;
    
    console.log('🔍 Plan:', plan, 'StoreId:', storeId);
    console.log('👤 Usuário autenticado:', !!req.user);

    // Para teste, vamos usar um usuário mock se não houver autenticação
    const user = req.user || { id: 1, email: 'test@test.com' };
    console.log('👤 Usuário sendo usado:', user);

    // Verificar se o plano existe
    if (!SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS]) {
      return res.status(400).json({
        success: false,
        error: 'Plano inválido'
      });
    }

    const selectedPlan = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS];

    // Para o plano freemium, não precisa do Stripe
    if (plan === 'freemium') {
      // Atualizar diretamente no banco de dados
      await storage.updateStoreStripeInfo(storeId, {
        subscriptionPlan: 'freemium',
        subscriptionStatus: 'active',
        subscriptionStartDate: new Date(),
        subscriptionEndDate: null
      });

      return res.json({
        success: true,
        message: 'Plano freemium ativado com sucesso',
        redirect: '/seller/dashboard'
      });
    }

    // Verificar se as chaves do Stripe estão configuradas
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Chaves do Stripe não configuradas. Entre em contato com o suporte.'
      });
    }

    // Criar sessão de checkout do Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `Plano ${selectedPlan.name}`,
            },
            unit_amount: selectedPlan.price,
            recurring: {
              interval: selectedPlan.interval as 'month',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        storeId: storeId.toString(),
        plan: plan,
        userId: user.id.toString()
      },
      success_url: `${req.headers.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/subscription/plans`,
    });

    console.log('✅ Sessão de checkout criada:', session.id);

    res.json({
      success: true,
      url: session.url
    });

  } catch (error: any) {
    console.error('❌ ERRO DETALHADO ao criar sessão de checkout:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor',
      details: error.stack
    });
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('❌ STRIPE_WEBHOOK_SECRET não configurado');
    return res.status(400).send('Webhook secret não configurado');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('❌ Erro na verificação do webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('✅ Checkout concluído:', session.id);
        
        if (session.metadata) {
          await storage.updateStoreStripeInfo(parseInt(session.metadata.storeId), {
            stripeCustomerId: session.customer as string,
            subscriptionPlan: session.metadata.plan as any,
            subscriptionStatus: 'active',
            subscriptionStartDate: new Date()
          });
        }
        break;
        
      case 'invoice.payment_succeeded':
        console.log('✅ Pagamento bem-sucedido');
        break;
        
      case 'invoice.payment_failed':
        console.log('❌ Falha no pagamento');
        break;
        
      default:
        console.log(`Evento não tratado: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('❌ Erro ao processar webhook:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getSubscriptionStatus = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    const store = await storage.getStore(parseInt(storeId));
    
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Loja não encontrada'
      });
    }

    res.json({
      success: true,
      subscription: {
        plan: store.subscriptionPlan || 'freemium',
        status: store.subscriptionStatus || 'active',
        startDate: store.subscriptionStartDate,
        endDate: store.subscriptionEndDate
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao buscar status da assinatura:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};