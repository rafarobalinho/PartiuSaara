// server/routes/plans.ts
import { Router } from 'express';
import {
  getAvailablePlans,
  startTrial,
  getPlansComparison,
  getTrialStatus
} from '../controllers/plans.controller.js';
import {
  getPlanStatus
} from '../middleware/plan-limits.middleware.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// ===== ROTAS PÚBLICAS =====
// Listar planos disponíveis (público para página de marketing)
router.get('/available', getAvailablePlans);

// Comparação detalhada entre planos (público)
router.get('/comparison', getPlansComparison);

// ===== ROTAS PROTEGIDAS (LOJISTAS) =====
// Obter status atual do plano do usuário
router.get('/status', authMiddleware, getPlanStatus);

// Obter status do trial
router.get('/trial/status', authMiddleware, getTrialStatus);

// Iniciar trial de um plano
router.post('/trial/start', authMiddleware, startTrial);

export default router;