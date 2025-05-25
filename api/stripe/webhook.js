
import { buffer } from 'micro';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const isTestMode = process.env.STRIPE_MODE === 'test';
  const webhookSecret = isTestMode 
    ? process.env.STRIPE_WEBHOOK_SECRET_TEST 
    : process.env.STRIPE_WEBHOOK_SECRET_LIVE;

  if (!webhookSecret) {
    console.error('Webhook secret não configurado');
    return res.status(500).json({ error: 'Webhook secret não configurado' });
  }

  try {
    // Obter o payload em formato raw
    const rawBody = await buffer(req);
    const signature = req.headers['stripe-signature'];

    // Carregar Stripe
    const Stripe = require('stripe');
    const stripeSecretKey = isTestMode 
      ? process.env.STRIPE_SECRET_KEY_TEST 
      : process.env.STRIPE_SECRET_KEY_LIVE;
    
    if (!stripeSecretKey) {
      return res.status(500).json({ error: 'Chave do Stripe não configurada' });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Verificar assinatura
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );

    // Processar eventos
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        // Processar pagamento confirmado
        console.log('Checkout completo:', session.id);
        // Implementar lógica adicional aqui
        break;

      case 'customer.subscription.updated':
        const subscription = event.data.object;
        console.log('Assinatura atualizada:', subscription.id);
        // Implementar lógica adicional aqui
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        console.log('Assinatura cancelada:', deletedSubscription.id);
        // Implementar lógica adicional aqui
        break;

      default:
        console.log(`Evento não processado: ${event.type}`);
    }

    // Retornar sucesso
    res.status(200).json({ received: true });
  } catch (err) {
    console.error(`Erro no webhook: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
