
#!/usr/bin/env node

/**
 * Script para corrigir a localização das imagens de loja
 * Move arquivos de /uploads/thumbnails/ para /uploads/stores/{id}/
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixStoreImagesLocation() {
  try {
    console.log('🔧 CORREÇÃO DE LOCALIZAÇÃO DAS IMAGENS DE LOJA');
    console.log('=' .repeat(60));
    
    await client.connect();
    
    const baseUploadPath = path.join(process.cwd(), 'public', 'uploads');
    const thumbnailsPath = path.join(baseUploadPath, 'thumbnails');
    const storesPath = path.join(baseUploadPath, 'stores');
    
    // 1. Buscar todas as imagens de lojas no banco
    console.log('\n📋 1. BUSCANDO IMAGENS DE LOJAS NO BANCO...');
    
    const result = await client.query(`
      SELECT store_id, filename, is_primary, id
      FROM store_images 
      ORDER BY store_id, is_primary DESC
    `);
    
    console.log(`Encontradas ${result.rows.length} imagens de lojas registradas`);
    
    let moved = 0;
    let alreadyCorrect = 0;
    let notFound = 0;
    
    // 2. Verificar e mover cada arquivo
    for (const image of result.rows) {
      const { store_id, filename, is_primary } = image;
      
      console.log(`\n🔍 Verificando: Loja ${store_id} - ${filename} ${is_primary ? '(PRIMARY)' : ''}`);
      
      // Criar diretório da loja se não existir
      const storeDir = path.join(storesPath, store_id.toString());
      if (!fs.existsSync(storeDir)) {
        fs.mkdirSync(storeDir, { recursive: true });
        console.log(`  📁 Criado diretório: stores/${store_id}/`);
      }
      
      // Verificar se arquivo já está no local correto
      const correctPath = path.join(storeDir, filename);
      if (fs.existsSync(correctPath)) {
        console.log(`  ✅ Arquivo já está no local correto`);
        alreadyCorrect++;
        continue;
      }
      
      // Procurar arquivo no local legado (thumbnails)
      const legacyPath = path.join(thumbnailsPath, filename);
      if (fs.existsSync(legacyPath)) {
        console.log(`  🔄 Movendo de thumbnails/ para stores/${store_id}/`);
        fs.renameSync(legacyPath, correctPath);
        console.log(`  ✅ Arquivo movido com sucesso`);
        moved++;
      } else {
        console.log(`  ❌ Arquivo não encontrado em nenhum local`);
        notFound++;
      }
    }
    
    // 3. Criar diretórios de thumbnails para as lojas se necessário
    console.log('\n📁 3. CRIANDO ESTRUTURA DE THUMBNAILS...');
    
    const storeIds = [...new Set(result.rows.map(r => r.store_id))];
    for (const storeId of storeIds) {
      const thumbDir = path.join(storesPath, storeId.toString(), 'thumbnails');
      if (!fs.existsSync(thumbDir)) {
        fs.mkdirSync(thumbDir, { recursive: true });
        console.log(`  ✅ Criado: stores/${storeId}/thumbnails/`);
      }
    }
    
    // 4. Relatório final
    console.log('\n📊 RELATÓRIO FINAL:');
    console.log(`✅ Arquivos já corretos: ${alreadyCorrect}`);
    console.log(`🔄 Arquivos movidos: ${moved}`);
    console.log(`❌ Arquivos não encontrados: ${notFound}`);
    
    if (moved > 0) {
      console.log('\n🎉 CORREÇÃO CONCLUÍDA! As imagens de loja devem aparecer agora.');
    } else if (alreadyCorrect > 0) {
      console.log('\n✅ Estrutura já estava correta!');
    } else {
      console.log('\n⚠️ Nenhum arquivo foi encontrado. Pode ser necessário recriar as imagens.');
    }
    
  } catch (error) {
    console.error('❌ Erro durante correção:', error);
  } finally {
    await client.end();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  fixStoreImagesLocation();
}

module.exports = { fixStoreImagesLocation };
