import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obter __dirname equivalente em ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function diagnoseMissingImages() {
  const client = await pool.connect();

  try {
    console.log('🔍 DIAGNÓSTICO DE IMAGENS EM FALTA');
    console.log('='.repeat(50));

    const baseUploadPath = path.join(process.cwd(), 'public', 'uploads');

    // Verificar produtos específicos com problema
    const problemProducts = [19, 20, 21];
    const problemStores = [9, 10, 11];

    console.log('\n🚨 PRODUTOS COM PROBLEMA:');
    for (const productId of problemProducts) {
      const result = await client.query(`
        SELECT p.id, p.store_id, p.name, pi.filename
        FROM products p
        LEFT JOIN product_images pi ON p.id = pi.product_id
        WHERE p.id = $1
      `, [productId]);

      if (result.rows.length > 0) {
        const product = result.rows[0];
        console.log(`\n📦 Produto ${product.id} (${product.name}):`);
        console.log(`   Loja: ${product.store_id}`);
        console.log(`   Arquivo: ${product.filename || 'SEM IMAGEM'}`);

        if (product.filename) {
          const expectedPath = path.join(baseUploadPath, 'stores', product.store_id.toString(), 'products', product.id.toString(), product.filename);
          console.log(`   Caminho esperado: ${expectedPath}`);
          console.log(`   Existe: ${fs.existsSync(expectedPath) ? '✅' : '❌'}`);

          // Procurar em outros locais
          const altPaths = [
            path.join(baseUploadPath, product.filename),
            path.join(baseUploadPath, 'originals', product.filename),
            path.join(baseUploadPath, 'thumbnails', product.filename)
          ];

          console.log('   Procurando em locais alternativos:');
          for (const altPath of altPaths) {
            if (fs.existsSync(altPath)) {
              console.log(`   ✅ Encontrado em: ${altPath}`);
            }
          }
        }
      }
    }

    console.log('\n🏪 LOJAS COM PROBLEMA:');
    for (const storeId of problemStores) {
      const result = await client.query(`
        SELECT s.id, s.name, si.filename
        FROM stores s
        LEFT JOIN store_images si ON s.id = si.store_id
        WHERE s.id = $1
      `, [storeId]);

      if (result.rows.length > 0) {
        const store = result.rows[0];
        console.log(`\n🏪 Loja ${store.id} (${store.name}):`);
        console.log(`   Arquivo: ${store.filename || 'SEM IMAGEM'}`);

        if (store.filename) {
          const expectedPath = path.join(baseUploadPath, 'stores', store.id.toString(), store.filename);
          console.log(`   Caminho esperado: ${expectedPath}`);
          console.log(`   Existe: ${fs.existsSync(expectedPath) ? '✅' : '❌'}`);

          // Procurar em outros locais
          const altPaths = [
            path.join(baseUploadPath, store.filename),
            path.join(baseUploadPath, 'originals', store.filename),
            path.join(baseUploadPath, 'thumbnails', store.filename)
          ];

          console.log('   Procurando em locais alternativos:');
          for (const altPath of altPaths) {
            if (fs.existsSync(altPath)) {
              console.log(`   ✅ Encontrado em: ${altPath}`);
            }
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Erro durante diagnóstico:', error);
  } finally {
    await client.release();
    await pool.end();
  }
}

// Verificar se é o módulo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  diagnoseMissingImages();
}

export { diagnoseMissingImages };