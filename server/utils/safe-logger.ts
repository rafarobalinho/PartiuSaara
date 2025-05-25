
/**
 * Utilitário para logging seguro que reduz informações sensíveis
 */

// Determinar se estamos em ambiente de produção
const isProduction = process.env.NODE_ENV === 'production';

// Lista de chaves sensíveis que devem ser ocultadas nos logs
const SENSITIVE_KEYS = [
  'password', 'token', 'secret', 'key', 'auth', 'credential', 'pin', 'ssn', 'credit', 'card'
];

/**
 * Verifica se uma chave é sensível e deve ser mascarada
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.some(sensitiveKey => 
    key.toLowerCase().includes(sensitiveKey.toLowerCase())
  );
}

/**
 * Mascara valores sensíveis
 */
function maskSensitiveValue(value: any): string {
  if (!value) return value;
  
  if (typeof value === 'string') {
    if (value.length <= 8) return '***';
    return value.substring(0, 4) + '***' + value.substring(value.length - 4);
  }
  
  return '***';
}

/**
 * Processa um objeto recursivamente para mascarar valores sensíveis
 */
function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = maskSensitiveValue(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Função de log seguro que mascara informações sensíveis
 */
export default function safeLog(message: string, data?: any): void {
  const sanitizedData = data ? sanitizeObject(data) : undefined;
  
  if (isProduction) {
    // Em produção, usamos um formato mais limpo sem stacktraces
    console.log(`${message}${sanitizedData ? `: ${JSON.stringify(sanitizedData)}` : ''}`);
  } else {
    // Em desenvolvimento, mais detalhes para debug
    console.log(`🔒 ${message}`, sanitizedData || '');
  }
}
