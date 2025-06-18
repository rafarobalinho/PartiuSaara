
#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const { Pool } = pg;

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Migra URLs antigas para nova estrutura
 */
async function migrateOldUrls() {
  const client = await pool.connect();

  try {
    console.log(`${colors.cyan}🔄 Iniciando migração de URLs antigas para nova estrutura${colors.reset}`);

    // 1. Verificar produtos com URLs antigas
    console.log(`\n${colors.blue}=== ETAPA 1: Verificando URLs antigas ===${colors.reset}`);
    
    const checkQuery = `
      SELECT 
        pi.id, 
        pi.product_id, 
        pi.image_url,
        pi.thumbnail_url,
        p.store_id,
        p.name as product_name
      FROM product_images pi
      JOIN products p ON pi.product_id = p.id
      WHERE (pi.image_url LIKE '/uploads/17%' AND pi.image_url NOT LIKE '/uploads/stores/%')
         OR (pi.thumbnail_url LIKE '/uploads/thumbnails/17%' AND pi.thumbnail_url NOT LIKE '/uploads/stores/%')
      ORDER BY p.store_id, pi.product_id
    `;

    const checkResult = await client.query(checkQuery);
    console.log(`${colors.yellow}Encontradas ${checkResult.rows.length} imagens com URLs antigas${colors.reset}`);

    if (checkResult.rows.length === 0) {
      console.log(`${colors.green}✅ Nenhuma URL antiga encontrada! Todas já estão no formato correto.${colors.reset}`);
      return;
    }

    // Mostrar preview das mudanças
    console.log(`\n${colors.blue}=== PREVIEW DAS MUDANÇAS ===${colors.reset}`);
    checkResult.rows.forEach((row, index) => {
      console.log(`\n${colors.cyan}${index + 1}. Produto: ${row.product_name} (ID: ${row.product_id}, Loja: ${row.store_id})${colors.reset}`);
      
      if (row.image_url && row.image_url.includes('/uploads/17')) {
        const fileName = row.image_url.split('/').pop();
        const newImageUrl = `/uploads/stores/${row.store_id}/products/${row.product_id}/${fileName}`;
        console.log(`   🖼️  Imagem: ${row.image_url}`);
        console.log(`   ➡️   Nova: ${newImageUrl}`);
      }
      
      if (row.thumbnail_url && row.thumbnail_url.includes('/uploads/thumbnails/17')) {
        const fileName = row.thumbnail_url.split('/').pop();
        const newThumbnailUrl = `/uploads/stores/${row.store_id}/products/${row.product_id}/thumbnails/${fileName}`;
        console.log(`   🖼️  Thumb: ${row.thumbnail_url}`);
        console.log(`   ➡️   Nova: ${newThumbnailUrl}`);
      }
    });

    console.log(`\n${colors.yellow}Prosseguindo com a migração...${colors.reset}`);

    // 2. Atualizar URLs antigas de imagens principais
    console.log(`\n${colors.blue}=== ETAPA 2: Atualizando URLs de imagens principais ===${colors.reset}`);
    
    const updateImageQuery = `
      UPDATE product_images 
      SET image_url = CONCAT('/uploads/stores/', 
        (SELECT store_id FROM products WHERE id = product_images.product_id),
        '/products/', 
        product_id, 
        '/', 
        SUBSTRING(image_url FROM 10))
      WHERE image_url LIKE '/uploads/17%' 
        AND image_url NOT LIKE '/uploads/stores/%'
    `;

    const imageUpdateResult = await client.query(updateImageQuery);
    console.log(`${colors.green}✅ ${imageUpdateResult.rowCount} URLs de imagens principais atualizadas${colors.reset}`);

    // 3. Atualizar URLs antigas de thumbnails
    console.log(`\n${colors.blue}=== ETAPA 3: Atualizando URLs de thumbnails ===${colors.reset}`);
    
    const updateThumbnailQuery = `
      UPDATE product_images 
      SET thumbnail_url = CONCAT('/uploads/stores/', 
        (SELECT store_id FROM products WHERE id = product_images.product_id),
        '/products/', 
        product_id, 
        '/thumbnails/', 
        SUBSTRING(thumbnail_url FROM 21))
      WHERE thumbnail_url LIKE '/uploads/thumbnails/17%'
        AND thumbnail_url NOT LIKE '/uploads/stores/%'
    `;

    const thumbnailUpdateResult = await client.query(updateThumbnailQuery);
    console.log(`${colors.green}✅ ${thumbnailUpdateResult.rowCount} URLs de thumbnails atualizadas${colors.reset}`);

    // 4. Verificar resultado final
    console.log(`\n${colors.blue}=== ETAPA 4: Verificando resultado final ===${colors.reset}`);
    
    const finalCheckResult = await client.query(checkQuery);
    console.log(`${colors.yellow}URLs antigas restantes: ${finalCheckResult.rows.length}${colors.reset}`);

    if (finalCheckResult.rows.length === 0) {
      console.log(`${colors.green}🎉 Migração concluída com sucesso! Todas as URLs estão no formato correto.${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️ Ainda existem ${finalCheckResult.rows.length} URLs que precisam de atenção manual.${colors.reset}`);
    }

    // 5. Mostrar estatísticas finais
    console.log(`\n${colors.blue}=== ESTATÍSTICAS FINAIS ===${colors.reset}`);
    console.log(`${colors.green}✅ Imagens principais atualizadas: ${imageUpdateResult.rowCount}${colors.reset}`);
    console.log(`${colors.green}✅ Thumbnails atualizadas: ${thumbnailUpdateResult.rowCount}${colors.reset}`);
    console.log(`${colors.cyan}📊 Total de URLs migradas: ${imageUpdateResult.rowCount + thumbnailUpdateResult.rowCount}${colors.reset}`);

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
    await migrateOldUrls();
    console.log(`\n${colors.green}🎉 Migração de URLs concluída com sucesso!${colors.reset}`);
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
