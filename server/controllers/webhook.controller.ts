
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { db } from '../db';
import { subscriptions, stores } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function handleStripeWebhook(req: Request, res: Response) {
  console.log('🚨 WEBHOOK CHAMADO! 🚨');
  console.log('Headers:', req.headers);
  console.log('Body type:', typeof req.body);
  
  const sig = req.headers['stripe-signature'];

  let event: Stripe.Event;

  try {
    if (!sig) {
      console.error('❌ Stripe signature missing');
      return res.status(400).send('Webhook signature missing');
    }

    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('✅ Webhook signature verified');
    console.log('Event type:', event.type);
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;
      default:
        console.log(`🔄 Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  
  console.log('=== CHECKOUT SESSION COMPLETED ===');
  console.log('Session ID:', session.id);
  console.log('Session metadata:', session.metadata);
  console.log('Client reference ID:', session.client_reference_id);
  console.log('Customer:', session.customer);
  console.log('Subscription:', session.subscription);

  try {
    const storeId = session.metadata?.storeId;
    const userId = session.metadata?.userId;
    const planType = session.metadata?.planType;

    if (!storeId || !userId || !planType) {
      console.error('❌ Missing required metadata:', { storeId, userId, planType });
      return;
    }

    // Verificar se a loja existe
    const [store] = await db.select().from(stores).where(eq(stores.id, parseInt(storeId)));
    if (!store) {
      console.error('❌ Store not found:', storeId);
      return;
    }

    // Criar ou atualizar subscription
    const subscriptionData = {
      storeId: parseInt(storeId),
      userId: parseInt(userId),
      stripeSubscriptionId: session.subscription as string,
      stripeCustomerId: session.customer as string,
      plan: planType,
      status: 'active' as const,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
      updatedAt: new Date()
    };

    // Verificar se já existe uma subscription para esta loja
    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.storeId, parseInt(storeId)));

    if (existingSubscription) {
      // Atualizar subscription existente
      await db
        .update(subscriptions)
        .set(subscriptionData)
        .where(eq(subscriptions.storeId, parseInt(storeId)));
      
      console.log('✅ Subscription updated for store:', storeId);
    } else {
      // Criar nova subscription
      await db.insert(subscriptions).values({
        ...subscriptionData,
        createdAt: new Date()
      });
      
      console.log('✅ New subscription created for store:', storeId);
    }

    // Atualizar status da loja
    await db
      .update(stores)
      .set({ 
        subscriptionStatus: 'active',
        updatedAt: new Date()
      })
      .where(eq(stores.id, parseInt(storeId)));

    console.log('✅ Store subscription status updated:', storeId);

  } catch (error) {
    console.error('❌ Error processing checkout session:', error);
    throw error;
  }
}

async function handleInvoicePaymentSucceeded(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  
  console.log('=== INVOICE PAYMENT SUCCEEDED ===');
  console.log('Invoice ID:', invoice.id);
  console.log('Subscription ID:', invoice.subscription);
  console.log('Customer ID:', invoice.customer);

  try {
    if (invoice.subscription) {
      // Buscar subscription no banco
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.stripeSubscriptionId, invoice.subscription as string));

      if (subscription) {
        // Atualizar status da subscription
        await db
          .update(subscriptions)
          .set({
            status: 'active',
            updatedAt: new Date()
          })
          .where(eq(subscriptions.stripeSubscriptionId, invoice.subscription as string));

        // Atualizar status da loja
        await db
          .update(stores)
          .set({
            subscriptionStatus: 'active',
            updatedAt: new Date()
          })
          .where(eq(stores.id, subscription.storeId));

        console.log('✅ Payment processed for store:', subscription.storeId);
      }
    }
  } catch (error) {
    console.error('❌ Error processing invoice payment:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  
  console.log('=== SUBSCRIPTION UPDATED ===');
  console.log('Subscription ID:', subscription.id);
  console.log('Status:', subscription.status);
  console.log('Customer:', subscription.customer);

  try {
    // Buscar subscription no banco
    const [dbSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

    if (dbSubscription) {
      const status = subscription.status === 'active' ? 'active' : 'inactive';
      
      // Atualizar subscription
      await db
        .update(subscriptions)
        .set({
          status: status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          updatedAt: new Date()
        })
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

      // Atualizar loja
      await db
        .update(stores)
        .set({
          subscriptionStatus: status,
          updatedAt: new Date()
        })
        .where(eq(stores.id, dbSubscription.storeId));

      console.log('✅ Subscription updated for store:', dbSubscription.storeId);
    }
  } catch (error) {
    console.error('❌ Error updating subscription:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  
  console.log('=== SUBSCRIPTION DELETED ===');
  console.log('Subscription ID:', subscription.id);
  console.log('Customer:', subscription.customer);

  try {
    // Buscar subscription no banco
    const [dbSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

    if (dbSubscription) {
      // Atualizar subscription para cancelada
      await db
        .update(subscriptions)
        .set({
          status: 'cancelled',
          updatedAt: new Date()
        })
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

      // Atualizar loja para inativa
      await db
        .update(stores)
        .set({
          subscriptionStatus: 'inactive',
          updatedAt: new Date()
        })
        .where(eq(stores.id, dbSubscription.storeId));

      console.log('✅ Subscription cancelled for store:', dbSubscription.storeId);
    }
  } catch (error) {
    console.error('❌ Error cancelling subscription:', error);
    throw error;
  }
}
