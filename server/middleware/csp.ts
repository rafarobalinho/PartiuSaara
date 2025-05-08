/**
 * Middleware para Content Security Policy (CSP)
 * 
 * Este middleware configura a política de segurança de conteúdo
 * para permitir recursos específicos como Google Maps API e outras fontes externas
 */
import { Express, Request, Response, NextFunction } from 'express';

/**
 * Configura o middleware CSP para a aplicação Express
 * 
 * @param app Instância do Express
 */
export function setupCSP(app: Express) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Configuração da política de segurança de conteúdo abrangente para Replit
    res.setHeader(
      'Content-Security-Policy',
      [
        // Origens padrão - mesmo domínio e dados inline
        "default-src 'self'",
        
        // Scripts - configuração mais permissiva para Replit
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://*.google.com https://*.replit.com https://cdnjs.cloudflare.com",
        
        // Estilos - permite inline e fontes
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
        
        // Fontes - Google Fonts e outros
        "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
        
        // Imagens - configuração permissiva para ambiente de desenvolvimento
        "img-src 'self' data: blob: * https://*.googleapis.com https://maps.gstatic.com https://placehold.co https://images.unsplash.com https://*.replit.app https://*.replit.dev",
        
        // Conectividade - configuração permissiva para ambiente de desenvolvimento
        "connect-src 'self' * https://*.googleapis.com https://maps.googleapis.com wss://*.replit.com https://*.replit.app https://*.replit.dev",
        
        // Frames - para widgets incorporados
        "frame-src 'self' https://*.google.com",
        
        // Manifesto - para PWA
        "manifest-src 'self'",
        
        // Worker scripts (incluindo blob URLs)
        "worker-src 'self' blob:",
        
        // Objetos - não permitir para segurança
        "object-src 'none'"
      ].join('; ')
    );

    next();
  });

  console.log('[CSP] Política de segurança de conteúdo configurada com suporte abrangente para recursos externos');
}