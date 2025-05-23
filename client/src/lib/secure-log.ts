
// Função de log segura com proteção de dados sensíveis
export const secureLog = (message: string, data?: any, userId?: string) => {
  try {
    // Verificar se estamos em modo de desenvolvimento
    const isDev = process.env.NODE_ENV === 'development';
    const isTestMode = process.env.STRIPE_MODE === 'test';
    
    // Só fazer log detalhado em desenvolvimento
    if (!isDev && !isTestMode) {
      // Em produção, log mínimo sem dados sensíveis
      console.log(`[${new Date().toISOString()}] ${message}`);
      return;
    }

    // Em desenvolvimento, fazer log com dados sanitizados
    if (data) {
      const sanitizedData = sanitizeLogData(data, userId);
      console.log(`[${new Date().toISOString()}] ${message}`, sanitizedData);
    } else {
      console.log(`[${new Date().toISOString()}] ${message}`);
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

// Função para sanitizar dados sensíveis
export const sanitizeLogData = (data: any, userId?: string): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'authorization',
    'cpf', 'cnpj', 'rg', 'phone', 'email', 'address',
    'latitude', 'longitude', 'coordinates', 'location',
    'price', 'cost', 'revenue', 'financial', 'payment',
    'stripe_customer_id', 'stripe_account_id'
  ];

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

// Função para criar hash anônimo do usuário
export const hashUserId = (userId: string): string => {
  try {
    // Criar hash simples para identificação de debug sem expor ID real
    return `user_${userId.slice(-4)}${Date.now().toString().slice(-3)}`;
  } catch {
    return 'user_unknown';
  }
};
