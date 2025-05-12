import { Request, Response } from 'express';
import { storage } from '../storage';
import { imageUpload } from '../utils/imageUpload';
import fs from 'fs';
import path from 'path';

/**
 * Endpoint para atualização do avatar do usuário
 */
export async function updateUserAvatar(req: Request, res: Response) {
  try {
    // ID do usuário autenticado
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuário não autenticado' 
      });
    }
    
    // Verificar se o diretório do usuário existe, se não, criar
    const userDir = path.join(process.cwd(), 'public', 'uploads', 'users', userId.toString());
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    // Usar o middleware de upload existente para manter compatibilidade
    imageUpload.single('avatar')(req, res, async (err) => {
      if (err) {
        console.error('Erro no upload de avatar:', err);
        return res.status(400).json({ 
          success: false, 
          message: 'Erro no upload da imagem: ' + err.message 
        });
      }
      
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nenhuma imagem enviada' 
        });
      }
      
      try {
        // Processar a imagem usando o sistema existente
        const fullPath = req.file.path;
        const filename = path.basename(fullPath);
        const fileNameWithoutExt = path.basename(filename, path.extname(filename));
        
        // Definir caminhos para as imagens processadas
        const thumbnailPath = `/uploads/users/${userId}/thumb-${fileNameWithoutExt}.jpg`;
        const originalPath = `/uploads/users/${userId}/${fileNameWithoutExt}.jpg`;
        
        // Mover os arquivos para o diretório do usuário se necessário
        const targetThumbPath = path.join(process.cwd(), 'public', thumbnailPath);
        const targetOriginalPath = path.join(process.cwd(), 'public', originalPath);
        
        // Garantir que os arquivos estejam no local correto
        if (fs.existsSync(path.join(process.cwd(), 'public', 'uploads', `${fileNameWithoutExt}.jpg`))) {
          fs.renameSync(
            path.join(process.cwd(), 'public', 'uploads', `${fileNameWithoutExt}.jpg`),
            targetOriginalPath
          );
        }
        
        if (fs.existsSync(path.join(process.cwd(), 'public', 'uploads', 'thumbnails', `${fileNameWithoutExt}.jpg`))) {
          fs.renameSync(
            path.join(process.cwd(), 'public', 'uploads', 'thumbnails', `${fileNameWithoutExt}.jpg`),
            targetThumbPath
          );
        }
        
        // Atualizar o avatar do usuário no banco de dados
        await storage.updateUser(userId, {
          avatarUrl: originalPath,
          avatarThumbnailUrl: thumbnailPath
        });
        
        // Retornar sucesso com os caminhos das imagens
        return res.json({
          success: true,
          message: 'Avatar atualizado com sucesso',
          avatar: {
            url: originalPath,
            thumbnailUrl: thumbnailPath
          }
        });
      } catch (error) {
        console.error('Erro ao processar o avatar:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Erro ao processar o avatar',
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar avatar:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
}