/**
 * Controlador para funções relacionadas a usuários administrativos
 * Responsável por gerenciar os administradores do sistema
 */

import { Request, Response } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../utils/auth';

/**
 * Promover um usuário existente para administrador
 * Requer autenticação e privilégios administrativos
 */
export async function promoteUserToAdmin(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const id = parseInt(userId);

    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID de usuário inválido' });
    }

    // Verificar se o usuário existe
    const user = await db.query.users.findFirst({
      where: eq(users.id, id)
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Promover para administrador
    await db
      .update(users)
      .set({ role: 'admin' })
      .where(eq(users.id, id));

    res.json({
      success: true,
      message: 'Usuário promovido para administrador com sucesso'
    });
  } catch (error) {
    console.error('Error promoting user to admin:', error);
    res.status(500).json({ message: 'Erro ao promover usuário para administrador' });
  }
}

/**
 * Criar um novo usuário administrador diretamente
 * Requer autenticação e privilégios administrativos
 */
export async function createAdminUser(req: Request, res: Response) {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    // Verificações básicas
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        message: 'Dados incompletos. Email, senha, nome e sobrenome são obrigatórios.' 
      });
    }

    // Verificar se o email já está em uso
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email já está em uso' });
    }

    // Hash da senha
    const hashedPassword = await hashPassword(password);

    // Criar o usuário admin
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Remover senha do objeto de resposta
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      message: 'Administrador criado com sucesso',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ message: 'Erro ao criar usuário administrador' });
  }
}

/**
 * Listar todos os administradores
 * Requer autenticação e privilégios administrativos
 */
export async function listAdminUsers(req: Request, res: Response) {
  try {
    const adminUsers = await db.query.users.findMany({
      where: eq(users.role, 'admin'),
      columns: {
        password: false, // Excluir o campo de senha
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ adminUsers });
  } catch (error) {
    console.error('Error listing admin users:', error);
    res.status(500).json({ message: 'Erro ao listar usuários administradores' });
  }
}

/**
 * Verificar se já existe um usuário administrador no sistema
 * Útil para inicialização/configuração
 */
export async function checkForAdminUsers(req: Request, res: Response) {
  try {
    const count = await db.query.users.findMany({
      where: eq(users.role, 'admin'),
      columns: {
        id: true
      }
    });

    res.json({ 
      hasAdmins: count.length > 0,
      count: count.length
    });
  } catch (error) {
    console.error('Error checking for admin users:', error);
    res.status(500).json({ message: 'Erro ao verificar usuários administradores' });
  }
}

/**
 * Inicializar o primeiro administrador se não existir nenhum
 * Esta função deve ser protegida por código secreto em produção
 */
export async function initializeAdminUser(req: Request, res: Response) {
  try {
    // Verificar se já existe algum admin
    const existingAdmins = await db.query.users.findMany({
      where: eq(users.role, 'admin'),
      columns: {
        id: true
      }
    });

    if (existingAdmins.length > 0) {
      return res.status(400).json({ 
        message: 'Operação não permitida. Já existem administradores cadastrados.',
        count: existingAdmins.length
      });
    }

    const { email, password, firstName, lastName, secretCode } = req.body;
    
    // Verificar código secreto (em produção, use variável de ambiente)
    const ADMIN_INIT_CODE = 'PartSaara2023!';
    if (secretCode !== ADMIN_INIT_CODE) {
      return res.status(403).json({ message: 'Código secreto inválido' });
    }

    // Verificações básicas
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        message: 'Dados incompletos. Email, senha, nome e sobrenome são obrigatórios.' 
      });
    }

    // Verificar se o email já existe
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email já está em uso' });
    }

    // Hash da senha
    const hashedPassword = await hashPassword(password);

    // Criar o primeiro admin
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Remover senha do objeto de resposta
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      message: 'Primeiro administrador inicializado com sucesso',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error initializing admin user:', error);
    res.status(500).json({ message: 'Erro ao inicializar usuário administrador' });
  }
}