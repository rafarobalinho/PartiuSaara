
#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function verifyProductImageFiles() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando existência de arquivos de imagem de produtos...\n');
    
    // Buscar todas as imagens de produtos com informações da loja
    const result = await client.query(`
      SELECT 
        pi.id,
        pi.product_id,
        pi.filename,
        pi.thumbnail_filename,
        p.store_id,
        p.name as product_name,
        s.name as store_name
      FROM product_images pi
      JOIN products p ON pi.product_id = p.id
      JOIN stores s ON p.store_id = s.id
      ORDER BY p.store_id, pi.product_id, pi.id
    `);
    
    console.log(`Encontradas ${result.rows.length} imagens de produtos para verificação\n`);
    
    let totalFiles = 0;
    let existingFiles = 0;
    let missingFiles = 0;
    
    for (const row of result.rows) {
      const { id, product_id, filename, thumbnail_filename, store_id, product_name, store_name } = row;
      
      console.log(`\n📦 Produto: "${product_name}" (ID: ${product_id})`);
      console.log(`🏪 Loja: "${store_name}" (ID: ${store_id})`);
      console.log(`🖼️ Imagem ID: ${id}`);
      
      // Verificar imagem principal
      if (filename) {
        totalFiles++;
        const imagePath = path.join(process.cwd(), 'public', 'uploads', 'stores', String(store_id), 'products', String(product_id), filename);
        console.log(`   Verificando: ${imagePath}`);
        
        if (fs.existsSync(imagePath)) {
          console.log(`   ✅ EXISTE: ${filename}`);
          existingFiles++;
        } else {
          console.log(`   ❌ AUSENTE: ${filename}`);
          missingFiles++;
          
          // Tentar encontrar o arquivo em outros lugares
          const alternativePaths = [
            path.join(process.cwd(), 'public', 'uploads', filename),
            path.join(process.cwd(), 'public', 'uploads', 'originals', filename),
            path.join(process.cwd(), 'public', 'uploads', 'stores', String(store_id), filename)
          ];
          
          for (const altPath of alternativePaths) {
            if (fs.existsSync(altPath)) {
              console.log(`   🔍 ENCONTRADO EM: ${altPath}`);
              break;
            }
          }
        }
      }
      
      // Verificar thumbnail
      if (thumbnail_filename) {
        totalFiles++;
        const thumbPath = path.join(process.cwd(), 'public', 'uploads', 'stores', String(store_id), 'products', String(product_id), 'thumbnails', thumbnail_filename);
        console.log(`   Verificando thumbnail: ${thumbPath}`);
        
        if (fs.existsSync(thumbPath)) {
          console.log(`   ✅ THUMBNAIL EXISTE: ${thumbnail_filename}`);
          existingFiles++;
        } else {
          console.log(`   ❌ THUMBNAIL AUSENTE: ${thumbnail_filename}`);
          missingFiles++;
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO FINAL:');
    console.log(`Total de arquivos esperados: ${totalFiles}`);
    console.log(`Arquivos existentes: ${existingFiles} (${((existingFiles/totalFiles)*100).toFixed(1)}%)`);
    console.log(`Arquivos ausentes: ${missingFiles} (${((missingFiles/totalFiles)*100).toFixed(1)}%)`);
    console.log('='.repeat(60));
    
    if (missingFiles > 0) {
      console.log('\n⚠️  ATENÇÃO: Alguns arquivos estão ausentes nos caminhos esperados.');
      console.log('Isso explica por que algumas imagens aparecem como placeholder.');
    } else {
      console.log('\n✅ Todos os arquivos estão nos caminhos corretos!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar arquivos:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  verifyProductImageFiles();
}

module.exports = { verifyProductImageFiles };
