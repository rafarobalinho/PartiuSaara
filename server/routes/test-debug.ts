import { Router } from 'express';

const router = Router();

router.get('/working', (req, res) => {
  res.json({ 
    message: 'DEBUG: Rota funcionando!',
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path
  });
});

export default router;
