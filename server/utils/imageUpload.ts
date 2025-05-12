import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

// Configurar o diretório de upload
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
const thumbnailsDir = path.join(uploadDir, 'thumbnails');

// Garantir que os diretórios existam
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir, { recursive: true });
}

// Configurar o storage do multer
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Criar um nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtro para permitir apenas imagens
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Apenas imagens são permitidas'));
  }
};

// Criar o middleware de upload
export const imageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Limite de 5MB
  }
});

/**
 * Processa uma imagem para criar uma versão otimizada e miniatura
 * @param originalPath Caminho do arquivo original
 * @param width Largura desejada para a versão otimizada
 * @param thumbnailWidth Largura desejada para a miniatura
 */
export async function processImage(originalPath: string, width = 1200, thumbnailWidth = 300) {
  try {
    const ext = path.extname(originalPath);
    const filename = path.basename(originalPath, ext);
    const optimizedPath = path.join(uploadDir, `${filename}.jpg`);
    const thumbnailPath = path.join(thumbnailsDir, `${filename}.jpg`);

    // Criar versão otimizada
    await sharp(originalPath)
      .resize(width, null, { withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(optimizedPath);

    // Criar miniatura
    await sharp(originalPath)
      .resize(thumbnailWidth, null, { withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toFile(thumbnailPath);

    // Se o arquivo original não é um JPG, podemos removê-lo para economizar espaço
    if (ext.toLowerCase() !== '.jpg' && ext.toLowerCase() !== '.jpeg') {
      fs.unlinkSync(originalPath);
    }

    return {
      originalPath: optimizedPath,
      thumbnailPath: thumbnailPath
    };
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    throw error;
  }
}