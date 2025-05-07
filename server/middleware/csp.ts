/**
 * Middleware para Content Security Policy (CSP)
 * 
 * Este middleware configura a política de segurança de conteúdo
 * para permitir recursos específicos como Google Maps API
 */
import { Express, Request, Response, NextFunction } from 'express';

/**
 * Configura o middleware CSP para a aplicação Express
 * 
 * @param app Instância do Express
 */
export function setupCSP(app: Express) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Configuração da política de segurança de conteúdo
    res.setHeader(
      'Content-Security-Policy',
      [
        // Fontes de scripts permitidas
        "script-src 'self' https://apis.google.com https://maps.googleapis.com 'unsafe-inline'",
        // Fontes de estilos permitidas
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        // Fontes de imagens permitidas
        "img-src 'self' data: https://maps.googleapis.com https://placehold.co https://*.googleapis.com",
        // Fontes de conexão permitidas
        "connect-src 'self' https://maps.googleapis.com https://*.googleapis.com",
        // Fontes de fontes permitidas
        "font-src 'self' https://fonts.gstatic.com",
        // Fontes de mídia permitidas
        "media-src 'self'",
        // Objetos permitidos (Flash, etc.)
        "object-src 'none'",
        // Fontes de frame permitidas
        "frame-src 'self' https://maps.googleapis.com https://*.googleapis.com",
        // Permitir worker scripts
        "worker-src 'self' blob:",
        // Política padrão para outras fontes
        "default-src 'self'"
      ].join('; ')
    );

    next();
  });

  console.log('[CSP] Política de segurança de conteúdo configurada');
}