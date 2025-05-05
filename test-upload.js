// Teste simples para simular o processamento de imagens com sharp
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Obtém o caminho do diretório atual em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;

// Definir diretórios
const uploadDir = path.join(rootDir, 'public', 'uploads');
const thumbnailDir = path.join(uploadDir, 'thumbnails');
const tempDir = path.join(uploadDir, 'temp');

// Garantir que os diretórios existam
[uploadDir, thumbnailDir, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Diretório criado: ${dir}`);
  }
});

// Criar uma imagem de teste simples (1px branco)
const testImage = sharp({
  create: {
    width: 100,
    height: 100,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 1 }
  }
});

// Nome de arquivo para teste
const timestamp = Date.now();
const testFileName = `${timestamp}-test.jpg`;
const testFilePath = path.join(uploadDir, testFileName);

// Salvar a imagem de teste
await testImage.jpeg().toFile(testFilePath);
console.log(`Imagem de teste criada: ${testFilePath}`);

// Simular o processamento de imagem com o fluxo corrigido
try {
  // Definir caminhos para teste
  const fileNameWithoutExt = path.basename(testFileName, path.extname(testFileName));
  const optimizedPath = path.join(uploadDir, `${fileNameWithoutExt}.jpg`);
  const tempOptimizedPath = path.join(tempDir, `temp_${fileNameWithoutExt}.jpg`);
  const thumbnailPath = path.join(thumbnailDir, `${fileNameWithoutExt}.jpg`);
  
  console.log(`\nProcessando imagem: ${testFilePath}`);
  console.log(`Caminho otimizado temporário: ${tempOptimizedPath}`);
  console.log(`Caminho otimizado final: ${optimizedPath}`);
  console.log(`Caminho do thumbnail: ${thumbnailPath}`);
  
  // 1. Primeiro processa a imagem para um arquivo temporário
  await sharp(testFilePath)
    .resize({
      width: 1920,
      height: 1080,
      fit: 'inside',
      withoutEnlargement: true
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 85 })
    .toFile(tempOptimizedPath);
  
  console.log(`✓ Imagem otimizada para temp salva com sucesso`);
  
  // 2. Move o arquivo temporário para o destino final
  fs.renameSync(tempOptimizedPath, optimizedPath);
  console.log(`✓ Arquivo temp movido para destino final`);
  
  // 3. Cria o thumbnail
  await sharp(optimizedPath)
    .resize({
      width: 300,
      height: 300,
      fit: 'cover',
      position: 'centre'
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 80 })
    .toFile(thumbnailPath);
  
  console.log(`✓ Thumbnail criado com sucesso`);
  
  console.log("\nTeste concluído com sucesso! O fluxo está funcionando conforme esperado.");
} catch (error) {
  console.error("ERRO NO TESTE:", error);
}