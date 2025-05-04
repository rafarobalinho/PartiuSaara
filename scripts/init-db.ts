import { pool } from '../server/db';
import * as schema from '../shared/schema';

async function main() {
  console.log('Inicializando o banco de dados...');
  
  try {
    // Criar tabelas para usuários
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "email" VARCHAR(255) NOT NULL UNIQUE,
        "password" VARCHAR(255) NOT NULL,
        "firstName" VARCHAR(255) NOT NULL,
        "lastName" VARCHAR(255) NOT NULL,
        "dateOfBirth" DATE,
        "gender" VARCHAR(50),
        "role" VARCHAR(50) DEFAULT 'customer',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Criar tabelas para lojas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "stores" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "categories" TEXT[] DEFAULT '{}',
        "address" VARCHAR(255),
        "latitude" DECIMAL(10, 8),
        "longitude" DECIMAL(11, 8),
        "phone" VARCHAR(50),
        "email" VARCHAR(255),
        "website" VARCHAR(255),
        "openingHours" TEXT,
        "images" TEXT[] DEFAULT '{}',
        "locationConsent" BOOLEAN DEFAULT FALSE,
        "isVerified" BOOLEAN DEFAULT FALSE,
        "userId" INTEGER REFERENCES "users"("id"),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Criar tabelas para produtos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "products" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "price" DECIMAL(10, 2) NOT NULL,
        "discountedPrice" DECIMAL(10, 2),
        "category" VARCHAR(100),
        "stock" INTEGER,
        "images" TEXT[] DEFAULT '{}',
        "featured" BOOLEAN DEFAULT FALSE,
        "isActive" BOOLEAN DEFAULT TRUE,
        "isOnPromotion" BOOLEAN DEFAULT FALSE,
        "storeId" INTEGER REFERENCES "stores"("id"),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Criar tabelas para promoções
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "promotions" (
        "id" SERIAL PRIMARY KEY,
        "type" VARCHAR(50) NOT NULL,
        "discountPercentage" DECIMAL(5, 2) NOT NULL,
        "startTime" TIMESTAMP NOT NULL,
        "endTime" TIMESTAMP NOT NULL,
        "productId" INTEGER REFERENCES "products"("id"),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Criar tabelas para cupons
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "coupons" (
        "id" SERIAL PRIMARY KEY,
        "code" VARCHAR(50) NOT NULL,
        "description" TEXT,
        "discountPercentage" DECIMAL(5, 2),
        "discountAmount" DECIMAL(10, 2),
        "startTime" TIMESTAMP NOT NULL,
        "endTime" TIMESTAMP NOT NULL,
        "maxUsageCount" INTEGER,
        "usageCount" INTEGER DEFAULT 0,
        "isActive" BOOLEAN DEFAULT TRUE,
        "storeId" INTEGER REFERENCES "stores"("id"),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Criar tabela para wishlist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "wishlists" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER REFERENCES "users"("id"),
        "productId" INTEGER REFERENCES "products"("id"),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("userId", "productId")
      )
    `);
    
    // Criar tabela para lojas favoritas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "favorite_stores" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER REFERENCES "users"("id"),
        "storeId" INTEGER REFERENCES "stores"("id"),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("userId", "storeId")
      )
    `);
    
    // Criar tabela para reservas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "reservations" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER REFERENCES "users"("id"),
        "productId" INTEGER REFERENCES "products"("id"),
        "quantity" INTEGER DEFAULT 1,
        "status" VARCHAR(50) DEFAULT 'pending',
        "expiresAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Criar tabela para categorias
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "categories" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(100) NOT NULL,
        "slug" VARCHAR(100) NOT NULL UNIQUE,
        "description" TEXT,
        "icon" VARCHAR(100),
        "imageUrl" VARCHAR(255),
        "parentId" INTEGER REFERENCES "categories"("id"),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Criar tabela para banners
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "banners" (
        "id" SERIAL PRIMARY KEY,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "imageUrl" VARCHAR(255) NOT NULL,
        "buttonText" VARCHAR(100),
        "buttonLink" VARCHAR(255),
        "couponCode" VARCHAR(50),
        "startDate" TIMESTAMP,
        "endDate" TIMESTAMP,
        "isActive" BOOLEAN DEFAULT TRUE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Criar tabela para analytics de lojas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "store_impressions" (
        "id" SERIAL PRIMARY KEY,
        "storeId" INTEGER REFERENCES "stores"("id"),
        "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Tabelas criadas com sucesso!');

    // Inserir um usuário de teste (usando os nomes de colunas conforme existem no banco)
    await pool.query(`
      INSERT INTO "users" ("email", "password", "username", "name", "role")
      VALUES ('vendedor@example.com', '$2a$12$iWV.eQVrYQD9bQRMgG8/r.s.KquCQRLUJUxgJBg/VR3d6CrmZ.fE.', 'vendedor', 'Vendedor Teste', 'seller')
      ON CONFLICT (email) DO NOTHING
    `);
    
    console.log('Usuário de teste criado: vendedor@example.com com senha: senha123');
    
  } catch (error) {
    console.error('Erro ao inicializar o banco de dados:', error);
  } finally {
    await pool.end();
  }
}

main();