/**
 * Script de verificação de mapeamento entre imagens e produtos
 * 
 * Este script:
 * 1. Verifica se cada imagem está associada ao produto correto
 * 2. Detecta casos onde imagens de um produto são exibidas para outro
 * 3. Gera relatório de problemas encontrados
 * 4. Corrige automaticamente problemas comuns
 */

const { pool } = require('../server/db.js');
const fs = require('fs');
const path = require('path');

// Cores para melhor legibilidade no console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Verifica o mapeamento entre imagens e produtos
 */
async function verifyProductImageMapping() {
  const client = await pool.connect();
  
  try {
    console.log(`\n${colors.blue}=== Verificando mapeamento entre imagens e produtos ===${colors.reset}`);
    
    // Buscar todas as imagens de produtos
    const result = await client.query(`
      SELECT pi.id, pi.product_id, pi.image_url, p.store_id, p.name as product_name, s.name as store_name
      FROM product_images pi
      JOIN products p ON pi.product_id = p.id
      JOIN stores s ON p.store_id = s.id
      ORDER BY pi.product_id, pi.id
    `);
    
    console.log(`${colors.blue}Encontradas ${result.rows.length} imagens de produtos para verificação${colors.reset}`);
    
    let problemCount = 0;
    let fixedCount = 0;
    
    // Verificar cada imagem
    for (const row of result.rows) {
      const { id, product_id, image_url, store_id, product_name, store_name } = row;
      
      // Verificar se o caminho da imagem segue o padrão esperado para o produto
      const expectedPattern = `/uploads/stores/${store_id}/products/${product_id}/`;
      
      if (!image_url.includes(expectedPattern)) {
        problemCount++;
        console.log(`\n${colors.yellow}⚠️ Problema #${problemCount}: Imagem ${id} do produto "${product_name}" (ID: ${product_id})${colors.reset}`);
        console.log(`${colors.yellow}   Loja: "${store_name}" (ID: ${store_id})${colors.reset}`);
        console.log(`${colors.yellow}   Caminho atual: ${image_url}${colors.reset}`);
        console.log(`${colors.yellow}   Padrão esperado: ${expectedPattern}${colors.reset}`);
        
        // Analisar o caminho para ver se está mapeado para outro produto
        const matches = image_url.match(/\/uploads\/stores\/(\d+)\/products\/(\d+)\//);
        
        if (matches) {
          const pathStoreId = parseInt(matches[1]);
          const pathProductId = parseInt(matches[2]);
          
          if (pathProductId !== product_id || pathStoreId !== store_id) {
            console.log(`${colors.red}❌ ALERTA: Imagem mapeada incorretamente!${colors.reset}`);
            console.log(`${colors.red}   Caminho aponta para: Loja ${pathStoreId}, Produto ${pathProductId}${colors.reset}`);
            console.log(`${colors.red}   Mas pertence a: Loja ${store_id}, Produto ${product_id}${colors.reset}`);
            
            // Verificar se a imagem existe fisicamente no caminho atual
            const physicalPath = path.join(process.cwd(), 'public', image_url);
            const imageExists = fs.existsSync(physicalPath);
            
            console.log(`${imageExists ? colors.green + '✓' : colors.red + '❌'} Arquivo existe no caminho atual: ${imageExists}${colors.reset}`);
            
            if (imageExists) {
              // Corrigir o mapeamento no banco
              const fileName = image_url.split('/').pop();
              const correctPath = `/uploads/stores/${store_id}/products/${product_id}/${fileName}`;
              
              // Verificar/criar diretório de destino
              const correctDir = path.join(process.cwd(), 'public', `/uploads/stores/${store_id}/products/${product_id}`);
              if (!fs.existsSync(correctDir)) {
                fs.mkdirSync(correctDir, { recursive: true });
                console.log(`${colors.green}✓ Diretório criado: ${correctDir}${colors.reset}`);
              }
              
              // Copiar o arquivo para o caminho correto
              try {
                fs.copyFileSync(physicalPath, path.join(process.cwd(), 'public', correctPath));
                console.log(`${colors.green}✓ Arquivo copiado para caminho correto${colors.reset}`);
                
                // Atualizar o registro no banco de dados
                await client.query(
                  `UPDATE product_images SET image_url = $1 WHERE id = $2`,
                  [correctPath, id]
                );
                
                console.log(`${colors.green}✓ Registro atualizado no banco de dados${colors.reset}`);
                fixedCount++;
              } catch (copyError) {
                console.error(`${colors.red}❌ Erro ao copiar arquivo: ${copyError.message}${colors.reset}`);
              }
            }
          }
        } else {
          // Padrão de caminho desconhecido
          console.log(`${colors.red}❌ Padrão de caminho não reconhecido${colors.reset}`);
          
          // Tentar extrair nome do arquivo
          const fileName = image_url.split('/').pop();
          
          if (fileName) {
            const correctPath = `/uploads/stores/${store_id}/products/${product_id}/${fileName}`;
            console.log(`${colors.blue}ℹ️ Caminho sugerido: ${correctPath}${colors.reset}`);
            
            // Verificar se o arquivo existe no caminho original
            const originalPath = path.join(process.cwd(), 'public', image_url);
            const imageExists = fs.existsSync(originalPath);
            
            console.log(`${imageExists ? colors.green + '✓' : colors.red + '❌'} Arquivo existe no caminho original: ${imageExists}${colors.reset}`);
            
            if (imageExists) {
              // Verificar/criar diretório de destino
              const correctDir = path.join(process.cwd(), 'public', `/uploads/stores/${store_id}/products/${product_id}`);
              if (!fs.existsSync(correctDir)) {
                fs.mkdirSync(correctDir, { recursive: true });
                console.log(`${colors.green}✓ Diretório criado: ${correctDir}${colors.reset}`);
              }
              
              // Copiar o arquivo para o caminho correto
              try {
                fs.copyFileSync(originalPath, path.join(process.cwd(), 'public', correctPath));
                console.log(`${colors.green}✓ Arquivo copiado para caminho correto${colors.reset}`);
                
                // Atualizar o registro no banco de dados
                await client.query(
                  `UPDATE product_images SET image_url = $1 WHERE id = $2`,
                  [correctPath, id]
                );
                
                console.log(`${colors.green}✓ Registro atualizado no banco de dados${colors.reset}`);
                fixedCount++;
              } catch (copyError) {
                console.error(`${colors.red}❌ Erro ao copiar arquivo: ${copyError.message}${colors.reset}`);
              }
            }
          }
        }
      }
    }
    
    console.log(`\n${colors.blue}=== Resultados da verificação ===${colors.reset}`);
    console.log(`${colors.blue}Total de imagens verificadas: ${result.rows.length}${colors.reset}`);
    console.log(`${colors.yellow}Problemas encontrados: ${problemCount}${colors.reset}`);
    console.log(`${colors.green}Problemas corrigidos: ${fixedCount}${colors.reset}`);
    
    if (problemCount === 0) {
      console.log(`${colors.green}✓ Nenhum problema de mapeamento encontrado!${colors.reset}`);
    } else if (problemCount === fixedCount) {
      console.log(`${colors.green}✓ Todos os problemas foram corrigidos!${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️ ${problemCount - fixedCount} problemas requerem atenção manual.${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}❌ Erro ao verificar mapeamento de imagens: ${error.message}${colors.reset}`);
  } finally {
    client.release();
  }
}

/**
 * Verifica o mapeamento entre imagens e lojas
 */
async function verifyStoreImageMapping() {
  const client = await pool.connect();
  
  try {
    console.log(`\n${colors.blue}=== Verificando mapeamento entre imagens e lojas ===${colors.reset}`);
    
    // Buscar todas as imagens de lojas
    const result = await client.query(`
      SELECT si.id, si.store_id, si.image_url, s.name as store_name
      FROM store_images si
      JOIN stores s ON si.store_id = s.id
      ORDER BY si.store_id, si.id
    `);
    
    console.log(`${colors.blue}Encontradas ${result.rows.length} imagens de lojas para verificação${colors.reset}`);
    
    let problemCount = 0;
    let fixedCount = 0;
    
    // Verificar cada imagem
    for (const row of result.rows) {
      const { id, store_id, image_url, store_name } = row;
      
      // Verificar se o caminho da imagem segue o padrão esperado para a loja
      const expectedPattern = `/uploads/stores/${store_id}/`;
      
      if (!image_url.includes(expectedPattern)) {
        problemCount++;
        console.log(`\n${colors.yellow}⚠️ Problema #${problemCount}: Imagem ${id} da loja "${store_name}" (ID: ${store_id})${colors.reset}`);
        console.log(`${colors.yellow}   Caminho atual: ${image_url}${colors.reset}`);
        console.log(`${colors.yellow}   Padrão esperado: ${expectedPattern}${colors.reset}`);
        
        // Analisar o caminho para ver se está mapeado para outra loja
        const matches = image_url.match(/\/uploads\/stores\/(\d+)\//);
        
        if (matches) {
          const pathStoreId = parseInt(matches[1]);
          
          if (pathStoreId !== store_id) {
            console.log(`${colors.red}❌ ALERTA: Imagem mapeada incorretamente!${colors.reset}`);
            console.log(`${colors.red}   Caminho aponta para: Loja ${pathStoreId}${colors.reset}`);
            console.log(`${colors.red}   Mas pertence a: Loja ${store_id}${colors.reset}`);
            
            // Verificar se a imagem existe fisicamente no caminho atual
            const physicalPath = path.join(process.cwd(), 'public', image_url);
            const imageExists = fs.existsSync(physicalPath);
            
            console.log(`${imageExists ? colors.green + '✓' : colors.red + '❌'} Arquivo existe no caminho atual: ${imageExists}${colors.reset}`);
            
            if (imageExists) {
              // Corrigir o mapeamento no banco
              const fileName = image_url.split('/').pop();
              const correctPath = `/uploads/stores/${store_id}/${fileName}`;
              
              // Verificar/criar diretório de destino
              const correctDir = path.join(process.cwd(), 'public', `/uploads/stores/${store_id}`);
              if (!fs.existsSync(correctDir)) {
                fs.mkdirSync(correctDir, { recursive: true });
                console.log(`${colors.green}✓ Diretório criado: ${correctDir}${colors.reset}`);
              }
              
              // Copiar o arquivo para o caminho correto
              try {
                fs.copyFileSync(physicalPath, path.join(process.cwd(), 'public', correctPath));
                console.log(`${colors.green}✓ Arquivo copiado para caminho correto${colors.reset}`);
                
                // Atualizar o registro no banco de dados
                await client.query(
                  `UPDATE store_images SET image_url = $1 WHERE id = $2`,
                  [correctPath, id]
                );
                
                console.log(`${colors.green}✓ Registro atualizado no banco de dados${colors.reset}`);
                fixedCount++;
              } catch (copyError) {
                console.error(`${colors.red}❌ Erro ao copiar arquivo: ${copyError.message}${colors.reset}`);
              }
            }
          }
        } else {
          // Padrão de caminho desconhecido
          console.log(`${colors.red}❌ Padrão de caminho não reconhecido${colors.reset}`);
          
          // Tentar extrair nome do arquivo
          const fileName = image_url.split('/').pop();
          
          if (fileName) {
            const correctPath = `/uploads/stores/${store_id}/${fileName}`;
            console.log(`${colors.blue}ℹ️ Caminho sugerido: ${correctPath}${colors.reset}`);
            
            // Verificar se o arquivo existe no caminho original
            const originalPath = path.join(process.cwd(), 'public', image_url);
            const imageExists = fs.existsSync(originalPath);
            
            console.log(`${imageExists ? colors.green + '✓' : colors.red + '❌'} Arquivo existe no caminho original: ${imageExists}${colors.reset}`);
            
            if (imageExists) {
              // Verificar/criar diretório de destino
              const correctDir = path.join(process.cwd(), 'public', `/uploads/stores/${store_id}`);
              if (!fs.existsSync(correctDir)) {
                fs.mkdirSync(correctDir, { recursive: true });
                console.log(`${colors.green}✓ Diretório criado: ${correctDir}${colors.reset}`);
              }
              
              // Copiar o arquivo para o caminho correto
              try {
                fs.copyFileSync(originalPath, path.join(process.cwd(), 'public', correctPath));
                console.log(`${colors.green}✓ Arquivo copiado para caminho correto${colors.reset}`);
                
                // Atualizar o registro no banco de dados
                await client.query(
                  `UPDATE store_images SET image_url = $1 WHERE id = $2`,
                  [correctPath, id]
                );
                
                console.log(`${colors.green}✓ Registro atualizado no banco de dados${colors.reset}`);
                fixedCount++;
              } catch (copyError) {
                console.error(`${colors.red}❌ Erro ao copiar arquivo: ${copyError.message}${colors.reset}`);
              }
            }
          }
        }
      }
    }
    
    console.log(`\n${colors.blue}=== Resultados da verificação ===${colors.reset}`);
    console.log(`${colors.blue}Total de imagens verificadas: ${result.rows.length}${colors.reset}`);
    console.log(`${colors.yellow}Problemas encontrados: ${problemCount}${colors.reset}`);
    console.log(`${colors.green}Problemas corrigidos: ${fixedCount}${colors.reset}`);
    
    if (problemCount === 0) {
      console.log(`${colors.green}✓ Nenhum problema de mapeamento encontrado!${colors.reset}`);
    } else if (problemCount === fixedCount) {
      console.log(`${colors.green}✓ Todos os problemas foram corrigidos!${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️ ${problemCount - fixedCount} problemas requerem atenção manual.${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}❌ Erro ao verificar mapeamento de imagens: ${error.message}${colors.reset}`);
  } finally {
    client.release();
  }
}

/**
 * Função principal
 */
async function main() {
  console.log(`${colors.magenta}=== Iniciando verificação de mapeamento de imagens ===${colors.reset}`);
  
  try {
    // Verificar mapeamento entre imagens e produtos
    await verifyProductImageMapping();
    
    // Verificar mapeamento entre imagens e lojas
    await verifyStoreImageMapping();
    
    console.log(`\n${colors.green}=== Processo finalizado com sucesso ===${colors.reset}`);
  } catch (error) {
    console.error(`\n${colors.red}=== Erro durante o processo ===${colors.reset}`);
    console.error(error);
  } finally {
    // Fechar a conexão com o banco de dados
    await pool.end();
  }
}

// Executar script
main().catch(console.error);