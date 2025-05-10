import React, { useState } from 'react';

interface SafeImageProps {
  productId?: number;
  storeId?: number;
  promotionId?: number;
  imageId?: number;
  alt?: string;
  className?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  placeholderImage?: string;
  width?: number | string;
  height?: number | string;
}

/**
 * Componente seguro para exibição de imagens
 * Sempre usa APIs seguras em vez de caminhos diretos de arquivo
 */
export const SafeImage: React.FC<SafeImageProps> = ({ 
  productId, 
  storeId,
  promotionId,
  imageId,
  alt = '', 
  className = "w-full h-full object-cover",
  onError = null,
  placeholderImage = "/placeholder-image.jpg",
  width,
  height
}) => {
  const [error, setError] = useState(false);

  // Determinar a URL da imagem com base nos parâmetros fornecidos
  let src: string;
  
  if (promotionId) {
    // Imagem de promoção
    src = `/api/promotions/${promotionId}/image`;
  } else if (productId) {
    if (imageId) {
      // Imagem específica de um produto
      src = `/api/products/${productId}/image/${imageId}`;
    } else {
      // Imagem principal do produto
      src = `/api/products/${productId}/primary-image`;
    }
  } else if (storeId) {
    // Imagem de loja
    src = `/api/stores/${storeId}/primary-image`;
  } else {
    // Sem parâmetros válidos, usar placeholder
    src = placeholderImage;
  }
  
  // Handler para erros de carregamento de imagem
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!error) {
      console.warn(`Erro ao carregar imagem: ${src}`);
      setError(true);
      e.currentTarget.src = placeholderImage;
      
      if (onError && typeof onError === 'function') {
        onError(e);
      }
    }
  };
  
  return (
    <img
      src={error ? placeholderImage : src}
      alt={alt}
      className={className}
      onError={handleError}
      width={width}
      height={height}
    />
  );
};

export default SafeImage;