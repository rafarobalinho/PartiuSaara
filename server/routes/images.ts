/**
 * Rotas unificadas para acesso a imagens
 * Fornece endpoints consistentes para todos os tipos de imagens no sistema
 */

import { Request, Response, Router } from 'express';
import path from 'path';
import fs from 'fs';
import { pool, db } from '../db';
import { storeImages, productImages } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Endpoint para obter a imagem principal de uma loja
 */
router.get('/stores/:id/primary-image', async (req: Request, res: Response) => {
  try {
    const storeId = parseInt(req.params.id);
    
    // Buscar a imagem principal da loja no banco de dados
    const result = await db.select()
      .from(storeImages)
      .where(eq(storeImages.storeId, storeId))
      .limit(1);
    
    if (result.length === 0) {
      // Se não encontrar, enviar imagem padrão
      console.log(`Imagem não encontrada para loja ID: ${storeId}, usando imagem padrão`);
      return res.redirect('/assets/default-store-image.jpg');
    }
    
    // Obter o caminho da imagem
    const imagePath = result[0].imageUrl;
    
    // Verificar se o caminho começa com /uploads/
    if (imagePath.startsWith('/uploads/')) {
      // Remover a barra inicial para obter o caminho relativo à pasta public
      const relativePath = imagePath.substring(1);
      const fullPath = path.join(process.cwd(), 'public', relativePath);
      
      if (fs.existsSync(fullPath)) {
        // Servir o arquivo
        return res.sendFile(fullPath);
      } else {
        console.error(`Arquivo não encontrado: ${fullPath}`);
        return res.redirect('/assets/default-store-image.jpg');
      }
    } else {
      // Se o caminho não começa com /uploads/, redirecionar para o caminho como está
      return res.redirect(imagePath);
    }
  } catch (error) {
    console.error('Erro ao buscar imagem da loja:', error);
    return res.redirect('/assets/default-store-image.jpg');
  }
});

/**
 * Endpoint para obter a imagem principal de um produto
 */
router.get('/products/:id/primary-image', async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id);
    
    // Buscar a imagem principal do produto no banco de dados
    const result = await db.select()
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .limit(1);
    
    if (result.length === 0) {
      // Se não encontrar, enviar imagem padrão
      console.log(`Imagem não encontrada para produto ID: ${productId}, usando imagem padrão`);
      return res.redirect('/assets/default-product-image.jpg');
    }
    
    // Obter o caminho da imagem
    const imagePath = result[0].imageUrl;
    
    // Verificar se o caminho começa com /uploads/
    if (imagePath.startsWith('/uploads/')) {
      // Remover a barra inicial para obter o caminho relativo à pasta public
      const relativePath = imagePath.substring(1);
      const fullPath = path.join(process.cwd(), 'public', relativePath);
      
      if (fs.existsSync(fullPath)) {
        // Servir o arquivo
        return res.sendFile(fullPath);
      } else {
        console.error(`Arquivo não encontrado: ${fullPath}`);
        return res.redirect('/assets/default-product-image.jpg');
      }
    } else {
      // Se o caminho não começa com /uploads/, redirecionar para o caminho como está
      return res.redirect(imagePath);
    }
  } catch (error) {
    console.error('Erro ao buscar imagem do produto:', error);
    return res.redirect('/assets/default-product-image.jpg');
  }
});

/**
 * Endpoint para verificar e redirecionar imagens de upload por timestamp e ID
 */
router.get('/check-image/:timestamp/:id', async (req: Request, res: Response) => {
  try {
    const { timestamp, id } = req.params;
    const filename = `${timestamp}-${id}.jpg`;
    
    // Verificar no diretório de uploads
    const uploadPath = path.join(process.cwd(), 'public/uploads', filename);
    
    if (fs.existsSync(uploadPath)) {
      // Servir o arquivo
      return res.sendFile(uploadPath);
    } else {
      console.log(`Arquivo não encontrado: ${uploadPath}`);
      // Imagem não encontrada, enviar imagem padrão
      return res.redirect('/assets/default-image.jpg');
    }
  } catch (error) {
    console.error('Erro ao verificar imagem:', error);
    return res.redirect('/assets/default-image.jpg');
  }
});

/**
 * Endpoint para diagnóstico de arquivos no diretório de uploads
 * Somente acessível por usuários admin
 */
router.get('/admin/uploads-diagnostic', async (req: Request, res: Response) => {
  try {
    const uploadsDir = path.join(process.cwd(), 'public/uploads');
    const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
    const originalsDir = path.join(uploadsDir, 'originals');
    
    // Verificar se o diretório existe
    if (!fs.existsSync(uploadsDir)) {
      return res.json({
        success: false,
        error: 'Diretório de uploads não encontrado',
        path: uploadsDir
      });
    }
    
    // Listar arquivos
    const files = fs.readdirSync(uploadsDir).filter(f => !fs.statSync(path.join(uploadsDir, f)).isDirectory());
    
    // Agrupar arquivos por tipo
    const jpgFiles = files.filter(f => f.toLowerCase().endsWith('.jpg'));
    const pngFiles = files.filter(f => f.toLowerCase().endsWith('.png'));
    const otherFiles = files.filter(f => !f.toLowerCase().endsWith('.jpg') && !f.toLowerCase().endsWith('.png'));
    
    // Verificar diretórios de thumbnails e originals
    const thumbnailExists = fs.existsSync(thumbnailsDir);
    const thumbnailFiles = thumbnailExists ? fs.readdirSync(thumbnailsDir) : [];
    
    const originalsExists = fs.existsSync(originalsDir);
    const originalsFiles = originalsExists ? fs.readdirSync(originalsDir) : [];
    
    // Verificar referências no banco de dados
    const storeImagesResult = await db.select().from(storeImages);
    const productImagesResult = await db.select().from(productImages);
    
    // Mapear arquivos para registros no banco
    const mappedStoreImages = storeImagesResult.map(row => {
      const filename = row.imageUrl?.split('/').pop() || '';
      const exists = files.includes(filename);
      return {
        id: row.id,
        storeId: row.storeId,
        filename,
        path: row.imageUrl,
        exists
      };
    });
    
    const mappedProductImages = productImagesResult.map(row => {
      const filename = row.imageUrl?.split('/').pop() || '';
      const exists = files.includes(filename);
      return {
        id: row.id,
        productId: row.productId,
        filename,
        path: row.imageUrl,
        exists
      };
    });
    
    // Verificar permissões
    const stats = fs.statSync(uploadsDir);
    
    return res.json({
      success: true,
      directories: {
        uploads: {
          path: uploadsDir,
          exists: true,
          permissions: stats.mode.toString(8),
          fileCount: files.length,
        },
        thumbnails: {
          path: thumbnailsDir,
          exists: thumbnailExists,
          fileCount: thumbnailFiles.length,
        },
        originals: {
          path: originalsDir,
          exists: originalsExists,
          fileCount: originalsFiles.length,
        }
      },
      files: {
        total: files.length,
        jpg: jpgFiles.length,
        png: pngFiles.length,
        other: otherFiles.length,
        samples: files.slice(0, 10)
      },
      database: {
        storeImages: storeImagesResult.length,
        productImages: productImagesResult.length,
        storeImagesSamples: mappedStoreImages.slice(0, 5),
        productImagesSamples: mappedProductImages.slice(0, 5),
        missingStoreImages: mappedStoreImages.filter(img => !img.exists).length,
        missingProductImages: mappedProductImages.filter(img => !img.exists).length
      },
      detailedFiles: {
        missingStoreImages: mappedStoreImages.filter(img => !img.exists).slice(0, 5),
        missingProductImages: mappedProductImages.filter(img => !img.exists).slice(0, 5),
      }
    });
  } catch (error) {
    console.error('Erro no diagnóstico de uploads:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao realizar diagnóstico',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;