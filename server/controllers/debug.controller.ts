
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
        FRONTEND_URL: process.env.FRONTEND_URL,
        CLIENT_URL: process.env.CLIENT_URL
      },
      
      // Verificar chaves (sem expor valores)
      keys: {
        test_secret: !!process.env.STRIPE_SECRET_KEY_TEST,
        test_public: !!process.env.STRIPE_PUBLIC_KEY_TEST,
        live_secret: !!process.env.STRIPE_SECRET_KEY_LIVE,
        live_public: !!process.env.STRIPE_PUBLISHABLE_KEY_LIVE,
      },
      
      // Status das chaves
      stripe_config: {
        mode: process.env.STRIPE_MODE === 'test' ? 'TEST' : 'LIVE',
        active_secret_key: process.env.STRIPE_MODE === 'test' 
          ? (process.env.STRIPE_SECRET_KEY_TEST ? 'CONFIGURED' : 'MISSING')
          : (process.env.STRIPE_SECRET_KEY_LIVE ? 'CONFIGURED' : 'MISSING')
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
