/**
 * Middleware para verificar se o usuário é um administrador
 * Este middleware deve ser utilizado para proteger rotas que só devem ser acessíveis
 * por usuários com papel de administrador
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Verifica se o usuário está autenticado e se tem o papel de administrador
 * Retorna 401 se não estiver autenticado ou 403 se não for administrador
 */
export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  // Verifica se o usuário está autenticado
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Não autorizado: Usuário não autenticado' });
  }

  // Verifica se há dados do usuário no req.user (adicionado pelo middleware de autenticação)
  if (!req.user) {
    return res.status(401).json({ message: 'Não autorizado: Dados do usuário não disponíveis' });
  }

  // Verifica se o usuário tem o papel de administrador
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Acesso negado: Esta funcionalidade é restrita a administradores' 
    });
  }

  // Se chegou até aqui, o usuário é um administrador autenticado
  next();
}