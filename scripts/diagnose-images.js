
import fs from 'fs';
import path from 'path';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function diagnoseImages() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 DIAGNÓSTICO COMPLETO DO SISTEMA DE IMAGENS');
    console.log('=' .repeat(60));
    
    // 1. Verificar estrutura de diretórios
    console.log('\n📁 1. ESTRUTURA DE DIRETÓRIOS:');
    const baseUploadPath = path.join(process.cwd(), 'public', 'uploads');
    
    function scanDirectory(dirPath, level = 0) {
      const indent = '  '.repeat(level);
      try {
        if (!fs.existsSync(dirPath)) {
          console.log(`${indent}❌ ${path.basename(dirPath)} (NÃO EXISTE)`);
          return;
        }
        
        console.log(`${indent}📂 ${path.basename(dirPath)}/`);
        const items = fs.readdirSync(dirPath);
        
        items.forEach(item => {
          const itemPath = path.join(dirPath, item);
          const stats = fs.statSync(itemPath);
          
          if (stats.isDirectory()) {
            scanDirectory(itemPath, level + 1);
          } else {
            console.log(`${indent}  📄 ${item}`);
          }
        });
      } catch (error) {
        console.log(`${indent}❌ Erro ao ler: ${error.message}`);
      }
    }
    
    scanDirectory(baseUploadPath);
    
    // 2. Produtos sem imagens no banco
    console.log('\n📸 2. PRODUTOS SEM IMAGENS NO BANCO:');
    const productsWithoutImages = await client.query(`
      SELECT p.id, p.name, p.store_id, s.name as store_name
      FROM products p
      JOIN stores s ON p.store_id = s.id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE pi.id IS NULL
      ORDER BY p.store_id, p.id
    `);
    
    console.log(`Total: ${productsWithoutImages.rows.length} produtos`);
    productsWithoutImages.rows.forEach(product => {
      console.log(`  ❌ Produto ${product.id}: ${product.name} (Loja ${product.store_id}: ${product.store_name})`);
    });
    
    // 3. Arquivos órfãos (sem registro no banco)
    console.log('\n👻 3. ARQUIVOS ÓRFÃOS:');
    const storesPath = path.join(baseUploadPath, 'stores');
    if (fs.existsSync(storesPath)) {
      const stores = fs.readdirSync(storesPath);
      
      for (const storeDir of stores) {
        const storePath = path.join(storesPath, storeDir);
        if (fs.statSync(storePath).isDirectory()) {
          const productsPath = path.join(storePath, 'products');
          
          if (fs.existsSync(productsPath)) {
            const products = fs.readdirSync(productsPath);
            
            for (const productDir of products) {
              const productPath = path.join(productsPath, productDir);
              if (fs.statSync(productPath).isDirectory()) {
                const files = fs.readdirSync(productPath).filter(f => 
                  f.match(/\.(jpg|jpeg|png|gif)$/i)
                );
                
                if (files.length > 0) {
                  // Verificar se produto tem registro no banco
                  const productImages = await client.query(
                    'SELECT COUNT(*) as count FROM product_images WHERE product_id = $1',
                    [parseInt(productDir)]
                  );
                  
                  if (productImages.rows[0].count === '0') {
                    console.log(`  👻 Produto ${productDir} (Loja ${storeDir}): ${files.length} arquivos órfãos`);
                    files.forEach(file => {
                      console.log(`     - ${file}`);
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // 4. URLs blob na tabela stores
    console.log('\n🌐 4. URLs BLOB NA TABELA STORES:');
    const storesWithBlob = await client.query(`
      SELECT id, name, image_url 
      FROM stores 
      WHERE image_url LIKE 'blob:%'
    `);
    
    console.log(`Total: ${storesWithBlob.rows.length} lojas com URLs blob`);
    storesWithBlob.rows.forEach(store => {
      console.log(`  🌐 Loja ${store.id}: ${store.name}`);
      console.log(`     URL: ${store.image_url}`);
    });
    
    // 5. Inconsistências entre banco e arquivos
    console.log('\n⚠️  5. INCONSISTÊNCIAS BANCO vs ARQUIVOS:');
    const allProductImages = await client.query(`
      SELECT pi.*, p.store_id, p.name as product_name
      FROM product_images pi
      JOIN products p ON pi.product_id = p.id
      ORDER BY p.store_id, pi.product_id
    `);
    
    let inconsistencies = 0;
    for (const image of allProductImages.rows) {
      const expectedPath = path.join(
        baseUploadPath, 
        'stores', 
        image.store_id.toString(), 
        'products', 
        image.product_id.toString()
      );
      
      // Extrair nome do arquivo da URL
      const fileName = image.image_url.split('/').pop();
      const filePath = path.join(expectedPath, fileName);
      
      if (!fs.existsSync(filePath)) {
        inconsistencies++;
        console.log(`  ⚠️  Imagem ${image.id} (Produto ${image.product_id}): Arquivo não encontrado`);
        console.log(`     URL: ${image.image_url}`);
        console.log(`     Esperado: ${filePath}`);
      }
    }
    
    console.log(`Total de inconsistências: ${inconsistencies}`);
    
    // 6. Resumo e recomendações
    console.log('\n📋 6. RESUMO E RECOMENDAÇÕES:');
    console.log(`✅ Produtos sem imagens: ${productsWithoutImages.rows.length}`);
    console.log(`✅ Lojas com URLs blob: ${storesWithBlob.rows.length}`);
    console.log(`✅ Inconsistências encontradas: ${inconsistencies}`);
    
    console.log('\n🔧 RECOMENDAÇÕES:');
    if (productsWithoutImages.rows.length > 0) {
      console.log('  1. Executar script de correção para produtos sem imagens');
    }
    if (storesWithBlob.rows.length > 0) {
      console.log('  2. Converter URLs blob para arquivos físicos');
    }
    if (inconsistencies > 0) {
      console.log('  3. Sincronizar registros do banco com arquivos físicos');
    }
    console.log('  4. Implementar validação preventiva contra URLs blob');
    console.log('  5. Criar estrutura padrão de diretórios para novas lojas/produtos');
    
  } catch (error) {
    console.error('❌ Erro durante diagnóstico:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

diagnoseImages();
