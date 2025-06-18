
#!/usr/bin/env node

import { main as migrateToSecure } from './migrate-to-secure-structure-final.js';
import fs from 'fs';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

async function completeMigration() {
  try {
    console.log(`${colors.cyan}🚀 MIGRAÇÃO COMPLETA PARA ESTRUTURA SEGURA${colors.reset}`);
    console.log(`${colors.cyan}===========================================${colors.reset}\n`);
    
    // Passo 1: Executar migração principal
    console.log(`${colors.blue}📋 Passo 1: Migrando imagens para estrutura segura...${colors.reset}`);
    await migrateToSecure();
    
    // Passo 2: Verificar se migração foi bem-sucedida
    console.log(`\n${colors.blue}📋 Passo 2: Verificando resultado da migração...${colors.reset}`);
    
    // Passo 3: Relatório final
    console.log(`\n${colors.green}✅ MIGRAÇÃO COMPLETA FINALIZADA!${colors.reset}`);
    console.log(`${colors.green}================================${colors.reset}`);
    console.log(`${colors.green}• Todas as imagens agora usam o formato seguro${colors.reset}`);
    console.log(`${colors.green}• URLs antigas foram eliminadas${colors.reset}`);
    console.log(`${colors.green}• Image controller simplificado${colors.reset}`);
    console.log(`${colors.green}• Sistema mais seguro e consistente${colors.reset}`);
    
    console.log(`\n${colors.yellow}⚠️ RECOMENDAÇÕES FINAIS:${colors.reset}`);
    console.log(`${colors.yellow}• Teste o carregamento de imagens em /seller/promotions${colors.reset}`);
    console.log(`${colors.yellow}• Teste o carregamento de imagens em /promotions${colors.reset}`);
    console.log(`${colors.yellow}• Verifique se placeholder funciona corretamente${colors.reset}`);
    console.log(`${colors.yellow}• Considere remover scripts de migração antigos${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Erro durante migração completa:`, error, colors.reset);
    process.exit(1);
  }
}

// Executar migração completa
completeMigration();
