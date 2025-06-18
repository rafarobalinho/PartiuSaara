
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuração para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixProduct11() {
  const client = await pool.connect();

  try {
    console.log('🔧 Corrigindo produto 11...');

    // 1. Verificar se o produto 11 existe
    const productResult = await client.query('SELECT id, store_id, name FROM products WHERE id = $1', [11]);

    if (productResult.rows.length === 0) {
      console.log('❌ Produto 11 não encontrado no banco de dados');
      return;
    }

    const product = productResult.rows[0];
    console.log('✅ Produto encontrado:', product);

    // 2. Verificar imagens existentes no banco
    const imagesResult = await client.query('SELECT * FROM product_images WHERE product_id = $1', [11]);
    console.log('📸 Imagens no banco:', imagesResult.rows);

    // 3. Verificar arquivos físicos
    const productDir = path.join(process.cwd(), 'public', 'uploads', 'stores', product.store_id.toString(), 'products', '11');
    console.log('📁 Verificando diretório:', productDir);

    if (fs.existsSync(productDir)) {
      const files = fs.readdirSync(productDir);
      const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));

      console.log('📷 Arquivos de imagem encontrados:', imageFiles);

      if (imageFiles.length > 0 && imagesResult.rows.length === 0) {
        console.log('🔧 Criando registro no banco para imagem órfã...');

        const imageFile = imageFiles[0];
        const imageUrl = `/uploads/stores/${product.store_id}/products/11/${imageFile}`;
        const thumbnailUrl = `/uploads/stores/${product.store_id}/products/11/thumbnails/${imageFile}`;

        // Inserir registro da imagem no banco
        const insertResult = await client.query(`
          INSERT INTO product_images (product_id, image_url, thumbnail_url, is_primary, display_order)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `, [11, imageUrl, thumbnailUrl, true, 0]);

        console.log('✅ Imagem registrada no banco com ID:', insertResult.rows[0].id);
      }
    } else {
      console.log('❌ Diretório do produto 11 não existe');
    }

    // 4. Verificação final
    const finalCheck = await client.query('SELECT * FROM product_images WHERE product_id = $1', [11]);
    console.log('🎯 Estado final - Imagens do produto 11:', finalCheck.rows);

  } catch (error) {
    console.error('❌ Erro ao corrigir produto 11:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixProduct11();