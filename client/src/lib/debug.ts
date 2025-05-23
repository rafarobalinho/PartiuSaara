
/**
 * Sistema de logging seguro para substituir o código problemático
 * que está causando erro "Console.js:61"
 */

interface LogOptions {
  timestamp?: boolean;
  prefix?: string;
  color?: string;
}

const DEFAULT_OPTIONS: LogOptions = {
  timestamp: true,
  prefix: '',
  color: ''
};

// Preservar as referências originais do console
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug
};

// Função para formatar mensagens de log
const formatMessage = (message: any, options: LogOptions): any[] => {
  const args = [];
  
  // Adicionar timestamp se solicitado
  if (options.timestamp) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    args.push(`[${timeStr}]`);
  }
  
  // Adicionar prefixo se fornecido
  if (options.prefix) {
    args.push(`[${options.prefix}]`);
  }
  
  // Adicionar a mensagem principal
  args.push(message);
  
  return args;
};

/**
 * Configura o sistema de logging seguro
 * Esta função substitui os métodos console.* com versões seguras
 */
export const setupSafeLogging = () => {
  // Só aplicar no ambiente do navegador
  if (typeof window === 'undefined') return;

  // Métodos de console a serem sobrescritos
  const methods = ['log', 'warn', 'error', 'info', 'debug'];
  
  methods.forEach(method => {
    // Preservar referência ao método original
    const originalMethod = originalConsole[method];
    
    // Sobrescrever o método com versão segura que não usa 'this'
    console[method] = function(...args) {
      // Chamar o método original diretamente, sem usar 'this'
      originalMethod.apply(console, args);
      
      // Aqui você pode adicionar qualquer lógica adicional de logging
      // Por exemplo, enviar logs para um servidor, etc.
    };
  });
  
  console.info('✅ Sistema de logging seguro inicializado');
};

/**
 * Restaura os métodos originais do console
 */
export const restoreOriginalConsole = () => {
  if (typeof window === 'undefined') return;
  
  Object.keys(originalConsole).forEach(method => {
    console[method] = originalConsole[method];
  });
};

/**
 * Logger configurável que não modifica o console global
 */
export const createLogger = (defaultOptions: LogOptions = DEFAULT_OPTIONS) => {
  return {
    log: (message: any, options: LogOptions = {}) => {
      const mergedOptions = { ...defaultOptions, ...options };
      originalConsole.log.apply(console, formatMessage(message, mergedOptions));
    },
    
    warn: (message: any, options: LogOptions = {}) => {
      const mergedOptions = { ...defaultOptions, ...options };
      originalConsole.warn.apply(console, formatMessage(message, mergedOptions));
    },
    
    error: (message: any, options: LogOptions = {}) => {
      const mergedOptions = { ...defaultOptions, ...options };
      originalConsole.error.apply(console, formatMessage(message, mergedOptions));
    },
    
    info: (message: any, options: LogOptions = {}) => {
      const mergedOptions = { ...defaultOptions, ...options };
      originalConsole.info.apply(console, formatMessage(message, mergedOptions));
    },
    
    debug: (message: any, options: LogOptions = {}) => {
      const mergedOptions = { ...defaultOptions, ...options };
      originalConsole.debug.apply(console, formatMessage(message, mergedOptions));
    }
  };
};

// Logger padrão para uso em toda a aplicação
export const logger = createLogger();

// Exportar as referências originais para caso necessário
export { originalConsole };
