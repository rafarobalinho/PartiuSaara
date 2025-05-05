import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtém o diretório atual para o módulo ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script para criar diretórios necessários para o sistema de upload de imagens
 * Este script verifica e cria os diretórios de uploads caso não existam
 */

const directories = [
  'public/uploads',
  'public/uploads/thumbnails'
];

// Função para criar diretório se não existir
function createDirectoryIfNotExists(dir) {
  const fullPath = path.join(process.cwd(), dir);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`Criando diretório: ${dir}`);
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Diretório criado com sucesso: ${dir}`);
  } else {
    console.log(`Diretório já existe: ${dir}`);
  }
}

// Cria todos os diretórios necessários
function setup() {
  console.log('Iniciando setup de diretórios para sistema de upload de imagens...');
  
  directories.forEach(dir => {
    createDirectoryIfNotExists(dir);
  });
  
  console.log('Setup concluído com sucesso!');
}

// Executa o setup
setup();