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
const uploadBaseDir = path.join(rootDir, 'public', 'uploads');
const thumbnailBaseDir = path.join(uploadBaseDir, 'thumbnails');
const storesDir = path.join(uploadBaseDir, 'stores');

// Garante que as pastas base existam
if (!fs.existsSync(uploadBaseDir)) {
  fs.mkdirSync(uploadBaseDir, { recursive: true });
}
if (!fs.existsSync(thumbnailBaseDir)) {
  fs.mkdirSync(thumbnailBaseDir, { recursive: true });
}
if (!fs.existsSync(storesDir)) {
  fs.mkdirSync(storesDir, { recursive: true });
}

// Função para criar diretorios seguros por loja e produto
const createSecureDirectories = (storeId, productId = null) => {
  // Cria o diretório da loja
  const storeDir = path.join(storesDir, String(storeId));
  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true });
  }
  
  // Se for produto, cria o diretório de produtos
  if (productId) {
    const productsDir = path.join(storeDir, 'products');
    if (!fs.existsSync(productsDir)) {
      fs.mkdirSync(productsDir, { recursive: true });
    }
    
    // Cria o diretório específico do produto
    const productDir = path.join(productsDir, String(productId));
    if (!fs.existsSync(productDir)) {
      fs.mkdirSync(productDir, { recursive: true });
    }
    
    return productDir;
  }
  
  return storeDir;
};

// Configuração do armazenamento para o multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Verifica se temos os parâmetros na requisição para criar diretórios seguros
    const { storeId, productId } = req.params;
    
    if (storeId) {
      try {
        // Cria diretórios segmentados por loja e produto
        const secureDir = createSecureDirectories(storeId, productId);
        return cb(null, secureDir);
      } catch (error) {
        console.error('Erro ao criar diretórios seguros:', error);
      }
    }
    
    // Fallback para o diretório padrão se não conseguir criar os diretórios seguros
    cb(null, uploadBaseDir);
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

// Função para gerar caminhos de URL seguros
const generateSecurePaths = (req, file) => {
  const { storeId, productId } = req.params;
  const fileName = path.basename(file.filename, path.extname(file.filename)) + '.jpg';
  
  if (storeId) {
    if (productId) {
      // Caminho para produto
      return {
        imageUrl: `/uploads/stores/${storeId}/products/${productId}/${fileName}`,
        thumbnailUrl: `/uploads/stores/${storeId}/products/${productId}/thumb-${fileName}`,
        originalPath: file.path,
        targetDir: path.join(storesDir, String(storeId), 'products', String(productId)),
        fileName: fileName,
        thumbFileName: `thumb-${fileName}`
      };
    } else {
      // Caminho para loja
      return {
        imageUrl: `/uploads/stores/${storeId}/${fileName}`,
        thumbnailUrl: `/uploads/stores/${storeId}/thumb-${fileName}`,
        originalPath: file.path,
        targetDir: path.join(storesDir, String(storeId)),
        fileName: fileName,
        thumbFileName: `thumb-${fileName}`
      };
    }
  }
  
  // Fallback para o caminho padrão não seguro (manter retrocompatibilidade)
  return {
    imageUrl: `/uploads/${fileName}`,
    thumbnailUrl: `/uploads/thumbnails/${fileName}`,
    originalPath: file.path,
    targetDir: uploadBaseDir,
    fileName: fileName,
    thumbFileName: `thumb-${fileName}`
  };
};

// Middleware para processar as imagens após o upload
const processImages = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    if (req.file) {
      // Se tivermos um único arquivo, convertê-lo para o formato array
      req.files = [req.file];
    } else {
      return next();
    }
  }

  try {
    // Adicionar informação de caminhos seguros na requisição
    req.secureImagePaths = [];
    
    // Para cada arquivo enviado, cria uma versão otimizada (thumbnail) com caminhos seguros
    const processPromises = req.files.map(async (file) => {
      // Gerar caminhos de URL seguros baseados na estrutura de loja/produto
      const securePaths = generateSecurePaths(req, file);
      
      // Garante que o diretório de destino exista
      if (!fs.existsSync(securePaths.targetDir)) {
        fs.mkdirSync(securePaths.targetDir, { recursive: true });
      }
      
      // Caminho completo para o arquivo de destino
      const optimizedPath = path.join(securePaths.targetDir, securePaths.fileName);
      const thumbnailPath = path.join(securePaths.targetDir, securePaths.thumbFileName);
      
      console.log(`Processando imagem com isolamento seguro: ${file.path} -> ${optimizedPath}`);
      
      try {
        // Utiliza um nome de arquivo temporário para o processamento
        const tempFilePath = path.join(securePaths.targetDir, `temp_${Date.now()}_${securePaths.fileName}`);
        
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
        
        // Remove o arquivo original
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          console.log(`Aviso: Não foi possível excluir o arquivo original: ${e.message}`);
        }
        
        console.log(`Gerando thumbnail com caminho seguro: ${thumbnailPath}`);
        
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
        
        // Adicionar os caminhos de URL seguros à requisição para usar no controlador
        req.secureImagePaths.push({
          originalName: file.originalname,
          imageUrl: securePaths.imageUrl,
          thumbnailUrl: securePaths.thumbnailUrl,
          size: file.size,
          mimetype: 'image/jpeg'
        });
        
        return thumbnailPath;
      } catch (err) {
        console.error(`Erro ao processar imagem individual: ${file.path}`, err);
        throw err;
      }
    });

    await Promise.all(processPromises);
    next();
  } catch (error) {
    console.error('Erro ao processar imagens com isolamento seguro:', error);
    next(error);
  }
};

// Middleware de validação de propriedade para isolamento de segurança
const validateOwnership = async (req, res, next) => {
  try {
    const { storeId } = req.params;
    
    // Se não temos um ID de loja ou o usuário é admin, prosseguir
    if (!storeId || req.user?.role === 'admin') {
      return next();
    }
    
    // Verificar se o usuário é dono da loja
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Autenticação necessária para upload de imagens' });
    }
    
    // Buscar loja e verificar propriedade
    const pool = req.app.locals.pool;
    const storeQuery = `
      SELECT user_id FROM stores WHERE id = $1
    `;
    
    const storeResult = await pool.query(storeQuery, [storeId]);
    
    if (storeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Loja não encontrada' });
    }
    
    const store = storeResult.rows[0];
    
    // Verificar propriedade
    if (store.user_id !== userId) {
      console.error(`Tentativa de acesso não autorizado: Usuário ${userId} tentando acessar loja ${storeId} (pertence ao usuário ${store.user_id})`);
      return res.status(403).json({ message: 'Você não tem permissão para fazer upload de imagens para esta loja' });
    }
    
    // Se chegou aqui, o usuário é dono da loja, prosseguir
    next();
  } catch (error) {
    console.error('Erro na validação de propriedade:', error);
    next(error);
  }
};

// Exporta o middleware completo com validação de segurança
export const imageUpload = {
  array: (fieldName, maxCount) => {
    return (req, res, next) => {
      // Primeiro validar propriedade para garantir isolamento de segurança
      validateOwnership(req, res, (err) => {
        if (err) return next(err);
        
        // Se a validação passou, fazer upload
        upload.array(fieldName, maxCount)(req, res, (err) => {
          if (err) return next(err);
          
          // Processar imagens com isolamento por loja/produto
          processImages(req, res, next);
        });
      });
    };
  },
  single: (fieldName) => {
    return (req, res, next) => {
      // Primeiro validar propriedade para garantir isolamento de segurança
      validateOwnership(req, res, (err) => {
        if (err) return next(err);
        
        // Se a validação passou, fazer upload
        upload.single(fieldName)(req, res, (err) => {
          if (err) return next(err);
          
          // Processar imagens com isolamento por loja/produto
          processImages(req, res, next);
        });
      });
    };
  },
  
  // Função auxiliar para criação de diretórios seguros
  createSecureDirectories,
  
  // Função auxiliar para gerar caminhos de URL seguros
  generateSecurePaths
};