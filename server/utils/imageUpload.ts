// ARQUIVO: server/utils/imageUpload.ts
// ✅ VERSÃO LIMPA SEM ERROS TYPESCRIPT

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

// ✅ TIPAGENS PARA CALLBACKS DO MULTER
type DestinationCallback = (error: Error | null, destination: string) => void;
type FilenameCallback = (error: Error | null, filename: string) => void;

// Configurar o storage do multer
const storage = multer.diskStorage({
  destination: function(_req: any, _file: Express.Multer.File, cb: DestinationCallback) {
    cb(null, originalsDir);
  },
  filename: function(_req: any, file: Express.Multer.File, cb: FilenameCallback) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtro para permitir apenas imagens
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
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

// ✅ INTERFACE PARA RETORNO DE getSecurePaths
interface SecurePathsResult {
  storeId: string | number;
  productId?: string | number;
  targetDir: string;
  targetThumbDir: string;
  urlBase: string;
}

/**
 * Determina os diretórios e URLs corretos com base no tipo e ID da entidade
 */
async function getSecurePaths(type: string, entityId: string | number): Promise<SecurePathsResult> {
  // ✅ VALIDAÇÃO CRÍTICA
  if (entityId === 'new' || entityId === null || entityId === undefined || entityId === '') {
    throw new Error(`ID da entidade inválido: "${entityId}". A entidade deve ser criada antes do upload de imagens.`);
  }

  let storeId: string | number;
  let productId: string | number | undefined;
  let targetDir: string;
  let targetThumbDir: string;
  let urlBase: string;

  if (type === 'store') {
    storeId = entityId;
    console.log(`🏪 [SECURE-PATHS] Processando upload para loja ${storeId}`);

  } else if (type === 'product') {
    productId = entityId;

    // ✅ VALIDAÇÃO ADICIONAL PARA PRODUTOS
    const numericProductId = Number(productId);
    if (isNaN(numericProductId) || numericProductId <= 0) {
      throw new Error(`ID do produto inválido: "${productId}". Deve ser um número maior que zero.`);
    }

    // Buscar o storeId do produto
    try {
      console.log(`🔍 [SECURE-PATHS] Buscando informações do produto ${productId}...`);
      const [product] = await db.select().from(products).where(eq(products.id, numericProductId));

      if (product) {
        storeId = product.storeId;
        console.log(`✅ [SECURE-PATHS] Produto ${productId} pertence à loja ${storeId}`);
      } else {
        console.warn(`❌ [SECURE-PATHS] Produto ${productId} não encontrado no banco de dados`);
        throw new Error(`Produto ${productId} não encontrado`);
      }
    } catch (err) {
      console.error('❌ [SECURE-PATHS] Erro ao buscar informações do produto:', err);
      throw err;
    }
  } else {
    throw new Error(`Tipo de entidade inválido: "${type}". Deve ser "store" ou "product".`);
  }

  // Criar estrutura de diretórios para a loja
  const storeDir = path.join(storesDir, storeId.toString());
  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true });
    console.log(`📁 [SECURE-PATHS] Criado diretório da loja: ${storeDir}`);
  }

  urlBase = `/uploads/stores/${storeId}`;
  targetDir = storeDir;

  // Se for um produto, adicionar subdiretório
  if (productId) {
    const productsDir = path.join(storeDir, 'products');
    if (!fs.existsSync(productsDir)) {
      fs.mkdirSync(productsDir, { recursive: true });
      console.log(`📁 [SECURE-PATHS] Criado diretório de produtos: ${productsDir}`);
    }

    const productDir = path.join(productsDir, productId.toString());
    if (!fs.existsSync(productDir)) {
      fs.mkdirSync(productDir, { recursive: true });
      console.log(`📁 [SECURE-PATHS] Criado diretório do produto: ${productDir}`);
    }

    targetDir = productDir;
    urlBase += `/products/${productId}`;
  }

  // Criar diretório para thumbnails
  targetThumbDir = path.join(targetDir, 'thumbnails');
  if (!fs.existsSync(targetThumbDir)) {
    fs.mkdirSync(targetThumbDir, { recursive: true });
    console.log(`📁 [SECURE-PATHS] Criado diretório de thumbnails: ${targetThumbDir}`);
  }

  console.log(`✅ [SECURE-PATHS] Estrutura criada com sucesso:`, {
    storeId,
    productId,
    targetDir,
    targetThumbDir,
    urlBase
  });

  return {
    storeId,
    productId,
    targetDir,
    targetThumbDir,
    urlBase
  };
}

// ✅ INTERFACE PARA RETORNO DE processImage
interface ProcessImageResult {
  originalPath: string;
  thumbnailPath: string;
  imageUrl: string;
  thumbnailUrl: string;
}

/**
 * Processa uma imagem para criar uma versão otimizada e miniatura
 */
export async function processImage(
  originalPath: string, 
  type?: string, 
  entityId?: string | number, 
  width = 1200, 
  thumbnailWidth = 300
): Promise<ProcessImageResult> {
  try {
    console.log(`🖼️ [PROCESS-IMAGE] Iniciando processamento:`, { originalPath, type, entityId, width, thumbnailWidth });

    const ext = path.extname(originalPath);
    const filename = path.basename(originalPath, ext);

    // ✅ USAR CAMINHOS SEGUROS SE INFORMAÇÕES DISPONÍVEIS
    let secureImagePath = path.join(uploadDir, `${filename}.jpg`);
    let secureThumbnailPath = path.join(thumbnailsDir, `${filename}.jpg`);
    let imageUrl = `/uploads/${filename}.jpg`;
    let thumbnailUrl = `/uploads/thumbnails/${filename}.jpg`;

    // ✅ SE TEMOS INFORMAÇÕES DE TIPO E ENTIDADE, USAR CAMINHOS ISOLADOS
    if (type && entityId) {
      console.log(`🔒 [PROCESS-IMAGE] Usando caminhos seguros para ${type} ${entityId}...`);

      const { targetDir, targetThumbDir, urlBase } = await getSecurePaths(type, entityId);

      secureImagePath = path.join(targetDir, `${filename}.jpg`);
      secureThumbnailPath = path.join(targetThumbDir, `${filename}.jpg`);

      imageUrl = `${urlBase}/${filename}.jpg`;
      thumbnailUrl = `${urlBase}/thumbnails/${filename}.jpg`;

      console.log(`🔒 [PROCESS-IMAGE] Caminhos seguros determinados:`, {
        secureImagePath,
        secureThumbnailPath,
        imageUrl,
        thumbnailUrl
      });
    }

    // ✅ CRIAR VERSÃO TEMPORÁRIA PARA EVITAR CONFLITO DE ARQUIVOS
    const tempPath = path.join(originalsDir, `temp_${Date.now()}_${filename}.jpg`);

    console.log(`⚙️ [PROCESS-IMAGE] Criando versão otimizada temporária: ${tempPath}`);

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
      console.log(`📁 [PROCESS-IMAGE] Criado diretório de destino: ${targetDirName}`);
    }

    // Mover para o destino final
    console.log(`📋 [PROCESS-IMAGE] Movendo para destino final: ${secureImagePath}`);
    fs.renameSync(tempPath, secureImagePath);

    // ✅ CRIAR MINIATURA
    console.log(`🔍 [PROCESS-IMAGE] Criando thumbnail: ${secureThumbnailPath}`);

    // Garantir que o diretório de thumbnails exista
    const thumbnailDirName = path.dirname(secureThumbnailPath);
    if (!fs.existsSync(thumbnailDirName)) {
      fs.mkdirSync(thumbnailDirName, { recursive: true });
      console.log(`📁 [PROCESS-IMAGE] Criado diretório de thumbnails: ${thumbnailDirName}`);
    }

    await sharp(secureImagePath)
      .resize(thumbnailWidth, thumbnailWidth, { fit: 'cover', position: 'centre' })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 70 })
      .toFile(secureThumbnailPath);

    // ✅ LIMPAR ARQUIVO ORIGINAL SE NÃO FOR JPG
    if (ext.toLowerCase() !== '.jpg' && ext.toLowerCase() !== '.jpeg') {
      try {
        fs.unlinkSync(originalPath);
        console.log(`🧹 [PROCESS-IMAGE] Arquivo original removido: ${originalPath}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.log(`⚠️ [PROCESS-IMAGE] Aviso: Não foi possível excluir o arquivo original: ${errorMessage}`);
      }
    }

    console.log(`✅ [PROCESS-IMAGE] Processamento concluído com sucesso:`, {
      imageUrl,
      thumbnailUrl
    });

    return {
      originalPath: secureImagePath,
      thumbnailPath: secureThumbnailPath,
      imageUrl,
      thumbnailUrl
    };
  } catch (error) {
    console.error('❌ [PROCESS-IMAGE] Erro ao processar imagem:', error);
    throw error;
  }
}