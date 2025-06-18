
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { imageUpload } from '../utils/imageUpload.js';
import { db } from '../db.js';
import { storeImages, productImages } from '../../shared/schema.js';
import { eq, desc } from 'drizzle-orm';

// Obtém o caminho do diretório atual em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

/**
 * @route POST /api/upload/images
 * @desc Upload múltiplas imagens e retorna URLs otimizadas
 * @access Privado (apenas usuários autenticados)
 */
export const uploadImages = async (req, res) => {
  try {
    // A verificação de autenticação já é feita pelo middleware authMiddleware na rota
    const { type, storeId, productId } = req.query;
    
    console.log(`🔍 [UPLOAD-CONTROLLER] Parâmetros recebidos:`, { type, storeId, productId });
    
    if (!type || !storeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parâmetros obrigatórios não fornecidos: type (store ou product) e storeId' 
      });
    }

    // Verifica se o tipo é válido
    if (type !== 'store' && type !== 'product') {
      return res.status(400).json({ 
        success: false, 
        message: 'Tipo inválido. Deve ser "store" ou "product"' 
      });
    }

    // Para produtos, productId é obrigatório
    if (type === 'product' && !productId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Para tipo "product", productId é obrigatório' 
      });
    }

    // A configuração de upload é tratada pelo middleware imageUpload
    imageUpload.array('images', 10)(req, res, async (err) => {
      if (err) {
        console.error('❌ [UPLOAD-CONTROLLER] Erro no upload de imagens:', err);
        return res.status(400).json({ success: false, message: 'Erro no upload de imagens: ' + err.message });
      }

      // Se não houver arquivos enviados
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'Nenhuma imagem enviada' });
      }

      try {
        console.log(`📁 [UPLOAD-CONTROLLER] Processando ${req.files.length} arquivos`);
        
        // Processa as imagens e retorna os caminhos otimizados
        const processedImages = req.files.map(file => {
          // O caminho completo do arquivo
          const fullPath = file.path;
          
          // Nome do arquivo
          const filename = path.basename(fullPath);
          
          // Obter o nome do arquivo sem extensão
          const fileNameWithoutExt = path.basename(filename, path.extname(filename));
          
          // Construir URLs relativas baseadas na estrutura de pastas
          let imageUrl, thumbnailUrl;
          
          if (type === 'product') {
            imageUrl = `/uploads/stores/${storeId}/products/${productId}/${fileNameWithoutExt}.jpg`;
            thumbnailUrl = `/uploads/stores/${storeId}/products/${productId}/thumbnails/${fileNameWithoutExt}.jpg`;
          } else {
            imageUrl = `/uploads/stores/${storeId}/${fileNameWithoutExt}.jpg`;
            thumbnailUrl = `/uploads/stores/${storeId}/thumbnails/${fileNameWithoutExt}.jpg`;
          }
          
          console.log(`🖼️ [UPLOAD-CONTROLLER] Imagem processada:`, { imageUrl, thumbnailUrl });
          
          return {
            originalName: file.originalname,
            imageUrl: imageUrl,
            thumbnailUrl: thumbnailUrl,
            size: file.size,
            mimetype: 'image/jpeg' // Sempre retorna como JPEG, pois convertemos todas as imagens
          };
        });

        // Salva as imagens no banco de dados
        const savedImages = [];

        for (const image of processedImages) {
          if (type === 'store') {
            // Se for uma loja, primeiro desativa todas as imagens primárias existentes
            await db.update(storeImages)
              .set({
                isPrimary: false
              })
              .where(eq(storeImages.storeId, parseInt(storeId)));
            
            // Salva a nova imagem como primária (sempre a mais recente será primária)
            const [savedImage] = await db.insert(storeImages).values({
              storeId: parseInt(storeId),
              imageUrl: image.imageUrl,
              thumbnailUrl: image.thumbnailUrl,
              isPrimary: true, // Sempre verdadeiro - a imagem mais recente é a primária
              displayOrder: savedImages.length
            }).returning();
            
            console.log(`✅ [UPLOAD-CONTROLLER] Imagem de loja salva:`, savedImage);
            
            savedImages.push({
              ...image,
              id: savedImage.id,
              isPrimary: savedImage.isPrimary
            });
          } else {
            // Se for um produto, primeiro desativa todas as imagens primárias existentes
            await db.update(productImages)
              .set({
                isPrimary: false
              })
              .where(eq(productImages.productId, parseInt(productId)));
            
            // Salva a nova imagem como primária (sempre a mais recente será primária)
            const [savedImage] = await db.insert(productImages).values({
              productId: parseInt(productId),
              imageUrl: image.imageUrl,
              thumbnailUrl: image.thumbnailUrl,
              isPrimary: true, // Sempre verdadeiro - a imagem mais recente é a primária
              displayOrder: savedImages.length
            }).returning();
            
            console.log(`✅ [UPLOAD-CONTROLLER] Imagem de produto salva:`, savedImage);
            
            savedImages.push({
              ...image,
              id: savedImage.id,
              isPrimary: savedImage.isPrimary
            });
          }
        }

        return res.status(200).json({
          success: true,
          message: 'Imagens enviadas com sucesso',
          images: savedImages
        });
      } catch (error) {
        console.error('❌ [UPLOAD-CONTROLLER] Erro ao processar as imagens:', error);
        // Resposta mais detalhada do erro para facilitar o debugging
        return res.status(500).json({ 
          success: false, 
          message: 'Erro ao processar as imagens', 
          error: error.message,
          details: error.stack
        });
      }
    });
  } catch (error) {
    console.error('❌ [UPLOAD-CONTROLLER] Erro no servidor durante upload:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

/**
 * @route DELETE /api/upload/images/:id
 * @desc Deleta uma imagem do servidor e do banco de dados
 * @access Privado (apenas usuários autenticados)
 */
export const deleteImage = async (req, res) => {
  try {
    // A verificação de autenticação já é feita pelo middleware authMiddleware na rota
    const { id } = req.params;
    const { type } = req.query;

    if (!id || !type) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parâmetros obrigatórios não fornecidos: id e type (store ou product)' 
      });
    }

    // Verifica se o tipo é válido
    if (type !== 'store' && type !== 'product') {
      return res.status(400).json({ 
        success: false, 
        message: 'Tipo inválido. Deve ser "store" ou "product"' 
      });
    }

    // Busca a imagem no banco de dados
    let imageRecord;
    if (type === 'store') {
      [imageRecord] = await db.select().from(storeImages).where(eq(storeImages.id, parseInt(id)));
    } else {
      [imageRecord] = await db.select().from(productImages).where(eq(productImages.id, parseInt(id)));
    }

    if (!imageRecord) {
      return res.status(404).json({ success: false, message: 'Imagem não encontrada no banco de dados' });
    }

    // Extrai o nome do arquivo da URL
    const { imageUrl, thumbnailUrl } = imageRecord;
    
    // Constrói os caminhos completos para os arquivos no sistema
    const originalPath = path.join(rootDir, 'public', imageUrl);
    const thumbnailPath = path.join(rootDir, 'public', thumbnailUrl);

    console.log(`🗑️ [UPLOAD-CONTROLLER] Deletando arquivos:`, { originalPath, thumbnailPath });

    // Verifica se os arquivos existem e os exclui
    const deleteFileIfExists = (filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ [UPLOAD-CONTROLLER] Arquivo deletado: ${filePath}`);
        return true;
      }
      console.log(`⚠️ [UPLOAD-CONTROLLER] Arquivo não encontrado: ${filePath}`);
      return false;
    };

    // Exclui os arquivos físicos
    const originalDeleted = deleteFileIfExists(originalPath);
    const thumbnailDeleted = deleteFileIfExists(thumbnailPath);

    // Remove o registro do banco de dados
    const isPrimaryImage = imageRecord.isPrimary;
    
    if (type === 'store') {
      await db.delete(storeImages).where(eq(storeImages.id, parseInt(id)));
      
      // Se estava excluindo a imagem primária, definir outra como primária
      if (isPrimaryImage) {
        // Buscar a imagem mais recente (com o maior ID)
        const [newestImage] = await db.select()
          .from(storeImages)
          .where(eq(storeImages.storeId, imageRecord.storeId))
          .orderBy(desc(storeImages.id))
          .limit(1);
          
        if (newestImage) {
          // Definir esta imagem como primária
          await db.update(storeImages)
            .set({ isPrimary: true })
            .where(eq(storeImages.id, newestImage.id));
        }
      }
    } else {
      await db.delete(productImages).where(eq(productImages.id, parseInt(id)));
      
      // Se estava excluindo a imagem primária, definir outra como primária
      if (isPrimaryImage) {
        // Buscar a imagem mais recente (com o maior ID)
        const [newestImage] = await db.select()
          .from(productImages)
          .where(eq(productImages.productId, imageRecord.productId))
          .orderBy(desc(productImages.id))
          .limit(1);
          
        if (newestImage) {
          // Definir esta imagem como primária
          await db.update(productImages)
            .set({ isPrimary: true })
            .where(eq(productImages.id, newestImage.id));
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Imagem excluída com sucesso',
      filesDeleted: {
        original: originalDeleted,
        thumbnail: thumbnailDeleted
      }
    });
  } catch (error) {
    console.error('❌ [UPLOAD-CONTROLLER] Erro ao excluir imagem:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao excluir imagem',
      error: error.message,
      details: error.stack
    });
  }
};
