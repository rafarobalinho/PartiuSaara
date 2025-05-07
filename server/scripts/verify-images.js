/**
 * Script para verificar a integridade das imagens no sistema
 * Verifica se os arquivos referenciados no banco de dados existem no sistema de arquivos
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

async function verifyImages() {
  // Verificar diretório de uploads
  const uploadsDir = path.join(__dirname, '../../public/uploads');
  console.log(`Verificando diretório de uploads: ${uploadsDir}`);
  
  if (!fs.existsSync(uploadsDir)) {
    console.error(`⚠️ Diretório de uploads não encontrado: ${uploadsDir}`);
    return;
  }
  
  // Listar arquivos no diretório
  const files = fs.readdirSync(uploadsDir);
  console.log(`📁 Arquivos encontrados: ${files.length}`);
  
  // Buscar referências no banco de dados
  const storeImagesResult = await pool.query('SELECT * FROM store_images');
  const productImagesResult = await pool.query('SELECT * FROM product_images');
  
  const storeImages = storeImagesResult.rows;
  const productImages = productImagesResult.rows;
  
  console.log(`🔍 Referências no banco: ${storeImages.length + productImages.length}`);
  
  // Verificar cada referência
  let missingFiles = 0;
  
  for (const img of storeImages) {
    const filename = path.basename(img.image_url);
    if (!files.includes(filename)) {
      console.log(`❌ Arquivo ausente: ${filename} (ID: ${img.id}, Loja: ${img.store_id})`);
      missingFiles++;
    }
  }
  
  for (const img of productImages) {
    const filename = path.basename(img.image_url);
    if (!files.includes(filename)) {
      console.log(`❌ Arquivo ausente: ${filename} (ID: ${img.id}, Produto: ${img.product_id})`);
      missingFiles++;
    }
  }
  
  console.log(`\n📊 Resumo da verificação:`);
  console.log(`- Arquivos no sistema: ${files.length}`);
  console.log(`- Referências no banco: ${storeImages.length + productImages.length}`);
  console.log(`- Arquivos ausentes: ${missingFiles}`);
  
  // Verificar se existem arquivos órfãos (no sistema mas não referenciados no banco)
  const storeUrls = storeImages.map(img => path.basename(img.image_url));
  const productUrls = productImages.map(img => path.basename(img.image_url));
  const allReferenced = [...storeUrls, ...productUrls];
  
  const orphanedFiles = files.filter(file => !allReferenced.includes(file));
  console.log(`- Arquivos órfãos: ${orphanedFiles.length}`);
  
  if (orphanedFiles.length > 0) {
    console.log('\n⚠️ Arquivos órfãos (no sistema mas não referenciados no banco):');
    orphanedFiles.forEach(file => console.log(`  - ${file}`));
  }
}

// Executar o script diretamente
if (require.main === module) {
  verifyImages()
    .then(() => console.log('\n✅ Verificação concluída'))
    .catch(err => console.error('\n❌ Erro durante verificação:', err))
    .finally(() => process.exit());
}

module.exports = { verifyImages };