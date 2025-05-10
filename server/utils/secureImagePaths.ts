/**
 * Utilitário para gerar caminhos seguros de imagens isolados por loja/produto 
 * para evitar vazamento de dados entre lojas.
 */

/**
 * Gera caminhos seguros para imagens baseados na estrutura segura de diretórios
 * @param imageUrl URL original da imagem
 * @param thumbnailUrl URL original da thumbnail
 * @param storeId ID da loja
 * @param productId ID do produto
 * @returns Caminhos de imagem seguros
 */
export function generateSecureImagePaths(
  imageUrl: string,
  thumbnailUrl: string,
  storeId: number,
  productId: number | null = null
): { imageUrl: string, thumbnailUrl: string } {
  
  // Verifica se as URLs já estão no formato seguro com isolamento de loja
  const storeSegment = `/uploads/stores/${storeId}`;
  const productSegment = productId ? `/products/${productId}` : '';
  const securePathPrefix = `${storeSegment}${productSegment}/`;
  
  // Se já estiver no formato seguro, retornar sem modificação
  if (imageUrl.includes(securePathPrefix)) {
    return {
      imageUrl,
      thumbnailUrl
    };
  }
  
  // Extrair os nomes dos arquivos das URLs originais
  let imageFileName = '';
  let thumbFileName = '';
  
  if (imageUrl.includes('/')) {
    imageFileName = imageUrl.split('/').pop() || '';
  } else {
    imageFileName = imageUrl;
  }
  
  if (thumbnailUrl.includes('/')) {
    thumbFileName = thumbnailUrl.split('/').pop() || '';
  } else {
    thumbFileName = thumbnailUrl;
  }
  
  // Gerar caminhos seguros no novo formato isolado por loja/produto
  const secureImagePath = productId
    ? `${storeSegment}${productSegment}/${imageFileName}`
    : `${storeSegment}/${imageFileName}`;
    
  const secureThumbPath = productId
    ? `${storeSegment}${productSegment}/thumb-${thumbFileName}`
    : `${storeSegment}/thumb-${thumbFileName}`;
  
  return {
    imageUrl: secureImagePath,
    thumbnailUrl: secureThumbPath
  };
}

/**
 * Valida se uma imagem pertence ao produto e loja corretos
 * @param imageProductId ID do produto ao qual a imagem está associada
 * @param targetProductId ID do produto de destino para validação
 * @param imageUrl URL da imagem para análise
 * @param storeId ID da loja
 * @returns true se a imagem pertence ao produto e loja corretos
 */
export function validateImageOwnership(
  imageProductId: number,
  targetProductId: number,
  imageUrl: string,
  storeId: number
): boolean {
  // Validação básica de correspondência de ID
  if (imageProductId !== targetProductId) {
    console.error(`Validação falhou: Imagem do produto ${imageProductId} não pertence ao produto ${targetProductId}`);
    return false;
  }
  
  // Verificar se a URL da imagem contém o padrão seguro com o store_id correto
  const securePathPattern = `/uploads/stores/${storeId}/`;
  
  if (imageUrl.startsWith('/uploads/') && !imageUrl.includes(securePathPattern)) {
    console.error(`Validação falhou: Imagem do produto ${targetProductId} não está no caminho seguro da loja ${storeId}`);
    return false;
  }
  
  return true;
}