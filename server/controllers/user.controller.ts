import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// Esquema de validação para atualização de usuário
const updateUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Formato de e-mail inválido'),
  password: z.string().optional()
});

// Esquema de validação para verificação de senha
const verifyPasswordSchema = z.object({
  password: z.string().min(1, 'Senha é obrigatória')
});

/**
 * Endpoint para verificação de senha atual
 */
export async function verifyPassword(req: Request, res: Response) {
  const requestId = Math.random().toString(36).substring(2, 10);
  console.log(`[User:${requestId}] Iniciando verificação de senha`);
  
  try {
    // Verificar se o usuário está autenticado
    if (!req.user) {
      console.warn(`[User:${requestId}] Usuário não autenticado`);
      return res.status(401).json({ message: 'Não autenticado' });
    }
    
    // Validar o corpo da requisição
    const validationResult = verifyPasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.warn(`[User:${requestId}] Dados inválidos:`, validationResult.error.errors);
      return res.status(400).json({ 
        message: 'Dados inválidos', 
        errors: validationResult.error.errors 
      });
    }
    
    const { password } = validationResult.data;
    
    // Verificar a senha
    const isValid = await storage.verifyUserPassword(req.user.id, password);
    
    console.log(`[User:${requestId}] Verificação de senha: ${isValid ? 'válida' : 'inválida'}`);
    
    if (isValid) {
      return res.status(200).json({ message: 'Senha verificada com sucesso' });
    } else {
      return res.status(401).json({ message: 'Senha incorreta' });
    }
    
  } catch (error) {
    console.error(`[User:${requestId}] Erro ao verificar senha:`, error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

/**
 * Endpoint para atualização de perfil do usuário
 */
export async function updateUser(req: Request, res: Response) {
  const requestId = Math.random().toString(36).substring(2, 10);
  console.log(`[User:${requestId}] Iniciando atualização de perfil`);
  
  try {
    // Verificar se o usuário está autenticado
    if (!req.user) {
      console.warn(`[User:${requestId}] Usuário não autenticado`);
      return res.status(401).json({ message: 'Não autenticado' });
    }
    
    // Validar o corpo da requisição
    const validationResult = updateUserSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.warn(`[User:${requestId}] Dados inválidos:`, validationResult.error.errors);
      return res.status(400).json({ 
        message: 'Dados inválidos', 
        errors: validationResult.error.errors 
      });
    }
    
    const { name, email, password } = validationResult.data;
    
    // Verificar se o email já está em uso por outro usuário
    if (email !== req.user.email) {
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && existingUser.id !== req.user.id) {
        console.warn(`[User:${requestId}] Email já em uso: ${email}`);
        return res.status(409).json({ message: 'Este email já está em uso' });
      }
    }
    
    // Construir objeto de atualização
    const updateData: {
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
    } = {};
    
    // Separar nome em firstName e lastName se fornecido
    if (name) {
      const nameParts = name.trim().split(' ');
      if (nameParts.length >= 2) {
        updateData.firstName = nameParts[0];
        updateData.lastName = nameParts.slice(1).join(' ');
      } else {
        updateData.firstName = name;
        // Se não houver sobrenome, manter o sobrenome atual
      }
    }
    
    if (email) {
      updateData.email = email;
    }
    
    if (password) {
      updateData.password = password;
    }
    
    // Atualizar o usuário
    const updatedUser = await storage.updateUser(req.user.id, updateData);
    
    if (!updatedUser) {
      console.error(`[User:${requestId}] Falha ao atualizar usuário: ${req.user.id}`);
      return res.status(500).json({ message: 'Erro ao atualizar perfil' });
    }
    
    console.log(`[User:${requestId}] Usuário atualizado com sucesso: ${updatedUser.id}`);
    
    // Retornar usuário atualizado (sem a senha)
    const { password: _, ...userWithoutPassword } = updatedUser;
    
    res.status(200).json({ 
      message: 'Perfil atualizado com sucesso', 
      user: userWithoutPassword 
    });
    
  } catch (error) {
    console.error(`[User:${requestId}] Erro ao atualizar perfil:`, error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

/**
 * Endpoint para obter o perfil do usuário atual
 */
export async function getCurrentUser(req: Request, res: Response) {
  const requestId = Math.random().toString(36).substring(2, 10);
  console.log(`[User:${requestId}] Obtendo dados do usuário atual`);
  
  try {
    // Verificar se o usuário está autenticado
    if (!req.user) {
      console.warn(`[User:${requestId}] Usuário não autenticado`);
      return res.status(401).json({ message: 'Não autenticado' });
    }
    
    // Obter estatísticas do usuário
    const stats = await storage.getUserStats(req.user.id);
    
    // Criar resposta com usuário e estatísticas
    const userWithStats = {
      ...req.user,
      stats
    };
    
    console.log(`[User:${requestId}] Dados do usuário obtidos com sucesso: ${req.user.id}`);
    res.status(200).json(userWithStats);
    
  } catch (error) {
    console.error(`[User:${requestId}] Erro ao obter dados do usuário:`, error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}