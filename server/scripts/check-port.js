import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function killPortProcesses(port = 5000) {
  console.log(`🔍 Verificando porta ${port}...`);

  try {
    // Comando para encontrar processos usando a porta
    const { stdout } = await execAsync(`lsof -i :${port} -t`);

    if (stdout.trim()) {
      const pids = stdout.trim().split('\n').filter(pid => pid);
      console.log(`🚫 Porta ${port} ocupada pelos processos: ${pids.join(', ')}`);

      // Mata os processos encontrados
      for (const pid of pids) {
        try {
          console.log(`⚡ Terminando processo ${pid}...`);
          await execAsync(`kill -9 ${pid}`);
          console.log(`✅ Processo ${pid} terminado`);
        } catch (e) {
          console.log(`⚠️ Não foi possível terminar o processo ${pid}: ${e.message}`);
        }
      }

      // Aguarda um momento para garantir que a porta seja liberada
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`🎉 Porta ${port} liberada com sucesso!`);
    } else {
      console.log(`✅ Porta ${port} já está disponível`);
    }
  } catch (error) {
    // Se lsof não encontrar nada, a porta está livre
    if (error.code === 1) {
      console.log(`✅ Porta ${port} está disponível`);
    } else {
      console.log(`⚠️ Erro ao verificar porta: ${error.message}`);
    }
  }
}

async function checkAndKillPort(port = 5000) {
  await killPortProcesses(port);

  // Verificação adicional para garantir que a porta está realmente livre
  try {
    const { stdout } = await execAsync(`lsof -i :${port} -t`);
    if (stdout.trim()) {
      console.log(`⚠️ Ainda há processos na porta ${port}, tentando kill -9...`);
      const pids = stdout.trim().split('\n').filter(pid => pid);
      for (const pid of pids) {
        try {
          await execAsync(`kill -9 ${pid}`);
          console.log(`💀 Processo ${pid} forçadamente terminado`);
        } catch (e) {
          console.log(`❌ Falha ao forçar término do processo ${pid}`);
        }
      }
    }
  } catch (error) {
    // Porta livre
  }
}

// Exporta a função para uso em outros arquivos
export { checkAndKillPort as checkPortAndStart, killPortProcesses };

// Se for executado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  checkAndKillPort().then(() => {
    console.log('🎯 Verificação de porta concluída');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Erro durante verificação de porta:', error);
    process.exit(1);
  });
}
