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

/**
 * Sincroniza estrutura física de imagens com registros do banco
 */
async function syncImageStructure() {
  const client = await pool.connect();

  try {
    console.log('🔄 SINCRONIZAÇÃO DE ESTRUTURA DE IMAGENS');
    console.log('='.repeat(50));

    const baseUploadPath = path.join(process.cwd(), 'public', 'uploads');
    let movedFiles = 0;
    let createdFolders = 0;

    // 1. Processar imagens de produtos
    console.log('\n📦 1. SINCRONIZANDO PRODUTOS...');
    const productsResult = await client.query(`
      SELECT p.id, p.store_id, p.name, pi.filename
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE pi.filename IS NOT NULL
      ORDER BY p.store_id, p.id
    `);

    for (const product of productsResult.rows) {
      const { id, store_id, name, filename } = product;

      // Criar estrutura de pastas se não existir
      const productDir = path.join(baseUploadPath, 'stores', store_id.toString(), 'products', id.toString());
      const thumbnailDir = path.join(productDir, 'thumbnails');

      if (!fs.existsSync(productDir)) {
        fs.mkdirSync(productDir, { recursive: true });
        console.log(`📁 Criado: stores/${store_id}/products/${id}/`);
        createdFolders++;
      }

      if (!fs.existsSync(thumbnailDir)) {
        fs.mkdirSync(thumbnailDir, { recursive: true });
        console.log(`📁 Criado: stores/${store_id}/products/${id}/thumbnails/`);
        createdFolders++;
      }

      // Verificar se arquivo existe no local correto
      const expectedPath = path.join(productDir, filename);

      if (!fs.existsSync(expectedPath)) {
        // Procurar arquivo em outros locais
        const possiblePaths = [
          path.join(baseUploadPath, filename),
          path.join(baseUploadPath, 'originals', filename),
          path.join(baseUploadPath, 'thumbnails', filename),
          path.join(baseUploadPath, 'stores', store_id.toString(), filename)
        ];

        for (const possiblePath of possiblePaths) {
          if (fs.existsSync(possiblePath)) {
            // Mover arquivo para local correto
            fs.copyFileSync(possiblePath, expectedPath);
            console.log(`✅ Movido: ${filename} -> stores/${store_id}/products/${id}/`);
            movedFiles++;
            break;
          }
        }
      } else {
        console.log(`✅ OK: Produto ${id} - ${filename}`);
      }
    }

    // 2. Processar imagens de lojas
    console.log('\n🏪 2. SINCRONIZANDO LOJAS...');
    const storesResult = await client.query(`
      SELECT s.id, s.name, si.filename
      FROM stores s
      LEFT JOIN store_images si ON s.id = si.store_id
      WHERE si.filename IS NOT NULL
      ORDER BY s.id
    `);

    for (const store of storesResult.rows) {
      const { id, name, filename } = store;

      // Criar estrutura de pastas se não existir
      const storeDir = path.join(baseUploadPath, 'stores', id.toString());
      const thumbnailDir = path.join(storeDir, 'thumbnails');

      if (!fs.existsSync(storeDir)) {
        fs.mkdirSync(storeDir, { recursive: true });
        console.log(`📁 Criado: stores/${id}/`);
        createdFolders++;
      }

      if (!fs.existsSync(thumbnailDir)) {
        fs.mkdirSync(thumbnailDir, { recursive: true });
        console.log(`📁 Criado: stores/${id}/thumbnails/`);
        createdFolders++;
      }

      // Verificar se arquivo existe no local correto
      const expectedPath = path.join(storeDir, filename);

      if (!fs.existsSync(expectedPath)) {
        // Procurar arquivo em outros locais
        const possiblePaths = [
          path.join(baseUploadPath, filename),
          path.join(baseUploadPath, 'originals', filename),
          path.join(baseUploadPath, 'thumbnails', filename)
        ];

        for (const possiblePath of possiblePaths) {
          if (fs.existsSync(possiblePath)) {
            // Mover arquivo para local correto
            fs.copyFileSync(possiblePath, expectedPath);
            console.log(`✅ Movido: ${filename} -> stores/${id}/`);
            movedFiles++;
            break;
          }
        }
      } else {
        console.log(`✅ OK: Loja ${id} - ${filename}`);
      }
    }

    // 3. Relatório final
    console.log('\n📊 3. RELATÓRIO DE SINCRONIZAÇÃO');
    console.log(`📁 Pastas criadas: ${createdFolders}`);
    console.log(`📄 Arquivos movidos: ${movedFiles}`);
    console.log(`📦 Produtos processados: ${productsResult.rows.length}`);
    console.log(`🏪 Lojas processadas: ${storesResult.rows.length}`);

    if (createdFolders + movedFiles === 0) {
      console.log('✅ Estrutura já estava sincronizada!');
    } else {
      console.log('✅ Sincronização concluída com sucesso!');
    }

  } catch (error) {
    console.error('❌ Erro durante sincronização:', error);
  } finally {
    await client.release();
    await pool.end();
  }
}

// Verificar se é o módulo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  syncImageStructure();
}

export { syncImageStructure };
