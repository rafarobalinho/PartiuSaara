/**
 * Script para verificar e corrigir permissões do diretório de uploads
 * 
 * Este script verifica se o diretório de uploads existe e tem as permissões corretas
 */
const fs = require('fs');
const path = require('path');

// Diretórios necessários
const directories = [
  '../public/uploads',
  '../public/uploads/thumbnails',
  '../public/uploads/originals'
];

/**
 * Verifica se um diretório existe e cria se necessário
 * 
 * @param {string} dir Caminho do diretório
 * @returns {boolean} True se o diretório existia ou foi criado com sucesso
 */
function checkAndCreateDirectory(dir) {
  const fullPath = path.resolve(__dirname, dir);
  
  try {
    console.log(`Verificando diretório: ${fullPath}`);
    
    if (fs.existsSync(fullPath)) {
      console.log(`✅ Diretório existe: ${fullPath}`);
      
      // Verificar permissões - deve ser 0755 (leitura/escrita para dono, leitura/execução para outros)
      const stats = fs.statSync(fullPath);
      const mode = stats.mode & 0o777; // Pegar apenas bits de permissão
      
      console.log(`📊 Permissões atuais: ${mode.toString(8).padStart(3, '0')}`);
      
      if (mode !== 0o755) {
        console.log(`⚠️ Ajustando permissões para 0755: ${fullPath}`);
        fs.chmodSync(fullPath, 0o755);
      }
      
      return true;
    } else {
      console.log(`❌ Diretório não existe, criando: ${fullPath}`);
      fs.mkdirSync(fullPath, { recursive: true, mode: 0o755 });
      console.log(`✅ Diretório criado: ${fullPath}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Erro ao verificar/criar diretório ${fullPath}:`, error);
    return false;
  }
}

/**
 * Função principal para verificar todos os diretórios
 */
function checkAllDirectories() {
  console.log('🔍 Verificando diretórios de uploads...');
  
  let success = true;
  
  for (const dir of directories) {
    if (!checkAndCreateDirectory(dir)) {
      success = false;
    }
  }
  
  if (success) {
    console.log('✅ Todos os diretórios verificados e corrigidos com sucesso');
  } else {
    console.error('❌ Houve problemas com alguns diretórios');
  }
  
  return success;
}

// Executar se for chamado diretamente
if (require.main === module) {
  const result = checkAllDirectories();
  process.exit(result ? 0 : 1);
}

module.exports = { checkAllDirectories };