
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para logs de requisições detalhados
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log de entrada da requisição
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Captura o método original para interceptar a resposta
  const originalSend = res.send;
  
  // Substitui o método para interceptar a resposta e adicionar logs
  res.send = function(body) {
    const duration = Date.now() - start;
    
    // Log da resposta
    console.log(`[${new Date().toISOString()}] Resposta: ${res.statusCode} (${duration}ms)`);
    
    // Se houver erro (status 4xx ou 5xx), log mais detalhado
    if (res.statusCode >= 400) {
      console.error(`[ERRO] ${req.method} ${req.url} - Status: ${res.statusCode}`);
      
      // Tentar extrair mensagem de erro do corpo se for JSON
      try {
        const bodyObj = typeof body === 'string' ? JSON.parse(body) : body;
        if (bodyObj && bodyObj.error) {
          console.error(`[ERRO] Mensagem: ${bodyObj.error}`);
          if (bodyObj.details) console.error(`[ERRO] Detalhes: ${bodyObj.details}`);
        }
      } catch (e) {
        // Falha ao parsear, log do body como está
        if (body && typeof body === 'string' && body.length < 500) {
          console.error(`[ERRO] Corpo da resposta: ${body}`);
        }
      }
    }
    
    // Chama o método original
    return originalSend.call(this, body);
  };
  
  next();
};

/**
 * Middleware para tratamento global de erros 
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[ERRO GLOBAL]', err);
  
  // Verificar se já houve resposta
  if (res.headersSent) {
    return next(err);
  }
  
  // Enviar resposta de erro formatada
  res.status(err.status || 500).json({
    error: 'Erro interno do servidor',
    message: err.message || 'Ocorreu um erro inesperado',
    path: req.path,
    timestamp: new Date().toISOString()
  });
};
