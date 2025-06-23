import pkg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function safeCleanup() {
  const client = await pool.connect();

  try {
    console.log('🧹 FASE 1: LIMPEZA SEGURA DOS REGISTROS ÓRFÃOS');
    console.log('='.repeat(55));

    // 1. ANÁLISE INICIAL
    console.log('\n📊 1. ANÁLISE INICIAL:');

    const totalRecords = await client.query('SELECT COUNT(*) as count FROM store_images');
    console.log(`   Total de registros: ${totalRecords.rows[0].count}`);

    const primaryRecords = await client.query('SELECT COUNT(*) as count FROM store_images WHERE is_primary = true');
    console.log(`   Registros primários: ${primaryRecords.rows[0].count}`);

    const storesWithImages = await client.query('SELECT COUNT(DISTINCT store_id) as count FROM store_images');
    console.log(`   Lojas com imagens: ${storesWithImages.rows[0].count}`);

    // 2. IDENTIFICAR REGISTROS A MANTER E DELETAR
    console.log('\n🔍 2. ANÁLISE POR LOJA:');

    const storeAnalysis = await client.query(`
      SELECT 
        store_id,
        COUNT(*) as total_images,
        COUNT(*) FILTER (WHERE is_primary = true) as primary_count,
        array_agg(id ORDER BY created_at DESC) as image_ids,
        array_agg(filename ORDER BY created_at DESC) as filenames
      FROM store_images 
      GROUP BY store_id 
      ORDER BY store_id
    `);

    let toKeep = [];
    let toDelete = [];

    for (const store of storeAnalysis.rows) {
      console.log(`\n   🏪 Loja ${store.store_id}:`);
      console.log(`      - Total de imagens: ${store.total_images}`);
      console.log(`      - Imagens primárias: ${store.primary_count}`);

      // Estratégia: manter apenas a imagem mais recente (primeira no array)
      const mostRecentId = store.image_ids[0];
      const mostRecentFilename = store.filenames[0];

      toKeep.push({
        id: mostRecentId,
        store_id: store.store_id,
        filename: mostRecentFilename
      });

      // Marcar o resto para deletar
      const idsToDelete = store.image_ids.slice(1);
      const filenamesToDelete = store.filenames.slice(1);

      idsToDelete.forEach((id, index) => {
        toDelete.push({
          id,
          store_id: store.store_id,
          filename: filenamesToDelete[index]
        });
      });

      console.log(`      ✅ Manter: ID ${mostRecentId} (${mostRecentFilename})`);
      if (idsToDelete.length > 0) {
        console.log(`      🗑️ Deletar: ${idsToDelete.length} registros órfãos`);
      }
    }

    console.log(`\n📋 RESUMO:`);
    console.log(`   ✅ Registros a manter: ${toKeep.length}`);
    console.log(`   🗑️ Registros a deletar: ${toDelete.length}`);

    // 3. CONFIRMAR ANTES DE PROSSEGUIR
    if (toDelete.length === 0) {
      console.log('\n🎉 Nenhuma limpeza necessária! Sistema já está otimizado.');
      return;
    }

    console.log('\n⚠️  ATENÇÃO: Esta operação irá:');
    console.log(`   - Deletar ${toDelete.length} registros órfãos do banco`);
    console.log(`   - Deletar arquivos físicos correspondentes`);
    console.log(`   - Manter apenas 1 imagem por loja (a mais recente)`);

    // Para ambiente de produção, adicionar confirmação
    // const readline = require('readline');
    // const rl = readline.createInterface({input: process.stdin, output: process.stdout});
    // const answer = await new Promise(resolve => rl.question('Continuar? (y/N): ', resolve));
    // if (answer.toLowerCase() !== 'y') { console.log('Operação cancelada.'); return; }

    // 4. DELETAR ARQUIVOS FÍSICOS ÓRFÃOS
    console.log('\n🗑️ 3. DELETANDO ARQUIVOS FÍSICOS ÓRFÃOS:');

    let filesDeleted = 0;

    for (const record of toDelete) {
      const storeDir = path.join(process.cwd(), 'public', 'uploads', 'stores', String(record.store_id));
      const thumbnailDir = path.join(storeDir, 'thumbnails');

      // Deletar arquivo principal
      const mainFile = path.join(storeDir, record.filename);
      if (fs.existsSync(mainFile)) {
        fs.unlinkSync(mainFile);
        console.log(`   🗑️ Deletado: ${mainFile}`);
        filesDeleted++;
      }

      // Deletar thumbnail
      const thumbFile = path.join(thumbnailDir, record.filename);
      if (fs.existsSync(thumbFile)) {
        fs.unlinkSync(thumbFile);
        console.log(`   🗑️ Deletado: ${thumbFile}`);
        filesDeleted++;
      }
    }

    console.log(`   📊 Total de arquivos deletados: ${filesDeleted}`);

    // 5. DELETAR REGISTROS DO BANCO
    console.log('\n🗄️ 4. DELETANDO REGISTROS DO BANCO:');

    if (toDelete.length > 0) {
      const idsToDelete = toDelete.map(r => r.id);
      const result = await client.query(
        'DELETE FROM store_images WHERE id = ANY($1)',
        [idsToDelete]
      );

      console.log(`   ✅ ${result.rowCount} registros deletados do banco`);
    }

    // 6. GARANTIR QUE REGISTROS MANTIDOS SÃO PRIMÁRIOS
    console.log('\n✅ 5. CONFIGURANDO IMAGENS PRIMÁRIAS:');

    for (const record of toKeep) {
      await client.query(
        'UPDATE store_images SET is_primary = true WHERE id = $1',
        [record.id]
      );
      console.log(`   ✅ Loja ${record.store_id}: Imagem ID ${record.id} definida como primária`);
    }

    // 7. ADICIONAR REGISTRO PARA LOJA 4 SE NECESSÁRIO
    console.log('\n🔧 6. VERIFICANDO LOJA 4:');

    const store4Check = await client.query('SELECT * FROM store_images WHERE store_id = 4');
    if (store4Check.rows.length === 0) {
      // Verificar se arquivo existe
      const store4File = path.join(process.cwd(), 'public', 'uploads', 'stores', '4', '1746574875959-463379720.jpg');
      if (fs.existsSync(store4File)) {
        await client.query(`
          INSERT INTO store_images (store_id, filename, thumbnail_filename, is_primary, display_order, created_at)
          VALUES (4, '1746574875959-463379720.jpg', '1746574875959-463379720.jpg', true, 0, NOW())
        `);
        console.log('   ✅ Registro criado para Loja 4');

        // Criar thumbnail se não existir
        const thumbnailDir = path.join(process.cwd(), 'public', 'uploads', 'stores', '4', 'thumbnails');
        const thumbnailFile = path.join(thumbnailDir, '1746574875959-463379720.jpg');

        if (!fs.existsSync(thumbnailDir)) {
          fs.mkdirSync(thumbnailDir, { recursive: true });
        }

        if (!fs.existsSync(thumbnailFile)) {
          fs.copyFileSync(store4File, thumbnailFile);
          console.log('   ✅ Thumbnail criado para Loja 4');
        }
      } else {
        console.log('   ⚠️ Arquivo da Loja 4 não encontrado fisicamente');
      }
    } else {
      console.log('   ✅ Loja 4 já possui registro no banco');
    }

    // 8. VERIFICAÇÃO FINAL
    console.log('\n📊 7. VERIFICAÇÃO FINAL:');

    const finalStats = await client.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE is_primary = true) as primary_records,
        COUNT(DISTINCT store_id) as stores_with_images
      FROM store_images
    `);

    const stats = finalStats.rows[0];
    console.log(`   ✅ Total de registros: ${stats.total_records}`);
    console.log(`   ✅ Registros primários: ${stats.primary_records}`);
    console.log(`   ✅ Lojas com imagens: ${stats.stores_with_images}`);

    console.log('\n🎉 LIMPEZA CONCLUÍDA COM SUCESSO!');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('   1. Reiniciar o servidor');
    console.log('   2. Testar APIs de imagem: /api/stores/3/primary-image e /api/stores/4/primary-image');
    console.log('   3. Verificar se logos aparecem nas páginas');

  } catch (error) {
    console.error('❌ Erro durante limpeza:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar limpeza
safeCleanup()
  .then(() => {
    console.log('\n✅ Script executado com sucesso');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });