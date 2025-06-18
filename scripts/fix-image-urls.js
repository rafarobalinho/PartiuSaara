
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixImageUrls() {
  try {
    console.log('🔧 Corrigindo URLs de imagens...');

    // Buscar todos os produtos com suas imagens
    const result = await pool.query(`
      SELECT 
        p.id as product_id,
        p.store_id,
        pi.id as image_id,
        pi.image_url,
        pi.thumbnail_url
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE pi.image_url IS NOT NULL
      ORDER BY p.id, pi.id
    `);

    console.log(`📋 Encontrados ${result.rows.length} registros de imagens`);

    let updatedCount = 0;

    for (const row of result.rows) {
      const { product_id, store_id, image_id, image_url, thumbnail_url } = row;
      
      let needsUpdate = false;
      let newImageUrl = image_url;
      let newThumbnailUrl = thumbnail_url;

      // Verificar se a URL da imagem precisa ser corrigida
      const expectedPath = `/uploads/stores/${store_id}/products/${product_id}/`;
      
      if (!image_url.includes(expectedPath)) {
        const fileName = image_url.split('/').pop();
        newImageUrl = `${expectedPath}${fileName}`;
        needsUpdate = true;
        console.log(`🔄 Produto ${product_id}: ${image_url} -> ${newImageUrl}`);
      }

      // Verificar se a URL do thumbnail precisa ser corrigida
      if (thumbnail_url && !thumbnail_url.includes(expectedPath)) {
        const fileName = thumbnail_url.split('/').pop();
        newThumbnailUrl = `${expectedPath}thumbnails/${fileName}`;
        needsUpdate = true;
        console.log(`🔄 Thumbnail ${product_id}: ${thumbnail_url} -> ${newThumbnailUrl}`);
      }

      // Atualizar se necessário
      if (needsUpdate) {
        await pool.query(`
          UPDATE product_images 
          SET image_url = $1, thumbnail_url = $2
          WHERE id = $3
        `, [newImageUrl, newThumbnailUrl, image_id]);
        
        updatedCount++;
      }
    }

    console.log(`✅ ${updatedCount} registros atualizados com sucesso!`);
    
    // Verificar os produtos específicos que estavam com erro
    const problemProducts = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.store_id,
        pi.image_url
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
      WHERE p.id IN (11, 12)
    `);

    console.log('\n📋 Status dos produtos com erro:');
    for (const product of problemProducts.rows) {
      console.log(`Produto ${product.id} (${product.name}): ${product.image_url || 'SEM IMAGEM'}`);
    }

  } catch (error) {
    console.error('❌ Erro ao corrigir URLs:', error);
  } finally {
    await pool.end();
  }
}

fixImageUrls();
