
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
 * Corrige arquivos físicos ausentes para lojas e produtos específicos
 */
async function fixMissingPhysicalFiles() {
  const client = await pool.connect();

  try {
    console.log('🔧 CORREÇÃO DE ARQUIVOS FÍSICOS AUSENTES');
    console.log('='.repeat(50));

    const baseUploadPath = path.join(process.cwd(), 'public', 'uploads');
    const placeholderPath = path.join(process.cwd(), 'public', 'placeholder-image.jpg');
    
    let fixedFiles = 0;
    let updatedRecords = 0;

    // 1. Verificar lojas problemáticas (9, 10, 11)
    console.log('\n🏪 1. CORRIGINDO IMAGENS DE LOJAS...');
    const problemStores = [9, 10, 11];

    for (const storeId of problemStores) {
      const storeImages = await client.query(`
        SELECT id, filename, image_url
        FROM store_images 
        WHERE store_id = $1
      `, [storeId]);

      for (const image of storeImages.rows) {
        const expectedPath = path.join(baseUploadPath, 'stores', storeId.toString(), image.filename);
        
        if (!fs.existsSync(expectedPath)) {
          console.log(`  ❌ Arquivo ausente para loja ${storeId}: ${image.filename}`);
          
          // Procurar em locais alternativos
          const possiblePaths = [
            path.join(baseUploadPath, image.filename),
            path.join(baseUploadPath, 'originals', image.filename),
            path.join(baseUploadPath, 'thumbnails', image.filename)
          ];

          let found = false;
          for (const possiblePath of possiblePaths) {
            if (fs.existsSync(possiblePath)) {
              // Copiar arquivo para local correto
              fs.copyFileSync(possiblePath, expectedPath);
              console.log(`  ✅ Movido: ${image.filename} -> stores/${storeId}/`);
              fixedFiles++;
              found = true;
              break;
            }
          }

          if (!found) {
            // Se arquivo não existe, usar placeholder e atualizar banco
            if (fs.existsSync(placeholderPath)) {
              const placeholderNewPath = path.join(baseUploadPath, 'stores', storeId.toString(), 'placeholder-image.jpg');
              fs.copyFileSync(placeholderPath, placeholderNewPath);
              
              await client.query(`
                UPDATE store_images 
                SET filename = 'placeholder-image.jpg', image_url = $1
                WHERE id = $2
              `, [`/uploads/stores/${storeId}/placeholder-image.jpg`, image.id]);
              
              console.log(`  🔄 Placeholder aplicado para loja ${storeId}`);
              updatedRecords++;
            }
          }
        } else {
          console.log(`  ✅ OK: Loja ${storeId} - ${image.filename}`);
        }
      }
    }

    // 2. Verificar produtos problemáticos (19, 20, 21)
    console.log('\n📦 2. CORRIGINDO IMAGENS DE PRODUTOS...');
    const problemProducts = [19, 20, 21];

    for (const productId of problemProducts) {
      const productResult = await client.query(`
        SELECT p.store_id FROM products p WHERE p.id = $1
      `, [productId]);

      if (productResult.rows.length === 0) {
        console.log(`  ❌ Produto ${productId} não encontrado no banco`);
        continue;
      }

      const storeId = productResult.rows[0].store_id;

      const productImages = await client.query(`
        SELECT id, filename, image_url
        FROM product_images 
        WHERE product_id = $1
      `, [productId]);

      for (const image of productImages.rows) {
        const expectedPath = path.join(baseUploadPath, 'stores', storeId.toString(), 'products', productId.toString(), image.filename);
        
        if (!fs.existsSync(expectedPath)) {
          console.log(`  ❌ Arquivo ausente para produto ${productId}: ${image.filename}`);
          
          // Procurar em locais alternativos
          const possiblePaths = [
            path.join(baseUploadPath, image.filename),
            path.join(baseUploadPath, 'originals', image.filename),
            path.join(baseUploadPath, 'thumbnails', image.filename),
            path.join(baseUploadPath, 'stores', storeId.toString(), image.filename)
          ];

          let found = false;
          for (const possiblePath of possiblePaths) {
            if (fs.existsSync(possiblePath)) {
              // Copiar arquivo para local correto
              fs.copyFileSync(possiblePath, expectedPath);
              console.log(`  ✅ Movido: ${image.filename} -> stores/${storeId}/products/${productId}/`);
              fixedFiles++;
              found = true;
              break;
            }
          }

          if (!found) {
            // Se arquivo não existe, usar placeholder e atualizar banco
            if (fs.existsSync(placeholderPath)) {
              const placeholderNewPath = path.join(baseUploadPath, 'stores', storeId.toString(), 'products', productId.toString(), 'placeholder-image.jpg');
              fs.copyFileSync(placeholderPath, placeholderNewPath);
              
              await client.query(`
                UPDATE product_images 
                SET filename = 'placeholder-image.jpg', image_url = $1
                WHERE id = $2
              `, [`/uploads/stores/${storeId}/products/${productId}/placeholder-image.jpg`, image.id]);
              
              console.log(`  🔄 Placeholder aplicado para produto ${productId}`);
              updatedRecords++;
            }
          }
        } else {
          console.log(`  ✅ OK: Produto ${productId} - ${image.filename}`);
        }
      }
    }

    // 3. Relatório final
    console.log('\n📊 3. RELATÓRIO DE CORREÇÃO');
    console.log(`📄 Arquivos movidos/corrigidos: ${fixedFiles}`);
    console.log(`💾 Registros atualizados no banco: ${updatedRecords}`);
    
    if (fixedFiles + updatedRecords === 0) {
      console.log('✅ Nenhuma correção necessária - sistema já está íntegro!');
    } else {
      console.log('✅ Correção concluída com sucesso!');
    }

  } catch (error) {
    console.error('❌ Erro durante correção:', error);
  } finally {
    await client.release();
    await pool.end();
  }
}

// Verificar se é o módulo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  fixMissingPhysicalFiles();
}

export { fixMissingPhysicalFiles };
