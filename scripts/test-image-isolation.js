
#!/usr/bin/env node

/**
 * Script de teste para verificar isolamento de imagens entre produtos
 * Detecta vazamentos de dados entre lojas diferentes
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://28e4b557-7792-4b03-b33e-93489b7586b5-00-33goki6qofjtz.riker.replit.dev'
  : 'http://localhost:5000';

async function testImageIsolation() {
  console.log('🔍 [TEST] Iniciando teste de isolamento de imagens...\n');
  
  try {
    // Buscar todos os produtos primeiro
    const productsResponse = await fetch(`${BASE_URL}/api/products?type=all&limit=50`);
    const productsData = await productsResponse.json();
    const products = productsData.products || [];
    
    console.log(`📦 [TEST] Encontrados ${products.length} produtos para testar\n`);
    
    const results = [];
    
    for (const product of products) {
      try {
        const imageUrl = `${BASE_URL}/api/products/${product.id}/primary-image`;
        const response = await fetch(imageUrl);
        
        const result = {
          productId: product.id,
          productName: product.name,
          storeId: product.store_id || product.store?.id,
          storeName: product.store?.name || 'N/A',
          imageStatus: response.status,
          imageUrl: imageUrl,
          contentType: response.headers.get('content-type')
        };
        
        if (response.status === 200) {
          console.log(`✅ [TEST] Produto ${product.id} (${product.name}): Imagem OK`);
        } else if (response.status === 404) {
          console.log(`⚠️ [TEST] Produto ${product.id} (${product.name}): Sem imagem`);
        } else if (response.status === 403) {
          console.log(`🚨 [TEST] Produto ${product.id} (${product.name}): ERRO DE SEGURANÇA!`);
        } else {
          console.log(`❌ [TEST] Produto ${product.id} (${product.name}): Erro ${response.status}`);
        }
        
        results.push(result);
        
        // Delay pequeno para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`💥 [TEST] Erro ao testar produto ${product.id}:`, error.message);
        results.push({
          productId: product.id,
          productName: product.name,
          storeId: product.store_id || product.store?.id,
          imageStatus: 'ERROR',
          error: error.message
        });
      }
    }
    
    console.log('\n📊 [TEST] RESUMO DOS RESULTADOS:');
    console.log('================================');
    
    const statusCounts = results.reduce((acc, result) => {
      const status = result.imageStatus;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      const emoji = status === 200 ? '✅' : status === 404 ? '⚠️' : status === 403 ? '🚨' : '❌';
      console.log(`${emoji} Status ${status}: ${count} produtos`);
    });
    
    // Verificar se há produtos com erro de segurança
    const securityErrors = results.filter(r => r.imageStatus === 403);
    if (securityErrors.length > 0) {
      console.log('\n🚨 [CRITICAL] VAZAMENTOS DE SEGURANÇA DETECTADOS:');
      securityErrors.forEach(error => {
        console.log(`  - Produto ${error.productId} (${error.productName}) da loja ${error.storeId}`);
      });
    }
    
    // Agrupar por loja para verificar isolamento
    console.log('\n🏪 [TEST] DISTRIBUIÇÃO POR LOJA:');
    const byStore = results.reduce((acc, result) => {
      const storeId = result.storeId || 'N/A';
      if (!acc[storeId]) {
        acc[storeId] = { storeName: result.storeName, products: [], successCount: 0 };
      }
      acc[storeId].products.push(result);
      if (result.imageStatus === 200) {
        acc[storeId].successCount++;
      }
      return acc;
    }, {});
    
    Object.entries(byStore).forEach(([storeId, data]) => {
      const successRate = ((data.successCount / data.products.length) * 100).toFixed(1);
      console.log(`  Loja ${storeId} (${data.storeName}): ${data.products.length} produtos, ${successRate}% com imagem`);
    });
    
    console.log('\n✅ [TEST] Teste de isolamento concluído!');
    
  } catch (error) {
    console.error('💥 [TEST] Erro durante teste de isolamento:', error);
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  testImageIsolation();
}

module.exports = { testImageIsolation };
