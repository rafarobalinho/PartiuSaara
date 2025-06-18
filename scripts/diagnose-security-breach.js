
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function diagnoseCritical() {
  const client = await pool.connect();
  
  try {
    console.log('🚨 DIAGNÓSTICO CRÍTICO DE SEGURANÇA');
    
    // 1. Verificar usuários e suas lojas
    const users = await client.query(`
      SELECT u.id as user_id, u.email, s.id as store_id, s.name as store_name, s.user_id as store_owner
      FROM users u 
      LEFT JOIN stores s ON u.id = s.user_id
      ORDER BY u.id
    `);
    
    console.log('\n👥 USUÁRIOS E LOJAS:');
    users.rows.forEach(row => {
      console.log(`User ${row.user_id} (${row.email}) -> Loja ${row.store_id} (${row.store_name})`);
    });
    
    // 2. Verificar produtos e suas lojas
    const products = await client.query(`
      SELECT p.id as product_id, p.name, p.store_id, s.name as store_name, s.user_id as store_owner
      FROM products p
      JOIN stores s ON p.store_id = s.id
      ORDER BY p.id
    `);
    
    console.log('\n📦 PRODUTOS E SUAS LOJAS:');
    products.rows.forEach(row => {
      console.log(`Produto ${row.product_id} (${row.name}) -> Loja ${row.store_id} (${row.store_name}) -> Owner ${row.store_owner}`);
    });
    
    // 3. Verificar imagens e seus caminhos
    const images = await client.query(`
      SELECT pi.id, pi.product_id, pi.image_url, p.store_id, s.user_id as store_owner
      FROM product_images pi
      JOIN products p ON pi.product_id = p.id
      JOIN stores s ON p.store_id = s.id
      ORDER BY pi.id
    `);
    
    console.log('\n📸 IMAGENS E SEUS CAMINHOS:');
    images.rows.forEach(row => {
      const urlParts = row.image_url.split('/');
      const urlStoreId = urlParts[2]; // /uploads/stores/[ID]/...
      const urlProductId = urlParts[4]; // /uploads/stores/X/products/[ID]/...
      
      console.log(`Imagem ${row.id}:`);
      console.log(`  Produto Real: ${row.product_id} (Loja ${row.store_id}, Owner ${row.store_owner})`);
      console.log(`  URL: ${row.image_url}`);
      console.log(`  URL Store ID: ${urlStoreId}, URL Product ID: ${urlProductId}`);
      
      if (urlStoreId != row.store_id || urlProductId != row.product_id) {
        console.log(`  ❌ INCONSISTÊNCIA DETECTADA!`);
      } else {
        console.log(`  ✅ OK`);
      }
    });
    
    // 4. Procurar URLs blob
    const blobUrls = await client.query(`
      SELECT id, name, images, logo 
      FROM stores 
      WHERE images::text LIKE '%blob:%' OR logo LIKE '%blob:%'
    `);
    
    console.log('\n🔍 URLs BLOB ENCONTRADAS:');
    blobUrls.rows.forEach(row => {
      console.log(`Loja ${row.id} (${row.name}): ${row.images || row.logo}`);
    });
    
    // 5. Verificar último upload feito
    console.log('\n📋 ÚLTIMOS UPLOADS:');
    const recentImages = await client.query(`
      SELECT pi.id, pi.product_id, pi.image_url, pi.created_at, p.store_id, s.user_id as store_owner, s.name as store_name
      FROM product_images pi
      JOIN products p ON pi.product_id = p.id
      JOIN stores s ON p.store_id = s.id
      ORDER BY pi.id DESC
      LIMIT 10
    `);
    
    recentImages.rows.forEach(row => {
      console.log(`Upload ${row.id} - ${row.created_at}:`);
      console.log(`  Produto: ${row.product_id} | Loja Real: ${row.store_id} (${row.store_name}) | Owner: ${row.store_owner}`);
      console.log(`  URL: ${row.image_url}`);
      
      const urlParts = row.image_url.split('/');
      const urlStoreId = urlParts[2];
      const urlProductId = urlParts[4];
      
      if (urlStoreId != row.store_id) {
        console.log(`  🚨 FALHA DE SEGURANÇA: Imagem da loja ${row.store_id} salva na pasta da loja ${urlStoreId}!`);
      }
    });
    
  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

diagnoseCritical();
