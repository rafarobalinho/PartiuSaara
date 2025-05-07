/**
 * Script para limpar URLs blob do banco de dados
 * 
 * Este script pesquisa e remove URLs blob de tabelas que contêm imagens
 * para evitar problemas de exibição e armazenamento
 */

import { db } from '../db';
import { eq } from 'drizzle-orm';
import { stores, products } from '@shared/schema';

/**
 * Limpa URLs blob da tabela de lojas
 */
async function cleanBlobUrlsInStores() {
  try {
    console.log('Iniciando limpeza de URLs blob em stores...');
    
    // Buscar todas as lojas
    const allStores = await db.select().from(stores);
    let count = 0;
    
    for (const store of allStores) {
      if (!store.images || !Array.isArray(store.images)) continue;
      
      // Verificar se há URLs blob no array images
      const hasBlobUrls = store.images.some(url => 
        typeof url === 'string' && url.startsWith('blob:')
      );
      
      if (hasBlobUrls) {
        console.log(`Limpando URLs blob da loja ${store.id}: ${store.name}`);
        
        // Remover todas as URLs blob do array
        const cleanedImages = store.images.filter(url => 
          typeof url !== 'string' || !url.startsWith('blob:')
        );
        
        // Atualizar no banco
        await db.update(stores)
          .set({ images: cleanedImages })
          .where(eq(stores.id, store.id));
          
        count++;
      }
    }
    
    console.log(`Limpeza de stores concluída. ${count} lojas atualizadas.`);
    return count;
  } catch (error) {
    console.error('Erro ao limpar URLs blob em stores:', error);
    throw error;
  }
}

/**
 * Limpa URLs blob da tabela de produtos
 */
async function cleanBlobUrlsInProducts() {
  try {
    console.log('Iniciando limpeza de URLs blob em products...');
    
    // Buscar todos os produtos
    const allProducts = await db.select().from(products);
    let count = 0;
    
    for (const product of allProducts) {
      if (!product.images || !Array.isArray(product.images)) continue;
      
      // Verificar se há URLs blob no array images
      const hasBlobUrls = product.images.some(url => 
        typeof url === 'string' && url.startsWith('blob:')
      );
      
      if (hasBlobUrls) {
        console.log(`Limpando URLs blob do produto ${product.id}: ${product.name}`);
        
        // Remover todas as URLs blob do array
        const cleanedImages = product.images.filter(url => 
          typeof url !== 'string' || !url.startsWith('blob:')
        );
        
        // Atualizar no banco
        await db.update(products)
          .set({ images: cleanedImages })
          .where(eq(products.id, product.id));
          
        count++;
      }
    }
    
    console.log(`Limpeza de products concluída. ${count} produtos atualizados.`);
    return count;
  } catch (error) {
    console.error('Erro ao limpar URLs blob em products:', error);
    throw error;
  }
}

/**
 * Executor principal que limpa URLs blob de todas as tabelas
 */
export async function cleanAllBlobUrls() {
  try {
    console.log('Iniciando limpeza de URLs blob em todas as tabelas...');
    
    const storesCount = await cleanBlobUrlsInStores();
    const productsCount = await cleanBlobUrlsInProducts();
    
    console.log('Limpeza concluída com sucesso.');
    console.log(`Total: ${storesCount} lojas e ${productsCount} produtos atualizados.`);
    
    return {
      stores: storesCount,
      products: productsCount
    };
  } catch (error) {
    console.error('Erro ao limpar URLs blob:', error);
    throw error;
  }
}

// Se executado diretamente via CLI
if (require.main === module) {
  cleanAllBlobUrls()
    .then(result => {
      console.log('Resultado da limpeza:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Falha na execução:', error);
      process.exit(1);
    });
}