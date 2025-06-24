// scripts/trial-automation.js
import cron from 'node-cron';
import { processTrialNotifications, processExpiredTrials } from '../server/controllers/trial.controller.js';

console.log('🤖 Iniciando automação de trials...');

// Processar notificações de trial - a cada 6 horas
cron.schedule('0 */6 * * *', async () => {
  console.log('⏰ Executando: Processamento de notificações de trial');
  try {
    await processTrialNotifications();
    console.log('✅ Notificações de trial processadas com sucesso');
  } catch (error) {
    console.error('❌ Erro ao processar notificações de trial:', error);
  }
});

// Processar trials expirados - todo dia às 00:30
cron.schedule('30 0 * * *', async () => {
  console.log('⏰ Executando: Processamento de trials expirados');
  try {
    await processExpiredTrials();
    console.log('✅ Trials expirados processados com sucesso');
  } catch (error) {
    console.error('❌ Erro ao processar trials expirados:', error);
  }
});

// Limpeza de impressões antigas - toda semana
cron.schedule('0 2 * * 0', async () => {
  console.log('⏰ Executando: Limpeza de impressões antigas');
  try {
    await cleanupOldImpressions();
    console.log('✅ Limpeza de impressões concluída');
  } catch (error) {
    console.error('❌ Erro na limpeza de impressões:', error);
  }
});

// Função para limpeza de dados antigos
async function cleanupOldImpressions() {
  const { Client } = require('pg');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();

    // Manter apenas impressões dos últimos 90 dias
    const result = await client.query(`
      DELETE FROM highlight_impressions 
      WHERE timestamp < NOW() - INTERVAL '90 days'
    `);

    console.log(`🗑️ ${result.rowCount} impressões antigas removidas`);
  } finally {
    await client.end();
  }
}

console.log('✅ Automação de trials configurada com sucesso!');
console.log('📅 Agenda:');
console.log('   - Notificações: a cada 6 horas');
console.log('   - Downgrades: todo dia às 00:30');
console.log('   - Limpeza: todo domingo às 02:00');

// scripts/manual-trial-check.js
// Script para verificação manual de trials
import dotenv from 'dotenv';
import { processTrialNotifications, processExpiredTrials } from '../server/controllers/trial.controller.js';

dotenv.config();

async function manualTrialCheck() {
  console.log('🔍 Verificação manual de trials iniciada...');

  try {
    console.log('📧 Processando notificações...');
    await processTrialNotifications();

    console.log('📉 Processando downgrades...');
    await processExpiredTrials();

    console.log('✅ Verificação manual concluída!');
  } catch (error) {
    console.error('❌ Erro na verificação manual:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (process.argv[1] === new URL(import.meta.url).pathname) {
  manualTrialCheck();
}