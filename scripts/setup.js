import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Script para criar diretórios necessários para o sistema de upload de imagens
 * Este script verifica e cria os diretórios de uploads caso não existam
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

/**
 * Cria um diretório se ele não existir
 * @param {string} dir - Caminho do diretório
 */
function createDirectoryIfNotExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Diretório criado: ${dir}`);
  } else {
    console.log(`Diretório já existe: ${dir}`);
  }
}

/**
 * Configura os diretórios necessários para o sistema
 */
function setup() {
  console.log('Iniciando configuração de diretórios...');
  
  // Diretório de uploads
  const uploadsDir = path.join(rootDir, 'public', 'uploads');
  createDirectoryIfNotExists(uploadsDir);
  
  // Diretório de thumbnails
  const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
  createDirectoryIfNotExists(thumbnailsDir);
  
  console.log('Configuração de diretórios concluída!');
}

// Executar a configuração
setup();