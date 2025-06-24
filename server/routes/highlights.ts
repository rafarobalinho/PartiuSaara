// server/routes/highlights.ts
import { Router } from 'express';
import {
  getHomeHighlights,
  recordHighlightImpression,
  getHighlightAnalytics,
  updateHighlightWeight
} from '../controllers/highlight.controller.js';

const router = Router();

// Middleware de autenticação (assumindo que já existe)
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }
  next();
};

// Middleware de admin (para peso de destaques)
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.session?.userId || req.session?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado - Admin required' });
  }
  next();
};

// Rotas públicas
router.get('/home', getHomeHighlights);
router.post('/impression', recordHighlightImpression);

// Rotas protegidas (lojistas)
router.get('/analytics/:storeId', requireAuth, getHighlightAnalytics);

// Rotas admin
router.patch('/weight/:storeId', requireAdmin, updateHighlightWeight);

export default router;