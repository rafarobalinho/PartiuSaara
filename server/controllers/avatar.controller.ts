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
    
    // Utilizar o novo processamento seguro de imagens com diretórios isolados
    // Definimos o tipo "user" e o entityId como o ID do usuário
    console.log(`Processando avatar para usuário ${userId}...`);
    
    // Processar a imagem usando o novo método que cria diretórios isolados
    const { imageUrl, thumbnailUrl } = await processImage(originalPath, 'user', userId, 400, 100);
    
    console.log(`Avatar processado: ${imageUrl}, ${thumbnailUrl}`);
    
    // Obter o avatar atual para remover depois
    const currentUser = await storage.getUser(userId);
    
    // Atualizar o usuário no banco de dados
    await storage.updateUserAvatar(userId, imageUrl, thumbnailUrl);
    
    // Remover o avatar antigo se existir
    if (currentUser?.avatarUrl) {
      const oldAvatarPath = path.join(process.cwd(), 'public', currentUser.avatarUrl);
      if (fs.existsSync(oldAvatarPath)) {
        try {
          fs.unlinkSync(oldAvatarPath);
          console.log(`Avatar antigo removido: ${oldAvatarPath}`);
        } catch (e) {
          console.log(`Não foi possível remover avatar antigo: ${e.message}`);
        }
      }
    }
    
    if (currentUser?.avatarThumbnailUrl) {
      const oldThumbnailPath = path.join(process.cwd(), 'public', currentUser.avatarThumbnailUrl);
      if (fs.existsSync(oldThumbnailPath)) {
        try {
          fs.unlinkSync(oldThumbnailPath);
          console.log(`Thumbnail antigo removido: ${oldThumbnailPath}`);
        } catch (e) {
          console.log(`Não foi possível remover thumbnail antigo: ${e.message}`);
        }
      }
    }
    
    return res.status(200).json({ 
      message: 'Avatar atualizado com sucesso',
      avatarUrl: imageUrl, 
      avatarThumbnailUrl: thumbnailUrl 
    });
    
  } catch (error) {
    console.error('Erro ao processar upload de avatar:', error);
    return res.status(500).json({ message: 'Erro ao processar o avatar' });
  }
};