/**
 * Script para atualizar todos os controladores de imagem 
 * para usar o novo middleware de validação de relacionamento
 * 
 * Este script gera um backup da versão atual do controlador e
 * atualiza todas as rotas para usar o novo sistema de validação.
 */

const fs = require('fs');
const path = require('path');

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

// Caminho para o arquivo do controlador de imagens
const imageControllerPath = path.join(process.cwd(), 'server/controllers/image.controller.ts');

// Função para criar backup do arquivo original
function createBackup(filePath) {
  const backupPath = `${filePath}.backup-${Date.now()}`;
  try {
    fs.copyFileSync(filePath, backupPath);
    console.log(`${colors.green}✓ Backup criado em: ${backupPath}${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Erro ao criar backup: ${error.message}${colors.reset}`);
    return false;
  }
}

// Função para atualizar o conteúdo do controlador
function updateImageController() {
  try {
    // Ler conteúdo atual do arquivo
    const content = fs.readFileSync(imageControllerPath, 'utf8');
    
    // Criar backup antes de modificar
    if (!createBackup(imageControllerPath)) {
      console.log(`${colors.yellow}⚠️ Operação cancelada. Não foi possível criar backup.${colors.reset}`);
      return false;
    }
    
    // Lista de funções que devem usar o novo middleware
    const functionsToUpdate = [
      'getProductPrimaryImage',
      'getProductThumbnail',
      'getProductImages',
      'getProductImage',
      'getReservationImage',
      'getPromotionImage',
      'getFlashPromotionImage',
      'deleteImage'
    ];
    
    // Criar uma cópia modificada do conteúdo
    let updatedContent = content;
    
    // 1. Adicionar importação do novo middleware se ainda não existir
    if (!content.includes("import validateImageRelationship from '../middleware/image-validation';")) {
      // Encontrar posição para adicionar a importação após as importações existentes
      const importEndIndex = content.lastIndexOf('import ');
      const importEndLineIndex = content.indexOf('\n', importEndIndex);
      
      if (importEndLineIndex !== -1) {
        const beforeImport = content.substring(0, importEndLineIndex + 1);
        const afterImport = content.substring(importEndLineIndex + 1);
        
        updatedContent = beforeImport + 
          "\nimport validateImageRelationship from '../middleware/image-validation';\n" + 
          afterImport;
          
        console.log(`${colors.green}✓ Importação do novo middleware adicionada${colors.reset}`);
      }
    }
    
    // 2. Atualizar todas as funções alvo para usar o novo middleware
    for (const funcName of functionsToUpdate) {
      // Encontrar a definição da função
      const functionPattern = new RegExp(`export const ${funcName}\\s*=\\s*\\[.*?\\]|export const ${funcName}\\s*=\\s*[^\\[]`, 's');
      const functionMatch = updatedContent.match(functionPattern);
      
      if (functionMatch) {
        const matchedText = functionMatch[0];
        
        if (matchedText.includes('[') && matchedText.includes(']')) {
          // Já é um array de middlewares, verificar se já usa o novo middleware
          if (!matchedText.includes('validateImageRelationship')) {
            // Substituir para adicionar o novo middleware
            const newFunctionText = matchedText.replace(
              `export const ${funcName} = [`, 
              `export const ${funcName} = [validateImageRelationship, `
            );
            updatedContent = updatedContent.replace(matchedText, newFunctionText);
            console.log(`${colors.green}✓ Middleware adicionado à função: ${funcName}${colors.reset}`);
          } else {
            console.log(`${colors.blue}ℹ️ Função ${funcName} já usa o novo middleware${colors.reset}`);
          }
        } else {
          // É uma função direta, não um array de middlewares
          const newFunctionText = `export const ${funcName} = [validateImageRelationship, ${funcName}Handler]`;
          
          // Verificar se existe uma versão Handler da função
          const handlerPattern = new RegExp(`export const ${funcName}Handler\\s*=`);
          if (updatedContent.match(handlerPattern)) {
            // Substituir a declaração da função
            updatedContent = updatedContent.replace(
              matchedText, 
              newFunctionText
            );
            console.log(`${colors.green}✓ Função ${funcName} convertida para usar middleware${colors.reset}`);
          } else {
            // Criar versão Handler da função original
            const functionPattern = new RegExp(`export const ${funcName}\\s*=\\s*async\\s*\\([^)]*\\)\\s*=>`);
            const asyncFunctionMatch = updatedContent.match(functionPattern);
            
            if (asyncFunctionMatch) {
              const originalFuncText = asyncFunctionMatch[0];
              const handlerFuncText = originalFuncText.replace(
                `export const ${funcName}`, 
                `export const ${funcName}Handler`
              );
              
              // Substituir a função original pela versão Handler
              updatedContent = updatedContent.replace(originalFuncText, handlerFuncText);
              
              // Adicionar a nova declaração da função com middleware
              const functionEndPattern = new RegExp(`export const ${funcName}Handler[\\s\\S]*?;\\s*\\n\\s*\\n`);
              const functionEndMatch = updatedContent.match(functionEndPattern);
              
              if (functionEndMatch) {
                const endIndex = updatedContent.indexOf(functionEndMatch[0]) + functionEndMatch[0].length;
                updatedContent = 
                  updatedContent.substring(0, endIndex) + 
                  `\n// Combinando o novo middleware de validação com o handler\n${newFunctionText};\n\n` + 
                  updatedContent.substring(endIndex);
                  
                console.log(`${colors.green}✓ Função ${funcName} convertida para usar middleware${colors.reset}`);
              }
            }
          }
        }
      } else {
        console.log(`${colors.yellow}⚠️ Função ${funcName} não encontrada${colors.reset}`);
      }
    }
    
    // 3. Substituir o antigo middleware validateEntityRelationship pelo novo
    updatedContent = updatedContent.replace(
      /export const validateEntityRelationship[\s\S]*?next\(\);[\s\S]*?\};/g,
      '// Este middleware foi substituído pelo validateImageRelationship em middleware/image-validation.ts\n' +
      'export const validateEntityRelationship = (req, res, next) => next();'
    );
    
    console.log(`${colors.green}✓ Middleware validateEntityRelationship substituído${colors.reset}`);
    
    // Salvar as alterações no arquivo
    fs.writeFileSync(imageControllerPath, updatedContent, 'utf8');
    console.log(`${colors.green}✓ Arquivo atualizado: ${imageControllerPath}${colors.reset}`);
    
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Erro ao atualizar controlador: ${error.message}${colors.reset}`);
    return false;
  }
}

// Função principal
function main() {
  console.log(`${colors.magenta}=== Atualizando controlador de imagens para usar o novo middleware ===${colors.reset}`);
  
  try {
    if (updateImageController()) {
      console.log(`\n${colors.green}✓ Controlador de imagens atualizado com sucesso!${colors.reset}`);
      console.log(`${colors.blue}ℹ️ Um backup do arquivo original foi criado antes das modificações.${colors.reset}`);
    } else {
      console.log(`\n${colors.red}❌ Falha ao atualizar o controlador de imagens.${colors.reset}`);
    }
  } catch (error) {
    console.error(`\n${colors.red}❌ Erro durante o processo:${colors.reset}`);
    console.error(error);
  }
}

// Executar script
main();