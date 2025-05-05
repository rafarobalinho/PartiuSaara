import { upload, processUploadedImages, deleteImage } from '../utils/imageUpload.js';
import express from 'express';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

/**
 * @route POST /api/upload/images
 * @desc Upload múltiplas imagens e retorna URLs otimizadas
 * @access Privado (apenas usuários autenticados)
 */
router.post('/images', authMiddleware, 
  // Middleware do multer para processar o upload (máximo 5 arquivos)
  upload.array('images', 5), 
  // Middleware customizado para processar e otimizar as imagens
  processUploadedImages,
  (req, res) => {
    try {
      // Se não houver imagens ou erro no processamento
      if (!req.processedImages) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nenhuma imagem foi enviada ou houve um erro no processamento.' 
        });
      }
      
      // Retorna os caminhos das imagens processadas
      return res.status(200).json({
        success: true,
        message: 'Imagens enviadas com sucesso',
        images: req.processedImages
      });
    } catch (error) {
      console.error('Erro ao finalizar upload:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro interno ao processar upload de imagens.' 
      });
    }
  }
);

/**
 * @route DELETE /api/upload/images
 * @desc Deleta uma imagem do servidor
 * @access Privado (apenas usuários autenticados)
 */
router.delete('/images', authMiddleware, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'URL da imagem não fornecida.'
      });
    }
    
    // Deleta a imagem e sua thumbnail
    const deleted = await deleteImage(imageUrl);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Imagem não encontrada ou erro ao excluir.'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Imagem excluída com sucesso.'
    });
  } catch (error) {
    console.error('Erro ao excluir imagem:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao excluir imagem.'
    });
  }
});

export default router;