import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// User registration schema
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'not_specified']).optional(),
  role: z.enum(['customer', 'seller']).default('customer')
});

// User login schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export async function register(req: Request, res: Response) {
  try {
    // Validate request body
    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: validationResult.error.errors 
      });
    }

    const userData = validationResult.data;

    // Check if email already exists
    const existingEmail = await storage.getUserByEmail(userData.email);
    if (existingEmail) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    // Hash the password before storing it
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    // Create the user with new fields
    const user = await storage.createUser({
      email: userData.email,
      password: hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
      dateOfBirth: userData.dateOfBirth,
      gender: userData.gender,
      role: userData.role
    });

    // Set user session
    req.session.userId = user.id;

    // Salvar a sessão explicitamente para garantir persistência
    req.session.save(err => {
      if (err) {
        console.error('Erro ao salvar sessão após registro:', err);
        return res.status(500).json({ message: 'Erro ao completar o registro' });
      }

      res.status(201).json({ 
        message: 'User registered successfully', 
        user: { 
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          dateOfBirth: user.dateOfBirth,
          gender: user.gender,
          role: user.role
        } 
      });
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function login(req: Request, res: Response) {
  const requestId = Math.random().toString(36).substring(2, 10);
  console.log(`[Auth:${requestId}] Tentativa de login iniciada`);

  try {
    // Definir Content-Type para garantir resposta JSON
    res.setHeader('Content-Type', 'application/json');

    // Verificar headers e cookies para diagnóstico
    console.log(`[Auth:${requestId}] Headers da requisição:`, {
      contentType: req.headers['content-type'],
      accept: req.headers['accept'],
      cookie: req.headers.cookie ? 'Presente' : 'Ausente'
    });

    // Validate request body
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.warn(`[Auth:${requestId}] Erro de validação:`, validationResult.error.errors);
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: validationResult.error.errors 
      });
    }

    const { email, password } = validationResult.data;
    console.log(`[Auth:${requestId}] Tentando login para email: ${email}`);

    // Find user by email
    const user = await storage.getUserByEmail(email);
    console.log(`[Auth:${requestId}] Usuário encontrado: ${!!user}`);

    if (!user) {
      return res.status(401).json({ message: 'Email ou senha inválidos' });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);
    console.log(`[Auth:${requestId}] Senha válida: ${passwordValid}`);

    if (!passwordValid) {
      return res.status(401).json({ message: 'Email ou senha inválidos' });
    }

    // Verificar se o objeto de sessão está disponível
    if (!req.session) {
      console.error(`[Auth:${requestId}] ERRO CRÍTICO: Objeto de sessão não disponível`);
      return res.status(500).json({ message: 'Erro na inicialização da sessão' });
    }

    // Set user session e garantir que seja salva no banco de dados
    req.session.userId = user.id;
    console.log(`[Auth:${requestId}] ID do usuário ${user.id} armazenado na sessão. Session ID: ${req.sessionID}`);

    // Salvar a sessão explicitamente para garantir persistência
    req.session.save(err => {
      if (err) {
        console.error(`[Auth:${requestId}] Erro ao salvar sessão:`, err);
        return res.status(500).json({ message: 'Erro ao realizar login' });
      }

      console.log(`[Auth:${requestId}] Sessão salva com sucesso`);

      // Remover a senha do objeto de usuário
      const { password, ...userWithoutPassword } = user;

      // Retornar com usuário logado após a sessão ser salva
      console.log(`[Auth:${requestId}] Login bem-sucedido para ${email}`);
      res.json({ 
        message: 'Login bem-sucedido', 
        user: userWithoutPassword
      });
    });

  } catch (error) {
    console.error(`[Auth:${requestId}] Erro no login:`, error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

export async function logout(req: Request, res: Response) {
  const requestId = Math.random().toString(36).substring(2, 10);
  console.log(`[Auth:${requestId}] Iniciando logout`);

  try {
    // Definir Content-Type para garantir resposta JSON
    res.setHeader('Content-Type', 'application/json');

    // Verificar estado da sessão antes de destruí-la
    console.log(`[Auth:${requestId}] Dados da sessão antes do logout:`, {
      sessionID: req.sessionID || 'Indisponível',
      userId: req.session?.userId || 'Indisponível',
      hasCookies: !!req.headers.cookie
    });

    if (!req.session) {
      console.warn(`[Auth:${requestId}] Sessão já não existe`);
      res.clearCookie('partiu.sid');
      return res.json({ message: 'Logout successful (no session found)' });
    }

    req.session.destroy((err: Error | null) => {
      if (err) {
        console.error(`[Auth:${requestId}] Erro destruindo sessão:`, err);
        return res.status(500).json({ message: 'Failed to logout' });
      }

      console.log(`[Auth:${requestId}] Sessão destruída com sucesso`);

      // Obter as configurações de cookie usadas na sessão para garantir limpeza correta
      const isProduction = process.env.NODE_ENV === 'production';
      const domain = process.env.COOKIE_DOMAIN || undefined;

      // Limpar cookie com as mesmas configurações usadas para criá-lo
      res.clearCookie('partiu.sid', {
        path: '/',
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        domain: domain
      });

      console.log(`[Auth:${requestId}] Cookie limpo. Logout concluído.`);
      res.json({ message: 'Logout successful' });
    });

  } catch (error) {
    console.error(`[Auth:${requestId}] Erro no logout:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getCurrentUser(req: Request, res: Response) {
  const requestId = Math.random().toString(36).substring(2, 10);
  console.log(`[Auth:${requestId}] Verificando usuário atual`);

  try {
    // Definir Content-Type para garantir resposta JSON
    res.setHeader('Content-Type', 'application/json');

    // Verificar estado da sessão
    console.log(`[Auth:${requestId}] Detalhes da sessão ao verificar usuário:`, {
      sessionID: req.sessionID || 'Indisponível',
      userId: req.session?.userId || 'Indisponível',
      hasCookies: !!req.headers.cookie,
      hasUser: !!req.user
    });

    // User is already set in req.user by the auth middleware
    if (!req.user) {
      console.warn(`[Auth:${requestId}] Usuário não autenticado em /auth/me`);
      return res.status(401).json({ message: 'Not authenticated' });
    }

    console.log(`[Auth:${requestId}] Usuário autenticado encontrado: ${req.user.id}`);
    res.json(req.user);

  } catch (error) {
    console.error(`[Auth:${requestId}] Erro ao obter usuário atual:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function verify(req: Request, res: Response) {
  try {
    // Definir Content-Type para garantir resposta JSON
    res.setHeader('Content-Type', 'application/json');

    // Verificar se o usuário está autenticado através do middleware
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Não autenticado',
        isValid: false 
      });
    }

    // Se chegou até aqui, o usuário é válido (passou pelo authMiddleware)
    res.json({
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      isValid: true
    });
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      isValid: false 
    });
  }
}