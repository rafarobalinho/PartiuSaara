// scripts/debug-store-images.js
// Script para debugar o que está acontecendo com as imagens das lojas

import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const { Client } = pg;
dotenv.config();

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function debugStoreImages() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log(`${colors.green}✅ Conectado ao banco de dados${colors.reset}\n`);

    // 1. Verificar estrutura da tabela store_images
    console.log(`${colors.blue}📋 1. ESTRUTURA DA TABELA STORE_IMAGES:${colors.reset}`);
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'store_images' 
      ORDER BY ordinal_position
    `);

    if (tableInfo.rows.length === 0) {
      console.log(`${colors.red}❌ Tabela store_images não existe!${colors.reset}`);
      return;
    }

    tableInfo.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // 2. Verificar se existem lojas
    console.log(`\n${colors.blue}📋 2. LOJAS CADASTRADAS:${colors.reset}`);
    const storesResult = await client.query('SELECT id, name FROM stores ORDER BY id LIMIT 10');

    if (storesResult.rows.length === 0) {
      console.log(`${colors.red}❌ Nenhuma loja cadastrada!${colors.reset}`);
      return;
    }

    console.log(`${colors.cyan}Encontradas ${storesResult.rows.length} lojas:${colors.reset}`);
    storesResult.rows.forEach(store => {
      console.log(`  - ID ${store.id}: ${store.name}`);
    });

    // 3. Verificar imagens de lojas
    console.log(`\n${colors.blue}📋 3. IMAGENS DAS LOJAS:${colors.reset}`);
    const imagesResult = await client.query(`
      SELECT id, store_id, filename, thumbnail_filename, image_url, thumbnail_url, is_primary, display_order
      FROM store_images 
      ORDER BY store_id, display_order
    `);

    if (imagesResult.rows.length === 0) {
      console.log(`${colors.yellow}⚠️ Nenhuma imagem de loja encontrada no banco!${colors.reset}`);

      // Tentar criar uma imagem de teste
      console.log(`\n${colors.blue}🔧 Criando imagem de teste...${colors.reset}`);
      const firstStore = storesResult.rows[0];

      await client.query(`
        INSERT INTO store_images (store_id, filename, thumbnail_filename, is_primary, display_order)
        VALUES ($1, 'default-store-image.jpg', 'default-store-image.jpg', true, 0)
      `, [firstStore.id]);

      console.log(`${colors.green}✅ Imagem de teste criada para loja ${firstStore.id}${colors.reset}`);
    } else {
      console.log(`${colors.cyan}Encontradas ${imagesResult.rows.length} imagens:${colors.reset}`);
      imagesResult.rows.forEach(img => {
        console.log(`  - Store ${img.store_id}: filename="${img.filename}", image_url="${img.image_url}" ${img.is_primary ? '(PRIMARY)' : ''}`);
      });
    }

    // 4. Testar a query específica que o controller usa
    console.log(`\n${colors.blue}📋 4. TESTANDO QUERY DO CONTROLLER:${colors.reset}`);

    for (const store of storesResult.rows.slice(0, 3)) {
      console.log(`\n${colors.cyan}🧪 Testando loja ${store.id} (${store.name}):${colors.reset}`);

      // Query exata do controller
      const controllerQuery = `SELECT filename FROM store_images WHERE store_id = $1 ORDER BY is_primary DESC, id DESC LIMIT 1;`;
      const result = await client.query(controllerQuery, [store.id]);

      if (result.rows.length > 0) {
        const filename = result.rows[0].filename;
        console.log(`  ✅ Filename encontrado: "${filename}"`);

        // Verificar se arquivo existe fisicamente
        const expectedPath = path.join(process.cwd(), 'public', 'uploads', 'stores', store.id.toString(), filename);
        const assetPath = path.join(process.cwd(), 'public', 'assets', filename);

        console.log(`  📁 Verificando arquivo físico:`);
        console.log(`    - Caminho esperado: ${expectedPath}`);
        console.log(`    - Existe? ${fs.existsSync(expectedPath) ? colors.green + '✅ SIM' : colors.red + '❌ NÃO'}${colors.reset}`);
        console.log(`    - Assets path: ${assetPath}`);
        console.log(`    - Existe em assets? ${fs.existsSync(assetPath) ? colors.green + '✅ SIM' : colors.red + '❌ NÃO'}${colors.reset}`);

      } else {
        console.log(`  ${colors.red}❌ Nenhuma imagem encontrada${colors.reset}`);
      }
    }

    // 5. Verificar arquivos de placeholder
    console.log(`\n${colors.blue}📋 5. VERIFICANDO ARQUIVOS PLACEHOLDER:${colors.reset}`);
    const placeholderPaths = [
      'public/placeholder-image.jpg',
      'public/assets/default-store-image.jpg',
      'public/assets/placeholder-image.jpg'
    ];

    placeholderPaths.forEach(placeholderPath => {
      const fullPath = path.join(process.cwd(), placeholderPath);
      console.log(`  - ${placeholderPath}: ${fs.existsSync(fullPath) ? colors.green + '✅ EXISTE' : colors.red + '❌ NÃO EXISTE'}${colors.reset}`);
    });

    // 6. Verificar qual rota está sendo usada
    console.log(`\n${colors.blue}📋 6. VERIFICANDO ROTAS:${colors.reset}`);
    const routesPath = path.join(process.cwd(), 'server', 'routes.ts');
    const imagesRoutesPath = path.join(process.cwd(), 'server', 'routes', 'images.ts');

    if (fs.existsSync(routesPath)) {
      const routesContent = fs.readFileSync(routesPath, 'utf8');
      const hasDuplicateRoute = routesContent.includes("app.get('/api/stores/:id/primary-image'");
      console.log(`  - Rota duplicada em routes.ts: ${hasDuplicateRoute ? colors.yellow + '⚠️ SIM (PROBLEMA!)' : colors.green + '✅ NÃO'}${colors.reset}`);
    }

    if (fs.existsSync(imagesRoutesPath)) {
      const imagesContent = fs.readFileSync(imagesRoutesPath, 'utf8');
      const hasImageRoute = imagesContent.includes("router.get('/stores/:id/primary-image'");
      console.log(`  - Rota em images.ts: ${hasImageRoute ? colors.green + '✅ SIM' : colors.red + '❌ NÃO'}${colors.reset}`);
    }

    // 7. Simular URL completa que seria acessada
    console.log(`\n${colors.blue}📋 7. SIMULAÇÃO DA URL:${colors.reset}`);
    console.log(`  URL testada: ${colors.cyan}http://localhost:5000/api/stores/1/primary-image${colors.reset}`);
    console.log(`  Esperado: Redirecionar para imagem da loja ou placeholder`);

    console.log(`\n${colors.green}🔍 DEBUG CONCLUÍDO!${colors.reset}`);
    console.log(`${colors.yellow}📋 Se o problema persiste, verifique:${colors.reset}`);
    console.log(`${colors.yellow}1. Se existe rota duplicada (remover do routes.ts)${colors.reset}`);
    console.log(`${colors.yellow}2. Se o controller está usando filename corretamente${colors.reset}`);
    console.log(`${colors.yellow}3. Se os arquivos físicos existem${colors.reset}`);
    console.log(`${colors.yellow}4. Se o servidor foi reiniciado após as mudanças${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}❌ Erro durante debug:`, error, colors.reset);
  } finally {
    await client.end();
  }
}

// Executar debug
debugStoreImages()
  .then(() => {
    console.log(`\n${colors.green}✅ Debug finalizado${colors.reset}`);
  })
  .catch((error) => {
    console.error(`${colors.red}💥 Erro no debug:`, error, colors.reset);
  });