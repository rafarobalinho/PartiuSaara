/**
 * Script para corrigir caminhos de imagens inconsistentes
 *
 * Este script:
 * 1. Escaneia o banco de dados procurando por caminhos de imagens em formato antigo
 * 2. Verifica a existência física dos arquivos no servidor
 * 3. Corrige os caminhos para o novo formato /uploads/stores/{storeId}/products/{productId}/
 * 4. Atualiza os registros no banco de dados
 */

const { pool } = require('../server/db.js');
const fs = require('fs');
const path = require('path');

// Diretório base para uploads
const BASE_UPLOAD_DIR = path.join(process.cwd(), 'public/uploads');

// Definir tipos de entidades suportadas
const ENTITY_TYPES = {
  PRODUCT: 'product',
  STORE: 'store',
};

// Cores para melhor legibilidade no console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Extrai informações de um caminho de arquivo de imagem
 * @param {string} filePath - Caminho do arquivo a ser analisado
 * @returns {Object|null} Informações extraídas ou null se não for possível extrair
 */
function extractImageInfo(filePath) {
  // Extrair apenas o nome do arquivo do caminho completo
  const fileName = filePath.split('/').pop();
  
  // Verificar se é um padrão conhecido
  if (/^\d+-\d+\.(jpg|jpeg|png|gif)$/i.test(fileName)) {
    // É um padrão timestamp-randomID
    const timestamp = fileName.split('-')[0];
    return {
      fileName,
      timestamp,
      pattern: 'timestamp-random',
    };
  }
  
  return null;
}

/**
 * Constrói o caminho seguro para uma imagem
 * @param {string} entityType - Tipo de entidade (product, store)
 * @param {number} entityId - ID da entidade
 * @param {number} ownerId - ID do dono (store para produtos, user para lojas)
 * @param {string} fileName - Nome do arquivo
 * @returns {string} Caminho seguro construído
 */
function buildSecurePath(entityType, entityId, ownerId, fileName) {
  if (entityType === ENTITY_TYPES.PRODUCT) {
    return `/uploads/stores/${ownerId}/products/${entityId}/${fileName}`;
  } else if (entityType === ENTITY_TYPES.STORE) {
    return `/uploads/stores/${entityId}/${fileName}`;
  }
  return null;
}

/**
 * Garante que os diretórios existam para o caminho seguro
 * @param {string} securePath - Caminho seguro completo
 */
async function ensureDirectoryExists(securePath) {
  const dirPath = path.join(process.cwd(), 'public', path.dirname(securePath));
  
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`${colors.green}✓ Diretório criado: ${dirPath}${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}❌ Erro ao criar diretório ${dirPath}: ${error.message}${colors.reset}`);
    throw error;
  }
}

/**
 * Move um arquivo para o caminho seguro
 * @param {string} originalPath - Caminho original do arquivo
 * @param {string} securePath - Caminho seguro para onde o arquivo deve ser movido
 * @returns {boolean} Se a operação foi bem-sucedida
 */
async function moveFileToSecurePath(originalPath, securePath) {
  try {
    const originalFullPath = path.join(process.cwd(), 'public', originalPath);
    const secureFullPath = path.join(process.cwd(), 'public', securePath);
    
    // Verificar se o arquivo original existe
    if (!fs.existsSync(originalFullPath)) {
      console.warn(`${colors.yellow}⚠️ Arquivo original não encontrado: ${originalFullPath}${colors.reset}`);
      return false;
    }
    
    // Garantir que o diretório de destino exista
    await ensureDirectoryExists(securePath);
    
    // Copiar o arquivo em vez de mover, para preservar o original como backup
    fs.copyFileSync(originalFullPath, secureFullPath);
    console.log(`${colors.green}✓ Arquivo copiado: ${originalPath} -> ${securePath}${colors.reset}`);
    
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Erro ao mover arquivo: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Atualiza os registros de imagem de produto no banco de dados
 * @param {number} productId - ID do produto
 * @param {string} oldPath - Caminho antigo da imagem
 * @param {string} newPath - Caminho novo (seguro) da imagem
 * @returns {boolean} Se a operação foi bem-sucedida
 */
async function updateProductImagePath(productId, oldPath, newPath) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Atualizar na tabela de imagens de produto
    const result = await client.query(
      `UPDATE product_images 
       SET image_url = $1 
       WHERE product_id = $2 AND image_url = $3`,
      [newPath, productId, oldPath]
    );
    
    if (result.rowCount === 0) {
      console.warn(`${colors.yellow}⚠️ Nenhum registro de imagem encontrado para produto ${productId} com caminho ${oldPath}${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ Atualizado ${result.rowCount} registros para produto ${productId}${colors.reset}`);
    }
    
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`${colors.red}❌ Erro ao atualizar caminho de imagem para produto ${productId}: ${error.message}${colors.reset}`);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Atualiza os registros de imagem de loja no banco de dados
 * @param {number} storeId - ID da loja
 * @param {string} oldPath - Caminho antigo da imagem
 * @param {string} newPath - Caminho novo (seguro) da imagem
 * @returns {boolean} Se a operação foi bem-sucedida
 */
async function updateStoreImagePath(storeId, oldPath, newPath) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Atualizar na tabela de imagens de loja
    const result = await client.query(
      `UPDATE store_images 
       SET image_url = $1 
       WHERE store_id = $2 AND image_url = $3`,
      [newPath, storeId, oldPath]
    );
    
    if (result.rowCount === 0) {
      console.warn(`${colors.yellow}⚠️ Nenhum registro de imagem encontrado para loja ${storeId} com caminho ${oldPath}${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ Atualizado ${result.rowCount} registros para loja ${storeId}${colors.reset}`);
    }
    
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`${colors.red}❌ Erro ao atualizar caminho de imagem para loja ${storeId}: ${error.message}${colors.reset}`);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Processa imagens de produtos para corrigir caminhos inconsistentes
 */
async function processProductImages() {
  const client = await pool.connect();
  
  try {
    console.log(`\n${colors.blue}=== Processando imagens de produtos ===${colors.reset}`);
    
    // Buscar todas as imagens de produtos que não estão no formato seguro
    const result = await client.query(`
      SELECT pi.id, pi.product_id, pi.image_url, p.store_id
      FROM product_images pi
      JOIN products p ON pi.product_id = p.id
      WHERE pi.image_url NOT LIKE '/uploads/stores/%/products/%/%'
    `);
    
    console.log(`${colors.blue}Encontradas ${result.rows.length} imagens de produtos com caminhos inconsistentes${colors.reset}`);
    
    // Processar cada imagem
    for (const row of result.rows) {
      const { id, product_id, image_url, store_id } = row;
      console.log(`\n${colors.cyan}Processando imagem ${id} do produto ${product_id}${colors.reset}`);
      
      const imageInfo = extractImageInfo(image_url);
      if (!imageInfo) {
        console.warn(`${colors.yellow}⚠️ Não foi possível extrair informações da imagem: ${image_url}${colors.reset}`);
        continue;
      }
      
      // Construir caminho seguro
      const securePath = buildSecurePath(
        ENTITY_TYPES.PRODUCT,
        product_id,
        store_id,
        imageInfo.fileName
      );
      
      if (!securePath) {
        console.warn(`${colors.yellow}⚠️ Não foi possível construir caminho seguro para: ${image_url}${colors.reset}`);
        continue;
      }
      
      console.log(`${colors.blue}Corrigindo caminho: ${image_url} -> ${securePath}${colors.reset}`);
      
      // Mover arquivo para o caminho seguro
      const fileMoved = await moveFileToSecurePath(image_url, securePath);
      
      if (fileMoved) {
        // Atualizar registro no banco de dados
        await updateProductImagePath(product_id, image_url, securePath);
      }
    }
  } catch (error) {
    console.error(`${colors.red}❌ Erro ao processar imagens de produtos: ${error.message}${colors.reset}`);
  } finally {
    client.release();
  }
}

/**
 * Processa imagens de lojas para corrigir caminhos inconsistentes
 */
async function processStoreImages() {
  const client = await pool.connect();
  
  try {
    console.log(`\n${colors.blue}=== Processando imagens de lojas ===${colors.reset}`);
    
    // Buscar todas as imagens de lojas que não estão no formato seguro
    const result = await client.query(`
      SELECT si.id, si.store_id, si.image_url
      FROM store_images si
      WHERE si.image_url NOT LIKE '/uploads/stores/%/%'
    `);
    
    console.log(`${colors.blue}Encontradas ${result.rows.length} imagens de lojas com caminhos inconsistentes${colors.reset}`);
    
    // Processar cada imagem
    for (const row of result.rows) {
      const { id, store_id, image_url } = row;
      console.log(`\n${colors.cyan}Processando imagem ${id} da loja ${store_id}${colors.reset}`);
      
      const imageInfo = extractImageInfo(image_url);
      if (!imageInfo) {
        console.warn(`${colors.yellow}⚠️ Não foi possível extrair informações da imagem: ${image_url}${colors.reset}`);
        continue;
      }
      
      // Construir caminho seguro
      const securePath = buildSecurePath(
        ENTITY_TYPES.STORE,
        store_id,
        store_id, // Para lojas, o owner_id é o próprio store_id
        imageInfo.fileName
      );
      
      if (!securePath) {
        console.warn(`${colors.yellow}⚠️ Não foi possível construir caminho seguro para: ${image_url}${colors.reset}`);
        continue;
      }
      
      console.log(`${colors.blue}Corrigindo caminho: ${image_url} -> ${securePath}${colors.reset}`);
      
      // Mover arquivo para o caminho seguro
      const fileMoved = await moveFileToSecurePath(image_url, securePath);
      
      if (fileMoved) {
        // Atualizar registro no banco de dados
        await updateStoreImagePath(store_id, image_url, securePath);
      }
    }
  } catch (error) {
    console.error(`${colors.red}❌ Erro ao processar imagens de lojas: ${error.message}${colors.reset}`);
  } finally {
    client.release();
  }
}

/**
 * Função principal
 */
async function main() {
  console.log(`${colors.magenta}=== Iniciando correção de caminhos de imagens ===${colors.reset}`);
  
  try {
    // Processar imagens de produtos
    await processProductImages();
    
    // Processar imagens de lojas
    await processStoreImages();
    
    console.log(`\n${colors.green}=== Processo finalizado com sucesso ===${colors.reset}`);
  } catch (error) {
    console.error(`\n${colors.red}=== Erro durante o processo ===${colors.reset}`);
    console.error(error);
  } finally {
    // Fechar a conexão com o banco de dados
    await pool.end();
  }
}

// Executar script
main().catch(console.error);