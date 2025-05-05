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
      
      console.log(`Processando imagem: ${file.path} -> ${thumbnailPath}`);
      
      try {
        // Define um caminho temporário para evitar reusar o mesmo arquivo
        const tempDir = path.join(uploadDir, 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Cria caminhos únicos para os arquivos otimizados
        const fileName = path.basename(file.path);
        const fileNameWithoutExt = path.basename(fileName, path.extname(fileName));
        const optimizedPath = path.join(uploadDir, `${fileNameWithoutExt}.jpg`);
        
        // Primeiro, processa o arquivo original em um arquivo temporário
        const tempOptimizedPath = path.join(tempDir, `temp_${fileNameWithoutExt}.jpg`);
        
        console.log(`Otimizando imagem para: ${tempOptimizedPath}`);
        
        // Processa o arquivo original para adicionar fundo branco (importante para PNGs transparentes)
        await sharp(file.path)
          .resize({
            width: 1920, // Largura máxima conforme especificação
            height: 1080, // Altura máxima conforme especificação
            fit: 'inside', // Mantém a proporção
            withoutEnlargement: true // Não amplia imagens pequenas
          })
          .flatten({ background: { r: 255, g: 255, b: 255 } }) // Adiciona fundo branco para imagens transparentes
          .jpeg({ quality: 85 }) // Salva como JPEG com qualidade 85% conforme especificação
          .toFile(tempOptimizedPath);
        
        // Mover o arquivo temporário para o destino final
        fs.renameSync(tempOptimizedPath, optimizedPath);
        
        // Caso o arquivo original não seja JPG, remover o arquivo original
        if (file.path !== optimizedPath) {
          try {
            fs.unlinkSync(file.path);
          } catch (e) {
            console.log(`Aviso: Não foi possível excluir o arquivo original: ${e.message}`);
          }
        }
        
        console.log(`Gerando thumbnail: ${thumbnailPath}`);
        
        // Criar o thumbnail como um processo separado
        await sharp(optimizedPath)
          .resize({
            width: 300, // Largura do thumbnail
            height: 300, // Altura do thumbnail
            fit: 'cover', // Cobre toda a área, cortando se necessário
            position: 'centre' // Centraliza a imagem
          })
          .flatten({ background: { r: 255, g: 255, b: 255 } }) // Adiciona fundo branco para imagens transparentes
          .jpeg({ quality: 80 }) // Qualidade do JPEG (80% é um bom equilíbrio)
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