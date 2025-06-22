// scripts/migrate-store-images-to-filename.js
// Script específico para migrar imagens de lojas para sistema filename

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

const { Client } = pg;

// Carregar variáveis de ambiente
dotenv.config();

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

console.log(`${colors.cyan}🏪 MIGRAÇÃO DE IMAGENS DE LOJAS PARA SISTEMA FILENAME${colors.reset}`);
console.log(`${colors.cyan}======================================================${colors.reset}\n`);

async function migrateStoreImagesToFilename() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log(`${colors.green}✅ Conectado ao banco de dados${colors.reset}`);

    // 1. Verificar estrutura atual da tabela store_images
    console.log(`\n${colors.blue}📋 Verificando estrutura da tabela store_images...${colors.reset}`);

    const tableInfo = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'store_images' 
      ORDER BY ordinal_position
    `);

    console.log('Colunas atuais:');
    tableInfo.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    const hasFilename = tableInfo.rows.some(col => col.column_name === 'filename');
    const hasThumbnailFilename = tableInfo.rows.some(col => col.column_name === 'thumbnail_filename');
    const hasImageUrl = tableInfo.rows.some(col => col.column_name === 'image_url');

    // 2. Adicionar colunas filename se não existirem
    if (!hasFilename) {
      console.log(`\n${colors.yellow}📝 Adicionando coluna filename...${colors.reset}`);
      await client.query('ALTER TABLE store_images ADD COLUMN filename TEXT');
      console.log(`${colors.green}✅ Coluna filename adicionada${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ Coluna filename já existe${colors.reset}`);
    }

    if (!hasThumbnailFilename) {
      console.log(`${colors.yellow}📝 Adicionando coluna thumbnail_filename...${colors.reset}`);
      await client.query('ALTER TABLE store_images ADD COLUMN thumbnail_filename TEXT');
      console.log(`${colors.green}✅ Coluna thumbnail_filename adicionada${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ Coluna thumbnail_filename já existe${colors.reset}`);
    }

    // 3. Buscar todas as lojas com imagens
    console.log(`\n${colors.blue}🔍 Buscando lojas com imagens...${colors.reset}`);

    const storeImagesQuery = hasImageUrl 
      ? `SELECT id, store_id, image_url, thumbnail_url, is_primary FROM store_images WHERE image_url IS NOT NULL ORDER BY store_id, id`
      : `SELECT id, store_id, filename, thumbnail_filename, is_primary FROM store_images WHERE filename IS NOT NULL ORDER BY store_id, id`;

    const storeImagesResult = await client.query(storeImagesQuery);

    console.log(`${colors.cyan}📊 Encontradas ${storeImagesResult.rows.length} imagens de lojas${colors.reset}`);

    if (storeImagesResult.rows.length === 0) {
      console.log(`${colors.yellow}⚠️ Nenhuma imagem de loja encontrada. Vamos criar algumas para teste...${colors.reset}`);

      // Buscar lojas sem imagens
      const storesResult = await client.query('SELECT id, name FROM stores LIMIT 5');

      for (const store of storesResult.rows) {
        console.log(`${colors.blue}🔧 Adicionando imagem padrão para loja ${store.id} (${store.name})...${colors.reset}`);

        await client.query(`
          INSERT INTO store_images (store_id, filename, thumbnail_filename, is_primary, display_order)
          VALUES ($1, 'default-store-image.jpg', 'default-store-image.jpg', true, 0)
          ON CONFLICT DO NOTHING
        `, [store.id]);
      }

      console.log(`${colors.green}✅ Imagens padrão adicionadas${colors.reset}`);
    } else {
      // 4. Migrar dados de image_url para filename (se necessário)
      if (hasImageUrl) {
        console.log(`\n${colors.blue}🔄 Migrando dados de image_url para filename...${colors.reset}`);

        let migratedCount = 0;

        for (const row of storeImagesResult.rows) {
          try {
            // Extrair filename da URL
            const filename = row.image_url ? path.basename(row.image_url) : null;
            const thumbnailFilename = row.thumbnail_url ? path.basename(row.thumbnail_url) : null;

            if (filename) {
              await client.query(`
                UPDATE store_images 
                SET filename = $1, thumbnail_filename = $2 
                WHERE id = $3
              `, [filename, thumbnailFilename, row.id]);

              console.log(`  ${colors.cyan}✓ Loja ${row.store_id}: ${filename}${colors.reset}`);
              migratedCount++;
            }
          } catch (error) {
            console.error(`  ${colors.red}❌ Erro na imagem ${row.id}: ${error.message}${colors.reset}`);
          }
        }

        console.log(`${colors.green}✅ ${migratedCount} registros migrados${colors.reset}`);
      }
    }

    // 5. Verificação final
    console.log(`\n${colors.blue}🔍 Verificação final...${colors.reset}`);

    const finalCheck = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(filename) as with_filename,
        COUNT(thumbnail_filename) as with_thumbnail_filename
      FROM store_images
    `);

    const stats = finalCheck.rows[0];
    console.log(`${colors.cyan}📊 Estatísticas finais:${colors.reset}`);
    console.log(`  Total de imagens: ${stats.total}`);
    console.log(`  Com filename: ${stats.with_filename}`);
    console.log(`  Com thumbnail_filename: ${stats.with_thumbnail_filename}`);

    // 6. Teste de consulta como o controller faz
    console.log(`\n${colors.blue}🧪 Testando consulta do controller...${colors.reset}`);

    const testQuery = `SELECT filename FROM store_images WHERE store_id = $1 ORDER BY is_primary DESC, id DESC LIMIT 1`;
    const storesTest = await client.query('SELECT id, name FROM stores LIMIT 3');

    for (const store of storesTest.rows) {
      const testResult = await client.query(testQuery, [store.id]);
      if (testResult.rows.length > 0) {
        console.log(`  ${colors.green}✓ Loja ${store.id} (${store.name}): ${testResult.rows[0].filename}${colors.reset}`);
      } else {
        console.log(`  ${colors.yellow}⚠ Loja ${store.id} (${store.name}): SEM IMAGEM${colors.reset}`);
      }
    }

    console.log(`\n${colors.green}🎉 MIGRAÇÃO DE LOJAS CONCLUÍDA COM SUCESSO!${colors.reset}`);
    console.log(`${colors.green}============================================${colors.reset}`);

    console.log(`\n${colors.cyan}📋 PRÓXIMOS PASSOS:${colors.reset}`);
    console.log(`${colors.cyan}1. Remover a rota duplicada em routes.ts${colors.reset}`);
    console.log(`${colors.cyan}2. Atualizar upload controller para usar filename${colors.reset}`);
    console.log(`${colors.cyan}3. Testar: http://localhost:5000/api/stores/1/primary-image${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}❌ Erro durante migração:`, error, colors.reset);
    throw error;
  } finally {
    await client.end();
  }
}

// Executar migração
migrateStoreImagesToFilename()
  .then(() => {
    console.log(`\n${colors.green}✅ Script finalizado com sucesso!${colors.reset}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`${colors.red}💥 Falha na migração:`, error, colors.reset);
    process.exit(1);
  });