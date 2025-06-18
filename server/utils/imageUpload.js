
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

// Obtém o caminho do diretório atual em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Define as pastas de upload base
const baseUploadDir = path.join(rootDir, 'public', 'uploads');

// Função para criar estrutura de pastas baseada no tipo e IDs
const createUploadPath = (type, storeId, productId = null) => {
  let uploadPath;
  
  if (type === 'product' && productId) {
    // Para produtos: /uploads/stores/{storeId}/products/{productId}/
    uploadPath = path.join(baseUploadDir, 'stores', storeId.toString(), 'products', productId.toString());
  } else if (type === 'store') {
    // Para lojas: /uploads/stores/{storeId}/
    uploadPath = path.join(baseUploadDir, 'stores', storeId.toString());
  } else {
    // Fallback para uploads gerais
    uploadPath = baseUploadDir;
  }
  
  // Garante que a pasta existe
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log(`📁 Pasta criada: ${uploadPath}`);
  }
  
  return uploadPath;
};

// Configuração do armazenamento para o multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { type, storeId, productId } = req.query;
    
    console.log(`🔍 [UPLOAD] Configurando destino:`, { type, storeId, productId });
    
    try {
      const uploadPath = createUploadPath(type, storeId, productId);
      console.log(`📁 [UPLOAD] Pasta de destino: ${uploadPath}`);
      cb(null, uploadPath);
    } catch (error) {
      console.error('❌ [UPLOAD] Erro ao criar pasta de destino:', error);
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    // Cria um nome de arquivo único baseado no timestamp e um número aleatório
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Obtém a extensão do arquivo original
    const ext = path.extname(file.originalname).toLowerCase();
    // Cria o nome do arquivo final
    const filename = uniqueSuffix + ext;
    console.log(`📝 [UPLOAD] Nome do arquivo: ${filename}`);
    cb(null, filename);
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

  const { type, storeId, productId } = req.query;
  console.log(`🖼️ [UPLOAD] Processando ${req.files.length} imagens para:`, { type, storeId, productId });

  try {
    // Para cada arquivo enviado, cria uma versão otimizada (thumbnail)
    const processPromises = req.files.map(async (file) => {
      // Modificamos a extensão para garantir que todos os arquivos sejam salvos como JPG
      const fileNameWithoutExt = path.basename(file.path, path.extname(file.path));
      
      // Criar pasta de thumbnails na mesma estrutura
      const fileDir = path.dirname(file.path);
      const thumbnailDir = path.join(fileDir, 'thumbnails');
      
      if (!fs.existsSync(thumbnailDir)) {
        fs.mkdirSync(thumbnailDir, { recursive: true });
        console.log(`📁 [UPLOAD] Pasta de thumbnails criada: ${thumbnailDir}`);
      }
      
      const thumbnailPath = path.join(thumbnailDir, `${fileNameWithoutExt}.jpg`);
      const optimizedPath = path.join(fileDir, `${fileNameWithoutExt}.jpg`);
      
      console.log(`🔄 [UPLOAD] Processando: ${file.path} -> ${optimizedPath}`);
      
      try {
        // Corrigindo o erro "Cannot use same file for input and output"
        // Utilizamos um nome de arquivo temporário para o processamento
        const tempFilePath = path.join(fileDir, `temp_${Date.now()}_${fileNameWithoutExt}.jpg`);
        
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
            console.log(`⚠️ [UPLOAD] Não foi possível excluir o arquivo original: ${e.message}`);
          }
        }
        
        console.log(`🖼️ [UPLOAD] Gerando thumbnail: ${thumbnailPath}`);
        
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
        console.error(`❌ [UPLOAD] Erro ao processar imagem: ${file.path}`, err);
        throw err;
      }
    });

    await Promise.all(processPromises);
    console.log(`✅ [UPLOAD] Todas as imagens processadas com sucesso`);
    next();
  } catch (error) {
    console.error('❌ [UPLOAD] Erro ao processar imagens:', error);
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
