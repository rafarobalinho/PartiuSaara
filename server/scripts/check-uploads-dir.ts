/**
 * Script para verificar e corrigir a estrutura de diretórios de uploads
 * Este script é usado para diagnosticar problemas com permissões e diretórios
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configuração para obter __dirname em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Diretórios a serem verificados
const BASE_DIR = path.join(__dirname, '../../public');
const UPLOADS_DIR = path.join(BASE_DIR, 'uploads');
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, 'thumbnails');
const ORIGINALS_DIR = path.join(UPLOADS_DIR, 'originals');

// Logs
console.log('==== Verificação de diretórios de uploads ====');
console.log('Diretório base:', BASE_DIR);
console.log('Diretório de uploads:', UPLOADS_DIR);
console.log('Diretório de miniaturas:', THUMBNAILS_DIR);
console.log('Diretório de originais:', ORIGINALS_DIR);

/**
 * Cria um diretório se não existir
 * @param dir Caminho do diretório
 * @returns true se o diretório foi criado, false se já existia
 */
function createDirIfNotExists(dir: string): boolean {
  if (!fs.existsSync(dir)) {
    console.log(`Criando diretório: ${dir}`);
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
    return true;
  }
  return false;
}

/**
 * Verifica e corrige permissões de um diretório
 * @param dir Caminho do diretório
 */
function checkAndFixPermissions(dir: string) {
  try {
    // Verificar permissões atuais
    const stats = fs.statSync(dir);
    const currentMode = stats.mode & 0o777; // Extrai apenas os bits de permissão
    
    console.log(`Permissões atuais de ${dir}: ${currentMode.toString(8)}`);
    
    // Se as permissões não forem 755, corrigir
    if (currentMode !== 0o755) {
      console.log(`Corrigindo permissões de ${dir} para 755`);
      fs.chmodSync(dir, 0o755);
    }
  } catch (error) {
    console.error(`Erro ao verificar/corrigir permissões de ${dir}:`, error);
  }
}

/**
 * Lista os arquivos em um diretório com suas permissões
 * @param dir Caminho do diretório
 */
function listFilesWithPermissions(dir: string) {
  try {
    if (!fs.existsSync(dir)) {
      console.log(`Diretório ${dir} não existe.`);
      return;
    }
    
    const files = fs.readdirSync(dir);
    console.log(`\nArquivos em ${dir} (${files.length}):`);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      const mode = (stats.mode & 0o777).toString(8);
      const size = stats.size;
      const isDir = stats.isDirectory();
      
      console.log(`${isDir ? 'd' : '-'}${mode} ${size.toString().padStart(8)} ${file}`);
    });
  } catch (error) {
    console.error(`Erro ao listar arquivos de ${dir}:`, error);
  }
}

// Criar/verificar diretórios
const baseCreated = createDirIfNotExists(BASE_DIR);
const uploadsCreated = createDirIfNotExists(UPLOADS_DIR);
const thumbnailsCreated = createDirIfNotExists(THUMBNAILS_DIR);
const originalsCreated = createDirIfNotExists(ORIGINALS_DIR);

// Verificar e corrigir permissões
console.log('\n==== Verificando permissões ====');
checkAndFixPermissions(BASE_DIR);
checkAndFixPermissions(UPLOADS_DIR);
checkAndFixPermissions(THUMBNAILS_DIR);
checkAndFixPermissions(ORIGINALS_DIR);

// Listar arquivos nos diretórios
console.log('\n==== Listando arquivos ====');
listFilesWithPermissions(UPLOADS_DIR);
listFilesWithPermissions(THUMBNAILS_DIR);
listFilesWithPermissions(ORIGINALS_DIR);

console.log('\n==== Verificação concluída ====');
console.log(`Para executar novamente: npx tsx server/scripts/check-uploads-dir.ts`);