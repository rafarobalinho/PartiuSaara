
export default async function handler(req, res) {
  console.log('🚀 === STRIPE CHECKOUT START ===');
  console.log('Method:', req.method);
  console.log('Body:', req.body);

  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { planId, interval } = req.body || {};

    console.log('📦 Plan ID:', planId);

    if (!planId) {
      console.log('❌ Plan ID missing');
      return res.status(400).json({ 
        error: 'Plan ID é obrigatório',
        received: { planId, interval }
      });
    }

    // ===== FREEMIUM - SEM STRIPE =====
    if (planId === 'freemium') {
      console.log('✅ Freemium plan - ativando localmente');
      
      return res.status(200).json({
        success: true,
        message: 'Plano freemium ativado com sucesso',
        planType: 'freemium',
        needsRedirect: false,
        timestamp: new Date().toISOString()
      });
    }

    // ===== PLANOS PAGOS =====
    console.log('💳 Plano pago - verificando Stripe...');

    let Stripe;
    try {
      Stripe = require('stripe');
      console.log('✅ Stripe library loaded');
    } catch (error) {
      console.error('❌ Stripe not found:', error);
      return res.status(500).json({
        error: 'Sistema de pagamento indisponível',
        details: 'Execute: npm install stripe'
      });
    }

    const isTestMode = process.env.STRIPE_MODE === 'test';
    const secretKey = isTestMode 
      ? process.env.STRIPE_SECRET_KEY_TEST 
      : process.env.STRIPE_SECRET_KEY;

    console.log('🔧 Stripe config:', {
      mode: isTestMode ? 'TEST' : 'LIVE',
      keyExists: !!secretKey
    });

    if (!secretKey) {
      const missingKey = isTestMode ? 'STRIPE_SECRET_KEY_TEST' : 'STRIPE_SECRET_KEY';
      console.error('❌ Missing key:', missingKey);
      
      return res.status(500).json({
        error: 'Configuração Stripe ausente',
        missingKey,
        mode: isTestMode ? 'test' : 'live'
      });
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });

    // Price mapping - SUBSTITUA PELOS SEUS PRICE IDs
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

    const priceId = priceMapping[planId]?.[interval || 'monthly'];

    if (!priceId) {
      return res.status(400).json({
        error: 'Configuração de preço não encontrada',
        planId,
        interval,
        availablePlans: Object.keys(priceMapping)
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000';
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: { 
        planId, 
        interval: interval || 'monthly',
        mode: isTestMode ? 'test' : 'live'
      }
    });

    console.log('✅ Session created:', session.id);

    return res.status(200).json({
      success: true,
      url: session.url,
      sessionId: session.id,
      planType: planId,
      needsRedirect: true,
      mode: isTestMode ? 'test' : 'live'
    });

  } catch (error) {
    console.error('❌ Stripe checkout error:', error);
    
    return res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message,
      type: error.type || 'unknown'
    });
  }
}
