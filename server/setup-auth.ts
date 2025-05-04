import { Express } from 'express';
import session from 'express-session';
import memorystore from 'memorystore';

export function setupAuthMiddleware(app: Express) {
  // Criar o MemoryStore com o session
  const MemoryStore = memorystore(session);
  
  // Configuração da sessão
  app.use(session({
    secret: 'partiu-saara-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 86400000, // 1 dia em milissegundos
      secure: process.env.NODE_ENV === 'production'
    },
    store: new MemoryStore({
      checkPeriod: 86400000 // limpar sessões expiradas a cada 24h
    })
  }));
}