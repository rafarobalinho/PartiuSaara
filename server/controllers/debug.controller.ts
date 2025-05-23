
import { Request, Response } from 'express';

export const getDiagnostics = async (req: Request, res: Response) => {
  try {
    // Verificar todas as variáveis de ambiente
    const diagnostics = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      
      // Verificar variáveis
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        STRIPE_MODE: process.env.STRIPE_MODE,
        APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        FRONTEND_URL: process.env.FRONTEND_URL,
        CLIENT_URL: process.env.CLIENT_URL
      },
      
      // Verificar chaves (sem expor valores completos)
      keys: {
        test_secret: process.env.STRIPE_SECRET_KEY_TEST ? 
          `${process.env.STRIPE_SECRET_KEY_TEST.substring(0, 8)}...` : null,
        test_public: process.env.STRIPE_PUBLIC_KEY_TEST ? 
          `${process.env.STRIPE_PUBLIC_KEY_TEST.substring(0, 8)}...` : null,
        live_secret: process.env.STRIPE_SECRET_KEY_LIVE ? 
          `${process.env.STRIPE_SECRET_KEY_LIVE.substring(0, 8)}...` : null,
        live_public: process.env.STRIPE_PUBLISHABLE_KEY_LIVE ? 
          `${process.env.STRIPE_PUBLISHABLE_KEY_LIVE.substring(0, 8)}...` : null,
      },
      
      // Status das chaves
      stripe_config: {
        mode: process.env.STRIPE_MODE === 'test' ? 'TEST' : 'LIVE',
        active_mode: process.env.STRIPE_MODE || 'undefined',
        active_secret_key: process.env.STRIPE_MODE === 'test' 
          ? (process.env.STRIPE_SECRET_KEY_TEST ? 'CONFIGURED' : 'MISSING')
          : (process.env.STRIPE_SECRET_KEY_LIVE ? 'CONFIGURED' : 'MISSING')
      },
      
      // Headers da requisição (para debug)
      request_headers: {
        host: req.headers.host,
        origin: req.headers.origin,
        referer: req.headers.referer,
        userAgent: req.headers['user-agent']
      }
    };

    console.log('🔍 DIAGNOSTICS:', JSON.stringify(diagnostics, null, 2));

    return res.status(200).json({
      success: true,
      message: 'Diagnóstico concluído - verifique os logs',
      data: diagnostics
    });

  } catch (error) {
    console.error('❌ DIAGNOSTIC ERROR:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Erro no diagnóstico',
      details: error.message,
      stack: error.stack
    });
  }
};

export const getStripePrices = async (req: Request, res: Response) => {
  try {
    const isTestMode = process.env.STRIPE_MODE === 'test';
    const stripeSecretKey = isTestMode 
      ? process.env.STRIPE_SECRET_KEY_TEST 
      : process.env.STRIPE_SECRET_KEY_LIVE;
    
    if (!stripeSecretKey) {
      return res.status(500).json({
        success: false,
        error: `Missing Stripe Secret Key for ${isTestMode ? 'TEST' : 'LIVE'} mode`
      });
    }

    const Stripe = require('stripe');
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16'
    });

    // Listar produtos e preços
    const products = await stripe.products.list({ limit: 10 });
    const prices = await stripe.prices.list({ limit: 20 });

    return res.status(200).json({
      success: true,
      mode: isTestMode ? 'test' : 'live',
      products: products.data.map(p => ({
        id: p.id,
        name: p.name,
        active: p.active
      })),
      prices: prices.data.map(p => ({
        id: p.id,
        product: p.product,
        unit_amount: p.unit_amount,
        currency: p.currency,
        recurring: p.recurring?.interval
      }))
    });

  } catch (error) {
    console.error('❌ STRIPE PRICES ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      type: error.type || error.name
    });
  }
};
