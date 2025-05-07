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

// Configuração para obter __dirname em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Verificar ambiente
const isProduction = process.env.NODE_ENV === 'production';
console.log(`[Server] Inicializando no ambiente: ${isProduction ? 'Produção' : 'Desenvolvimento'}`);

// Configurar CORS
const allowedOrigins = isProduction 
  ? [process.env.FRONTEND_URL || '*.replit.app', '*.replit.dev', '*.replit.co'] // URLs de produção (pode ser configurada via env)
  : ['http://localhost:5000', 'http://localhost:3000', 'https://*.replit.dev', 'https://*.replit.co']; // URLs de desenvolvimento

console.log(`[Server] CORS configurado para origens: ${allowedOrigins.join(', ')}`);

const app = express();

// Aplicar CORS antes de outros middlewares
app.use(cors({
  origin: function(origin, callback) {
    // Permitir requisições sem origem (como chamadas diretas da API)
    if (!origin) return callback(null, true);
    
    // Verificar se a origem está na lista de permitidas ou se corresponde a um padrão wildcard
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
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

// Configurar parsers antes do middleware de erros
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// Definir content-type padrão para rotas API
app.use('/api', (req, res, next) => {
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
  // Verificar diretórios de uploads
  try {
    // Verificar manualmente os diretórios de uploads
    const uploadsDir = path.join(__dirname, '../public/uploads');
    const thumbnailsDir = path.join(__dirname, '../public/uploads/thumbnails');
    const originalsDir = path.join(__dirname, '../public/uploads/originals');
    
    console.log('🔍 Verificando diretórios de uploads...');
    
    // Verificar e criar diretórios se não existirem
    if (!fs.existsSync(uploadsDir)) {
      console.log(`❌ Diretório não existe, criando: ${uploadsDir}`);
      fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
    }
    
    if (!fs.existsSync(thumbnailsDir)) {
      console.log(`❌ Diretório não existe, criando: ${thumbnailsDir}`);
      fs.mkdirSync(thumbnailsDir, { recursive: true, mode: 0o755 });
    }
    
    if (!fs.existsSync(originalsDir)) {
      console.log(`❌ Diretório não existe, criando: ${originalsDir}`);
      fs.mkdirSync(originalsDir, { recursive: true, mode: 0o755 });
    }
    
    console.log('✅ Todos os diretórios verificados e criados com sucesso');
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
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
