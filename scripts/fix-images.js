
import fs from 'fs';
import path from 'path';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixImages() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 CORREÇÃO AUTOMÁTICA DO SISTEMA DE IMAGENS');
    console.log('=' .repeat(60));
    
    const baseUploadPath = path.join(process.cwd(), 'public', 'uploads');
    
    // 1. Criar estrutura padrão de diretórios
    console.log('\n📁 1. CRIANDO ESTRUTURA PADRÃO DE DIRETÓRIOS...');
    
    const stores = await client.query('SELECT id FROM stores ORDER BY id');
    const products = await client.query('SELECT id, store_id FROM products ORDER BY store_id, id');
    
    // Criar diretórios para todas as lojas
    for (const store of stores.rows) {
      const storeDir = path.join(baseUploadPath, 'stores', store.id.toString());
      const productsDir = path.join(storeDir, 'products');
      
      if (!fs.existsSync(storeDir)) {
        fs.mkdirSync(storeDir, { recursive: true });
        console.log(`  ✅ Criado: stores/${store.id}/`);
      }
      
      if (!fs.existsSync(productsDir)) {
        fs.mkdirSync(productsDir, { recursive: true });
        console.log(`  ✅ Criado: stores/${store.id}/products/`);
      }
    }
    
    // Criar diretórios para todos os produtos
    for (const product of products.rows) {
      const productDir = path.join(
        baseUploadPath, 
        'stores', 
        product.store_id.toString(), 
        'products', 
        product.id.toString()
      );
      const thumbnailsDir = path.join(productDir, 'thumbnails');
      
      if (!fs.existsSync(productDir)) {
        fs.mkdirSync(productDir, { recursive: true });
        console.log(`  ✅ Criado: stores/${product.store_id}/products/${product.id}/`);
      }
      
      if (!fs.existsSync(thumbnailsDir)) {
        fs.mkdirSync(thumbnailsDir, { recursive: true });
        console.log(`  ✅ Criado: stores/${product.store_id}/products/${product.id}/thumbnails/`);
      }
    }
    
    // 2. Registrar arquivos órfãos no banco
    console.log('\n👻 2. REGISTRANDO ARQUIVOS ÓRFÃOS NO BANCO...');
    
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
                
                const productId = parseInt(productDir);
                const storeId = parseInt(storeDir);
                
                if (files.length > 0) {
                  // Verificar se produto tem imagens registradas
                  const existingImages = await client.query(
                    'SELECT COUNT(*) as count FROM product_images WHERE product_id = $1',
                    [productId]
                  );
                  
                  if (existingImages.rows[0].count === '0') {
                    console.log(`  🔧 Registrando ${files.length} imagens do produto ${productId}...`);
                    
                    for (let i = 0; i < files.length; i++) {
                      const file = files[i];
                      const imageUrl = `/uploads/stores/${storeId}/products/${productId}/${file}`;
                      const thumbnailUrl = `/uploads/stores/${storeId}/products/${productId}/thumbnails/${file}`;
                      
                      await client.query(`
                        INSERT INTO product_images (product_id, image_url, thumbnail_url, is_primary, display_order)
                        VALUES ($1, $2, $3, $4, $5)
                      `, [productId, imageUrl, thumbnailUrl, i === 0, i]);
                      
                      console.log(`    ✅ Registrada: ${file} ${i === 0 ? '(PRIMARY)' : ''}`);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // 3. Limpar URLs blob da tabela stores
    console.log('\n🌐 3. LIMPANDO URLs BLOB DA TABELA STORES...');
    
    const storesWithBlob = await client.query(`
      SELECT id, name, image_url 
      FROM stores 
      WHERE image_url LIKE 'blob:%'
    `);
    
    for (const store of storesWithBlob.rows) {
      console.log(`  🧹 Limpando URL blob da loja ${store.id}: ${store.name}`);
      
      await client.query(
        'UPDATE stores SET image_url = $1 WHERE id = $2',
        ['/placeholder-image.jpg', store.id]
      );
      
      console.log(`    ✅ URL atualizada para placeholder`);
    }
    
    // 4. Verificação final do produto 11
    console.log('\n🎯 4. VERIFICAÇÃO FINAL DO PRODUTO 11...');
    
    const product11Images = await client.query(
      'SELECT * FROM product_images WHERE product_id = 11'
    );
    
    if (product11Images.rows.length === 0) {
      console.log('  ❌ Produto 11 ainda sem imagens, criando placeholder...');
      
      await client.query(`
        INSERT INTO product_images (product_id, image_url, thumbnail_url, is_primary, display_order)
        VALUES ($1, $2, $3, $4, $5)
      `, [11, '/placeholder-image.jpg', '/placeholder-image.jpg', true, 0]);
      
      console.log('  ✅ Placeholder criado para produto 11');
    } else {
      console.log(`  ✅ Produto 11 tem ${product11Images.rows.length} imagens registradas`);
    }
    
    console.log('\n🎉 CORREÇÃO CONCLUÍDA COM SUCESSO!');
    
  } catch (error) {
    console.error('❌ Erro durante correção:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixImages();
