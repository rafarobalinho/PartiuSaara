
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

const { Client } = pg;

// Carregar variáveis de ambiente
dotenv.config();

console.log('🚀 Iniciando migração final para estrutura segura de imagens...');

async function migrateToSecureStructure() {
  // Usar Client em vez de Pool para evitar problemas de WebSocket
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados');

    // 1. Buscar todos os produtos com imagens
    console.log('📋 Buscando produtos com imagens...');
    const productsResult = await client.query(`
      SELECT p.id, p.store_id, p.name, 
             array_agg(pi.image_url ORDER BY pi.id) as images
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE pi.image_url IS NOT NULL
      GROUP BY p.id, p.store_id, p.name
      ORDER BY p.id
    `);

    console.log(`📊 Encontrados ${productsResult.rows.length} produtos com imagens`);

    for (const product of productsResult.rows) {
      console.log(`\n🔧 Processando produto ${product.id} (${product.name})`);

      const storeDir = path.join(process.cwd(), 'public', 'uploads', 'stores', product.store_id.toString());
      const productDir = path.join(storeDir, 'products', product.id.toString());
      const thumbnailDir = path.join(productDir, 'thumbnails');

      // Criar estrutura de diretórios
      if (!fs.existsSync(productDir)) {
        fs.mkdirSync(productDir, { recursive: true });
        console.log(`📁 Criado diretório: ${productDir}`);
      }

      if (!fs.existsSync(thumbnailDir)) {
        fs.mkdirSync(thumbnailDir, { recursive: true });
        console.log(`📁 Criado diretório: ${thumbnailDir}`);
      }

      const updatedImages = [];

      for (const imageUrl of product.images) {
        if (!imageUrl || imageUrl.startsWith('blob:')) continue;

        // Normalizar URL da imagem
        let cleanUrl = imageUrl;
        if (cleanUrl.startsWith('/')) cleanUrl = cleanUrl.substring(1);
        if (cleanUrl.startsWith('uploads/')) cleanUrl = cleanUrl.substring(8);

        const oldPath = path.join(process.cwd(), 'public', 'uploads', cleanUrl);
        const fileName = path.basename(cleanUrl);
        const newPath = path.join(productDir, fileName);
        const newUrl = `/uploads/stores/${product.store_id}/products/${product.id}/${fileName}`;

        try {
          if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
            // Mover arquivo para nova estrutura
            fs.copyFileSync(oldPath, newPath);
            console.log(`📋 Movido: ${cleanUrl} → ${newUrl}`);

            // Tentar remover arquivo antigo (se não estiver sendo usado por outros)
            try {
              fs.unlinkSync(oldPath);
            } catch (e) {
              // Arquivo pode estar sendo usado por outros produtos
            }
          }

          updatedImages.push(newUrl);
        } catch (error) {
          console.warn(`⚠️ Erro ao processar ${cleanUrl}:`, error.message);
          // Manter URL original se houver erro
          updatedImages.push(imageUrl);
        }
      }

      if (updatedImages.length > 0) {
        // Atualizar URLs no banco de dados
        await client.query('DELETE FROM product_images WHERE product_id = $1', [product.id]);

        for (let i = 0; i < updatedImages.length; i++) {
          // Gerar thumbnail_url baseado na image_url (mesmo padrão que o resto do sistema)
          const thumbnailUrl = updatedImages[i].replace('/products/', '/products/').replace(/\/([^\/]+)$/, '/thumbnails/$1');
          
          await client.query(
            'INSERT INTO product_images (product_id, image_url, thumbnail_url, is_primary, display_order) VALUES ($1, $2, $3, $4, $5)',
            [product.id, updatedImages[i], thumbnailUrl, i === 0, i]
          );
        }

        console.log(`✅ Atualizadas ${updatedImages.length} imagens para produto ${product.id}`);
      }
    }

    console.log('\n🧹 Limpando arquivos órfãos...');

    // Limpar diretório uploads raiz (manter apenas estrutura necessária)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const items = fs.readdirSync(uploadsDir);

    for (const item of items) {
      const itemPath = path.join(uploadsDir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isFile() && !['placeholder-image.jpg', 'placeholder-unavailable.jpg', 'placeholder-error.jpg'].includes(item)) {
        try {
          fs.unlinkSync(itemPath);
          console.log(`🗑️ Removido arquivo órfão: ${item}`);
        } catch (e) {
          console.warn(`⚠️ Não foi possível remover: ${item}`);
        }
      }
    }

    console.log('\n✅ Migração concluída com sucesso!');
    console.log('📋 Resumo:');
    console.log(`- ${productsResult.rows.length} produtos processados`);
    console.log('- Estrutura segura implementada');
    console.log('- URLs atualizadas no banco de dados');

  } catch (error) {
    console.error('❌ Erro durante migração:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Executar migração
migrateToSecureStructure()
  .then(() => {
    console.log('🎉 Script finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha na migração:', error);
    process.exit(1);
  });
