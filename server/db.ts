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
    
    // Tabela para armazenar detalhes de lugares do Google Places
    const createStoreDetailsTableQuery = `
    CREATE TABLE IF NOT EXISTS store_place_details (
      id SERIAL PRIMARY KEY,
      store_id INTEGER REFERENCES stores(id),
      place_id TEXT UNIQUE NOT NULL,
      name TEXT,
      formatted_address TEXT,
      phone_number TEXT,
      website TEXT,
      rating DECIMAL,
      total_ratings INTEGER,
      business_status TEXT,
      types JSONB,
      opening_hours JSONB,
      reviews JSONB,
      editorial_summary TEXT,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_store_place_details_store_id ON store_place_details(store_id);
    CREATE INDEX IF NOT EXISTS idx_store_place_details_place_id ON store_place_details(place_id);
    `;
    
    await pool.query(createStoreDetailsTableQuery);
    console.log('✅ Tabela store_place_details criada ou verificada com sucesso');
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao inicializar tabelas personalizadas:', error);
    return false;
  }
}