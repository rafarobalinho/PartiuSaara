
#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Conexão direta com o banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateImages() {
  try {
    console.log('🔄 Iniciando migração independente de imagens...');
    
    // Testar conexão
    await pool.query('SELECT 1');
    console.log('✅ Conexão com banco estabelecida');
    
    // Buscar imagens que precisam ser migradas
    const query = `
      SELECT 
        pi.id,
        pi.product_id,
        pi.image_url,
        pi.thumbnail_url,
        p.store_id,
        p.name as product_name
      FROM product_images pi
      JOIN products p ON pi.product_id = p.id
      WHERE (pi.image_url LIKE '/uploads/%' AND pi.image_url NOT LIKE '/uploads/stores/%')
         OR (pi.thumbnail_url LIKE '/uploads/thumbnails/%' AND pi.thumbnail_url NOT LIKE '/uploads/stores/%')
      ORDER BY p.store_id, pi.product_id
    `;
    
    const result = await pool.query(query);
    console.log(`📋 Encontradas ${result.rows.length} imagens para migrar`);
    
    if (result.rows.length === 0) {
      console.log('✅ Nenhuma imagem precisa ser migrada');
      await pool.end();
      return;
    }
    
    // Preview
    console.log('\n📋 Preview da migração:');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. Produto ${row.product_id} (Loja ${row.store_id}): ${row.product_name}`);
      console.log(`   📸 ${row.image_url}`);
      if (row.thumbnail_url) {
        console.log(`   🖼️  ${row.thumbnail_url}`);
      }
    });
    
    console.log('\n🔄 Iniciando migração...');
    
    let migrated = 0;
    for (const row of result.rows) {
      const success = await migrateImage(row);
      if (success) migrated++;
    }
    
    console.log(`\n✅ Migração concluída! ${migrated}/${result.rows.length} imagens migradas com sucesso.`);
    await pool.end();
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    await pool.end();
    process.exit(1);
  }
}

async function migrateImage(imageData) {
  const { id, product_id, image_url, thumbnail_url, store_id, product_name } = imageData;
  
  try {
    console.log(`\n🔄 Migrando produto ${product_id}: ${product_name} (Loja ${store_id})`);
    
    // Criar estrutura de pastas
    const storeDir = path.join(rootDir, 'public', 'uploads', 'stores', store_id.toString());
    const productDir = path.join(storeDir, 'products', product_id.toString());
    const thumbnailDir = path.join(productDir, 'thumbnails');
    
    // Criar pastas
    [storeDir, productDir, thumbnailDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Criada: ${dir.replace(rootDir, '')}`);
      }
    });
    
    let updateFields = [];
    let updateValues = [];
    let valueIndex = 1;
    
    // Migrar imagem principal
    if (image_url && !image_url.includes('/stores/')) {
      const newUrl = await moveFile(image_url, productDir, 'image');
      if (newUrl) {
        updateFields.push(`image_url = $${valueIndex++}`);
        updateValues.push(`/uploads/stores/${store_id}/products/${product_id}/${path.basename(newUrl)}`);
        console.log(`✅ Imagem principal migrada`);
      }
    }
    
    // Migrar thumbnail
    if (thumbnail_url && !thumbnail_url.includes('/stores/')) {
      const newUrl = await moveFile(thumbnail_url, thumbnailDir, 'thumbnail');
      if (newUrl) {
        updateFields.push(`thumbnail_url = $${valueIndex++}`);
        updateValues.push(`/uploads/stores/${store_id}/products/${product_id}/thumbnails/${path.basename(newUrl)}`);
        console.log(`✅ Thumbnail migrado`);
      }
    }
    
    // Atualizar banco
    if (updateFields.length > 0) {
      updateValues.push(id);
      const updateQuery = `UPDATE product_images SET ${updateFields.join(', ')} WHERE id = $${valueIndex}`;
      
      await pool.query(updateQuery, updateValues);
      console.log(`✅ URLs atualizadas no banco`);
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error(`❌ Erro no produto ${product_id}:`, error.message);
    return false;
  }
}

async function moveFile(originalUrl, targetDir, type) {
  const fileName = path.basename(originalUrl);
  const oldPath = path.join(rootDir, 'public', originalUrl);
  const newPath = path.join(targetDir, fileName);
  
  if (!fs.existsSync(oldPath)) {
    console.log(`⚠️ Arquivo não encontrado: ${originalUrl}`);
    return null;
  }
  
  try {
    // Mover arquivo
    fs.renameSync(oldPath, newPath);
    console.log(`📄 ${type}: ${fileName} → ${targetDir.replace(rootDir + '/public', '')}/`);
    return newPath;
  } catch (error) {
    console.log(`❌ Erro ao mover ${fileName}:`, error.message);
    return null;
  }
}

// Executar
console.log('🚀 Iniciando migração de imagens...');
migrateImages();
