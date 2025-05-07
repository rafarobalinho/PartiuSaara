import { Express } from 'express';
import session from 'express-session';
import memorystore from 'memorystore';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db';

// Declarando o tipo da sessão
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

export function setupAuthMiddleware(app: Express) {
  // Configuração do store de sessão
  const PostgresStore = connectPgSimple(session);
  
  // Usar um segredo mais seguro (idealmente viria de uma variável de ambiente)
  const sessionSecret = process.env.SESSION_SECRET || 'partiu-saara-secure-session-key-a84d7c5f';
  
  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`[Auth Setup] Ambiente: ${isProduction ? 'Produção' : 'Desenvolvimento'}`);
  
  // Opcional: Detectar domínio para configuração de cookies
  const domain = process.env.COOKIE_DOMAIN || undefined;
  console.log(`[Auth Setup] Domínio de cookies: ${domain || 'Padrão (não definido)'}`);
  
  // Configuração da sessão
  app.use(session({
    store: new PostgresStore({
      pool: pool,                   // Conexão com o banco de dados
      tableName: 'session',         // Nome da tabela que armazenará as sessões
      createTableIfMissing: true,   // Criar a tabela se não existir
      pruneSessionInterval: 60 * 15, // Limpar sessões expiradas a cada 15 minutos
      disableTouch: false           // Habilitar atualizações do tempo de expiração
    }),
    name: 'partiu.sid',             // Nome do cookie personalizado
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    proxy: isProduction,            // Confiar em proxies reversos em produção
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias em milissegundos
      secure: isProduction,         // Use HTTPS em produção
      httpOnly: true,               // Previne acesso via JavaScript
      sameSite: isProduction ? 'none' : 'lax', // Permite cookies em requisições cross-site em produção
      domain: domain                // Define o domínio do cookie se fornecido
    }
  }));
  
  console.log('[Auth Setup] Middleware de sessão configurado com sucesso');
}