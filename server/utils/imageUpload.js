import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

// Obtém o caminho do diretório atual em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Define as pastas de upload
const uploadDir = path.join(rootDir, 'public', 'uploads');
const thumbnailDir = path.join(uploadDir, 'thumbnails');

// Garante que as pastas existam
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(thumbnailDir)) {
  fs.mkdirSync(thumbnailDir, { recursive: true });
}

// Configuração do armazenamento para o multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Cria um nome de arquivo único baseado no timestamp e um número aleatório
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Obtém a extensão do arquivo original
    const ext = path.extname(file.originalname).toLowerCase();
    // Cria o nome do arquivo final
    cb(null, uniqueSuffix + ext);
  }
});

// Função para filtrar arquivos (aceita apenas imagens)
const fileFilter = (req, file, cb) => {
  // Aceita apenas os tipos de imagem mais comuns
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true); // Aceita o arquivo
  } else {
    cb(new Error('Tipo de arquivo inválido. Apenas imagens são permitidas.'), false);
  }
};

// Cria a instância do multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite de 5MB por arquivo
  }
});

// Middleware para processar as imagens após o upload
const processImages = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    // Para cada arquivo enviado, cria uma versão otimizada (thumbnail)
    const processPromises = req.files.map(async (file) => {
      // Modificamos a extensão para garantir que todos os arquivos sejam salvos como JPG
      const fileNameWithoutExt = path.basename(file.path, path.extname(file.path));
      const thumbnailPath = path.join(thumbnailDir, `${fileNameWithoutExt}.jpg`);
      const optimizedPath = path.join(uploadDir, `${fileNameWithoutExt}.jpg`);
      
      console.log(`Processando imagem: ${file.path} -> ${optimizedPath}`);
      
      try {
        // Corrigindo o erro "Cannot use same file for input and output"
        // Utilizamos um nome de arquivo temporário para o processamento
        const tempFilePath = path.join(uploadDir, `temp_${Date.now()}_${fileNameWithoutExt}.jpg`);
        
        // Processa o arquivo original para adicionar fundo branco e otimizar
        await sharp(file.path)
          .resize({
            width: 1920, // Largura máxima 
            height: 1080, // Altura máxima
            fit: 'inside', // Mantém a proporção
            withoutEnlargement: true // Não amplia imagens pequenas
          })
          .flatten({ background: { r: 255, g: 255, b: 255 } }) // Adiciona fundo branco
          .jpeg({ quality: 85 }) // Qualidade JPEG 85%
          .toFile(tempFilePath);
          
        // Renomeia o arquivo temporário para o nome final
        fs.renameSync(tempFilePath, optimizedPath);
        
        // Remove o arquivo original se for diferente do otimizado
        if (file.path !== optimizedPath) {
          try {
            fs.unlinkSync(file.path);
          } catch (e) {
            console.log(`Aviso: Não foi possível excluir o arquivo original: ${e.message}`);
          }
        }
        
        console.log(`Gerando thumbnail: ${thumbnailPath}`);
        
        // Criar thumbnail a partir do arquivo otimizado
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
        
        return thumbnailPath;
      } catch (err) {
        console.error(`Erro ao processar imagem individual: ${file.path}`, err);
        throw err;
      }
    });

    await Promise.all(processPromises);
    next();
  } catch (error) {
    console.error('Erro ao processar imagens:', error);
    next(error);
  }
};

// Exporta o middleware completo
export const imageUpload = {
  array: (fieldName, maxCount) => {
    return (req, res, next) => {
      upload.array(fieldName, maxCount)(req, res, (err) => {
        if (err) return next(err);
        processImages(req, res, next);
      });
    };
  },
  single: (fieldName) => {
    return (req, res, next) => {
      upload.single(fieldName)(req, res, (err) => {
        if (err) return next(err);
        processImages(req, res, next);
      });
    };
  }
};