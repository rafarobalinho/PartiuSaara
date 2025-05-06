import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Função para inicializar tabelas personalizadas que não estão no schema do Drizzle
export async function initCustomTables() {
  try {
    console.log('Inicializando tabelas personalizadas...');
    
    // Importar e executar a configuração da tabela de detalhes de lugares
    const { setupPlaceDetailsTable } = await import('./controllers/place_details.controller');
    await setupPlaceDetailsTable();
    
    console.log('✅ Tabelas personalizadas inicializadas com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao inicializar tabelas personalizadas:', error);
    return false;
  }
}