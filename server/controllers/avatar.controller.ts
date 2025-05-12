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
    
    // Criar diretório temporário para processamento
    const tempDir = path.join(process.cwd(), 'public', 'uploads', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Copiar o arquivo original para um local temporário para evitar conflito
    const tempFilePath = path.join(tempDir, `temp-${filename}`);
    fs.copyFileSync(originalPath, tempFilePath);
    
    // Processar a imagem a partir do arquivo temporário
    const { originalPath: optimizedPath, thumbnailPath } = await processImage(tempFilePath, 400, 100);
    
    // Definir caminhos finais
    const finalOptimizedPath = path.join(avatarDir, filename);
    const finalThumbnailPath = path.join(avatarDir, 'thumbnails', filename);
    
    // Mover as imagens processadas para os diretórios corretos
    if (!fs.existsSync(path.dirname(finalOptimizedPath))) {
      fs.mkdirSync(path.dirname(finalOptimizedPath), { recursive: true });
    }
    if (!fs.existsSync(path.dirname(finalThumbnailPath))) {
      fs.mkdirSync(path.dirname(finalThumbnailPath), { recursive: true });
    }
    
    fs.copyFileSync(optimizedPath, finalOptimizedPath);
    fs.copyFileSync(thumbnailPath, finalThumbnailPath);
    
    // Limpar arquivos temporários
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    if (fs.existsSync(optimizedPath)) {
      fs.unlinkSync(optimizedPath);
    }
    if (fs.existsSync(thumbnailPath)) {
      fs.unlinkSync(thumbnailPath);
    }
    
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