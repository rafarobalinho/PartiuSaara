import { Request, Response } from 'express';
import path from 'path';
import { imageUpload, processImage } from '../utils/imageUpload';
import fs from 'fs';
import { storage } from '../storage';

/**
 * Middleware para uploads de avatar
 */
export const uploadAvatarMiddleware = imageUpload.single('avatar');

/**
 * Cria o diretório de avatares se não existir
 */
function ensureAvatarDirExists(): void {
  const avatarDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
  const avatarThumbnailDir = path.join(process.cwd(), 'public', 'uploads', 'avatars', 'thumbnails');
  
  if (!fs.existsSync(avatarDir)) {
    fs.mkdirSync(avatarDir, { recursive: true });
  }
  
  if (!fs.existsSync(avatarThumbnailDir)) {
    fs.mkdirSync(avatarThumbnailDir, { recursive: true });
  }
}

/**
 * Upload e processamento de avatar
 */
export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    ensureAvatarDirExists();
    
    // Verificar se existe um arquivo enviado
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    }

    // Obter o ID do usuário autenticado
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    
    // Obter informações do arquivo
    const originalPath = req.file.path;
    const filename = `avatar-${userId}-${Date.now()}${path.extname(req.file.originalname)}`;
    
    // Definir caminhos para as versões de imagem
    const avatarDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    const destinationPath = path.join(avatarDir, filename);
    
    // Processar a imagem (redimensionar e criar thumbnail)
    const { optimizedPath, thumbnailPath } = await processImage(originalPath, 400, 100);
    
    // Mover as imagens processadas para os diretórios corretos
    const finalOptimizedPath = path.join(avatarDir, filename);
    const finalThumbnailPath = path.join(avatarDir, 'thumbnails', filename);
    
    fs.renameSync(optimizedPath, finalOptimizedPath);
    fs.renameSync(thumbnailPath, finalThumbnailPath);
    
    // Remover o arquivo original
    if (fs.existsSync(originalPath)) {
      fs.unlinkSync(originalPath);
    }
    
    // URLs para salvar no banco de dados
    const avatarUrl = `/uploads/avatars/${filename}`;
    const avatarThumbnailUrl = `/uploads/avatars/thumbnails/${filename}`;
    
    // Obter o avatar atual para remover depois
    const currentUser = await storage.getUser(userId);
    
    // Atualizar o usuário no banco de dados
    await storage.updateUserAvatar(userId, avatarUrl, avatarThumbnailUrl);
    
    // Remover o avatar antigo se existir
    if (currentUser?.avatarUrl) {
      const oldAvatarPath = path.join(process.cwd(), 'public', currentUser.avatarUrl);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }
    
    if (currentUser?.avatarThumbnailUrl) {
      const oldThumbnailPath = path.join(process.cwd(), 'public', currentUser.avatarThumbnailUrl);
      if (fs.existsSync(oldThumbnailPath)) {
        fs.unlinkSync(oldThumbnailPath);
      }
    }
    
    return res.status(200).json({ 
      message: 'Avatar atualizado com sucesso',
      avatarUrl, 
      avatarThumbnailUrl 
    });
    
  } catch (error) {
    console.error('Erro ao processar upload de avatar:', error);
    return res.status(500).json({ message: 'Erro ao processar o avatar' });
  }
};