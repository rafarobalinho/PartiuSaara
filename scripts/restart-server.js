
#!/usr/bin/env node

/**
 * Script para reiniciar o servidor de forma segura
 * Usa o mecanismo de sinal de arquivo em vez de matar processos diretamente
 */

import { safeRestartServer } from '../server/scripts/check-port.js';

console.log('Enviando sinal para reiniciar o servidor de forma segura...');
safeRestartServer();
