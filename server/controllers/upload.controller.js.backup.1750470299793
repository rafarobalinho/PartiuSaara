import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { pool } from '../db.ts';
import { fileURLToPath } from 'url';
import { desc } from 'drizzle-orm';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// Configuração do multer
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos'));
    }
  }
}).array('images', 10);

export const uploadImages = async (req, res) => {
  try {
    const { type, entityId, storeId } = req.query;

    console.log('🔍 [UPLOAD-DEBUG] Parâmetros recebidos:', { type, entityId, storeId });

    if (!type || !entityId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parâmetros obrigatórios: type e entityId' 
      });
    }

    if (type !== 'store' && type !== 'product') {
      return res.status(400).json({ 
        success: false, 
        message: 'Tipo inválido. Deve ser "store" ou "product"' 
      });
    }

    let finalStoreId;
    let finalEntityId = entityId;

    // LÓGICA CONDICIONAL POR TIPO:
    if (type === 'store') {
      // Para lojas: entityId É o storeId
      finalStoreId = entityId;
      console.log('🔍 [UPLOAD-DEBUG] Upload de loja, storeId:', finalStoreId);

    } else if (type === 'product') {
      // Para produtos: entityId é productId, precisamos do storeId
      const productId = entityId;

      if (storeId) {
        // Se storeId foi fornecido, usar ele
        finalStoreId = storeId;
      } else {
        // Se não foi fornecido, buscar no banco
        console.log('🔍 [UPLOAD-DEBUG] Buscando storeId para produto:', productId);

        const productResult = await pool.query(
          'SELECT store_id FROM products WHERE id = $1',
          [productId]
        );

        if (productResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Produto não encontrado'
          });
        }

        finalStoreId = productResult.rows[0].store_id;
      }

      console.log('🔍 [UPLOAD-DEBUG] Upload de produto, productId:', productId, 'storeId:', finalStoreId);
    }

    console.log('🔍 [UPLOAD-DEBUG] IDs finais:', {
      type,
      entityId: finalEntityId,
      storeId: finalStoreId
    });

    // Processar upload com multer
    upload(req, res, async (uploadError) => {
      if (uploadError) {
        console.error('Erro no multer:', uploadError);
        return res.status(400).json({ 
          success: false, 
          message: uploadError.message 
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nenhuma imagem foi enviada' 
        });
      }

      // Criar estrutura de pastas
      let targetDir;
      if (type === 'store') {
        targetDir = path.join(UPLOADS_DIR, 'stores', finalStoreId.toString());
      } else if (type === 'product') {
        targetDir = path.join(UPLOADS_DIR, 'stores', finalStoreId.toString(), 'products', finalEntityId.toString());
      }

      const thumbnailDir = path.join(targetDir, 'thumbnails');

      // Criar pastas se não existirem
      [targetDir, thumbnailDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log('📁 Criado diretório:', dir);
        }
      });

      const uploadedImages = [];

      for (const file of req.files) {
        try {
          const timestamp = Date.now();
          const randomId = Math.floor(Math.random() * 1000000000);
          const fileName = `${timestamp}-${randomId}.jpg`;

          const imagePath = path.join(targetDir, fileName);
          const thumbnailPath = path.join(thumbnailDir, fileName);

          // Processar imagem principal
          await sharp(file.buffer)
            .resize(800, 600, { 
              fit: 'inside',
              withoutEnlargement: true 
            })
            .jpeg({ quality: 85 })
            .toFile(imagePath);

          // Criar thumbnail
          await sharp(file.buffer)
            .resize(300, 200, { 
              fit: 'cover' 
            })
            .jpeg({ quality: 75 })
            .toFile(thumbnailPath);

          // URLs para o banco de dados - corrigir estrutura
          let imageUrl, thumbnailUrl;
          if (type === 'store') {
            imageUrl = `/uploads/stores/${finalStoreId}/${fileName}`;
            thumbnailUrl = `/uploads/stores/${finalStoreId}/thumbnails/${fileName}`;
          } else if (type === 'product') {
            imageUrl = `/uploads/stores/${finalStoreId}/products/${finalEntityId}/${fileName}`;
            thumbnailUrl = `/uploads/stores/${finalStoreId}/products/${finalEntityId}/thumbnails/${fileName}`;
          }

          // Salvar no banco de dados
          let insertQuery;
          let queryParams;

          if (type === 'store') {
            insertQuery = `
              INSERT INTO store_images (store_id, image_url, thumbnail_url, is_primary, display_order)
              VALUES ($1, $2, $3, $4, $5)
              RETURNING id
            `;

            // Verificar se é a primeira imagem (será primary)
            const existingImagesResult = await pool.query(
              'SELECT COUNT(*) as count FROM store_images WHERE store_id = $1',
              [finalStoreId]
            );
            const isPrimary = existingImagesResult.rows[0].count === '0';

            queryParams = [finalStoreId, imageUrl, thumbnailUrl, isPrimary, 0];

          } else if (type === 'product') {
            insertQuery = `
              INSERT INTO product_images (product_id, image_url, thumbnail_url, is_primary, display_order)
              VALUES ($1, $2, $3, $4, $5)
              RETURNING id
            `;

            // Verificar se é a primeira imagem (será primary)
            const existingImagesResult = await pool.query(
              'SELECT COUNT(*) as count FROM product_images WHERE product_id = $1',
              [finalEntityId]
            );
            const isPrimary = existingImagesResult.rows[0].count === '0';

            queryParams = [finalEntityId, imageUrl, thumbnailUrl, isPrimary, 0];
          }

          const result = await pool.query(insertQuery, queryParams);

          uploadedImages.push({
            id: result.rows[0].id,
            url: imageUrl,
            thumbnailUrl: thumbnailUrl,
            fileName: fileName,
            isPrimary: queryParams[3]
          });

          console.log('✅ Imagem salva:', fileName);

        } catch (error) {
          console.error('Erro ao processar imagem:', file.originalname, error);
        }
      }

      if (uploadedImages.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'Falha ao processar todas as imagens'
        });
      }

      console.log('🎉 Upload concluído:', uploadedImages.length, 'imagens');

      res.json({
        success: true,
        message: `${uploadedImages.length} imagem(ns) enviada(s) com sucesso`,
        images: uploadedImages,
        type: type,
        entityId: finalEntityId,
        storeId: finalStoreId
      });
    });

  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
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
    const originalPath = path.join(process.cwd(), 'public', imageUrl); // Use process.cwd() instead of rootDir
    const thumbnailPath = path.join(process.cwd(), 'public', thumbnailUrl); // Use process.cwd() instead of rootDir

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