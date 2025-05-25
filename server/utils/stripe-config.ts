
import Stripe from 'stripe';

// Função para determinar o ambiente Stripe (test/live)
export const getStripeMode = (): 'test' | 'live' => {
  const mode = process.env.STRIPE_MODE || 'test';
  return mode === 'test' ? 'test' : 'live';
};

// Função para obter a chave Stripe correta baseada no ambiente
export const getStripeSecretKey = (): string => {
  const isTestMode = getStripeMode() === 'test';
  
  const secretKey = isTestMode 
    ? process.env.STRIPE_SECRET_KEY_TEST 
    : process.env.STRIPE_SECRET_KEY_LIVE;
  
  if (!secretKey) {
    console.error(`Chave Stripe ${isTestMode ? 'TEST' : 'LIVE'} não configurada`);
    throw new Error(`Chave Stripe ${isTestMode ? 'TEST' : 'LIVE'} não configurada`);
  }
  
  return secretKey;
};

// Função para inicializar o cliente Stripe
export const initStripe = (): Stripe | null => {
  try {
    const secretKey = getStripeSecretKey();
    return new Stripe(secretKey, { apiVersion: '2023-10-16' });
  } catch (error) {
    console.error('Erro ao inicializar Stripe:', error);
    return null;
  }
};

// Mapeamento de planos para Price IDs
export const getPriceId = (planId: string, interval: 'monthly' | 'yearly' = 'monthly'): string | null => {
  const isTestMode = getStripeMode() === 'test';
  
  // Plano freemium não tem pagamento
  if (planId === 'freemium') {
    return null;
  }
  
  const priceMapping = {
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
  
  return priceMapping[planId]?.[interval] || null;
};
