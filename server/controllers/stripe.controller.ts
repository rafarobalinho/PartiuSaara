
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';
import { sellerMiddleware } from '../middleware/auth';

// Inicializa o cliente Stripe com a chave secreta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Cria uma sessão de checkout do Stripe
export async function createCheckoutSession(req: Request, res: Response) {
  try {
    // Verificar se o usuário é vendedor
    sellerMiddleware(req, res, async () => {
      const user = req.user!;
      
      // Validar dados da requisição
      const { planId, interval } = req.body;
      if (!planId || !interval) {
        return res.status(400).json({ message: 'Dados de plano e intervalo são obrigatórios' });
      }
      
      // Obter detalhes do plano
      const subscriptionPlans = [
        {
          id: 'freemium',
          name: 'Freemium',
          price: { monthly: 0, yearly: 0 }
        },
        {
          id: 'start',
          name: 'Start',
          price: { monthly: 149.90, yearly: 1439.00 }
        },
        {
          id: 'pro',
          name: 'Pro',
          price: { monthly: 249.90, yearly: 2399.00 }
        },
        {
          id: 'premium',
          name: 'Premium',
          price: { monthly: 349.90, yearly: 3359.00 }
        }
      ];
      
      const plan = subscriptionPlans.find(p => p.id === planId);
      if (!plan) {
        return res.status(404).json({ message: 'Plano não encontrado' });
      }
      
      // Obter a loja do usuário
      const stores = await storage.getStores({ search: '' });
      const userStore = stores.find(store => store.userId === user.id);
      
      if (!userStore) {
        return res.status(404).json({ message: 'Loja não encontrada. Por favor, crie uma loja primeiro.' });
      }
      
      // Determinar o preço com base no intervalo
      const unitAmount = interval === 'monthly' 
        ? Math.round(plan.price.monthly * 100) 
        : Math.round(plan.price.yearly * 100);
      
      // Criar produto e preço no Stripe (ou obter se já existir)
      let product;
      try {
        product = await stripe.products.retrieve(`plan_${planId}`);
      } catch (error) {
        product = await stripe.products.create({
          id: `plan_${planId}`,
          name: `${plan.name} ${interval === 'monthly' ? 'Mensal' : 'Anual'}`,
          metadata: {
            planId,
            interval
          }
        });
      }
      
      // Criar um preço para o produto
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: unitAmount,
        currency: 'brl',
        recurring: {
          interval: interval === 'monthly' ? 'month' : 'year',
        },
        metadata: {
          planId,
          interval
        }
      });
      
      // Criar a sessão de checkout
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.CLIENT_URL}/seller/subscription?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${process.env.CLIENT_URL}/seller/subscription?canceled=true`,
        customer_email: user.email,
        metadata: {
          userId: user.id.toString(),
          storeId: userStore.id.toString(),
          planId,
          interval
        }
      });
      
      res.json({ sessionId: session.id, url: session.url });
    });
  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

// Webhook para receber eventos do Stripe
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!endpointSecret) {
    return res.status(500).json({ message: 'Chave de webhook não configurada' });
  }

  let event;

  try {
    // Verificar assinatura do webhook
    event = stripe.webhooks.constructEvent(
      req.body, 
      sig, 
      endpointSecret
    );
  } catch (err: any) {
    console.error(`Erro na assinatura do webhook: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Processar eventos específicos
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object);
      break;
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCancelled(event.data.object);
      break;
    default:
      console.log(`Evento não tratado: ${event.type}`);
  }

  res.json({ received: true });
}

// Processar checkout concluído
async function handleCheckoutSessionCompleted(session: any) {
  try {
    // Extrair metadados da sessão
    const { userId, storeId, planId, interval } = session.metadata;
    
    if (!userId || !storeId || !planId) {
      console.error('Metadados incompletos na sessão de checkout');
      return;
    }
    
    // Calcular data de término da assinatura
    const now = new Date();
    const endDate = new Date(now);
    if (interval === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    
    // Atualizar a loja com os dados da assinatura
    await storage.updateStore(parseInt(storeId), {
      subscriptionPlan: planId,
      subscriptionEndDate: endDate
    });
    
    console.log(`Assinatura atualizada para loja ${storeId}: ${planId} até ${endDate}`);
  } catch (error) {
    console.error('Erro ao processar checkout concluído:', error);
  }
}

// Processar pagamento de fatura (renovações)
async function handleInvoicePaid(invoice: any) {
  try {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const { storeId, planId, interval } = subscription.metadata;
    
    if (!storeId || !planId) {
      console.error('Metadados incompletos na assinatura');
      return;
    }
    
    // Calcular nova data de término
    const now = new Date();
    const endDate = new Date(now);
    if (interval === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    
    // Atualizar a loja
    await storage.updateStore(parseInt(storeId), {
      subscriptionEndDate: endDate
    });
    
    console.log(`Assinatura renovada para loja ${storeId} até ${endDate}`);
  } catch (error) {
    console.error('Erro ao processar pagamento de fatura:', error);
  }
}

// Processar atualização de assinatura
async function handleSubscriptionUpdated(subscription: any) {
  // Implementar lógica para atualização de assinatura
  console.log('Assinatura atualizada:', subscription.id);
}

// Processar cancelamento de assinatura
async function handleSubscriptionCancelled(subscription: any) {
  try {
    const { storeId } = subscription.metadata;
    
    if (!storeId) {
      console.error('ID da loja não encontrado nos metadados da assinatura');
      return;
    }
    
    // Downgrade para freemium
    await storage.updateStore(parseInt(storeId), {
      subscriptionPlan: 'freemium',
      subscriptionEndDate: null
    });
    
    console.log(`Assinatura cancelada para loja ${storeId}, downgrade para freemium`);
  } catch (error) {
    console.error('Erro ao processar cancelamento de assinatura:', error);
  }
}
