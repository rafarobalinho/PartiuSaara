
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

(async () => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.name, p.store_id, COUNT(pi.id) as image_count
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      GROUP BY p.id, p.name, p.store_id
      ORDER BY p.id
      LIMIT 10
    `);
    console.log('📊 Produtos e suas imagens:');
    result.rows.forEach(row => {
      console.log(`Produto ${row.id} (${row.name}) - Loja ${row.store_id}: ${row.image_count} imagens`);
    });
    await pool.end();
  } catch (error) {
    console.error('Erro:', error);
  }
})();
