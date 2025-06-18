
#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Cores para console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

/**
 * Verifica se um caminho está no formato antigo
 */
function isOldFormat(imagePath) {
  return (
    imagePath.startsWith('/uploads/17') || // Timestamp direto
    imagePath.startsWith('/uploads/thumbnails/') || // Thumbnails antigas
    !imagePath.includes('/stores/') // Qualquer coisa que não tenha /stores/
  );
}

/**
 * Extrai informações de um arquivo de imagem
 */
function extractImageInfo(imagePath) {
  const fileName = path.basename(imagePath);
  
  // Verifica se é um padrão timestamp-randomID
  if (/^\d+-\d+\.(jpg|jpeg|png|gif)$/i.test(fileName)) {
    return {
      fileName,
      isValid: true
    };
  }
  
  return {
    fileName,
    isValid: false
  };
}

/**
 * Constrói o caminho seguro para uma imagem
 */
function buildSecurePath(storeId, productId, fileName, isThumbnail = false) {
  if (isThumbnail) {
    return `/uploads/stores/${storeId}/products/${productId}/thumbnails/${fileName}`;
  }
  return `/uploads/stores/${storeId}/products/${productId}/${fileName}`;
}

/**
 * Move um arquivo físico para o novo local
 */
async function movePhysicalFile(oldPath, newPath) {
  try {
    const oldFullPath = path.join(rootDir, 'public', oldPath);
    const newFullPath = path.join(rootDir, 'public', newPath);
    
    // Criar diretório de destino se não existir
    const newDir = path.dirname(newFullPath);
    if (!fs.existsSync(newDir)) {
      fs.mkdirSync(newDir, { recursive: true });
      console.log(`${colors.green}📁 Criado diretório: ${newDir}${colors.reset}`);
    }
    
    // Verificar se arquivo origem existe
    if (!fs.existsSync(oldFullPath)) {
      console.log(`${colors.yellow}⚠️ Arquivo origem não encontrado: ${oldFullPath}${colors.reset}`);
      return false;
    }
    
    // Verificar se arquivo destino já existe
    if (fs.existsSync(newFullPath)) {
      console.log(`${colors.yellow}⚠️ Arquivo destino já existe, removendo origem: ${oldFullPath}${colors.reset}`);
      fs.unlinkSync(oldFullPath);
      return true;
    }
    
    // Mover arquivo
    fs.renameSync(oldFullPath, newFullPath);
    console.log(`${colors.cyan}📄 Movido: ${oldPath} → ${newPath}${colors.reset}`);
    return true;
    
  } catch (error) {
    console.error(`${colors.red}❌ Erro ao mover arquivo ${oldPath}:`, error.message, colors.reset);
    return false;
  }
}

/**
 * Atualiza um registro de imagem no banco
 */
async function updateImageRecord(imageId, newImageUrl, newThumbnailUrl) {
  try {
    await pool.query(
      'UPDATE product_images SET image_url = $1, thumbnail_url = $2 WHERE id = $3',
      [newImageUrl, newThumbnailUrl, imageId]
    );
    console.log(`${colors.green}✅ Banco atualizado para imagem ID ${imageId}${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Erro ao atualizar banco para imagem ${imageId}:`, error.message, colors.reset);
    return false;
  }
}

/**
 * Processa uma imagem individual
 */
async function processImage(imageRecord) {
  const { id, product_id, image_url, thumbnail_url, store_id } = imageRecord;
  
  console.log(`\n${colors.magenta}🔄 Processando imagem ${id} - Produto ${product_id} - Loja ${store_id}${colors.reset}`);
  
  let newImageUrl = image_url;
  let newThumbnailUrl = thumbnail_url;
  let needsUpdate = false;
  
  // Processar imagem principal
  if (image_url && isOldFormat(image_url)) {
    const imageInfo = extractImageInfo(image_url);
    if (imageInfo.isValid) {
      newImageUrl = buildSecurePath(store_id, product_id, imageInfo.fileName);
      const moved = await movePhysicalFile(image_url, newImageUrl);
      if (moved) {
        needsUpdate = true;
        console.log(`${colors.blue}🔄 Imagem principal migrada: ${image_url} → ${newImageUrl}${colors.reset}`);
      }
    }
  }
  
  // Processar thumbnail
  if (thumbnail_url && isOldFormat(thumbnail_url)) {
    const thumbnailInfo = extractImageInfo(thumbnail_url);
    if (thumbnailInfo.isValid) {
      newThumbnailUrl = buildSecurePath(store_id, product_id, thumbnailInfo.fileName, true);
      const moved = await movePhysicalFile(thumbnail_url, newThumbnailUrl);
      if (moved) {
        needsUpdate = true;
        console.log(`${colors.blue}🔄 Thumbnail migrada: ${thumbnail_url} → ${newThumbnailUrl}${colors.reset}`);
      }
    }
  }
  
  // Atualizar banco se necessário
  if (needsUpdate) {
    const updated = await updateImageRecord(id, newImageUrl, newThumbnailUrl);
    return updated;
  }
  
  console.log(`${colors.yellow}ℹ️ Imagem ${id} já está no formato correto${colors.reset}`);
  return false;
}

/**
 * Remove diretórios antigos vazios
 */
function cleanupOldDirectories() {
  console.log(`\n${colors.blue}🧹 Limpando diretórios antigos...${colors.reset}`);
  
  const oldDirs = [
    path.join(rootDir, 'public', 'uploads', 'thumbnails'),
    path.join(rootDir, 'public', 'uploads', 'originals')
  ];
  
  for (const dir of oldDirs) {
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        if (files.length === 0) {
          fs.rmdirSync(dir);
          console.log(`${colors.green}🗑️ Removido diretório vazio: ${dir}${colors.reset}`);
        } else {
          console.log(`${colors.yellow}⚠️ Diretório não vazio, mantido: ${dir}${colors.reset}`);
        }
      }
    } catch (error) {
      console.error(`${colors.red}❌ Erro ao limpar diretório ${dir}:`, error.message, colors.reset);
    }
  }
}

/**
 * Função principal de migração
 */
async function migrateToSecureStructure() {
  const client = await pool.connect();
  
  try {
    console.log(`${colors.cyan}🚀 Iniciando migração definitiva para estrutura segura${colors.reset}`);
    console.log(`${colors.cyan}📋 Esta migração irá:${colors.reset}`);
    console.log(`${colors.cyan}   • Mover arquivos para /uploads/stores/{storeId}/products/{productId}/`);
    console.log(`${colors.cyan}   • Atualizar URLs no banco de dados`);
    console.log(`${colors.cyan}   • Remover estrutura antiga`);
    console.log(`${colors.cyan}   • Eliminar fallbacks de formato antigo${colors.reset}\n`);
    
    // Buscar todas as imagens que precisam ser migradas
    const query = `
      SELECT 
        pi.id,
        pi.product_id,
        pi.image_url,
        pi.thumbnail_url,
        p.store_id
      FROM product_images pi
      JOIN products p ON pi.product_id = p.id
      WHERE 
        pi.image_url LIKE '/uploads/17%' OR
        pi.image_url LIKE '/uploads/thumbnails/%' OR
        pi.image_url NOT LIKE '/uploads/stores/%' OR
        pi.thumbnail_url LIKE '/uploads/thumbnails/%' OR
        pi.thumbnail_url NOT LIKE '/uploads/stores/%'
      ORDER BY pi.product_id, pi.id
    `;
    
    const result = await client.query(query);
    console.log(`${colors.blue}📊 Encontradas ${result.rows.length} imagens para migrar${colors.reset}`);
    
    if (result.rows.length === 0) {
      console.log(`${colors.green}✅ Nenhuma imagem precisa ser migrada! Sistema já está atualizado.${colors.reset}`);
      return;
    }
    
    let migrated = 0;
    let errors = 0;
    
    // Processar cada imagem
    for (const row of result.rows) {
      try {
        const success = await processImage(row);
        if (success) {
          migrated++;
        }
      } catch (error) {
        console.error(`${colors.red}❌ Erro ao processar imagem ${row.id}:`, error.message, colors.reset);
        errors++;
      }
    }
    
    // Limpeza final
    cleanupOldDirectories();
    
    // Relatório final
    console.log(`\n${colors.blue}=== RELATÓRIO DE MIGRAÇÃO ===${colors.reset}`);
    console.log(`${colors.green}✅ Imagens migradas com sucesso: ${migrated}${colors.reset}`);
    console.log(`${colors.red}❌ Erros durante migração: ${errors}${colors.reset}`);
    console.log(`${colors.blue}📊 Total processadas: ${result.rows.length}${colors.reset}`);
    
    if (migrated > 0) {
      console.log(`\n${colors.green}🎉 Migração concluída! Sistema agora usa exclusivamente a estrutura segura.${colors.reset}`);
      console.log(`${colors.yellow}⚠️ PRÓXIMOS PASSOS:${colors.reset}`);
      console.log(`${colors.yellow}   1. Execute o script de limpeza do image controller${colors.reset}`);
      console.log(`${colors.yellow}   2. Teste o carregamento de imagens${colors.reset}`);
      console.log(`${colors.yellow}   3. Remova scripts de migração antigos${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}❌ Erro durante a migração:`, error, colors.reset);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Função principal
 */
async function main() {
  try {
    await migrateToSecureStructure();
    console.log(`\n${colors.green}🎉 Migração concluída com sucesso!${colors.reset}`);
    process.exit(0);
  } catch (error) {
    console.error(`${colors.red}❌ Erro fatal durante a migração:`, error, colors.reset);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
