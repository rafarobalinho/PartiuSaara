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
};

/**
 * Migra uma imagem específica
 */
async function migrateImage(imageData) {
  const { id, product_id, image_url, thumbnail_url, store_id } = imageData;

  try {
    console.log(`\n${colors.yellow}Migrando imagem ${id} do produto ${product_id} (loja ${store_id})${colors.reset}`);

    // Criar estrutura de pastas
    const storeDir = path.join(rootDir, 'public', 'uploads', 'stores', store_id.toString());
    const productDir = path.join(storeDir, 'products', product_id.toString());
    const thumbnailDir = path.join(productDir, 'thumbnails');

    // Criar pastas se não existirem
    if (!fs.existsSync(productDir)) {
      fs.mkdirSync(productDir, { recursive: true });
      console.log(`${colors.green}📁 Pasta criada: ${productDir}${colors.reset}`);
    }

    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
      console.log(`${colors.green}📁 Pasta criada: ${thumbnailDir}${colors.reset}`);
    }

    let imageUpdated = false;
    let thumbnailUpdated = false;

    // Migrar imagem principal
    if (image_url) {
      const result = await moveImageFile(image_url, store_id, product_id, 'image', id);
      imageUpdated = result.success;
    }

    // Migrar thumbnail
    if (thumbnail_url) {
      const result = await moveImageFile(thumbnail_url, store_id, product_id, 'thumbnail', id);
      thumbnailUpdated = result.success;
    }

    if (imageUpdated || thumbnailUpdated) {
      console.log(`${colors.green}✅ Migrada imagem do produto ${product_id}${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.yellow}⚠️ Nenhuma alteração necessária para produto ${product_id}${colors.reset}`);
      return false;
    }

  } catch (error) {
    console.error(`${colors.red}❌ Erro ao migrar produto ${product_id}:`, error.message, colors.reset);
    return false;
  }
}

/**
 * Move um arquivo de imagem e atualiza o banco
 */
async function moveImageFile(imageUrl, storeId, productId, type, imageId) {
  try {
    const oldPath = path.join(rootDir, 'public', imageUrl);
    const fileName = path.basename(imageUrl);

    let newPath;
    let newUrl;

    if (type === 'thumbnail') {
      newPath = path.join(rootDir, 'public', 'uploads', 'stores', storeId.toString(), 'products', productId.toString(), 'thumbnails', fileName);
      newUrl = `/uploads/stores/${storeId}/products/${productId}/thumbnails/${fileName}`;
    } else {
      newPath = path.join(rootDir, 'public', 'uploads', 'stores', storeId.toString(), 'products', productId.toString(), fileName);
      newUrl = `/uploads/stores/${storeId}/products/${productId}/${fileName}`;
    }

    // Verificar se o arquivo já está no local correto
    if (imageUrl === newUrl) {
      console.log(`${colors.blue}ℹ️ Arquivo já está no local correto: ${newUrl}${colors.reset}`);
      return { success: false, url: newUrl };
    }

    // Mover arquivo se existir no local antigo
    if (fs.existsSync(oldPath)) {
      // Verificar se o destino já existe
      if (fs.existsSync(newPath)) {
        console.log(`${colors.yellow}⚠️ Arquivo já existe no destino, removendo original: ${oldPath}${colors.reset}`);
        fs.unlinkSync(oldPath);
      } else {
        fs.renameSync(oldPath, newPath);
        console.log(`${colors.cyan}📄 Movido: ${imageUrl} → ${newUrl}${colors.reset}`);
      }

      // Atualizar banco de dados
      const updateField = type === 'thumbnail' ? 'thumbnail_url' : 'image_url';
      await pool.query(
        `UPDATE product_images SET ${updateField} = $1 WHERE id = $2`,
        [newUrl, imageId]
      );

      console.log(`${colors.green}✅ Banco atualizado: ${updateField} = ${newUrl}${colors.reset}`);
      return { success: true, url: newUrl };
    } else {
      console.log(`${colors.yellow}⚠️ Arquivo não encontrado: ${oldPath}${colors.reset}`);
      return { success: false, url: newUrl };
    }
  } catch (error) {
    console.error(`${colors.red}❌ Erro ao mover arquivo ${imageUrl}:`, error.message, colors.reset);
    return { success: false, url: imageUrl };
  }
}

/**
 * Função principal de migração
 */
async function migrateImages() {
  const client = await pool.connect();

  try {
    console.log(`${colors.cyan}🚀 Iniciando migração de imagens para nova estrutura de pastas${colors.reset}`);

    // Buscar todas as imagens de produtos que precisam ser migradas
    const query = `
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
    `;

    const result = await client.query(query);
    console.log(`${colors.blue}📋 Encontradas ${result.rows.length} imagens de produtos para migrar${colors.reset}`);

    if (result.rows.length === 0) {
      console.log(`${colors.green}✅ Nenhuma imagem precisa ser migrada!${colors.reset}`);
      return;
    }

    let migrated = 0;
    let errors = 0;

    for (const row of result.rows) {
      const success = await migrateImage(row);
      if (success) {
        migrated++;
      } else {
        errors++;
      }
    }

    console.log(`\n${colors.blue}=== Resultado da migração ===${colors.reset}`);
    console.log(`${colors.green}✅ Migradas com sucesso: ${migrated}${colors.reset}`);
    console.log(`${colors.red}❌ Erros: ${errors}${colors.reset}`);
    console.log(`${colors.cyan}📊 Total processadas: ${result.rows.length}${colors.reset}`);

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
    await migrateImages();
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