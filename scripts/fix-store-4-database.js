
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixStore4Database() {
  try {
    console.log('🔧 Corrigindo registro da loja 4...');

    // Verificar se já existe registro
    const existingResult = await pool.query(
      'SELECT * FROM store_images WHERE store_id = 4'
    );

    if (existingResult.rows.length > 0) {
      console.log('✅ Loja 4 já tem registro no banco');
      return;
    }

    // Inserir registro da imagem que existe fisicamente
    const insertResult = await pool.query(`
      INSERT INTO store_images (store_id, filename, thumbnail_filename, is_primary, display_order, created_at)
      VALUES (4, '1746574875959-463379720.jpg', '1746574875959-463379720.jpg', true, 0, NOW())
      RETURNING *
    `);

    console.log('✅ Registro criado para loja 4:', insertResult.rows[0]);

    // Verificar se registro foi criado
    const verifyResult = await pool.query(
      'SELECT * FROM store_images WHERE store_id = 4'
    );

    console.log('📋 Registros da loja 4:', verifyResult.rows);

  } catch (error) {
    console.error('❌ Erro ao corrigir loja 4:', error);
  } finally {
    await pool.end();
  }
}

fixStore4Database();
