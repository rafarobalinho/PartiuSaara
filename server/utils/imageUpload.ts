import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { products } from '../../shared/schema';

// Configurar o diretório de upload
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
const thumbnailsDir = path.join(uploadDir, 'thumbnails');
const originalsDir = path.join(uploadDir, 'originals');

// Garantir que os diretórios existam
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir, { recursive: true });
}

if (!fs.existsSync(originalsDir)) {
  fs.mkdirSync(originalsDir, { recursive: true });
}

// Garantir que existam diretórios de stores
const storesDir = path.join(uploadDir, 'stores');
if (!fs.existsSync(storesDir)) {
  fs.mkdirSync(storesDir, { recursive: true });
}

// Configurar o storage do multer
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, originalsDir); // Armazenar originais em diretório separado
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
 * Determina os diretórios e URLs corretos com base no tipo e ID da entidade
 * @param type Tipo de entidade ('store' ou 'product')
 * @param entityId ID da entidade
 */
async function getSecurePaths(type: string, entityId: string | number) {
  let storeId, productId, targetDir, targetThumbDir;
  let storeDir, urlBase;

  if (type === 'store') {
    storeId = entityId;
  } else if (type === 'product') {
    productId = entityId;
    
    // Buscar o storeId do produto
    try {
      const [product] = await db.select().from(products).where(eq(products.id, Number(productId)));
      if (product) {
        storeId = product.storeId;
        console.log(`Produto ${productId} pertence à loja ${storeId}`);
      } else {
        console.warn(`Produto ${productId} não encontrado no banco de dados`);
        throw new Error(`Produto ${productId} não encontrado`);
      }
    } catch (err) {
      console.error('Erro ao buscar informações do produto:', err);
      throw err;
    }
  }

  // Criar estrutura de diretórios para a loja
  if (storeId) {
    storeDir = path.join(storesDir, storeId.toString());
    if (!fs.existsSync(storeDir)) {
      fs.mkdirSync(storeDir, { recursive: true });
    }
    
    urlBase = `/uploads/stores/${storeId}`;
    targetDir = storeDir;
    
    // Se for um produto, adicionar subdiretório
    if (productId) {
      const productsDir = path.join(storeDir, 'products');
      if (!fs.existsSync(productsDir)) {
        fs.mkdirSync(productsDir, { recursive: true });
      }
      
      const productDir = path.join(productsDir, productId.toString());
      if (!fs.existsSync(productDir)) {
        fs.mkdirSync(productDir, { recursive: true });
      }
      
      targetDir = productDir;
      urlBase += `/products/${productId}`;
    }
    
    // Criar diretório para thumbnails
    targetThumbDir = path.join(targetDir, 'thumbnails');
    if (!fs.existsSync(targetThumbDir)) {
      fs.mkdirSync(targetThumbDir, { recursive: true });
    }
    
    return {
      storeId,
      productId,
      targetDir,
      targetThumbDir,
      urlBase
    };
  }
  
  return {
    storeId: null,
    productId: null,
    targetDir: uploadDir,
    targetThumbDir: thumbnailsDir,
    urlBase: '/uploads'
  };
}

/**
 * Processa uma imagem para criar uma versão otimizada e miniatura
 * @param originalPath Caminho do arquivo original
 * @param type Tipo de entidade ('store' ou 'product')
 * @param entityId ID da entidade
 * @param width Largura desejada para a versão otimizada
 * @param thumbnailWidth Largura desejada para a miniatura
 */
export async function processImage(originalPath: string, type?: string, entityId?: string | number, width = 1200, thumbnailWidth = 300) {
  try {
    const ext = path.extname(originalPath);
    const filename = path.basename(originalPath, ext);
    
    // Usar caminhos seguros baseados no tipo e entidade
    let secureImagePath = path.join(uploadDir, `${filename}.jpg`);
    let secureThumbnailPath = path.join(thumbnailsDir, `${filename}.jpg`);
    let imageUrl = `/uploads/${filename}.jpg`;
    let thumbnailUrl = `/uploads/thumbnails/${filename}.jpg`;
    
    // Se temos informações de tipo e entidade, usamos caminhos isolados
    if (type && entityId) {
      const { targetDir, targetThumbDir, urlBase } = await getSecurePaths(type, entityId);
      
      secureImagePath = path.join(targetDir, `${filename}.jpg`);
      secureThumbnailPath = path.join(targetThumbDir, `thumb-${filename}.jpg`);
      
      imageUrl = `${urlBase}/${filename}.jpg`;
      thumbnailUrl = `${urlBase}/thumbnails/thumb-${filename}.jpg`;
      
      console.log(`Processando imagem isolada para ${type} ${entityId}`);
      console.log(`Caminhos seguros: ${secureImagePath}, ${secureThumbnailPath}`);
    }

    // Criar versão temporária para evitar conflito de arquivos (mesmo arquivo para entrada/saída)
    const tempPath = path.join(originalsDir, `temp_${Date.now()}_${filename}.jpg`);
    
    // Criar versão otimizada no arquivo temporário
    await sharp(originalPath)
      .resize(width, null, { withoutEnlargement: true })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 85 })
      .toFile(tempPath);
      
    // Garantir que o diretório de destino exista
    const targetDirName = path.dirname(secureImagePath);
    if (!fs.existsSync(targetDirName)) {
      fs.mkdirSync(targetDirName, { recursive: true });
    }
    
    // Mover para o destino final
    fs.renameSync(tempPath, secureImagePath);

    // Criar miniatura
    await sharp(secureImagePath)
      .resize(thumbnailWidth, thumbnailWidth, { fit: 'cover', position: 'centre' })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 70 })
      .toFile(secureThumbnailPath);

    // Se o arquivo original não é um JPG, podemos removê-lo para economizar espaço
    if (ext.toLowerCase() !== '.jpg' && ext.toLowerCase() !== '.jpeg') {
      try {
        fs.unlinkSync(originalPath);
      } catch (e) {
        console.log(`Aviso: Não foi possível excluir o arquivo original: ${e.message}`);
      }
    }

    return {
      originalPath: secureImagePath,
      thumbnailPath: secureThumbnailPath,
      imageUrl,
      thumbnailUrl
    };
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    throw error;
  }
}