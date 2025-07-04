// ARQUIVO: server/utils/imageUpload.ts
// ✅ VERSÃO CORRIGIDA - ISOLAMENTO DE IMAGENS IMPLEMENTADO

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { products, stores } from '../../shared/schema';
import { Request } from 'express';

// Configurar o diretório de upload
const uploadDir = path.join(process.cwd(), 'public', 'uploads');

// Garantir que o diretório base exista
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Garantir que existam diretórios de stores
const storesDir = path.join(uploadDir, 'stores');
if (!fs.existsSync(storesDir)) {
  fs.mkdirSync(storesDir, { recursive: true });
}

// ✅ TIPAGENS PARA CALLBACKS DO MULTER
type DestinationCallback = (error: Error | null, destination: string) => void;
type FilenameCallback = (error: Error | null, filename: string) => void;

// ✅ INTERFACE PARA DADOS DE CONTEXTO DO UPLOAD
interface UploadContext {
  type: 'store' | 'product';
  entityId: string | number;
  storeId?: string | number;
  userId?: number;
}

// ✅ FUNÇÃO DE VALIDAÇÃO DE PROPRIEDADE DA LOJA
async function validateStoreOwnership(userId: number, storeId: number): Promise<boolean> {
  try {
    console.log(`🔒 [SECURITY] Validando propriedade da loja ${storeId} para usuário ${userId}`);

    const [store] = await db.select()
      .from(stores)
      .where(and(
        eq(stores.id, storeId),
        eq(stores.userId, userId)
      ));

    const isOwner = !!store;
    console.log(`🔒 [SECURITY] Usuário ${userId} ${isOwner ? 'É' : 'NÃO É'} proprietário da loja ${storeId}`);

    return isOwner;
  } catch (error) {
    console.error(`❌ [SECURITY] Erro ao validar propriedade da loja:`, error);
    return false;
  }
}

// ✅ FUNÇÃO PARA EXTRAIR CONTEXTO DO UPLOAD DA REQUISIÇÃO
function extractUploadContext(req: any): UploadContext | null {
  try {
    // Extrair dados da query string ou body
    const type = req.query?.type || req.body?.type;
    const entityId = req.query?.entityId || req.body?.entityId;
    const storeId = req.query?.storeId || req.body?.storeId;
    const userId = req.user?.id;

    console.log(`📋 [CONTEXT] Extraindo contexto do upload:`, { type, entityId, storeId, userId });

    if (!type || !entityId) {
      console.warn(`⚠️ [CONTEXT] Dados insuficientes para contexto: type=${type}, entityId=${entityId}`);
      return null;
    }

    return {
      type: type as 'store' | 'product',
      entityId,
      storeId,
      userId
    };
  } catch (error) {
    console.error(`❌ [CONTEXT] Erro ao extrair contexto:`, error);
    return null;
  }
}

// ✅ INTERFACE PARA RETORNO DE getSecurePaths
interface SecurePathsResult {
  storeId: string | number;
  productId?: string | number;
  targetDir: string;
  targetThumbDir: string;
  urlBase: string;
}

/**
 * ✅ NOVA FUNÇÃO: Determina os diretórios e URLs corretos com validação de segurança
 */
async function getSecurePathsWithValidation(
  type: string, 
  entityId: string | number,
  userId?: number,
  providedStoreId?: string | number
): Promise<SecurePathsResult> {
  // ✅ VALIDAÇÃO CRÍTICA
  if (entityId === 'new' || entityId === null || entityId === undefined || entityId === '') {
    throw new Error(`ID da entidade inválido: "${entityId}". A entidade deve ser criada antes do upload de imagens.`);
  }

  let storeId: string | number;
  let productId: string | number | undefined;

  if (type === 'store') {
    storeId = entityId;
    console.log(`🏪 [SECURE-PATHS] Processando upload para loja ${storeId}`);

    // ✅ VALIDAÇÃO DE PROPRIEDADE PARA LOJA
    if (userId) {
      const isOwner = await validateStoreOwnership(userId, Number(storeId));
      if (!isOwner) {
        throw new Error(`Acesso negado: Usuário ${userId} não é proprietário da loja ${storeId}`);
      }
    }

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

        // ✅ VALIDAÇÃO CRUZADA COM storeId FORNECIDO
        if (providedStoreId && Number(providedStoreId) !== Number(storeId)) {
          throw new Error(`Inconsistência de segurança: Produto ${productId} pertence à loja ${storeId}, mas foi fornecido storeId ${providedStoreId}`);
        }

        // ✅ VALIDAÇÃO DE PROPRIEDADE DA LOJA DO PRODUTO
        if (userId) {
          const isOwner = await validateStoreOwnership(userId, Number(storeId));
          if (!isOwner) {
            throw new Error(`Acesso negado: Usuário ${userId} não é proprietário da loja ${storeId} do produto ${productId}`);
          }
        }
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

  let urlBase = `/uploads/stores/${storeId}`;
  let targetDir = storeDir;

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
  const targetThumbDir = path.join(targetDir, 'thumbnails');
  if (!fs.existsSync(targetThumbDir)) {
    fs.mkdirSync(targetThumbDir, { recursive: true });
    console.log(`📁 [SECURE-PATHS] Criado diretório de thumbnails: ${targetThumbDir}`);
  }

  console.log(`✅ [SECURE-PATHS] Estrutura validada e criada com sucesso:`, {
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

// ✅ STORAGE SEGURO DO MULTER - USA CAMINHOS ISOLADOS DESDE O INÍCIO
const secureStorage = multer.diskStorage({
  destination: async function(req: any, _file: Express.Multer.File, cb: DestinationCallback) {
    try {
      console.log(`📁 [MULTER] Determinando destino seguro para upload...`);

      // Extrair contexto do upload
      const context = extractUploadContext(req);
      if (!context) {
        cb(new Error('Contexto de upload não encontrado. Parâmetros type e entityId são obrigatórios.'), '');
        return;
      }

      // ✅ OBTER CAMINHOS SEGUROS COM VALIDAÇÃO
      const { targetDir } = await getSecurePathsWithValidation(
        context.type,
        context.entityId,
        context.userId,
        context.storeId
      );

      console.log(`✅ [MULTER] Destino seguro determinado: ${targetDir}`);
      cb(null, targetDir);

    } catch (error) {
      console.error(`❌ [MULTER] Erro ao determinar destino seguro:`, error);
      cb(error as Error, '');
    }
  },

  filename: function(_req: any, file: Express.Multer.File, cb: FilenameCallback) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + path.extname(file.originalname);
    console.log(`📝 [MULTER] Filename gerado: ${filename}`);
    cb(null, filename);
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

// ✅ MIDDLEWARE DE UPLOAD SEGURO
export const imageUpload = multer({
  storage: secureStorage, // ✅ AGORA USA STORAGE SEGURO
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Limite de 5MB
  }
});

// ✅ INTERFACE PARA RETORNO DE processImage
interface ProcessImageResult {
  originalPath: string;
  thumbnailPath: string;
  imageUrl: string;
  thumbnailUrl: string;
}

/**
 * ✅ VERSÃO ATUALIZADA: Processa uma imagem para criar uma versão otimizada e miniatura
 */
export async function processImage(
  originalPath: string, 
  type?: string, 
  entityId?: string | number,
  userId?: number,
  providedStoreId?: string | number,
  width = 1200, 
  thumbnailWidth = 300
): Promise<ProcessImageResult> {
  try {
    console.log(`🖼️ [PROCESS-IMAGE] Iniciando processamento:`, { 
      originalPath, type, entityId, userId, providedStoreId, width, thumbnailWidth 
    });

    const ext = path.extname(originalPath);
    const filename = path.basename(originalPath, ext);

    // ✅ DETERMINAR CAMINHOS SEGUROS
    let imageUrl: string;
    let thumbnailUrl: string;
    let finalImagePath: string;
    let finalThumbnailPath: string;

    if (type && entityId) {
      console.log(`🔒 [PROCESS-IMAGE] Usando caminhos seguros para ${type} ${entityId}...`);

      const { targetDir, targetThumbDir, urlBase } = await getSecurePathsWithValidation(
        type, 
        entityId, 
        userId, 
        providedStoreId
      );

      finalImagePath = path.join(targetDir, `${filename}.jpg`);
      finalThumbnailPath = path.join(targetThumbDir, `${filename}.jpg`);

      imageUrl = `${urlBase}/${filename}.jpg`;
      thumbnailUrl = `${urlBase}/thumbnails/${filename}.jpg`;

      console.log(`🔒 [PROCESS-IMAGE] Caminhos seguros determinados:`, {
        finalImagePath,
        finalThumbnailPath,
        imageUrl,
        thumbnailUrl
      });
    } else {
      // Fallback para caminhos não seguros (usar apenas em desenvolvimento)
      console.warn(`⚠️ [PROCESS-IMAGE] USANDO CAMINHOS NÃO SEGUROS - apenas para desenvolvimento`);

      finalImagePath = path.join(uploadDir, `${filename}.jpg`);
      finalThumbnailPath = path.join(uploadDir, 'thumbnails', `${filename}.jpg`);

      imageUrl = `/uploads/${filename}.jpg`;
      thumbnailUrl = `/uploads/thumbnails/${filename}.jpg`;

      // Garantir que diretório de thumbnails existe
      const thumbnailsDir = path.join(uploadDir, 'thumbnails');
      if (!fs.existsSync(thumbnailsDir)) {
        fs.mkdirSync(thumbnailsDir, { recursive: true });
      }
    }

    // ✅ PROCESSAR IMAGEM PRINCIPAL
    console.log(`⚙️ [PROCESS-IMAGE] Criando versão otimizada: ${finalImagePath}`);

    await sharp(originalPath)
      .resize(width, null, { withoutEnlargement: true })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 85 })
      .toFile(finalImagePath);

    // ✅ CRIAR MINIATURA
    console.log(`🔍 [PROCESS-IMAGE] Criando thumbnail: ${finalThumbnailPath}`);

    await sharp(finalImagePath)
      .resize(thumbnailWidth, thumbnailWidth, { fit: 'cover', position: 'centre' })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 70 })
      .toFile(finalThumbnailPath);

    // ✅ LIMPAR ARQUIVO ORIGINAL SE NECESSÁRIO
    if (originalPath !== finalImagePath) {
      try {
        if (fs.existsSync(originalPath)) {
          fs.unlinkSync(originalPath);
          console.log(`🧹 [PROCESS-IMAGE] Arquivo original removido: ${originalPath}`);
        }
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
      originalPath: finalImagePath,
      thumbnailPath: finalThumbnailPath,
      imageUrl,
      thumbnailUrl
    };
  } catch (error) {
    console.error('❌ [PROCESS-IMAGE] Erro ao processar imagem:', error);
    throw error;
  }
}

// ✅ FUNÇÃO LEGADA MANTIDA PARA COMPATIBILIDADE (SEM VALIDAÇÃO DE SEGURANÇA)
async function getSecurePaths(type: string, entityId: string | number): Promise<SecurePathsResult> {
  console.warn(`⚠️ [LEGACY] Usando getSecurePaths sem validação de segurança - considere migrar para getSecurePathsWithValidation`);
  return getSecurePathsWithValidation(type, entityId);
}