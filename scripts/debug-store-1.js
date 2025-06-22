// scripts/debug-store-1.js
// Debug específico para a loja 1 que está retornando placeholder

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

async function debugStore1() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log(`${colors.green}✅ Conectado ao banco de dados${colors.reset}\n`);

    // 1. Dados da loja 1
    console.log(`${colors.blue}📋 1. DADOS DA LOJA 1:${colors.reset}`);
    const storeResult = await client.query('SELECT * FROM stores WHERE id = 1');
    if (storeResult.rows.length > 0) {
      const store = storeResult.rows[0];
      console.log(`  ID: ${store.id}`);
      console.log(`  Nome: ${store.name}`);
      console.log(`  User ID: ${store.user_id}`);
    } else {
      console.log(`${colors.red}❌ Loja 1 não encontrada!${colors.reset}`);
      return;
    }

    // 2. TODAS as imagens da loja 1
    console.log(`\n${colors.blue}📋 2. TODAS AS IMAGENS DA LOJA 1:${colors.reset}`);
    const allImagesResult = await client.query(`
      SELECT id, store_id, filename, thumbnail_filename, is_primary, display_order, created_at
      FROM store_images 
      WHERE store_id = 1
      ORDER BY is_primary DESC, id DESC
    `);

    console.log(`${colors.cyan}Encontradas ${allImagesResult.rows.length} imagens para loja 1:${colors.reset}`);
    allImagesResult.rows.forEach((img, index) => {
      console.log(`  ${index + 1}. ID ${img.id}: "${img.filename}" ${img.is_primary ? '(PRIMARY)' : ''} - Order: ${img.display_order}`);
    });

    // 3. Query EXATA do controller
    console.log(`\n${colors.blue}📋 3. QUERY EXATA DO CONTROLLER:${colors.reset}`);
    const controllerQuery = `SELECT filename FROM store_images WHERE store_id = $1 ORDER BY is_primary DESC, id DESC LIMIT 1;`;
    console.log(`Query: ${controllerQuery}`);
    console.log(`Parâmetro: store_id = 1`);

    const controllerResult = await client.query(controllerQuery, [1]);

    if (controllerResult.rows.length > 0) {
      const filename = controllerResult.rows[0].filename;
      console.log(`${colors.green}✅ Resultado: filename = "${filename}"${colors.reset}`);

      // 4. Verificar arquivo físico
      console.log(`\n${colors.blue}📋 4. VERIFICANDO ARQUIVO FÍSICO:${colors.reset}`);

      // Caminho que o controller constrói
      const storeId = 1;
      const expectedPath = path.join(process.cwd(), 'public', 'uploads', 'stores', storeId.toString(), filename);

      console.log(`  Filename do banco: "${filename}"`);
      console.log(`  Caminho construído pelo controller:`);
      console.log(`    ${expectedPath}`);
      console.log(`  Arquivo existe? ${fs.existsSync(expectedPath) ? colors.green + '✅ SIM' : colors.red + '❌ NÃO'}${colors.reset}`);

      // Se não existe, vamos procurar onde está
      if (!fs.existsSync(expectedPath)) {
        console.log(`\n${colors.yellow}🔍 PROCURANDO O ARQUIVO:${colors.reset}`);

        // Verificar estrutura de diretórios
        const storeDir = path.join(process.cwd(), 'public', 'uploads', 'stores', '1');
        console.log(`  Diretório da loja: ${storeDir}`);
        console.log(`  Diretório existe? ${fs.existsSync(storeDir) ? colors.green + '✅ SIM' : colors.red + '❌ NÃO'}${colors.reset}`);

        if (fs.existsSync(storeDir)) {
          const files = fs.readdirSync(storeDir);
          console.log(`  Arquivos no diretório (${files.length}):`);
          files.forEach(file => {
            console.log(`    - ${file}`);
          });
        }

        // Verificar diretório uploads geral
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        console.log(`\n  Diretório uploads geral: ${uploadsDir}`);
        if (fs.existsSync(uploadsDir)) {
          const uploadsFiles = fs.readdirSync(uploadsDir);
          console.log(`  Conteúdo do uploads:`);
          uploadsFiles.forEach(item => {
            const itemPath = path.join(uploadsDir, item);
            const isDir = fs.statSync(itemPath).isDirectory();
            console.log(`    ${isDir ? '📁' : '📄'} ${item}`);
          });
        }

        // Procurar o arquivo específico em todo o uploads
        console.log(`\n${colors.yellow}🔍 PROCURANDO "${filename}" EM TODO O UPLOADS:${colors.reset}`);
        function findFile(dir, targetFilename) {
          try {
            const items = fs.readdirSync(dir);
            for (const item of items) {
              const itemPath = path.join(dir, item);
              const stat = fs.statSync(itemPath);

              if (stat.isFile() && item === targetFilename) {
                console.log(`    ${colors.green}✅ ENCONTRADO: ${itemPath}${colors.reset}`);
                return itemPath;
              } else if (stat.isDirectory()) {
                const found = findFile(itemPath, targetFilename);
                if (found) return found;
              }
            }
          } catch (e) {
            // Ignorar erros de permissão
          }
          return null;
        }

        const foundPath = findFile(uploadsDir, filename);
        if (!foundPath) {
          console.log(`    ${colors.red}❌ Arquivo "${filename}" não encontrado em lugar nenhum${colors.reset}`);
        }
      }

    } else {
      console.log(`${colors.red}❌ NENHUM resultado da query do controller!${colors.reset}`);
    }

    // 5. Verificar placeholder
    console.log(`\n${colors.blue}📋 5. VERIFICANDO PLACEHOLDER:${colors.reset}`);
    const placeholderPath = path.join(process.cwd(), 'public', 'placeholder-image.jpg');
    console.log(`  Caminho: ${placeholderPath}`);
    console.log(`  Existe? ${fs.existsSync(placeholderPath) ? colors.green + '✅ SIM' : colors.red + '❌ NÃO'}${colors.reset}`);

    // 6. Verificar se há rota duplicada
    console.log(`\n${colors.blue}📋 6. VERIFICANDO ROTAS:${colors.reset}`);
    const routesPath = path.join(process.cwd(), 'server', 'routes.ts');
    if (fs.existsSync(routesPath)) {
      const routesContent = fs.readFileSync(routesPath, 'utf8');

      // Procurar por qualquer menção a /api/stores/:id/primary-image
      const hasStoreImageRoute = routesContent.includes("'/api/stores/:id/primary-image'") || 
                                 routesContent.includes('"/api/stores/:id/primary-image"');

      console.log(`  Rota duplicada em routes.ts: ${hasStoreImageRoute ? colors.red + '❌ SIM (PROBLEMA!)' : colors.green + '✅ NÃO'}${colors.reset}`);

      if (hasStoreImageRoute) {
        // Encontrar linhas específicas
        const lines = routesContent.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('/api/stores/:id/primary-image')) {
            console.log(`    Linha ${index + 1}: ${line.trim()}`);
          }
        });
      }
    }

    console.log(`\n${colors.cyan}🔧 DIAGNÓSTICO:${colors.reset}`);
    console.log(`${colors.cyan}- Se a query retorna um filename mas o arquivo não existe: problema de arquivo físico${colors.reset}`);
    console.log(`${colors.cyan}- Se a query não retorna nada: problema na lógica da query${colors.reset}`);
    console.log(`${colors.cyan}- Se há rota duplicada: conflito de rotas${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}❌ Erro:`, error, colors.reset);
  } finally {
    await client.end();
  }
}

// Executar
debugStore1()
  .then(() => {
    console.log(`\n${colors.green}✅ Debug específico finalizado${colors.reset}`);
  })
  .catch((error) => {
    console.error(`${colors.red}💥 Erro:`, error, colors.reset);
  });