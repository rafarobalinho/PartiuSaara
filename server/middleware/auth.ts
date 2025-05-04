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
        role: 'customer' | 'seller';
      };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: No session found' });
    }
    
    const user = await storage.getUser(userId);
    
    if (!user) {
      // Clear the invalid session
      req.session.destroy((err: Error | null) => {
        if (err) console.error('Error destroying session:', err);
      });
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }
    
    // Add the user object to the request (without password)
    const { password, ...userWithoutPassword } = user;
    req.user = userWithoutPassword as any;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
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
