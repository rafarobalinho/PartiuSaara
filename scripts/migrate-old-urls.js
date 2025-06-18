import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

// Load environment variables
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateOldUrls() {
  try {
    console.log('🔄 Atualizando URLs antigas...');

    // Atualizar image_url
    const updateImages = await pool.query(`
      UPDATE product_images 
      SET image_url = CONCAT('/uploads/stores/', 
        (SELECT store_id FROM products WHERE id = product_images.product_id),
        '/products/', 
        product_id, 
        '/', 
        SUBSTRING(image_url FROM 10))
      WHERE image_url LIKE '/uploads/17%' 
        AND image_url NOT LIKE '/uploads/stores/%'
    `);

    console.log(`✅ ${updateImages.rowCount} image_url atualizadas`);

    // Atualizar thumbnail_url  
    const updateThumbnails = await pool.query(`
      UPDATE product_images 
      SET thumbnail_url = CONCAT('/uploads/stores/', 
        (SELECT store_id FROM products WHERE id = product_images.product_id),
        '/products/', 
        product_id, 
        '/thumbnails/', 
        SUBSTRING(thumbnail_url FROM 21))
      WHERE thumbnail_url LIKE '/uploads/thumbnails/17%'
        AND thumbnail_url NOT LIKE '/uploads/stores/%'
    `);

    console.log(`✅ ${updateThumbnails.rowCount} thumbnail_url atualizadas`);

    await pool.end();
    console.log('✅ Migração concluída!');

  } catch (error) {
    console.error('❌ Erro:', error);
    await pool.end();
  }
}

migrateOldUrls();