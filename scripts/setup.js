/**
 * Script para criar diretórios necessários para o sistema de upload de imagens
 * Este script verifica e cria os diretórios de uploads caso não existam
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtém o caminho do diretório atual em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Cria um diretório se ele não existir
 * @param {string} dir - Caminho do diretório
 */
function createDirectoryIfNotExists(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Criando diretório: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Diretório criado com sucesso: ${dir}`);
  } else {
    console.log(`Diretório já existe: ${dir}`);
  }
}

/**
 * Configura os diretórios necessários para o sistema
 */
function setup() {
  try {
    console.log('Iniciando configuração do sistema de uploads...');
    
    // Caminhos para os diretórios de uploads
    const publicDir = path.join(rootDir, 'public');
    const uploadsDir = path.join(publicDir, 'uploads');
    const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
    const tempDir = path.join(uploadsDir, 'temp');
    
    // Criar diretórios se não existirem
    createDirectoryIfNotExists(publicDir);
    createDirectoryIfNotExists(uploadsDir);
    createDirectoryIfNotExists(thumbnailsDir);
    createDirectoryIfNotExists(tempDir); // Diretório temporário para processamento de imagens
    
    console.log('Configuração completa!');
    console.log('Os diretórios de upload estão prontos para uso.');
  } catch (error) {
    console.error('Erro durante a configuração:', error);
    process.exit(1);
  }
}

// Executar a função de configuração
setup();