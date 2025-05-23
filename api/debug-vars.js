
export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'undefined',
        STRIPE_MODE: process.env.STRIPE_MODE || 'undefined',
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'undefined'
      },
      stripeKeys: {
        STRIPE_SECRET_KEY_TEST: !!process.env.STRIPE_SECRET_KEY_TEST,
        STRIPE_PUBLIC_KEY_TEST: !!process.env.STRIPE_PUBLIC_KEY_TEST,
        STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
        STRIPE_PUBLIC_KEY: !!process.env.STRIPE_PUBLIC_KEY
      },
      activeMode: (process.env.STRIPE_MODE === 'test') ? 'TEST' : 'LIVE',
      activeSecretKey: (() => {
        if (process.env.STRIPE_MODE === 'test') {
          return process.env.STRIPE_SECRET_KEY_TEST ? 'CONFIGURADA' : 'AUSENTE';
        } else {
          return process.env.STRIPE_SECRET_KEY ? 'CONFIGURADA' : 'AUSENTE';
        }
      })()
    };

    console.log('🔍 Debug info:', debugInfo);
    return res.status(200).json(debugInfo);

  } catch (error) {
    console.error('❌ Debug error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
