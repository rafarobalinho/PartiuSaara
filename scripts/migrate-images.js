/**
 * Script para migrar imagens existentes para a nova estrutura segura por loja/produto
 * Este script deve ser executado APENAS UMA VEZ para migrar as imagens existentes
 */

import { pool } from '../server/db.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Obtém o caminho do diretório atual em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Define as pastas de upload
const oldUploadDir = path.join(rootDir, 'public', 'uploads');
const oldThumbnailDir = path.join(oldUploadDir, 'thumbnails');
const storesDir = path.join(oldUploadDir, 'stores');

// Garante que as pastas base existam
if (!fs.existsSync(storesDir)) {
  fs.mkdirSync(storesDir, { recursive: true });
}

/**
 * Cria os diretórios seguros para uma loja e produto
 */
function createSecureDirectories(storeId, productId = null) {
  // Cria o diretório da loja
  const storeDir = path.join(storesDir, String(storeId));
  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true });
  }
  
  // Se for produto, cria o diretório de produtos
  if (productId) {
    const productsDir = path.join(storeDir, 'products');
    if (!fs.existsSync(productsDir)) {
      fs.mkdirSync(productsDir, { recursive: true });
    }
    
    // Cria o diretório específico do produto
    const productDir = path.join(productsDir, String(productId));
    if (!fs.existsSync(productDir)) {
      fs.mkdirSync(productDir, { recursive: true });
    }
    
    return productDir;
  }
  
  return storeDir;
}

/**
 * Obtém o nome do arquivo a partir de um caminho
 */
function getFilenameFromPath(filePath) {
  if (!filePath) return null;
  
  // Normaliza o caminho para o formato POSIX
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  // Extrai o nome do arquivo do caminho
  return normalizedPath.split('/').pop();
}

/**
 * Migra uma imagem para a estrutura segura
 */
async function migrateImage(originalPath, thumbnailPath, targetDir, storeId, productId, imageId, type) {
  try {
    // Extrair os nomes dos arquivos
    const imageFileName = getFilenameFromPath(originalPath);
    const thumbFileName = getFilenameFromPath(thumbnailPath);
    
    if (!imageFileName || !thumbFileName) {
      console.error(`Nomes de arquivos inválidos: ${originalPath}, ${thumbnailPath}`);
      return null;
    }
    
    // Resolver os caminhos completos
    let originalFullPath, thumbnailFullPath;
    
    // Ajustar caminhos para arquivos existentes
    if (originalPath.startsWith('/uploads/')) {
      originalFullPath = path.join(rootDir, 'public', originalPath);
    } else {
      originalFullPath = path.join(oldUploadDir, imageFileName);
    }
    
    if (thumbnailPath.startsWith('/uploads/')) {
      thumbnailFullPath = path.join(rootDir, 'public', thumbnailPath);
    } else {
      thumbnailFullPath = path.join(oldThumbnailDir, thumbFileName);
    }
    
    // Verificar se os arquivos existem
    if (!fs.existsSync(originalFullPath)) {
      console.error(`Arquivo original não encontrado: ${originalFullPath}`);
      return null;
    }
    
    if (!fs.existsSync(thumbnailFullPath)) {
      console.error(`Arquivo thumbnail não encontrado: ${thumbnailFullPath}`);
      return null;
    }
    
    // Criar os novos caminhos seguros
    const newImagePath = path.join(targetDir, imageFileName);
    const newThumbPath = path.join(targetDir, thumbFileName);
    
    // Copiar os arquivos para os novos locais
    fs.copyFileSync(originalFullPath, newImagePath);
    fs.copyFileSync(thumbnailFullPath, newThumbPath);
    
    // Gerar as novas URLs relativas
    let newImageUrl, newThumbUrl;
    
    if (type === 'product') {
      newImageUrl = `/uploads/stores/${storeId}/products/${productId}/${imageFileName}`;
      newThumbUrl = `/uploads/stores/${storeId}/products/${productId}/${thumbFileName}`;
    } else {
      newImageUrl = `/uploads/stores/${storeId}/${imageFileName}`;
      newThumbUrl = `/uploads/stores/${storeId}/${thumbFileName}`;
    }
    
    console.log(`Imagem migrada com sucesso: ${originalPath} -> ${newImageUrl}`);
    
    // Atualizar o banco de dados
    if (type === 'product') {
      await pool.query(
        'UPDATE product_images SET image_url = $1, thumbnail_url = $2 WHERE id = $3',
        [newImageUrl, newThumbUrl, imageId]
      );
    } else {
      await pool.query(
        'UPDATE store_images SET image_url = $1, thumbnail_url = $2 WHERE id = $3',
        [newImageUrl, newThumbUrl, imageId]
      );
    }
    
    return {
      newImageUrl,
      newThumbUrl
    };
  } catch (error) {
    console.error(`Erro ao migrar imagem: ${error.message}`);
    return null;
  }
}

/**
 * Migra todas as imagens de produtos
 */
async function migrateProductImages() {
  try {
    console.log('Migrando imagens de produtos...');
    
    // Buscar todas as imagens de produtos e seus produtos associados
    const result = await pool.query(`
      SELECT pi.id, pi.image_url, pi.thumbnail_url, pi.product_id, p.store_id
      FROM product_images pi
      JOIN products p ON pi.product_id = p.id
    `);
    
    console.log(`Encontradas ${result.rows.length} imagens de produtos para migrar`);
    
    // Processar cada imagem
    for (const image of result.rows) {
      const storeId = image.store_id;
      const productId = image.product_id;
      
      // Criar diretório seguro
      const targetDir = createSecureDirectories(storeId, productId);
      
      // Migrar a imagem
      await migrateImage(
        image.image_url,
        image.thumbnail_url,
        targetDir,
        storeId,
        productId,
        image.id,
        'product'
      );
    }
    
    console.log('Migração de imagens de produtos concluída!');
  } catch (error) {
    console.error('Erro ao migrar imagens de produtos:', error);
  }
}

/**
 * Migra todas as imagens de lojas
 */
async function migrateStoreImages() {
  try {
    console.log('Migrando imagens de lojas...');
    
    // Buscar todas as imagens de lojas
    const result = await pool.query(`
      SELECT si.id, si.image_url, si.thumbnail_url, si.store_id
      FROM store_images si
    `);
    
    console.log(`Encontradas ${result.rows.length} imagens de lojas para migrar`);
    
    // Processar cada imagem
    for (const image of result.rows) {
      const storeId = image.store_id;
      
      // Criar diretório seguro
      const targetDir = createSecureDirectories(storeId);
      
      // Migrar a imagem
      await migrateImage(
        image.image_url,
        image.thumbnail_url,
        targetDir,
        storeId,
        null,
        image.id,
        'store'
      );
    }
    
    console.log('Migração de imagens de lojas concluída!');
  } catch (error) {
    console.error('Erro ao migrar imagens de lojas:', error);
  }
}

/**
 * Função principal para migrar todas as imagens
 */
async function migrateAllImages() {
  try {
    console.log('Iniciando migração de todas as imagens...');
    
    // Migrar imagens de produtos
    await migrateProductImages();
    
    // Migrar imagens de lojas
    await migrateStoreImages();
    
    console.log('Migração de todas as imagens concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a migração de imagens:', error);
  } finally {
    // Encerrar a conexão com o banco de dados
    await pool.end();
  }
}

// Executar o script
migrateAllImages();