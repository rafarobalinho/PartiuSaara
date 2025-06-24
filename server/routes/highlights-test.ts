import { Router } from 'express';

const router = Router();

// Teste simples SEM importar o controller
router.get('/simple-test', (req, res) => {
  res.json({ 
    message: 'Highlights route working WITHOUT controller',
    timestamp: new Date().toISOString()
  });
});

// Teste COM tentativa de importar o controller
router.get('/controller-test', async (req, res) => {
  try {
    // Tentativa de importar
    const { getHomeHighlights } = await import('../controllers/highlight.controller.js');
    res.json({ 
      message: 'Controller imported successfully',
      controllerLoaded: typeof getHomeHighlights === 'function'
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error importing controller',
      error: error.message,
      stack: error.stack
    });
  }
});

export default router;
