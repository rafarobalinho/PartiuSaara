import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { imageUpload } from '../utils/imageUpload.js';
import { db } from '../db.js';
import { storeImages, productImages } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

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
    const { type, entityId } = req.query;
    
    if (!type || !entityId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parâmetros obrigatórios não fornecidos: type (store ou product) e entityId' 
      });
    }

    // Verifica se o tipo é válido
    if (type !== 'store' && type !== 'product') {
      return res.status(400).json({ 
        success: false, 
        message: 'Tipo inválido. Deve ser "store" ou "product"' 
      });
    }

    // A configuração de upload é tratada pelo middleware imageUpload
    imageUpload.array('images', 10)(req, res, async (err) => {
      if (err) {
        console.error('Erro no upload de imagens:', err);
        return res.status(400).json({ success: false, message: 'Erro no upload de imagens: ' + err.message });
      }

      // Se não houver arquivos enviados
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'Nenhuma imagem enviada' });
      }

      try {
        // Processa as imagens e retorna os caminhos otimizados
        const processedImages = req.files.map(file => {
          // O caminho completo do arquivo
          const fullPath = file.path;
          
          // Nome do arquivo
          const filename = path.basename(fullPath);
          
          // Obter o nome do arquivo sem extensão
          const fileNameWithoutExt = path.basename(filename, path.extname(filename));
          
          // Caminho para o thumbnail (versão otimizada) sempre com extensão .jpg
          const thumbnailPath = `/uploads/thumbnails/${fileNameWithoutExt}.jpg`;
          
          // Caminho para o arquivo original convertido para JPG
          const originalPath = `/uploads/${fileNameWithoutExt}.jpg`;
          
          return {
            originalName: file.originalname,
            imageUrl: originalPath,
            thumbnailUrl: thumbnailPath,
            size: file.size,
            mimetype: 'image/jpeg' // Sempre retorna como JPEG, pois convertemos todas as imagens
          };
        });

        // Salva as imagens no banco de dados
        const savedImages = [];
        let isPrimary = true; // A primeira imagem será primária

        for (const image of processedImages) {
          if (type === 'store') {
            // Salva imagem para a loja
            const [savedImage] = await db.insert(storeImages).values({
              storeId: parseInt(entityId),
              imageUrl: image.imageUrl,
              thumbnailUrl: image.thumbnailUrl,
              isPrimary: isPrimary,
              displayOrder: savedImages.length
            }).returning();
            
            savedImages.push({
              ...image,
              id: savedImage.id,
              isPrimary: savedImage.isPrimary
            });
          } else {
            // Salva imagem para o produto
            const [savedImage] = await db.insert(productImages).values({
              productId: parseInt(entityId),
              imageUrl: image.imageUrl,
              thumbnailUrl: image.thumbnailUrl,
              isPrimary: isPrimary,
              displayOrder: savedImages.length
            }).returning();
            
            savedImages.push({
              ...image,
              id: savedImage.id,
              isPrimary: savedImage.isPrimary
            });
          }
          
          // Apenas a primeira imagem é primária
          if (isPrimary) isPrimary = false;
        }

        return res.status(200).json({
          success: true,
          message: 'Imagens enviadas com sucesso',
          images: savedImages
        });
      } catch (error) {
        console.error('Erro ao processar as imagens:', error);
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
    console.error('Erro no servidor durante upload:', error);
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

    // Verifica se os arquivos existem e os exclui
    const deleteFileIfExists = (filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    };

    // Exclui os arquivos físicos
    const originalDeleted = deleteFileIfExists(originalPath);
    const thumbnailDeleted = deleteFileIfExists(thumbnailPath);

    // Remove o registro do banco de dados
    if (type === 'store') {
      await db.delete(storeImages).where(eq(storeImages.id, parseInt(id)));
    } else {
      await db.delete(productImages).where(eq(productImages.id, parseInt(id)));
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
    console.error('Erro ao excluir imagem:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro ao excluir imagem',
      error: error.message,
      details: error.stack
    });
  }
};