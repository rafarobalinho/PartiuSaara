// scripts/update-controllers-for-filename.js
// Script para ajustar os controllers e rotas para usar filename

import fs from 'fs';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(`${colors.cyan}🔧 ATUALIZANDO CONTROLLERS PARA SISTEMA FILENAME${colors.reset}`);
console.log(`${colors.cyan}================================================${colors.reset}\n`);

function updateUploadController() {
  console.log(`${colors.blue}📝 Atualizando upload controller...${colors.reset}`);

  const uploadControllerPath = path.join(process.cwd(), 'server', 'controllers', 'upload.controller.js');

  if (!fs.existsSync(uploadControllerPath)) {
    console.log(`${colors.red}❌ Arquivo não encontrado: ${uploadControllerPath}${colors.reset}`);
    return false;
  }

  let content = fs.readFileSync(uploadControllerPath, 'utf8');

  // Substituir a seção de insert para stores
  const oldStoreInsert = `INSERT INTO store_images (store_id, image_url, thumbnail_url, is_primary, display_order)
            VALUES ($1, $2, $3, $4, $5)`;

  const newStoreInsert = `INSERT INTO store_images (store_id, filename, thumbnail_filename, is_primary, display_order)
            VALUES ($1, $2, $3, $4, $5)`;

  if (content.includes(oldStoreInsert)) {
    content = content.replace(oldStoreInsert, newStoreInsert);

    // Também atualizar os parâmetros para usar fileName em vez de URLs completas
    content = content.replace(
      /queryParams = \[finalStoreId, imageUrl, thumbnailUrl, isPrimary, 0\];/g,
      'queryParams = [finalStoreId, fileName, fileName, isPrimary, 0];'
    );

    console.log(`  ${colors.green}✓ Seção store_images atualizada${colors.reset}`);
  }

  // Substituir a seção de insert para products
  const oldProductInsert = `INSERT INTO product_images (product_id, image_url, thumbnail_url, is_primary, display_order)
            VALUES ($1, $2, $3, $4, $5)`;

  const newProductInsert = `INSERT INTO product_images (product_id, filename, thumbnail_filename, is_primary, display_order)
            VALUES ($1, $2, $3, $4, $5)`;

  if (content.includes(oldProductInsert)) {
    content = content.replace(oldProductInsert, newProductInsert);

    // Também atualizar os parâmetros para products
    content = content.replace(
      /queryParams = \[finalEntityId, imageUrl, thumbnailUrl, isPrimary, 0\];/g,
      'queryParams = [finalEntityId, fileName, fileName, isPrimary, 0];'
    );

    console.log(`  ${colors.green}✓ Seção product_images atualizada${colors.reset}`);
  }

  // Salvar arquivo atualizado
  fs.writeFileSync(uploadControllerPath, content);
  console.log(`  ${colors.green}✅ Upload controller atualizado${colors.reset}`);

  return true;
}

function removeDuplicateRoute() {
  console.log(`${colors.blue}📝 Removendo rota duplicada...${colors.reset}`);

  const routesPath = path.join(process.cwd(), 'server', 'routes.ts');

  if (!fs.existsSync(routesPath)) {
    console.log(`${colors.red}❌ Arquivo não encontrado: ${routesPath}${colors.reset}`);
    return false;
  }

  let content = fs.readFileSync(routesPath, 'utf8');

  // Procurar e remover a rota duplicada
  const duplicateRoutePattern = /\/\/ Rota para obter a imagem principal de uma loja[\s\S]*?res\.status\(500\)\.json\(\{ message: 'Erro ao buscar imagem' \}\);\s*}\s*}\);/g;

  if (duplicateRoutePattern.test(content)) {
    content = content.replace(duplicateRoutePattern, '');
    fs.writeFileSync(routesPath, content);
    console.log(`  ${colors.green}✅ Rota duplicada removida${colors.reset}`);
    return true;
  } else {
    // Tentar padrão mais específico
    const specificPattern = /app\.get\('\/api\/stores\/:id\/primary-image'[\s\S]*?}\);/g;
    if (specificPattern.test(content)) {
      content = content.replace(specificPattern, '');
      fs.writeFileSync(routesPath, content);
      console.log(`  ${colors.green}✅ Rota duplicada removida (padrão alternativo)${colors.reset}`);
      return true;
    }
  }

  console.log(`  ${colors.yellow}⚠️ Rota duplicada não encontrada (pode já ter sido removida)${colors.reset}`);
  return false;
}

function checkImageController() {
  console.log(`${colors.blue}📝 Verificando image controller...${colors.reset}`);

  const imageControllerPath = path.join(process.cwd(), 'server', 'controllers', 'image.controller.ts');

  if (!fs.existsSync(imageControllerPath)) {
    console.log(`${colors.red}❌ Arquivo não encontrado: ${imageControllerPath}${colors.reset}`);
    return false;
  }

  const content = fs.readFileSync(imageControllerPath, 'utf8');

  // Verificar se já usa filename
  if (content.includes('SELECT filename FROM store_images')) {
    console.log(`  ${colors.green}✅ Image controller já usa filename${colors.reset}`);
    return true;
  } else {
    console.log(`  ${colors.yellow}⚠️ Image controller pode precisar de atualização${colors.reset}`);
    return false;
  }
}

function createBackups() {
  console.log(`${colors.blue}💾 Criando backups...${colors.reset}`);

  const filesToBackup = [
    'server/controllers/upload.controller.js',
    'server/routes.ts'
  ];

  for (const filePath of filesToBackup) {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      const backupPath = `${fullPath}.backup.${Date.now()}`;
      fs.copyFileSync(fullPath, backupPath);
      console.log(`  ${colors.cyan}📋 Backup criado: ${backupPath}${colors.reset}`);
    }
  }
}

async function main() {
  try {
    // 1. Criar backups
    createBackups();

    // 2. Atualizar upload controller
    const uploadUpdated = updateUploadController();

    // 3. Remover rota duplicada
    const routeRemoved = removeDuplicateRoute();

    // 4. Verificar image controller
    const imageControllerOk = checkImageController();

    console.log(`\n${colors.green}📋 RESUMO DAS ALTERAÇÕES:${colors.reset}`);
    console.log(`  Upload Controller: ${uploadUpdated ? colors.green + '✅ Atualizado' : colors.red + '❌ Erro'}`);
    console.log(`  Rota Duplicada: ${routeRemoved ? colors.green + '✅ Removida' : colors.yellow + '⚠️ Não encontrada'}`);
    console.log(`  Image Controller: ${imageControllerOk ? colors.green + '✅ OK' : colors.yellow + '⚠️ Verificar'}`);
    console.log(colors.reset);

    console.log(`\n${colors.cyan}🧪 TESTES RECOMENDADOS:${colors.reset}`);
    console.log(`${colors.cyan}1. Reiniciar o servidor: npm run dev${colors.reset}`);
    console.log(`${colors.cyan}2. Testar imagem de loja: http://localhost:5000/api/stores/1/primary-image${colors.reset}`);
    console.log(`${colors.cyan}3. Testar upload de nova imagem${colors.reset}`);
    console.log(`${colors.cyan}4. Verificar console para erros${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}❌ Erro durante atualização:`, error, colors.reset);
    throw error;
  }
}

// Executar script
main()
  .then(() => {
    console.log(`\n${colors.green}✅ Atualização de controllers concluída!${colors.reset}`);
  })
  .catch((error) => {
    console.error(`${colors.red}💥 Falha na atualização:`, error, colors.reset);
    process.exit(1);
  });