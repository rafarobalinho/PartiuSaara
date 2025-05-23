
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Verifica e gerencia a porta do servidor de forma segura
 * @param {number} port - Porta a ser verificada (padrão: 5000)
 */
function checkPortAndStart(port = 5000) {
  console.log(`Verificando se a porta ${port} está disponível...`);
  
  // Comando para encontrar processos usando a porta (funciona no Linux, incluindo o ambiente Replit)
  const cmd = `lsof -i :${port} -t`;
  
  exec(cmd, (error, stdout, stderr) => {
    if (stdout) {
      const pids = stdout.trim().split('\n');
      console.log(`Porta ${port} está em uso pelos processos: ${pids.join(', ')}`);
      
      // Verifica se os processos são do nosso servidor
      pids.forEach(pid => {
        // Obtém informações do processo para garantir que pertence à nossa aplicação
        exec(`ps -p ${pid} -o command=`, (err, cmdOut) => {
          if (err) {
            console.log(`Não foi possível verificar o processo ${pid}: ${err.message}`);
            return;
          }
          
          // Verifica se o processo está relacionado à nossa aplicação
          if (cmdOut.includes('node') && (cmdOut.includes('server/index') || cmdOut.includes('tsx server'))) {
            console.log(`Terminando processo seguro ${pid}...`);
            try {
              // Envia SIGTERM em vez de SIGKILL para permitir encerramento limpo
              process.kill(parseInt(pid), 'SIGTERM');
              console.log(`Processo ${pid} terminado com sucesso.`);
            } catch (e) {
              console.log(`Não foi possível terminar o processo ${pid}: ${e.message}`);
            }
          } else {
            console.log(`Processo ${pid} não pertence à nossa aplicação. Ignorando.`);
          }
        });
      });
      
      console.log(`Operação na porta ${port} concluída.`);
    } else {
      console.log(`Porta ${port} está disponível.`);
    }
  });
}

/**
 * Reinicia o servidor de forma segura
 * Cria um arquivo temporário que o servidor pode monitorar para reiniciar
 */
function safeRestartServer() {
  const restartSignalFile = path.join(__dirname, '..', '..', 'tmp', 'restart.signal');
  
  // Garante que o diretório tmp existe
  const tmpDir = path.join(__dirname, '..', '..', 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  
  // Cria ou atualiza o arquivo de sinal
  fs.writeFileSync(restartSignalFile, Date.now().toString());
  
  console.log('Sinal de reinicialização enviado. O servidor será reiniciado quando possível.');
}

// Exporta as funções para uso em outros arquivos
export { checkPortAndStart, safeRestartServer };

// Se for executado diretamente
if (import.meta.url === import.meta.main) {
  const args = process.argv.slice(2);
  if (args[0] === 'restart') {
    safeRestartServer();
  } else {
    checkPortAndStart();
  }
}
