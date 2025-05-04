import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// User registration schema
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z.string().min(2, 'Username must be at least 2 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
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
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      name: userData.name,
      role: userData.role
    });
    
    // Set user session
    req.session.userId = user.id;
    
    res.status(201).json({ 
      message: 'User registered successfully', 
      user: { 
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role
      } 
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    // Validate request body
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: validationResult.error.errors 
      });
    }
    
    const { email, password } = validationResult.data;
    
    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Email ou senha inválidos' });
    }
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ message: 'Email ou senha inválidos' });
    }
    
    // Set user session
    req.session.userId = user.id;
    
    res.json({ 
      message: 'Login bem-sucedido', 
      user: { 
        id: user.id, 
        email: user.email, 
        username: user.username,
        name: user.name,
        role: user.role 
      } 
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    req.session.destroy((err: Error | null) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ message: 'Failed to logout' });
      }
      
      res.clearCookie('connect.sid');
      res.json({ message: 'Logout successful' });
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getCurrentUser(req: Request, res: Response) {
  try {
    // User is already set in req.user by the auth middleware
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    res.json(req.user);
    
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
