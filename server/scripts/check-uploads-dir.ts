import fs from 'fs';
import path from 'path';

/**
 * Função que garante que um diretório exista
 * Cria o diretório recursivamente se não existir
 * 
 * @param directory Caminho do diretório
 */
function ensureDirectoryExists(directory: string): void {
  if (!fs.existsSync(directory)) {
    try {
      fs.mkdirSync(directory, { recursive: true });
      console.log(`✅ Diretório criado com sucesso: ${directory}`);
    } catch (error) {
      console.error(`❌ Erro ao criar diretório ${directory}:`, error);
      throw error;
    }
  }
}

/**
 * Verifica permissões de um diretório
 * 
 * @param directory Caminho do diretório
 */
function checkDirectoryPermissions(directory: string): void {
  try {
    fs.accessSync(directory, fs.constants.W_OK | fs.constants.R_OK);
    console.log(`✅ Permissões corretas para o diretório: ${directory}`);
  } catch (error) {
    console.error(`❌ Problema de permissões no diretório ${directory}:`, error);
    try {
      // Tentar corrigir as permissões
      fs.chmodSync(directory, 0o755);
      console.log(`🔧 Permissões corrigidas para o diretório: ${directory}`);
    } catch (chmodError) {
      console.error(`❌ Não foi possível corrigir as permissões:`, chmodError);
    }
  }
}

/**
 * Cria uma imagem de placeholder se não existir
 * 
 * @param imagePath Caminho da imagem
 */
function ensureDefaultImageExists(imagePath: string): void {
  if (!fs.existsSync(imagePath)) {
    try {
      // Cria um arquivo vazio (pode ser substituído por uma imagem real depois)
      fs.writeFileSync(imagePath, '');
      console.log(`✅ Arquivo de imagem padrão criado: ${imagePath}`);
    } catch (error) {
      console.error(`❌ Erro ao criar imagem padrão ${imagePath}:`, error);
    }
  }
}

/**
 * Verifica e cria os diretórios necessários para o sistema de upload
 */
export function checkUploadDirectories(): void {
  console.log('🔍 Verificando diretórios de uploads...');
  
  // Caminhos dos diretórios
  const rootDir = process.cwd();
  const publicDir = path.join(rootDir, 'public');
  const uploadsDir = path.join(publicDir, 'uploads');
  const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
  const originalsDir = path.join(uploadsDir, 'originals');
  const assetsDir = path.join(publicDir, 'assets');
  
  // Garantir que os diretórios existam
  ensureDirectoryExists(publicDir);
  ensureDirectoryExists(uploadsDir);
  ensureDirectoryExists(thumbnailsDir);
  ensureDirectoryExists(originalsDir);
  ensureDirectoryExists(assetsDir);
  
  // Verificar permissões
  checkDirectoryPermissions(publicDir);
  checkDirectoryPermissions(uploadsDir);
  checkDirectoryPermissions(thumbnailsDir);
  checkDirectoryPermissions(originalsDir);
  checkDirectoryPermissions(assetsDir);
  
  // Garantir que as imagens padrão existam
  const defaultProductImage = path.join(assetsDir, 'default-product-image.jpg');
  const defaultStoreImage = path.join(assetsDir, 'default-store-image.jpg');
  const defaultImage = path.join(assetsDir, 'default-image.jpg');
  
  ensureDefaultImageExists(defaultProductImage);
  ensureDefaultImageExists(defaultStoreImage);
  ensureDefaultImageExists(defaultImage);
  
  console.log('✅ Todos os diretórios verificados e criados com sucesso');
}

// Em ESM não temos 'require.main', então removemos essa verificação
// e deixamos que o módulo seja importado e chamado explicitamente