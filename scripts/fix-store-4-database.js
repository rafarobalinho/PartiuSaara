import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixStore4Database() {
  const client = await pool.connect();

  try {
    console.log('🔧 Corrigindo banco de dados da Loja 4...');

    // 1. Verificar se a loja 4 existe
    const storeCheck = await client.query('SELECT id, name FROM stores WHERE id = 4');
    if (storeCheck.rows.length === 0) {
      console.log('❌ Loja 4 não encontrada na tabela stores');
      return;
    }

    console.log(`✅ Loja encontrada: ${storeCheck.rows[0].name}`);

    // 2. Verificar se já existe registro de imagem
    const existingImage = await client.query('SELECT * FROM store_images WHERE store_id = 4');
    if (existingImage.rows.length > 0) {
      console.log('⚠️ Loja 4 já tem registros de imagem - sobrescrevendo...');
      await client.query('DELETE FROM store_images WHERE store_id = 4');
    }

    // 3. Inserir novo registro para o arquivo que existe fisicamente
    const filename = '1746574875959-463379720.jpg';

    const insertQuery = `
      INSERT INTO store_images (store_id, filename, thumbnail_filename, is_primary, display_order, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id
    `;

    const result = await client.query(insertQuery, [
      4,                    // store_id
      filename,             // filename
      filename,             // thumbnail_filename
      true,                 // is_primary
      0                     // display_order
    ]);

    console.log(`✅ Registro criado com sucesso!`);
    console.log(`   - ID do registro: ${result.rows[0].id}`);
    console.log(`   - Filename: ${filename}`);
    console.log(`   - Primary: true`);

    console.log('\n🎉 Correção concluída! A API /api/stores/4/primary-image deve funcionar agora.');

  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixStore4Database()
  .then(() => {
    console.log('✅ Script executado com sucesso');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
