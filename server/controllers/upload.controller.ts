import { Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { pool } from '../db';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// Configuração do multer com tipagem
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos'));
    }
  }
}).array('images', 10);

// Interfaces para tipagem
interface UploadedImage {
  id: number;
  imageUrl: string;
  thumbnailUrl: string;
  fileName: string;
  isPrimary: boolean;
}

interface UploadResponse {
  success: boolean;
  message: string;
  images?: UploadedImage[];
  type?: string;
  entityId?: string;
  storeId?: string;
}

interface DeleteResponse {
  success: boolean;
  message: string;
  filesDeleted?: {
    original: boolean;
    thumbnail: boolean;
  };
}

export const uploadImages = async (req: Request, res: Response): Promise<Response<UploadResponse>> => {
  try {
    const { type, entityId, storeId } = req.query as {
      type?: string;
      entityId?: string;
      storeId?: string;
    };

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

    let finalStoreId: string;
    const finalEntityId = entityId;

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

        finalStoreId = productResult.rows[0].store_id.toString();
      }

      console.log('🔍 [UPLOAD-DEBUG] Upload de produto, productId:', productId, 'storeId:', finalStoreId);
    }

    console.log('🔍 [UPLOAD-DEBUG] IDs finais:', {
      type,
      entityId: finalEntityId,
      storeId: finalStoreId
    });

    // Processar upload com multer usando Promise wrapper
    return new Promise((resolve, reject) => {
      upload(req, res, async (uploadError: any) => {
        if (uploadError) {
          console.error('Erro no multer:', uploadError);
          return resolve(res.status(400).json({ 
            success: false, 
            message: uploadError.message 
          }));
        }

        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          return resolve(res.status(400).json({ 
            success: false, 
            message: 'Nenhuma imagem foi enviada' 
          }));
        }

        // Criar estrutura de pastas
        let targetDir: string;
        if (type === 'store') {
          targetDir = path.join(UPLOADS_DIR, 'stores', finalStoreId);
        } else {
          targetDir = path.join(UPLOADS_DIR, 'stores', finalStoreId, 'products', finalEntityId);
        }

        const thumbnailDir = path.join(targetDir, 'thumbnails');

        // Criar pastas se não existirem
        [targetDir, thumbnailDir].forEach(dir => {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log('📁 Criado diretório:', dir);
          }
        });

        const uploadedImages: UploadedImage[] = [];

        for (const file of files) {
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

            // ✅ CORREÇÃO: Usar filename/thumbnail_filename para AMBAS as tabelas
            let insertQuery: string;
            let queryParams: (string | number | boolean)[];

            if (type === 'store') {
              insertQuery = `
                INSERT INTO store_images (store_id, filename, thumbnail_filename, is_primary, display_order)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
              `;

              // Verificar se é a primeira imagem (será primary)
              const existingImagesResult = await pool.query(
                'SELECT COUNT(*) as count FROM store_images WHERE store_id = $1',
                [finalStoreId]
              );
              const isPrimary = existingImagesResult.rows[0].count === '0';

              queryParams = [parseInt(finalStoreId), fileName, fileName, isPrimary, 0];

            } else {
              insertQuery = `
                INSERT INTO product_images (product_id, filename, thumbnail_filename, is_primary, display_order)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
              `;

              // Verificar se é a primeira imagem (será primary)
              const existingImagesResult = await pool.query(
                'SELECT COUNT(*) as count FROM product_images WHERE product_id = $1',
                [finalEntityId]
              );
              const isPrimary = existingImagesResult.rows[0].count === '0';

              queryParams = [parseInt(finalEntityId), fileName, fileName, isPrimary, 0];
            }

            const result = await pool.query(insertQuery, queryParams);

            // Construir URLs de resposta para o frontend
            let imageUrl: string, thumbnailUrl: string;
            if (type === 'store') {
              imageUrl = `/uploads/stores/${finalStoreId}/${fileName}`;
              thumbnailUrl = `/uploads/stores/${finalStoreId}/thumbnails/${fileName}`;
            } else {
              imageUrl = `/uploads/stores/${finalStoreId}/products/${finalEntityId}/${fileName}`;
              thumbnailUrl = `/uploads/stores/${finalStoreId}/products/${finalEntityId}/thumbnails/${fileName}`;
            }

            uploadedImages.push({
              id: result.rows[0].id,
              imageUrl,
              thumbnailUrl,
              fileName,
              isPrimary: queryParams[3] as boolean
            });

            console.log('✅ Imagem salva:', fileName);

          } catch (error) {
            console.error('Erro ao processar imagem:', file.originalname, error);
          }
        }

        if (uploadedImages.length === 0) {
          return resolve(res.status(500).json({
            success: false,
            message: 'Falha ao processar todas as imagens'
          }));
        }

        console.log('🎉 Upload concluído:', uploadedImages.length, 'imagens');

        resolve(res.json({
          success: true,
          message: `${uploadedImages.length} imagem(ns) enviada(s) com sucesso`,
          images: uploadedImages,
          type,
          entityId: finalEntityId,
          storeId: finalStoreId
        }));
      });
    });

  } catch (error) {
    console.error('Erro no upload:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

export const deleteImage = async (req: Request, res: Response): Promise<Response<DeleteResponse>> => {
  try {
    const { id } = req.params;
    const { type } = req.query as { type?: string };

    if (!id || !type) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parâmetros obrigatórios não fornecidos: id e type (store ou product)' 
      });
    }

    if (type !== 'store' && type !== 'product') {
      return res.status(400).json({ 
        success: false, 
        message: 'Tipo inválido. Deve ser "store" ou "product"' 
      });
    }

    // Buscar usando filename/thumbnail_filename para ambas as tabelas
    let imageRecord: any;
    if (type === 'store') {
      const result = await pool.query(
        'SELECT store_id, filename, thumbnail_filename, is_primary FROM store_images WHERE id = $1', 
        [parseInt(id)]
      );
      imageRecord = result.rows[0];
    } else {
      const result = await pool.query(
        'SELECT product_id, filename, thumbnail_filename, is_primary FROM product_images WHERE id = $1', 
        [parseInt(id)]
      );
      imageRecord = result.rows[0];
    }

    if (!imageRecord) {
      return res.status(404).json({ 
        success: false, 
        message: 'Imagem não encontrada no banco de dados' 
      });
    }

    // Construir caminhos usando filename para ambas as tabelas
    let originalPath: string, thumbnailPath: string;

    if (type === 'store') {
      const { store_id, filename, thumbnail_filename } = imageRecord;
      originalPath = path.join(process.cwd(), 'public', 'uploads', 'stores', store_id.toString(), filename);
      thumbnailPath = path.join(process.cwd(), 'public', 'uploads', 'stores', store_id.toString(), 'thumbnails', thumbnail_filename);
    } else {
      // Para produtos, também usar filename/thumbnail_filename
      const { product_id, filename, thumbnail_filename } = imageRecord;

      // Buscar store_id do produto
      const productResult = await pool.query(
        'SELECT store_id FROM products WHERE id = $1',
        [product_id]
      );

      if (productResult.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Produto não encontrado' 
        });
      }

      const store_id = productResult.rows[0].store_id;
      originalPath = path.join(process.cwd(), 'public', 'uploads', 'stores', store_id.toString(), 'products', product_id.toString(), filename);
      thumbnailPath = path.join(process.cwd(), 'public', 'uploads', 'stores', store_id.toString(), 'products', product_id.toString(), 'thumbnails', thumbnail_filename);
    }

    console.log(`🗑️ [UPLOAD-CONTROLLER] Deletando arquivos:`, { originalPath, thumbnailPath });

    // Função para deletar arquivo se existir
    const deleteFileIfExists = (filePath: string): boolean => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ [UPLOAD-CONTROLLER] Arquivo deletado: ${filePath}`);
        return true;
      }
      console.log(`⚠️ [UPLOAD-CONTROLLER] Arquivo não encontrado: ${filePath}`);
      return false;
    };

    // Excluir arquivos físicos
    const originalDeleted = deleteFileIfExists(originalPath);
    const thumbnailDeleted = deleteFileIfExists(thumbnailPath);

    // Remover do banco de dados
    const isPrimary = imageRecord.is_primary;

    if (type === 'store') {
      await pool.query('DELETE FROM store_images WHERE id = $1', [parseInt(id)]);

      // Se era primária, definir outra como primária
      if (isPrimary) {
        const result = await pool.query(
          'SELECT id FROM store_images WHERE store_id = $1 ORDER BY id DESC LIMIT 1',
          [imageRecord.store_id]
        );

        if (result.rows.length > 0) {
          await pool.query(
            'UPDATE store_images SET is_primary = true WHERE id = $1',
            [result.rows[0].id]
          );
        }
      }
    } else {
      await pool.query('DELETE FROM product_images WHERE id = $1', [parseInt(id)]);

      // Se era primária, definir outra como primária
      if (isPrimary) {
        const result = await pool.query(
          'SELECT id FROM product_images WHERE product_id = $1 ORDER BY id DESC LIMIT 1',
          [imageRecord.product_id]
        );

        if (result.rows.length > 0) {
          await pool.query(
            'UPDATE product_images SET is_primary = true WHERE id = $1',
            [result.rows[0].id]
          );
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
      message: 'Erro ao excluir imagem'
    });
  }
};