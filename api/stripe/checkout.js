
// /api/stripe/checkout.js
export default async function handler(req, res) {
  console.log('🚀 === STRIPE CHECKOUT START ===');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);

  // Configurar headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  // Handle OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ 
      error: 'Method not allowed',
      method: req.method,
      allowedMethods: ['POST']
    });
  }

  try {
    // Para plano freemium, retornar sucesso sem checkout
    if (req.body && req.body.planId === 'freemium') {
      console.log('✅ Plano freemium selecionado - sem pagamento necessário');
      return res.status(200).json({ 
        success: true, 
        message: 'Plano Freemium ativado',
        redirect: false,
        mode: process.env.STRIPE_MODE === 'test' ? 'test' : 'live'
      });
    }

    // Qualquer outro plano - simular resposta
    return res.status(200).json({
      success: true,
      message: 'Endpoint de checkout funcionando',
      planRequested: req.body?.planId || 'não especificado',
      timestamp: new Date().toISOString(),
      mode: process.env.STRIPE_MODE === 'test' ? 'test' : 'live'
    });

  } catch (error) {
    console.error('❌ Stripe checkout error:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
