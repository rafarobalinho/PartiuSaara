import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diretórios de upload
const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads');
const THUMBNAIL_DIR = path.join(process.cwd(), 'public/uploads/thumbnails');

// Verifica se os diretórios existem, se não, cria-os
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(THUMBNAIL_DIR)) {
  fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
}

/**
 * Configuração do multer para armazenamento de arquivos
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Gera um nome único para o arquivo para evitar conflitos
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

/**
 * Filtro para permitir apenas formatos de imagem específicos
 */
const fileFilter = (req, file, cb) => {
  // Verifica se o tipo de arquivo é permitido
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de arquivo não suportado. Apenas JPG, PNG e WebP são permitidos.'), false);
  }
};

/**
 * Configura o multer com as opções definidas
 */
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5 // máximo 5 arquivos por vez
  }
});

/**
 * Processa a imagem usando sharp para otimização
 * @param {Object} file - O arquivo enviado pelo multer
 * @returns {Promise<Object>} - Objeto com os caminhos da imagem otimizada e thumbnail
 */
export const processImage = async (file) => {
  try {
    const filename = path.basename(file.path);
    const optimizedPath = path.join(UPLOAD_DIR, filename);
    const thumbnailPath = path.join(THUMBNAIL_DIR, filename);
    
    // Processamento da imagem principal - redimensiona para máximo 1920x1080
    await sharp(file.path)
      .resize({
        width: 1920,
        height: 1080,
        fit: 'inside', // mantém proporção original
        withoutEnlargement: true // não amplia imagens menores
      })
      .jpeg({ quality: 85 }) // comprimir com qualidade 85%
      .toFile(optimizedPath);
    
    // Criação da thumbnail 300x300
    await sharp(file.path)
      .resize({
        width: 300,
        height: 300,
        fit: 'cover', // corta e ajusta para o tamanho exato
        position: 'centre'
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
    
    // Remove o arquivo original após processamento
    fs.unlinkSync(file.path);
    
    // Retorna os caminhos relativos para uso nas URLs
    return {
      imageUrl: `/uploads/${filename}`,
      thumbnailUrl: `/uploads/thumbnails/${filename}`
    };
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    throw new Error('Falha ao processar a imagem.');
  }
};

/**
 * Middleware para processar várias imagens após o upload
 * @param {Object} req - Objeto de requisição Express
 * @param {Object} res - Objeto de resposta Express
 * @param {Function} next - Função next do Express
 */
export const processUploadedImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next();
    }
    
    const processedImages = [];
    
    // Processa cada arquivo
    for (const file of req.files) {
      const result = await processImage(file);
      processedImages.push(result);
    }
    
    // Adiciona os resultados ao objeto req para uso no próximo middleware
    req.processedImages = processedImages;
    next();
  } catch (error) {
    console.error('Erro ao processar imagens:', error);
    return res.status(500).json({ error: 'Falha ao processar imagens.' });
  }
};

/**
 * Exclui uma imagem e sua thumbnail do servidor
 * @param {string} imageUrl - URL da imagem a ser excluída
 * @returns {Promise<boolean>} - True se a exclusão for bem-sucedida
 */
export const deleteImage = async (imageUrl) => {
  try {
    if (!imageUrl) return false;
    
    // Extrai o nome do arquivo da URL
    const filename = path.basename(imageUrl);
    
    // Caminhos completos para os arquivos
    const imagePath = path.join(UPLOAD_DIR, filename);
    const thumbnailPath = path.join(THUMBNAIL_DIR, filename);
    
    // Exclui os arquivos se existirem
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    
    if (fs.existsSync(thumbnailPath)) {
      fs.unlinkSync(thumbnailPath);
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir imagem:', error);
    return false;
  }
};