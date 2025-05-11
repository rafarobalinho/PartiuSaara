import React, { useState, useEffect } from 'react';

interface ImageComponentProps {
  src: string;
  alt?: string;
  className?: string;
  productId?: number;
  storeId?: number;
}

/**
 * Componente para exibição de imagens com validação de caminhos e tratamento de erros
 * - Reconstrói caminhos de imagem para garantir o formato de URL seguro
 * - Implementa fallbacks automáticos caso a imagem não seja encontrada
 * - Garante que apenas imagens do produto/loja corretos sejam exibidas
 */
export const ImageComponent = ({
  src,
  alt = 'Imagem',
  className = '',
  productId,
  storeId,
}: ImageComponentProps) => {
  const [imageSrc, setImageSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  
  // Reconstruir um caminho seguro para a imagem quando necessário
  useEffect(() => {
    if (src && productId && storeId) {
      // Verificar se o caminho já está no formato correto
      const expectedPathPattern = `/uploads/stores/${storeId}/products/${productId}/`;
      
      if (!src.includes(expectedPathPattern) && !src.includes('/api/products/')) {
        try {
          // Verificar se é uma URL de API
          if (src.startsWith('/api/')) {
            // Manter URLs de API como estão
            setImageSrc(src);
            return;
          }
          
          // Verificar se é um caminho de blob
          if (src.startsWith('blob:')) {
            console.warn('⚠️ URL blob detectada, usando API segura:', src);
            setImageSrc(`/api/products/${productId}/primary-image`);
            return;
          }
          
          // Extrair o nome do arquivo da URL original
          const fileName = src.split('/').pop() || '';
          
          // Construir um caminho seguro
          const securePath = `${expectedPathPattern}${fileName}`;
          console.log(`Reconstruindo caminho de imagem: ${src} → ${securePath}`);
          setImageSrc(securePath);
        } catch (e) {
          console.error("Erro ao processar caminho de imagem:", e);
          // Fallback para API segura
          setImageSrc(`/api/products/${productId}/primary-image`);
        }
      } else {
        // Manter o caminho original se já estiver no formato correto
        setImageSrc(src);
      }
    } else if (src && storeId && !productId) {
      // Caso de imagem de loja (sem produto)
      const expectedStorePathPattern = `/uploads/stores/${storeId}/`;
      
      if (!src.includes(expectedStorePathPattern) && !src.includes('/api/stores/')) {
        try {
          // Verificar se é uma URL de API
          if (src.startsWith('/api/')) {
            // Manter URLs de API como estão
            setImageSrc(src);
            return;
          }
          
          // Verificar se é um caminho de blob
          if (src.startsWith('blob:')) {
            console.warn('⚠️ URL blob detectada, usando API segura:', src);
            setImageSrc(`/api/stores/${storeId}/primary-image`);
            return;
          }
          
          // Extrair o nome do arquivo da URL original
          const fileName = src.split('/').pop() || '';
          
          // Construir um caminho seguro
          const securePath = `${expectedStorePathPattern}${fileName}`;
          console.log(`Reconstruindo caminho de imagem de loja: ${src} → ${securePath}`);
          setImageSrc(securePath);
        } catch (e) {
          console.error("Erro ao processar caminho de imagem de loja:", e);
          // Fallback para API segura
          setImageSrc(`/api/stores/${storeId}/primary-image`);
        }
      } else {
        // Manter o caminho original se já estiver no formato correto
        setImageSrc(src);
      }
    } else {
      // Se não temos IDs, manter a URL original
      setImageSrc(src);
    }
  }, [src, productId, storeId]);
  
  // Handler para tratar erros de carregamento de imagem
  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      console.warn(`Erro ao carregar imagem: ${imageSrc}`);
      
      // Se estiver usando URL direta, tentar API como fallback
      if (productId && !imageSrc.includes('/api/products/')) {
        console.log(`Tentando API como fallback: /api/products/${productId}/primary-image`);
        setImageSrc(`/api/products/${productId}/primary-image`);
      } else if (storeId && !imageSrc.includes('/api/stores/') && !productId) {
        console.log(`Tentando API como fallback: /api/stores/${storeId}/primary-image`);
        setImageSrc(`/api/stores/${storeId}/primary-image`);
      } else {
        // Último fallback é o placeholder
        console.log('Usando placeholder como último recurso');
        setImageSrc('/placeholder-image.jpg');
      }
    }
  };
  
  return (
    <img 
      src={imageSrc} 
      alt={alt} 
      className={className} 
      onError={handleError}
    />
  );
};

export default ImageComponent;