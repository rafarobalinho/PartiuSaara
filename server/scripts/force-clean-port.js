
#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function forceCleanPort() {
  console.log('🧹 Iniciando limpeza forçada da porta 5000...');
  
  try {
    // 1. Matar todos os processos Node.js que possam estar usando a porta
    console.log('🔍 Procurando processos Node.js...');
    try {
      const { stdout: nodeProcesses } = await execAsync('pgrep -f "node.*server"');
      if (nodeProcesses.trim()) {
        const pids = nodeProcesses.trim().split('\n');
        for (const pid of pids) {
          try {
            await execAsync(`kill -9 ${pid}`);
            console.log(`💀 Processo Node.js ${pid} terminado`);
          } catch (e) {
            // Ignorar erros de processo já morto
          }
        }
      }
    } catch (e) {
      // Nenhum processo encontrado
    }

    // 2. Limpar especificamente a porta 5000
    try {
      const { stdout } = await execAsync('lsof -i :5000 -t');
      if (stdout.trim()) {
        const pids = stdout.trim().split('\n');
        for (const pid of pids) {
          await execAsync(`kill -9 ${pid}`);
          console.log(`💀 Processo na porta 5000 (${pid}) terminado`);
        }
      }
    } catch (e) {
      // Porta já livre
    }

    // 3. Aguardar um momento
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Verificação final
    try {
      const { stdout } = await execAsync('lsof -i :5000 -t');
      if (stdout.trim()) {
        console.log('⚠️ Ainda há processos na porta 5000. Pode ser necessário reiniciar o Repl.');
      } else {
        console.log('✅ Porta 5000 completamente limpa!');
      }
    } catch (e) {
      console.log('✅ Porta 5000 disponível!');
    }

  } catch (error) {
    console.error('❌ Erro durante limpeza:', error.message);
  }
}

forceCleanPort();
