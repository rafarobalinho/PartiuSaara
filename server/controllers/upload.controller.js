import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { imageUpload } from '../utils/imageUpload.js';

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
    // Verifica se o usuário está autenticado
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: 'Não autorizado. Faça login para continuar.' });
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
          
          // Caminho para o thumbnail (versão otimizada)
          const thumbnailPath = `/uploads/thumbnails/${filename}`;
          
          return {
            originalName: file.originalname,
            imageUrl: thumbnailPath, // Retorna o caminho do thumbnail para uso na aplicação
            size: file.size,
            mimetype: file.mimetype
          };
        });

        // Salva as imagens no banco de dados (opcional)
        // Aqui você pode adicionar a lógica para salvar os caminhos no banco de dados
        // e relacioná-los ao usuário, produto, loja, etc.

        return res.status(200).json({
          success: true,
          message: 'Imagens enviadas com sucesso',
          images: processedImages
        });
      } catch (error) {
        console.error('Erro ao processar as imagens:', error);
        return res.status(500).json({ success: false, message: 'Erro ao processar as imagens' });
      }
    });
  } catch (error) {
    console.error('Erro no servidor durante upload:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

/**
 * @route DELETE /api/upload/images
 * @desc Deleta uma imagem do servidor
 * @access Privado (apenas usuários autenticados)
 */
export const deleteImage = async (req, res) => {
  try {
    // Verifica se o usuário está autenticado
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: 'Não autorizado. Faça login para continuar.' });
    }

    // Obtém a URL da imagem do corpo da requisição
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'URL da imagem não fornecida' });
    }

    // Extrai o nome do arquivo da URL
    const filename = path.basename(imageUrl);
    
    // Constrói os caminhos para a imagem original e o thumbnail
    const thumbnailPath = path.join(rootDir, 'public', 'uploads', 'thumbnails', filename);
    const originalPath = path.join(rootDir, 'public', 'uploads', filename);

    // Verifica se os arquivos existem e os exclui
    const deleteFileIfExists = (filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    };

    const thumbnailDeleted = deleteFileIfExists(thumbnailPath);
    const originalDeleted = deleteFileIfExists(originalPath);

    if (!thumbnailDeleted && !originalDeleted) {
      return res.status(404).json({ success: false, message: 'Imagem não encontrada' });
    }

    // Aqui você pode adicionar lógica para remover a referência da imagem no banco de dados
    // por exemplo, remover o registro da tabela de imagens de produtos ou lojas

    return res.status(200).json({
      success: true,
      message: 'Imagem excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir imagem:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};