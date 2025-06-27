import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Configurar dotenv
dotenv.config();

// Obter __dirname equivalente em ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Cria estrutura de pastas para uma loja específica
 */
function createStoreDirectories(storeId) {
  const baseUploadPath = path.join(process.cwd(), 'public', 'uploads');
  const storeDir = path.join(baseUploadPath, 'stores', storeId.toString());
  const productsDir = path.join(storeDir, 'products');
  const thumbnailsDir = path.join(storeDir, 'thumbnails');

  let created = [];

  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true });
    created.push(`stores/${storeId}/`);
  }

  if (!fs.existsSync(productsDir)) {
    fs.mkdirSync(productsDir, { recursive: true });
    created.push(`stores/${storeId}/products/`);
  }

  if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
    created.push(`stores/${storeId}/thumbnails/`);
  }

  return created;
}

/**
 * Cria estrutura de pastas para um produto específico
 */
function createProductDirectories(storeId, productId) {
  const baseUploadPath = path.join(process.cwd(), 'public', 'uploads');
  const productDir = path.join(baseUploadPath, 'stores', storeId.toString(), 'products', productId.toString());
  const thumbnailsDir = path.join(productDir, 'thumbnails');

  let created = [];

  if (!fs.existsSync(productDir)) {
    fs.mkdirSync(productDir, { recursive: true });
    created.push(`stores/${storeId}/products/${productId}/`);
  }

  if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
    created.push(`stores/${storeId}/products/${productId}/thumbnails/`);
  }

  return created;
}

async function fixMissingFolders() {
  const client = await pool.connect();

  try {
    console.log('🔧 CORREÇÃO DE ESTRUTURA DE PASTAS');
    console.log('='.repeat(50));

    // 1. Buscar todas as lojas
    console.log('\n📊 1. VERIFICANDO LOJAS...');
    const storesResult = await client.query('SELECT id FROM stores ORDER BY id');

    let totalStoresFolders = 0;
    for (const store of storesResult.rows) {
      const created = createStoreDirectories(store.id);
      if (created.length > 0) {
        console.log(`✅ Loja ${store.id}: ${created.join(', ')}`);
        totalStoresFolders += created.length;
      }
    }

    // 2. Buscar todos os produtos
    console.log('\n📦 2. VERIFICANDO PRODUTOS...');
    const productsResult = await client.query('SELECT id, store_id FROM products ORDER BY store_id, id');

    let totalProductsFolders = 0;
    for (const product of productsResult.rows) {
      const created = createProductDirectories(product.store_id, product.id);
      if (created.length > 0) {
        console.log(`✅ Produto ${product.id} (Loja ${product.store_id}): ${created.join(', ')}`);
        totalProductsFolders += created.length;
      }
    }

    // 3. Relatório final
    console.log('\n📋 3. RELATÓRIO FINAL');
    console.log(`🏪 Lojas verificadas: ${storesResult.rows.length}`);
    console.log(`📦 Produtos verificados: ${productsResult.rows.length}`);
    console.log(`📁 Pastas de lojas criadas: ${totalStoresFolders}`);
    console.log(`📁 Pastas de produtos criadas: ${totalProductsFolders}`);
    console.log(`📁 Total de pastas criadas: ${totalStoresFolders + totalProductsFolders}`);

    if (totalStoresFolders + totalProductsFolders === 0) {
      console.log('✅ Todas as estruturas de pastas já existiam!');
    } else {
      console.log('✅ Estrutura de pastas corrigida com sucesso!');
    }

  } catch (error) {
    console.error('❌ Erro durante correção:', error);
  } finally {
    await client.release();
    await pool.end();
  }
}

// Verificar se é o módulo principal (equivalente ao require.main === module)
if (import.meta.url === `file://${process.argv[1]}`) {
  fixMissingFolders();
}

export { fixMissingFolders, createStoreDirectories, createProductDirectories };
