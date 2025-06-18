
#!/usr/bin/env node

/**
 * Script de debug específico para produtos 5 e 10
 * Identifica exatamente onde está o vazamento de dados
 */

const { pool } = require('../server/db');

async function debugSpecificProducts() {
  console.log('🔍 [DEBUG] Iniciando verificação específica dos produtos 5 e 10...\n');
  
  try {
    // Conectar ao banco
    if (!pool) {
      console.error('❌ Pool de conexão não encontrado');
      return;
    }

    console.log('=== VERIFICAÇÃO DIRETA NO BANCO DE DADOS ===\n');

    // 1. Verificar produto 5
    console.log('🔍 Verificando produto 5:');
    const produto5Query = `
      SELECT 'PRODUTO 5' as debug, pi.id, pi.product_id, pi.image_url, pi.is_primary, pi.display_order
      FROM product_images pi 
      WHERE pi.product_id = 5
      ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.id DESC;
    `;
    
    const produto5Result = await pool.query(produto5Query);
    console.log('Resultado para produto 5:', produto5Result.rows);
    console.log('');

    // 2. Verificar produto 10
    console.log('🔍 Verificando produto 10:');
    const produto10Query = `
      SELECT 'PRODUTO 10' as debug, pi.id, pi.product_id, pi.image_url, pi.is_primary, pi.display_order
      FROM product_images pi 
      WHERE pi.product_id = 10
      ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.id DESC;
    `;
    
    const produto10Result = await pool.query(produto10Query);
    console.log('Resultado para produto 10:', produto10Result.rows);
    console.log('');

    // 3. Verificar todas as imagens primárias
    console.log('🔍 Verificando todas as imagens primárias:');
    const todasPrimariasQuery = `
      SELECT 'TODAS PRIMÁRIAS' as debug, pi.id, pi.product_id, pi.image_url, pi.is_primary
      FROM product_images pi 
      WHERE pi.is_primary = true
      ORDER BY pi.product_id;
    `;
    
    const todasPrimariasResult = await pool.query(todasPrimariasQuery);
    console.log('Todas as imagens primárias:', todasPrimariasResult.rows);
    console.log('');

    // 4. Verificar se há IDs duplicados ou conflitos
    console.log('🔍 Verificando possíveis conflitos:');
    const conflitosQuery = `
      SELECT 
        product_id,
        COUNT(*) as total_imagens,
        COUNT(CASE WHEN is_primary = true THEN 1 END) as imagens_primarias
      FROM product_images 
      WHERE product_id IN (5, 10)
      GROUP BY product_id;
    `;
    
    const conflitosResult = await pool.query(conflitosQuery);
    console.log('Contagem de imagens por produto:', conflitosResult.rows);
    console.log('');

    // 5. Simular a query exata da API
    console.log('🔍 Simulando query exata da API para produto 5:');
    const apiQuery = `
      SELECT pi.id, pi.product_id, pi.image_url, pi.thumbnail_url, pi.is_primary, pi.display_order
      FROM product_images pi
      WHERE pi.product_id = $1 
      ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.id DESC
      LIMIT 1
    `;
    
    const apiResult5 = await pool.query(apiQuery, [5]);
    console.log('Query API para produto 5:', apiResult5.rows);
    
    console.log('🔍 Simulando query exata da API para produto 10:');
    const apiResult10 = await pool.query(apiQuery, [10]);
    console.log('Query API para produto 10:', apiResult10.rows);
    console.log('');

    // 6. Verificar dados dos produtos
    console.log('🔍 Verificando dados dos produtos:');
    const produtosQuery = `
      SELECT id, name, store_id, created_at
      FROM products 
      WHERE id IN (5, 10)
      ORDER BY id;
    `;
    
    const produtosResult = await pool.query(produtosQuery);
    console.log('Dados dos produtos:', produtosResult.rows);
    console.log('');

    console.log('✅ [DEBUG] Verificação específica concluída!');
    
  } catch (error) {
    console.error('💥 [DEBUG] Erro durante verificação:', error);
  }
}

// Executar debug se chamado diretamente
if (require.main === module) {
  debugSpecificProducts().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = { debugSpecificProducts };
