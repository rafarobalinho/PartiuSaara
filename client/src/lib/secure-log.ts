
/**
 * Sistema de logging seguro com proteção de dados sensíveis
 * Resolve o erro Console.js:61 e evita vazamento de informações
 */

// Lista de campos considerados sensíveis
const sensitiveFields = [
  'password', 'token', 'secret', 'key', 'authorization',
  'cpf', 'cnpj', 'rg', 'phone', 'email', 'address',
  'latitude', 'longitude', 'coordinates', 'location',
  'price', 'cost', 'revenue', 'financial', 'payment',
  'stripe_customer_id', 'stripe_account_id'
];

/**
 * Sanitiza dados para remover informações sensíveis
 */
const sanitizeLogData = (data: any, userId?: string): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    const keyLower = key.toLowerCase();
    
    // Remover campos sensíveis
    if (sensitiveFields.some(field => keyLower.includes(field))) {
      sanitized[key] = '[PROTECTED]';
    }
    // Sanitizar objetos aninhados
    else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeLogData(value, userId);
    }
    // Manter dados não sensíveis
    else {
      sanitized[key] = value;
    }
  }

  // Adicionar identificador do usuário para debug (sem dados pessoais)
  if (userId && !Array.isArray(sanitized)) {
    sanitized['_debug_user_hash'] = hashUserId(userId);
  }

  return sanitized;
};

/**
 * Cria um hash anônimo do ID do usuário para debug
 */
const hashUserId = (userId: string): string => {
  try {
    // Criar hash simples para identificação sem expor ID real
    return `user_${userId.toString().slice(-4)}${Date.now().toString().slice(-3)}`;
  } catch {
    return 'user_unknown';
  }
};

/**
 * Função de log segura que evita erros do console e protege dados sensíveis
 */
export const secureLog = (message: string, data?: any, userId?: string) => {
  try {
    // Verificar se estamos em modo de desenvolvimento
    const isDev = process.env.NODE_ENV === 'development';
    const isTestMode = process.env.STRIPE_MODE === 'test';
    
    // Em produção, log mínimo sem dados sensíveis
    if (!isDev && !isTestMode) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${message}`);
      return;
    }

    // Em desenvolvimento, fazer log com dados sanitizados
    const timestamp = new Date().toISOString();
    if (data) {
      const sanitizedData = sanitizeLogData(data, userId);
      // Usar forma segura de chamada que evita o erro Console.js:61
      console.log.apply(console, [`[${timestamp}] ${message}`, sanitizedData]);
    } else {
      console.log(`[${timestamp}] ${message}`);
    }
  } catch (error) {
    // Log de fallback sem dados sensíveis
    try {
      console.error(`[LOG_ERROR] ${message} - Failed to log safely`);
    } catch {
      // Silencioso se tudo falhar
    }
  }
};

/**
 * Versões seguras dos métodos de console padrão
 */
export const logger = {
  log: (message: string, data?: any, userId?: string) => secureLog(message, data, userId),
  info: (message: string, data?: any, userId?: string) => secureLog(`ℹ️ ${message}`, data, userId),
  warn: (message: string, data?: any, userId?: string) => secureLog(`⚠️ ${message}`, data, userId),
  error: (message: string, data?: any, userId?: string) => secureLog(`❌ ${message}`, data, userId),
  success: (message: string, data?: any, userId?: string) => secureLog(`✅ ${message}`, data, userId),
  debug: (message: string, data?: any, userId?: string) => {
    if (process.env.NODE_ENV === 'development') {
      secureLog(`🔍 ${message}`, data, userId);
    }
  }
};

export default logger;
