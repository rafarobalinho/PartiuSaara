
/**
 * Script para migrar imagens existentes para a nova estrutura de pastas
 * De: /uploads/filename.jpg
 * Para: /uploads/stores/{storeId}/products/{productId}/filename.jpg
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../server/db.js');

// Diretórios
const rootDir = process.cwd();
const uploadsDir = path.join(rootDir, 'public/uploads');
const storesDir = path.join(uploadsDir, 'stores');

// Cores para console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Cria estrutura de pastas se não existir
 */
function createDirectoryIfNotExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`${colors.green}✅ Pasta criada: ${dirPath}${colors.reset}`);
    return true;
  }
  return false;
}

/**
 * Move arquivo de um local para outro
 */
function moveFile(sourcePath, destinationPath) {
  try {
    // Criar diretório de destino se não existir
    const destDir = path.dirname(destinationPath);
    createDirectoryIfNotExists(destDir);
    
    // Mover arquivo
    fs.renameSync(sourcePath, destinationPath);
    console.log(`${colors.cyan}📁 Movido: ${path.basename(sourcePath)} -> ${destinationPath}${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Erro ao mover ${sourcePath}:`, error.message, colors.reset);
    return false;
  }
}

/**
 * Migra imagens de produtos
 */
async function migrateProductImages() {
  const client = await pool.connect();
  
  try {
    console.log(`\n${colors.blue}=== Migrando imagens de produtos ===${colors.reset}`);
    
    // Buscar todas as imagens de produtos que precisam ser migradas
    const result = await client.query(`
      SELECT 
        pi.id, 
        pi.product_id, 
        pi.image_url, 
        pi.thumbnail_url,
        p.store_id
      FROM product_images pi
      JOIN products p ON pi.product_id = p.id
      WHERE pi.image_url NOT LIKE '/uploads/stores/%'
      ORDER BY pi.id
    `);
    
    console.log(`${colors.blue}Encontradas ${result.rows.length} imagens de produtos para migrar${colors.reset}`);
    
    let migrated = 0;
    let errors = 0;
    
    for (const row of result.rows) {
      const { id, product_id, image_url, thumbnail_url, store_id } = row;
      
      // Extrair nome do arquivo da URL atual
      const imageFileName = path.basename(image_url);
      const thumbnailFileName = path.basename(thumbnail_url || '');
      
      // Caminhos atuais
      const currentImagePath = path.join(rootDir, 'public', image_url);
      const currentThumbnailPath = thumbnail_url ? path.join(rootDir, 'public', thumbnail_url) : null;
      
      // Novos caminhos
      const newImageDir = path.join(storesDir, store_id.toString(), 'products', product_id.toString());
      const newThumbnailDir = path.join(newImageDir, 'thumbnails');
      
      const newImagePath = path.join(newImageDir, imageFileName);
      const newThumbnailPath = thumbnailFileName ? path.join(newThumbnailDir, thumbnailFileName) : null;
      
      // Novas URLs
      const newImageUrl = `/uploads/stores/${store_id}/products/${product_id}/${imageFileName}`;
      const newThumbnailUrl = thumbnailFileName ? `/uploads/stores/${store_id}/products/${product_id}/thumbnails/${thumbnailFileName}` : null;
      
      console.log(`\n${colors.yellow}Migrando imagem ${id} do produto ${product_id} (loja ${store_id})${colors.reset}`);
      
      let success = true;
      
      // Mover imagem principal
      if (fs.existsSync(currentImagePath)) {
        if (!moveFile(currentImagePath, newImagePath)) {
          success = false;
        }
      } else {
        console.log(`${colors.yellow}⚠️ Arquivo não encontrado: ${currentImagePath}${colors.reset}`);
      }
      
      // Mover thumbnail se existir
      if (currentThumbnailPath && fs.existsSync(currentThumbnailPath)) {
        if (!moveFile(currentThumbnailPath, newThumbnailPath)) {
          success = false;
        }
      }
      
      // Atualizar banco de dados
      if (success) {
        try {
          await client.query(`
            UPDATE product_images 
            SET 
              image_url = $1,
              thumbnail_url = $2
            WHERE id = $3
          `, [newImageUrl, newThumbnailUrl, id]);
          
          console.log(`${colors.green}✅ Banco de dados atualizado para imagem ${id}${colors.reset}`);
          migrated++;
        } catch (error) {
          console.error(`${colors.red}❌ Erro ao atualizar banco para imagem ${id}:`, error.message, colors.reset);
          errors++;
        }
      } else {
        errors++;
      }
    }
    
    console.log(`\n${colors.blue}=== Resultado da migração de produtos ===${colors.reset}`);
    console.log(`${colors.green}✅ Migradas: ${migrated}${colors.reset}`);
    console.log(`${colors.red}❌ Erros: ${errors}${colors.reset}`);
    
  } finally {
    client.release();
  }
}

/**
 * Migra imagens de lojas
 */
async function migrateStoreImages() {
  const client = await pool.connect();
  
  try {
    console.log(`\n${colors.blue}=== Migrando imagens de lojas ===${colors.reset}`);
    
    // Buscar todas as imagens de lojas que precisam ser migradas
    const result = await client.query(`
      SELECT 
        si.id, 
        si.store_id, 
        si.image_url, 
        si.thumbnail_url
      FROM store_images si
      WHERE si.image_url NOT LIKE '/uploads/stores/%'
      ORDER BY si.id
    `);
    
    console.log(`${colors.blue}Encontradas ${result.rows.length} imagens de lojas para migrar${colors.reset}`);
    
    let migrated = 0;
    let errors = 0;
    
    for (const row of result.rows) {
      const { id, store_id, image_url, thumbnail_url } = row;
      
      // Extrair nome do arquivo da URL atual
      const imageFileName = path.basename(image_url);
      const thumbnailFileName = path.basename(thumbnail_url || '');
      
      // Caminhos atuais
      const currentImagePath = path.join(rootDir, 'public', image_url);
      const currentThumbnailPath = thumbnail_url ? path.join(rootDir, 'public', thumbnail_url) : null;
      
      // Novos caminhos
      const newImageDir = path.join(storesDir, store_id.toString());
      const newThumbnailDir = path.join(newImageDir, 'thumbnails');
      
      const newImagePath = path.join(newImageDir, imageFileName);
      const newThumbnailPath = thumbnailFileName ? path.join(newThumbnailDir, thumbnailFileName) : null;
      
      // Novas URLs
      const newImageUrl = `/uploads/stores/${store_id}/${imageFileName}`;
      const newThumbnailUrl = thumbnailFileName ? `/uploads/stores/${store_id}/thumbnails/${thumbnailFileName}` : null;
      
      console.log(`\n${colors.yellow}Migrando imagem ${id} da loja ${store_id}${colors.reset}`);
      
      let success = true;
      
      // Mover imagem principal
      if (fs.existsSync(currentImagePath)) {
        if (!moveFile(currentImagePath, newImagePath)) {
          success = false;
        }
      } else {
        console.log(`${colors.yellow}⚠️ Arquivo não encontrado: ${currentImagePath}${colors.reset}`);
      }
      
      // Mover thumbnail se existir
      if (currentThumbnailPath && fs.existsSync(currentThumbnailPath)) {
        if (!moveFile(currentThumbnailPath, newThumbnailPath)) {
          success = false;
        }
      }
      
      // Atualizar banco de dados
      if (success) {
        try {
          await client.query(`
            UPDATE store_images 
            SET 
              image_url = $1,
              thumbnail_url = $2
            WHERE id = $3
          `, [newImageUrl, newThumbnailUrl, id]);
          
          console.log(`${colors.green}✅ Banco de dados atualizado para imagem ${id}${colors.reset}`);
          migrated++;
        } catch (error) {
          console.error(`${colors.red}❌ Erro ao atualizar banco para imagem ${id}:`, error.message, colors.reset);
          errors++;
        }
      } else {
        errors++;
      }
    }
    
    console.log(`\n${colors.blue}=== Resultado da migração de lojas ===${colors.reset}`);
    console.log(`${colors.green}✅ Migradas: ${migrated}${colors.reset}`);
    console.log(`${colors.red}❌ Erros: ${errors}${colors.reset}`);
    
  } finally {
    client.release();
  }
}

/**
 * Função principal
 */
async function main() {
  try {
    console.log(`${colors.cyan}🚀 Iniciando migração de imagens para nova estrutura de pastas${colors.reset}`);
    
    // Criar pasta stores se não existir
    createDirectoryIfNotExists(storesDir);
    
    // Migrar imagens de produtos
    await migrateProductImages();
    
    // Migrar imagens de lojas
    await migrateStoreImages();
    
    console.log(`\n${colors.green}🎉 Migração concluída!${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Erro durante a migração:`, error, colors.reset);
  } finally {
    process.exit(0);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { main };
