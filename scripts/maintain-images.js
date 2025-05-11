/**
 * Script de manutenção de imagens para o aplicativo
 * 
 * Este script:
 * 1. Verifica e corrige caminhos de imagens inconsistentes
 * 2. Valida o mapeamento entre imagens e produtos/lojas
 * 3. Atualiza os controladores para usar o novo middleware de validação
 * 4. Gera relatório detalhado do processo
 */

const { spawn } = require('child_process');
const readline = require('readline');

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

// Lista de scripts a executar
const scripts = [
  {
    name: 'Correção de caminhos de imagens',
    path: './scripts/fix-image-paths.js',
    description: 'Corrige caminhos de imagens no banco de dados, movendo-os para a estrutura segura'
  },
  {
    name: 'Verificação de mapeamento de imagens',
    path: './scripts/verify-image-product-mapping.js',
    description: 'Verifica e corrige problemas de mapeamento entre imagens, produtos e lojas'
  },
  {
    name: 'Atualização do controlador de imagens',
    path: './scripts/update-image-controller.js',
    description: 'Atualiza controladores para usar o novo middleware de validação de imagens'
  }
];

// Interface para leitura de entrada do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Executa um script Node.js e retorna uma Promise com o resultado
 * @param {string} scriptPath - Caminho do script a ser executado
 * @returns {Promise<number>} Código de saída do processo
 */
function executeScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn('node', [scriptPath], { stdio: 'inherit' });
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Script falhou com código de saída ${code}`));
      }
    });
    
    childProcess.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Pergunta ao usuário se deseja continuar
 * @param {string} question - Pergunta a ser feita
 * @returns {Promise<boolean>} Resposta do usuário
 */
function askUser(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 's');
    });
  });
}

/**
 * Execução sequencial dos scripts com confirmação do usuário
 */
async function runMaintenanceScripts() {
  console.log(`${colors.magenta}=== FERRAMENTA DE MANUTENÇÃO DE IMAGENS ===${colors.reset}\n`);
  console.log(`${colors.blue}Esta ferramenta executará os seguintes scripts:${colors.reset}`);
  
  scripts.forEach((script, index) => {
    console.log(`${colors.yellow}${index + 1}. ${script.name}${colors.reset}`);
    console.log(`   ${script.description}`);
  });
  
  console.log(`\n${colors.red}ATENÇÃO: Certifique-se de ter um backup do banco de dados antes de continuar.${colors.reset}`);
  
  const shouldContinue = await askUser(`\n${colors.yellow}Deseja continuar? (y/n)${colors.reset} `);
  
  if (!shouldContinue) {
    console.log(`\n${colors.blue}Operação cancelada pelo usuário.${colors.reset}`);
    rl.close();
    return;
  }
  
  // Executar scripts em sequência
  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i];
    console.log(`\n${colors.magenta}=== Executando ${i + 1}/${scripts.length}: ${script.name} ===${colors.reset}`);
    
    if (i > 0) {
      const shouldRunNext = await askUser(`\n${colors.yellow}Executar o próximo script? (y/n)${colors.reset} `);
      if (!shouldRunNext) {
        console.log(`\n${colors.blue}Execução interrompida pelo usuário.${colors.reset}`);
        break;
      }
    }
    
    try {
      await executeScript(script.path);
      console.log(`\n${colors.green}✓ Script ${script.name} executado com sucesso!${colors.reset}`);
    } catch (error) {
      console.error(`\n${colors.red}❌ Erro ao executar script ${script.name}:${colors.reset}`);
      console.error(error);
      
      const shouldContinueAfterError = await askUser(`\n${colors.yellow}Continuar para o próximo script mesmo após erro? (y/n)${colors.reset} `);
      if (!shouldContinueAfterError) {
        console.log(`\n${colors.blue}Execução interrompida pelo usuário após erro.${colors.reset}`);
        break;
      }
    }
  }
  
  console.log(`\n${colors.magenta}=== PROCESSO DE MANUTENÇÃO FINALIZADO ===${colors.reset}`);
  console.log(`${colors.blue}Verifique os logs acima para detalhes sobre cada operação.${colors.reset}`);
  rl.close();
}

// Executar o processo de manutenção
runMaintenanceScripts().catch((error) => {
  console.error(`\n${colors.red}Erro fatal durante o processo de manutenção:${colors.reset}`);
  console.error(error);
  rl.close();
});