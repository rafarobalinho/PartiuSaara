
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verifyStores34() {
  try {
    console.log('🔍 Verificando correções das lojas 3 e 4...\n');

    // Verificar banco de dados
    const dbResult = await pool.query(`
      SELECT store_id, filename, thumbnail_filename, is_primary, created_at 
      FROM store_images 
      WHERE store_id IN (3, 4) 
      ORDER BY store_id
    `);

    console.log('📊 REGISTROS NO BANCO:');
    dbResult.rows.forEach(row => {
      console.log(`  Loja ${row.store_id}: ${row.filename} (primary: ${row.is_primary})`);
    });

    // Verificar arquivos físicos
    console.log('\n📁 ARQUIVOS FÍSICOS:');
    
    // Loja 3
    const store3Path = '/home/runner/workspace/public/uploads/stores/3/1746934665553-131736427.jpg';
    const store3ThumbPath = '/home/runner/workspace/public/uploads/stores/3/thumbnails/1746934665553-131736427.jpg';
    
    console.log(`  Loja 3 original: ${fs.existsSync(store3Path) ? '✅' : '❌'} ${store3Path}`);
    console.log(`  Loja 3 thumbnail: ${fs.existsSync(store3ThumbPath) ? '✅' : '❌'} ${store3ThumbPath}`);

    // Loja 4
    const store4Path = '/home/runner/workspace/public/uploads/stores/4/1746574875959-463379720.jpg';
    
    console.log(`  Loja 4 original: ${fs.existsSync(store4Path) ? '✅' : '❌'} ${store4Path}`);

    // Resumo
    console.log('\n📋 RESUMO:');
    const store3DbExists = dbResult.rows.some(r => r.store_id === 3);
    const store4DbExists = dbResult.rows.some(r => r.store_id === 4);
    
    console.log(`  Loja 3: Banco ${store3DbExists ? '✅' : '❌'} | Arquivo ${fs.existsSync(store3Path) ? '✅' : '❌'}`);
    console.log(`  Loja 4: Banco ${store4DbExists ? '✅' : '❌'} | Arquivo ${fs.existsSync(store4Path) ? '✅' : '❌'}`);

    if (store3DbExists && fs.existsSync(store3Path) && store4DbExists && fs.existsSync(store4Path)) {
      console.log('\n🎉 SUCESSO: Ambas as lojas estão corrigidas!');
    } else {
      console.log('\n⚠️ ATENÇÃO: Ainda existem problemas a serem resolvidos.');
    }

  } catch (error) {
    console.error('❌ Erro na verificação:', error);
  } finally {
    await pool.end();
  }
}

verifyStores34();
