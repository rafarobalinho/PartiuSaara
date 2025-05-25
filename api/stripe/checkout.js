
export default async function handler(req, res) {
  console.log('🚀 === STRIPE CHECKOUT START ===');
  
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { planId, interval, userId, redirectUrl } = req.body || {};

    console.log('📦 Plan ID:', planId);
    console.log('📦 Interval:', interval || 'monthly');
    console.log('📦 User ID:', userId);

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
      : process.env.STRIPE_SECRET_KEY_LIVE;

    console.log('🔧 Stripe config:', {
      mode: isTestMode ? 'TEST' : 'LIVE',
      keyExists: !!secretKey
    });

    if (!secretKey) {
      const missingKey = isTestMode ? 'STRIPE_SECRET_KEY_TEST' : 'STRIPE_SECRET_KEY_LIVE';
      console.error('❌ Missing key:', missingKey);
      
      return res.status(500).json({
        error: 'Configuração Stripe ausente',
        missingKey,
        mode: isTestMode ? 'test' : 'live'
      });
    }

    const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });

    // Price mapping
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

    // Obter ou criar customer se userId fornecido
    let customerId;
    if (userId) {
      try {
        // Aqui você buscaria o usuário no banco e obteria/criaria um customer
        // Exemplo simplificado
        const user = { id: userId, email: 'usuario@exemplo.com' };
        
        // Verificar se já existe um customerId
        // Se não, criar um novo customer
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: user.id.toString() }
        });
        
        customerId = customer.id;
      } catch (customerError) {
        console.error('❌ Customer error:', customerError);
        return res.status(500).json({
          error: 'Erro ao criar cliente no Stripe',
          details: customerError.message
        });
      }
    }

    // Determinar URLs de redirecionamento
    const baseUrl = redirectUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000';
    const successUrl = `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/pricing`;
    
    // Criar sessão de checkout
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { 
        planId, 
        interval: interval || 'monthly',
        userId: userId?.toString(),
        mode: isTestMode ? 'test' : 'live'
      }
    };

    // Adicionar customerId se disponível
    if (customerId) {
      sessionConfig.customer = customerId;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

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
