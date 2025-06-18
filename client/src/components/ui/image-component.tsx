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
 * - Garante que apenas imagens do produto/loja corretos sejam exibidos
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

  useEffect(() => {
    if (src && productId) {
      // Para produtos, sempre usar a API segura
      if (!src.startsWith('/api/products/')) {
        setImageSrc(`/api/products/${productId}/primary-image`);
      } else {
        setImageSrc(src);
      }
    } else if (src && storeId && !productId) {
      // Para lojas, sempre usar a API segura
      if (!src.startsWith('/api/stores/')) {
        setImageSrc(`/api/stores/${storeId}/primary-image`);
      } else {
        setImageSrc(src);
      }
    } else {
      // Usar src original para outros casos
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