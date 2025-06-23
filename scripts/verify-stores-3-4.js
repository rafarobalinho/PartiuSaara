import pkg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function verifyStores34() {
  const client = await pool.connect();

  try {
    console.log('🔍 VERIFICAÇÃO COMPLETA - LOJAS 3 e 4');
    console.log('='.repeat(50));

    // 1. Verificar dados no banco
    console.log('\n📊 1. DADOS NO BANCO DE DADOS:');
    const storeImages = await client.query(`
      SELECT si.*, s.name as store_name 
      FROM store_images si 
      JOIN stores s ON si.store_id = s.id 
      WHERE si.store_id IN (3, 4) 
      ORDER BY si.store_id, si.is_primary DESC
    `);

    if (storeImages.rows.length === 0) {
      console.log('❌ Nenhum registro encontrado para lojas 3 e 4');
    } else {
      storeImages.rows.forEach(img => {
        console.log(`✅ Loja ${img.store_id} (${img.store_name}):`);
        console.log(`   - ID: ${img.id}`);
        console.log(`   - Filename: ${img.filename}`);
        console.log(`   - Thumbnail: ${img.thumbnail_filename}`);
        console.log(`   - Primary: ${img.is_primary}`);
        console.log(`   - Created: ${img.created_at}`);
      });
    }

    // 2. Verificar arquivos físicos
    console.log('\n📁 2. ARQUIVOS FÍSICOS:');

    const stores = [3, 4];
    const expectedFiles = {
      3: '1746934665553-131736427.jpg',
      4: '1746574875959-463379720.jpg'
    };

    for (const storeId of stores) {
      console.log(`\n🏪 Loja ${storeId}:`);

      // Verificar pasta principal
      const storePath = path.join(process.cwd(), 'public', 'uploads', 'stores', storeId.toString());
      const thumbnailPath = path.join(storePath, 'thumbnails');

      console.log(`   Pasta principal: ${storePath}`);
      if (fs.existsSync(storePath)) {
        const files = fs.readdirSync(storePath).filter(f => !fs.statSync(path.join(storePath, f)).isDirectory());
        console.log(`   ✅ Arquivos encontrados: ${files.length}`);
        files.forEach(file => {
          console.log(`      - ${file}`);
          if (file === expectedFiles[storeId]) {
            console.log(`      ✅ Arquivo esperado encontrado!`);
          }
        });
      } else {
        console.log(`   ❌ Pasta não existe`);
      }

      // Verificar pasta de thumbnails
      console.log(`   Pasta thumbnails: ${thumbnailPath}`);
      if (fs.existsSync(thumbnailPath)) {
        const thumbFiles = fs.readdirSync(thumbnailPath);
        console.log(`   ✅ Thumbnails encontrados: ${thumbFiles.length}`);
        thumbFiles.forEach(file => {
          console.log(`      - ${file}`);
        });
      } else {
        console.log(`   ❌ Pasta thumbnails não existe`);
      }
    }

    // 3. Verificar pasta legada (para Loja 3)
    console.log('\n👻 3. VERIFICAR PASTA LEGADA:');
    const legacyPath = path.join(process.cwd(), 'public', 'uploads', 'thumbnails');
    if (fs.existsSync(legacyPath)) {
      const legacyFiles = fs.readdirSync(legacyPath);
      const store3File = legacyFiles.find(f => f === expectedFiles[3]);
      if (store3File) {
        console.log(`   ⚠️ Arquivo da Loja 3 ainda na pasta legada: ${store3File}`);
        console.log(`   📍 Localização: ${path.join(legacyPath, store3File)}`);
      } else {
        console.log(`   ✅ Arquivo da Loja 3 não está mais na pasta legada`);
      }
    } else {
      console.log(`   ✅ Pasta legada não existe`);
    }

    // 4. Testar APIs (simulação)
    console.log('\n🌐 4. STATUS DAS APIS:');
    for (const storeId of stores) {
      const hasDbRecord = storeImages.rows.some(img => img.store_id === storeId);
      const hasFile = fs.existsSync(path.join(process.cwd(), 'public', 'uploads', 'stores', storeId.toString(), expectedFiles[storeId]));

      console.log(`   Loja ${storeId}:`);
      console.log(`   - Registro no banco: ${hasDbRecord ? '✅' : '❌'}`);
      console.log(`   - Arquivo físico: ${hasFile ? '✅' : '❌'}`);
      console.log(`   - API funcionará: ${hasDbRecord && hasFile ? '✅ SIM' : '❌ NÃO'}`);
    }

    // 5. Resumo e recomendações
    console.log('\n📋 5. RESUMO E PRÓXIMOS PASSOS:');

    const store3HasDb = storeImages.rows.some(img => img.store_id === 3);
    const store3HasFile = fs.existsSync(path.join(process.cwd(), 'public', 'uploads', 'stores', '3', expectedFiles[3]));
    const store3InLegacy = fs.existsSync(path.join(process.cwd(), 'public', 'uploads', 'thumbnails', expectedFiles[3]));

    const store4HasDb = storeImages.rows.some(img => img.store_id === 4);
    const store4HasFile = fs.existsSync(path.join(process.cwd(), 'public', 'uploads', 'stores', '4', expectedFiles[4]));

    if (!store3HasFile && store3InLegacy) {
      console.log('🔧 Loja 3: Precisa mover arquivo da pasta legada');
      console.log(`   Comando: mv public/uploads/thumbnails/${expectedFiles[3]} public/uploads/stores/3/`);
    }

    if (!store4HasDb && store4HasFile) {
      console.log('🔧 Loja 4: Precisa criar registro no banco');
      console.log('   Execute: npx tsx scripts/fix-store-4-database.js');
    }

    if (store3HasDb && store3HasFile && store4HasDb && store4HasFile) {
      console.log('🎉 Ambas as lojas estão corretas! As imagens devem aparecer.');
    }

  } catch (error) {
    console.error('❌ Erro durante verificação:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar a verificação
verifyStores34()
  .then(() => {
    console.log('\n✅ Verificação concluída');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
