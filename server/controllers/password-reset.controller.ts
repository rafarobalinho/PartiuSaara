
import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Schema for password reset request
const requestResetSchema = z.object({
  email: z.string().email('Email inválido'),
});

// Schema for password reset confirmation
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

// Create email transporter
async function createEmailTransporter() {
  // If we have Gmail credentials, use them
  if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    });
  }
  
  // For development, create a test account with Ethereal Email
  try {
    const testAccount = await nodemailer.createTestAccount();
    
    console.log('📧 Usando conta de teste Ethereal Email:');
    console.log(`   User: ${testAccount.user}`);
    console.log(`   Pass: ${testAccount.pass}`);
    
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  } catch (error) {
    console.error('Erro ao criar conta de teste:', error);
    throw error;
  }
}

// Send password reset email
async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password?token=${token}`;
  
  // Log for debugging
  console.log('=== ENVIANDO EMAIL DE RECUPERAÇÃO ===');
  console.log(`Para: ${email}`);
  console.log(`Link de recuperação: ${resetUrl}`);
  console.log('=====================================');
  
  try {
    const transporter = await createEmailTransporter();
    
    const mailOptions = {
      from: `"Partiu Saara" <${process.env.EMAIL_USER || 'noreply@partiusaara.com'}>`,
      to: email,
      subject: 'Recuperação de Senha - Partiu Saara',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Recuperação de Senha</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Recuperação de Senha</h1>
            </div>
            <div class="content">
              <h2>Olá!</h2>
              <p>Você solicitou a recuperação de sua senha no <strong>Partiu Saara</strong>.</p>
              <p>Clique no botão abaixo para redefinir sua senha:</p>
              <a href="${resetUrl}" class="button">Redefinir Senha</a>
              <p>Ou copie e cole este link no seu navegador:</p>
              <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 4px;">${resetUrl}</p>
              <p><strong>Este link expira em 1 hora.</strong></p>
              <p>Se você não solicitou esta recuperação, pode ignorar este email com segurança.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Partiu Saara. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Recuperação de Senha - Partiu Saara
        
        Olá!
        
        Você solicitou a recuperação de sua senha no Partiu Saara.
        
        Acesse o link abaixo para redefinir sua senha:
        ${resetUrl}
        
        Este link expira em 1 hora.
        
        Se você não solicitou esta recuperação, pode ignorar este email com segurança.
        
        © ${new Date().getFullYear()} Partiu Saara. Todos os direitos reservados.
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de recuperação enviado com sucesso!');
    
    // If using Ethereal (test), show preview URL
    if (info.messageId && !process.env.EMAIL_USER) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('🔗 Preview do email (Ethereal): ' + previewUrl);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao enviar email de recuperação:', error);
    
    // Fall back to console logging for development
    console.log('=== FALLBACK: EMAIL DE RECUPERAÇÃO (CONSOLE) ===');
    console.log(`Para: ${email}`);
    console.log(`Link de recuperação: ${resetUrl}`);
    console.log('Este link expira em 1 hora');
    console.log('================================================');
    
    // Still return true so the user gets the success message
    // In production, you might want to return false and show an error
    return true;
  }
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
