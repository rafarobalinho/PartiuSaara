
import { exec } from 'child_process';

function checkPortAndStart(port = 5000) {
  console.log(`Verificando se a porta ${port} está disponível...`);
  
  // Comando para encontrar processos usando a porta (funciona no Linux, incluindo o ambiente Replit)
  const cmd = `lsof -i :${port} -t`;
  
  exec(cmd, (error, stdout, stderr) => {
    if (stdout) {
      const pids = stdout.trim().split('\n');
      console.log(`Porta ${port} está em uso pelos processos: ${pids.join(', ')}`);
      
      // Mata os processos encontrados
      pids.forEach(pid => {
        console.log(`Terminando processo ${pid}...`);
        try {
          process.kill(parseInt(pid), 'SIGTERM');
        } catch (e) {
          console.log(`Não foi possível terminar o processo ${pid}: ${e.message}`);
        }
      });
      
      console.log(`Porta ${port} liberada com sucesso!`);
    } else {
      console.log(`Porta ${port} está disponível.`);
    }
  });
}

// Exporta a função para uso em outros arquivos
export { checkPortAndStart };

// Se for executado diretamente
if (import.meta.url === import.meta.main) {
  checkPortAndStart();
}
