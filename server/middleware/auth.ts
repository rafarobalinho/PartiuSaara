import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import session from 'express-session';

// Extend Express Request interface to include user object
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        firstName: string;
        lastName: string;
        role: 'customer' | 'seller' | 'admin';
      };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const requestId = Math.random().toString(36).substring(2, 10); // ID único para rastrear requisições
  
  try {
    // Verificação de cookies e sessão para diagnóstico
    console.log(`[Auth:${requestId}] Verificando autenticação para ${req.method} ${req.path}`);
    console.log(`[Auth:${requestId}] Cookies presentes: ${!!req.headers.cookie}`);
    console.log(`[Auth:${requestId}] Session ID: ${req.sessionID || 'Indisponível'}`);
    
    if (!req.session) {
      console.error(`[Auth:${requestId}] Objeto de sessão não disponível`);
      return res.status(401).json({ message: 'Unauthorized: Session object not available' });
    }
    
    const userId = req.session.userId;
    console.log(`[Auth:${requestId}] Session userId: ${userId || 'Não encontrado'}`);
    
    if (!userId) {
      console.warn(`[Auth:${requestId}] Sessão sem userId. Acesso negado.`);
      return res.status(401).json({ message: 'Unauthorized: No session found' });
    }
    
    const user = await storage.getUser(userId);
    console.log(`[Auth:${requestId}] Usuário encontrado: ${!!user}`);
    
    if (!user) {
      // Clear the invalid session
      console.warn(`[Auth:${requestId}] ID de usuário ${userId} na sessão, mas usuário não encontrado no banco`);
      req.session.destroy((err: Error | null) => {
        if (err) console.error(`[Auth:${requestId}] Erro ao destruir sessão:`, err);
      });
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }
    
    // Add the user object to the request (without password)
    const { password, ...userWithoutPassword } = user;
    req.user = userWithoutPassword as any;
    
    // Atualizar a sessão para manter o usuário logado
    req.session.touch();
    
    console.log(`[Auth:${requestId}] Autenticação bem-sucedida para o usuário ${user.id}`);
    next();
  } catch (error) {
    console.error(`[Auth:${requestId}] Erro no middleware de autenticação:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Additional middleware for seller-only routes
export const sellerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  if (req.user.role !== 'seller') {
    return res.status(403).json({ message: 'Forbidden: Seller access required' });
  }
  
  next();
};

// Additional middleware for admin-only routes
export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
  
  next();
};
