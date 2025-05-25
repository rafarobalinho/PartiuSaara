
/**
 * Script para testar a configuração de webhook do Stripe
 * Este script verifica se a URL do webhook está acessível e responde corretamente.
 */

const https = require('https');
const http = require('http');
const url = require('url');

// URLs para testar
const webhookUrls = [
  'https://28e4b557-7792-4b03-b33e-93489b7586b5-00-33goki6qofjtz.riker.replit.dev/api/stripe/webhook',
  'https://partiusaara.replit.app/api/stripe/webhook'
];

// Função para testar uma URL
function testWebhook(webhookUrl) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Testando webhook URL: ${webhookUrl}`);
    
    // Parse da URL
    const parsedUrl = url.parse(webhookUrl);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'test_signature'  // Assinatura de teste
      }
    };
    
    // Escolher protocolo correto
    const requestLib = parsedUrl.protocol === 'https:' ? https : http;
    
    // Fazer a requisição
    const req = requestLib.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`🔍 Status: ${res.statusCode}`);
        console.log(`🔍 Headers: ${JSON.stringify(res.headers)}`);
        
        try {
          const responseData = data ? JSON.parse(data) : {};
          console.log(`🔍 Resposta: ${JSON.stringify(responseData)}`);
        } catch (e) {
          console.log(`🔍 Resposta (texto): ${data}`);
        }
        
        // Avaliar o resultado
        const success = res.statusCode === 400; // Esperamos 400 pois a assinatura não é válida
        console.log(`${success ? '✅' : '❌'} ${success ? 'Sucesso' : 'Falha'}: ${
          success 
            ? 'O endpoint existe e está verificando a assinatura (erro 400 é esperado)' 
            : 'O endpoint não está verificando a assinatura corretamente'
        }`);
        
        resolve({
          url: webhookUrl,
          status: res.statusCode,
          success: success,
          response: data
        });
      });
    });
    
    req.on('error', (error) => {
      console.error(`❌ Erro ao testar webhook: ${error.message}`);
      resolve({
        url: webhookUrl,
        status: 'error',
        success: false,
        error: error.message
      });
    });
    
    // Enviar uma carga útil de teste simples
    req.write(JSON.stringify({
      type: 'test.webhook',
      data: {
        object: {
          id: 'test_event_123'
        }
      }
    }));
    
    req.end();
  });
}

// Testar todas as URLs
async function testAllWebhooks() {
  console.log('🚀 Iniciando teste de webhooks do Stripe');
  console.log('=========================================');
  
  const results = [];
  
  for (const webhookUrl of webhookUrls) {
    const result = await testWebhook(webhookUrl);
    results.push(result);
  }
  
  console.log('\n📊 Resumo dos testes:');
  console.log('=====================');
  
  results.forEach((result, index) => {
    console.log(`URL ${index + 1}: ${result.url}`);
    console.log(`Status: ${result.status}`);
    console.log(`Resultado: ${result.success ? 'OK' : 'FALHA'}`);
    console.log('---------------------');
  });
  
  const allSuccess = results.every(r => r.success);
  console.log(`\n${allSuccess ? '✅ Todos os' : '❌ Nem todos os'} webhooks estão configurados corretamente.`);
  
  if (!allSuccess) {
    console.log('\n⚠️ Recomendações:');
    console.log('1. Verifique se o servidor está rodando');
    console.log('2. Confirme se as variáveis de ambiente STRIPE_WEBHOOK_SECRET_TEST e STRIPE_WEBHOOK_SECRET_LIVE estão configuradas');
    console.log('3. Verifique a implementação do endpoint /api/stripe/webhook');
  }
}

// Executar os testes
testAllWebhooks();
