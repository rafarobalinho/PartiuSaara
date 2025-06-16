
import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Schema for password reset request
const requestResetSchema = z.object({
  email: z.string().email('Email inválido'),
});

// Schema for password reset confirmation
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

// Simulate email sending (in production, use a real email service)
async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/auth/reset-password?token=${token}`;
  
  // For development, just log the reset link
  console.log('=== EMAIL DE RECUPERAÇÃO DE SENHA ===');
  console.log(`Para: ${email}`);
  console.log(`Link de recuperação: ${resetUrl}`);
  console.log('Este link expira em 1 hora');
  console.log('=====================================');
  
  // TODO: In production, replace this with actual email sending logic
  // Examples: SendGrid, AWS SES, Nodemailer, etc.
  
  return true;
}

export async function requestPasswordReset(req: Request, res: Response) {
  try {
    const validationResult = requestResetSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Dados inválidos', 
        errors: validationResult.error.errors 
      });
    }

    const { email } = validationResult.data;

    // Check if user exists
    const user = await storage.getUserByEmail(email);
    
    // Always return success for security (don't reveal if email exists)
    if (!user) {
      return res.json({ 
        message: 'Se o email existir em nosso sistema, você receberá um link de recuperação em breve.' 
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Save token to database
    await storage.createPasswordResetToken(user.id, token, expiresAt);

    // Send email with reset link
    await sendPasswordResetEmail(email, token);

    res.json({ 
      message: 'Se o email existir em nosso sistema, você receberá um link de recuperação em breve.' 
    });

  } catch (error) {
    console.error('Error in password reset request:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const validationResult = resetPasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Dados inválidos', 
        errors: validationResult.error.errors 
      });
    }

    const { token, password } = validationResult.data;

    // Get and validate token
    const resetToken = await storage.getPasswordResetToken(token);
    if (!resetToken) {
      return res.status(400).json({ 
        message: 'Token inválido ou expirado' 
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password
    const updateSuccess = await storage.updateUserPassword(resetToken.userId, hashedPassword);
    if (!updateSuccess) {
      return res.status(500).json({ 
        message: 'Erro ao atualizar a senha' 
      });
    }

    // Mark token as used
    await storage.markTokenAsUsed(token);

    res.json({ 
      message: 'Senha redefinida com sucesso! Você pode fazer login com sua nova senha.' 
    });

  } catch (error) {
    console.error('Error in password reset:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

export async function validateResetToken(req: Request, res: Response) {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Token não fornecido' 
      });
    }

    const resetToken = await storage.getPasswordResetToken(token);
    
    if (!resetToken) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Token inválido ou expirado' 
      });
    }

    res.json({ 
      valid: true, 
      message: 'Token válido' 
    });

  } catch (error) {
    console.error('Error validating reset token:', error);
    res.status(500).json({ 
      valid: false, 
      message: 'Erro interno do servidor' 
    });
  }
}
