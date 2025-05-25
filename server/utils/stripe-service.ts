
import Stripe from 'stripe';
import { initStripe, getPriceId, getStripeMode } from './stripe-config';
import * as db from '../db';

// Classe de serviço para operações do Stripe
export class StripeService {
  private stripe: Stripe | null;
  private isTestMode: boolean;

  constructor() {
    this.stripe = initStripe();
    this.isTestMode = getStripeMode() === 'test';
  }

  // Verificar se o Stripe está inicializado
  private checkStripe(): Stripe {
    if (!this.stripe) {
      throw new Error('Stripe não inicializado');
    }
    return this.stripe;
  }

  // Criar ou recuperar um cliente no Stripe
  async getOrCreateCustomer(user: any): Promise<string> {
    const stripe = this.checkStripe();
    
    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }
    
    try {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        metadata: {
          userId: user.id.toString()
        }
      });
      
      // Atualizar usuário com o ID do cliente
      await db.update(db.users).set({
        stripeCustomerId: customer.id
      }).where(db.eq(db.users.id, user.id));
      
      return customer.id;
    } catch (error) {
      console.error('Erro ao criar cliente Stripe:', error);
      throw error;
    }
  }

  // Criar sessão de checkout
  async createCheckoutSession(
    customerId: string, 
    planId: string, 
    interval: 'monthly' | 'yearly' = 'monthly',
    userId: number,
    successUrl: string,
    cancelUrl: string
  ) {
    const stripe = this.checkStripe();
    const priceId = getPriceId(planId, interval);
    
    // Se for plano freemium, retornar resposta especial
    if (!priceId) {
      return {
        success: true,
        message: 'Plano freemium ativado',
        needsRedirect: false,
        mode: this.isTestMode ? 'test' : 'live'
      };
    }
    
    try {
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
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: userId.toString(),
          planId,
          interval,
          mode: this.isTestMode ? 'test' : 'live'
        }
      });
      
      return {
        success: true,
        url: session.url,
        sessionId: session.id,
        mode: this.isTestMode ? 'test' : 'live'
      };
    } catch (error) {
      console.error('Erro ao criar sessão de checkout:', error);
      throw error;
    }
  }

  // Verificar assinatura
  async getSubscription(subscriptionId: string) {
    const stripe = this.checkStripe();
    
    try {
      return await stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      console.error('Erro ao obter assinatura:', error);
      throw error;
    }
  }

  // Cancelar assinatura
  async cancelSubscription(subscriptionId: string) {
    const stripe = this.checkStripe();
    
    try {
      return await stripe.subscriptions.cancel(subscriptionId);
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      throw error;
    }
  }

  // Atualizar assinatura (por exemplo, mudar de plano)
  async updateSubscription(subscriptionId: string, newPriceId: string) {
    const stripe = this.checkStripe();
    
    try {
      return await stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscriptionId, // item ID, não o subscription ID
            price: newPriceId,
          },
        ],
      });
    } catch (error) {
      console.error('Erro ao atualizar assinatura:', error);
      throw error;
    }
  }

  // Verificar webhook
  verifyWebhookSignature(payload: string, signature: string, webhookSecret: string) {
    const stripe = this.checkStripe();
    
    try {
      return stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );
    } catch (error) {
      console.error('Erro ao verificar assinatura do webhook:', error);
      throw error;
    }
  }
}

// Exportar uma instância para uso global
export const stripeService = new StripeService();
