// server/routes/trial.ts
import { Router } from 'express';
import {
  getTrialStatus,
  convertTrialToPaid,
  getTrialStatistics
} from '../controllers/trial.controller.js';

const router = Router();

// Middleware de autenticação (assumindo que já existe)
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }
  next();
};

// Middleware de admin (para estatísticas)
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.session?.userId || req.session?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado - Admin required' });
  }
  next();
};

// Rotas protegidas (lojistas)
router.get('/status/:storeId', requireAuth, getTrialStatus);
router.post('/convert/:storeId', requireAuth, convertTrialToPaid);

// Rotas admin
router.get('/statistics', requireAdmin, getTrialStatistics);

export default router;