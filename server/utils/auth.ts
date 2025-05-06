/**
 * Utilitários para autenticação
 */

import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

// Promisifica a função scrypt para uso com async/await
const scryptAsync = promisify(scrypt);

/**
 * Cria um hash seguro para uma senha
 * @param password Senha em texto puro
 * @returns Hash da senha com salt para armazenamento seguro
 */
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

/**
 * Compara uma senha em texto puro com uma senha hasheada
 * @param supplied Senha fornecida em texto puro
 * @param stored Hash da senha armazenada
 * @returns Booleano indicando se a senha está correta
 */
export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split('.');
  const hashedBuf = Buffer.from(hashed, 'hex');
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}