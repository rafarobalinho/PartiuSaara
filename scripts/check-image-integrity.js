
import fs from 'fs';
import path from 'path';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkImageIntegrity() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 VERIFICAÇÃO DE INTEGRIDADE DAS IMAGENS');
    console.log('=' .repeat(50));
    
    const baseUploadPath = path.join(process.cwd(), 'public', 'uploads');
    let issues = 0;
    
    // 1. Verificar arquivos órfãos
    console.log('\n👻 1. VERIFICANDO ARQUIVOS ÓRFÃOS...');
    const storesPath = path.join(baseUploadPath, 'stores');
    
    if (fs.existsSync(storesPath)) {
      const storesDirs = fs.readdirSync(storesPath);
      
      for (const storeDir of storesDirs) {
        const storePath = path.join(storesPath, storeDir);
        if (fs.statSync(storePath).isDirectory()) {
          const productsPath = path.join(storePath, 'products');
          
          if (fs.existsSync(productsPath)) {
            const productsDirs = fs.readdirSync(productsPath);
            
            for (const productDir of productsDirs) {
              const productPath = path.join(productsPath, productDir);
              if (fs.statSync(productPath).isDirectory()) {
                const files = fs.readdirSync(productPath).filter(f => 
                  f.match(/\.(jpg|jpeg|png|gif)$/i)
                );
                
                if (files.length > 0) {
                  const productImages = await client.query(
                    'SELECT COUNT(*) as count FROM product_images WHERE product_id = $1',
                    [parseInt(productDir)]
                  );
                  
                  if (productImages.rows[0].count === '0') {
                    issues++;
                    console.log(`  ❌ Produto ${productDir} (Loja ${storeDir}): ${files.length} arquivos órfãos`);
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // 2. Verificar registros sem arquivos
    console.log('\n💾 2. VERIFICANDO REGISTROS SEM ARQUIVOS...');
    const allProductImages = await client.query(`
      SELECT pi.*, p.store_id, p.name as product_name
      FROM product_images pi
      JOIN products p ON pi.product_id = p.id
      WHERE pi.image_url NOT LIKE '/placeholder%'
      ORDER BY p.store_id, pi.product_id
    `);
    
    for (const image of allProductImages.rows) {
      const fileName = image.image_url.split('/').pop();
      const expectedPath = path.join(
        baseUploadPath, 
        'stores', 
        image.store_id.toString(), 
        'products', 
        image.product_id.toString(),
        fileName
      );
      
      if (!fs.existsSync(expectedPath)) {
        issues++;
        console.log(`  ❌ Imagem ${image.id} (Produto ${image.product_id}): Arquivo não encontrado`);
        console.log(`     Esperado: ${expectedPath}`);
      }
    }
    
    // 3. Verificar URLs blob
    console.log('\n🌐 3. VERIFICANDO URLs BLOB...');
    const storesWithBlob = await client.query(`
      SELECT id, name, image_url 
      FROM stores 
      WHERE image_url LIKE 'blob:%'
    `);
    
    if (storesWithBlob.rows.length > 0) {
      issues += storesWithBlob.rows.length;
      console.log(`  ❌ ${storesWithBlob.rows.length} lojas com URLs blob encontradas`);
    } else {
      console.log('  ✅ Nenhuma URL blob encontrada');
    }
    
    // 4. Relatório final
    console.log('\n📊 RELATÓRIO DE SAÚDE:');
    if (issues === 0) {
      console.log('  🎉 SISTEMA SAUDÁVEL - Nenhum problema encontrado!');
    } else {
      console.log(`  ⚠️  ${issues} problemas encontrados`);
      console.log('  💡 Execute o script fix-images.js para corrigir automaticamente');
    }
    
    return issues;
    
  } catch (error) {
    console.error('❌ Erro durante verificação:', error);
    return -1;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  checkImageIntegrity();
}

export { checkImageIntegrity };
