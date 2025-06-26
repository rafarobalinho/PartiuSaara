// === DIAGNÓSTICO: Log de inicialização ===
console.log('[SERVER-TEST] === SERVIDOR INICIADO ===', new Date());

// Auto-detecção de ambiente de produção no Replit
if (!process.env.NODE_ENV && process.env.REPLIT_ENVIRONMENT === 'production') {
  process.env.NODE_ENV = 'production';
  console.log('🚀 Auto-detectado ambiente de PRODUÇÃO via REPLIT_ENVIRONMENT');
}

import dotenv from 'dotenv';
dotenv.config({ override: false });

// ---- ADICIONE ESTAS LINHAS PARA DEBUG ----
console.log('--- DEBUG INÍCIO server/index.ts ---');
console.log('process.env.STRIPE_MODE (após dotenv):', process.env.STRIPE_MODE);
console.log('process.env.NODE_ENV (após dotenv):', process.env.NODE_ENV);
console.log('process.env.FRONTEND_URL (após dotenv):', process.env.FRONTEND_URL);
console.log('--- DEBUG FIM server/index.ts ---');

console.log('🔍 STRIPE DEBUG:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
console.log('STRIPE_PUBLISHABLE_KEY exists:', !!process.env.STRIPE_PUBLISHABLE_KEY);
console.log('GOOGLE_MAPS_API_KEY exists:', !!process.env.GOOGLE_MAPS_API_KEY);
// -----------------------------------------
import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import cors from 'cors';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuthMiddleware } from "./setup-auth";
import { initCustomTables } from "./db";
import { setupCSP } from "./middleware/csp";
import { checkUploadDirectories } from "./scripts/check-uploads-dir";

// Configuração para obter __dirname em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Verificar ambiente
const isProduction = process.env.NODE_ENV === 'production';
console.log(`[Server] Inicializando no ambiente: ${isProduction ? 'Produção' : 'Desenvolvimento'}`);

// ---- DEBUG ASSETS ----
console.log('🔍 ENV:', process.env.NODE_ENV, 'isProduction:', isProduction);
if (isProduction) {
  console.log('🔍 ASSETS PATH:', path.join(__dirname, 'public/assets'));
  console.log('🔍 ASSETS EXISTS:', fs.existsSync(path.join(__dirname, 'public/assets')));
  console.log('🔍 PUBLIC PATH:', path.join(__dirname, 'public'));
  console.log('🔍 PUBLIC EXISTS:', fs.existsSync(path.join(__dirname, 'public')));
  console.log('🔍 __dirname:', __dirname);
}
// ---- FIM DEBUG ASSETS ----

// Configurar CORS
const allowedOrigins = isProduction 
  ? [
      'https://partiusaara.replit.app',
      process.env.FRONTEND_URL,
      /https:\/\/.*\.replit\.app$/,
      /https:\/\/.*\.replit\.dev$/,
      /https:\/\/.*\.replit\.co$/
    ]
  : ['http://localhost:5000', 'http://localhost:3000', 'https://*.replit.dev', 'https://*.replit.co'];

console.log(`[Server] CORS configurado para origens:`, allowedOrigins);

const app = express();

// Aplicar CORS antes de outros middlewares
app.use(cors({
  origin: function(origin, callback) {
    // Permitir requisições sem origem (como chamadas diretas da API)
    if (!origin) return callback(null, true);

    // Verificar se a origem está na lista de permitidas ou se corresponde a um padrão wildcard/regex
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      if (typeof allowedOrigin === 'string' && allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        return new RegExp(pattern).test(origin);
      }
      return allowedOrigin === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Bloqueando requisição de origem não permitida: ${origin}`);
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  credentials: true, // Importante: permitir cookies nas requisições cross-origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Configurar o middleware CSP
setupCSP(app);

// === IMPORTANTE: Raw middleware para webhook Stripe DEVE vir antes do JSON ===
// O webhook do Stripe precisa processar dados brutos
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Middleware para parsing de JSON (para todas as outras rotas)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Parse URL encoded bodies para todas as rotas
app.use(express.urlencoded({ extended: true }));

// Middleware para capturar erros de parsing JSON
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    console.error('JSON parsing error:', err);
    return res.status(400).json({ 
      success: false, 
      message: 'Erro no formato JSON enviado' 
    });
  }
  next(err);
});

// Servir arquivos estáticos da pasta de uploads
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use('/uploads/thumbnails', express.static(path.join(__dirname, '../public/uploads/thumbnails')));

// Assets middleware condicional
if (isProduction) {
  // Produção: __dirname = dist/
  const assetsPath = path.join(__dirname, 'public/assets');
  console.log('🔍 Configurando middleware /assets para:', assetsPath);
  app.use('/assets', express.static(assetsPath));
}

// === DIAGNÓSTICO: Interceptar todas as requests da API ===
app.use('/api', (req, res, next) => {
  console.log('[SERVER] Request:', req.method, req.path, 'Body:', req.body ? 'PRESENTE' : 'AUSENTE');
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Configurar o middleware de autenticação
setupAuthMiddleware(app);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Verificar diretórios de uploads com o script aprimorado
  try {
    checkUploadDirectories();
  } catch (error) {
    console.error('❌ Erro ao verificar diretórios de uploads:', error);
  }

  // Inicializar tabelas personalizadas
  try {
    await initCustomTables();
    log('✅ Tabelas personalizadas inicializadas com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar tabelas personalizadas:', error);
  }

  const server = await registerRoutes(app);

  // Middleware para tratar erros e garantir que sempre retornamos JSON
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('Error handler middleware:', err);

    // Definir explicitamente o content type para JSON
    res.setHeader('Content-Type', 'application/json');
    res.status(status).json({ 
      message,
      success: false,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    // Não lançar o erro novamente - isso pode causar comportamento inesperado
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV !== "production") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
    // Produção: __dirname = dist/
    app.use(express.static(path.join(__dirname, 'public')));
  }

  // Function to try starting server on available port
  async function startServer() {
    const ports = [5000, 5001, 5002, 5003];
    
    for (const port of ports) {
      try {
        await new Promise((resolve, reject) => {
          const serverInstance = server.listen({
            port,
            host: "0.0.0.0",
            reusePort: true,
          }, () => {
            log(`🚀 Server running on port ${port}`);
            resolve(serverInstance);
          });
          
          serverInstance.on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
              console.log(`⚠️ Port ${port} is busy, trying next port...`);
              reject(err);
            } else {
              reject(err);
            }
          });
        });
        break; // Success, break the loop
      } catch (error: any) {
        if (error.code === 'EADDRINUSE' && port !== ports[ports.length - 1]) {
          continue; // Try next port
        } else {
          console.error(`❌ Failed to start server: ${error.message}`);
          console.log('💡 Try running: npm run kill-port');
          process.exit(1);
        }
      }
    }
  }
  
  startServer();
})();