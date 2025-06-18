import React, { useState } from 'react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  productId?: number;
}

export const SafeImage: React.FC<SafeImageProps> = ({ 
  src, 
  alt, 
  className = '', 
  fallbackSrc = '/assets/default-product-image.jpg',
  productId 
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setImageError(false);
    setIsLoading(false);
  };

  // Processar src para garantir que use URL direta em vez de API endpoint
  const getDirectImageUrl = (originalSrc: string, productId?: number) => {
    // Se não há src válida e tem productId, usar API endpoint
    if ((!originalSrc || originalSrc.includes('placeholder') || originalSrc.includes('default')) && productId) {
      return `/api/products/${productId}/primary-image`;
    }

    // Se já é uma URL direta válida no formato correto, usar ela
    if (originalSrc && originalSrc.startsWith('/uploads/stores/')) {
      return originalSrc;
    }

    // Se é uma URL de uploads genérica, manter como está
    if (originalSrc && originalSrc.startsWith('/uploads/')) {
      return originalSrc;
    }

    // Se é um endpoint da API, manter como está
    if (originalSrc && originalSrc.includes('/api/products/')) {
      return originalSrc;
    }

    // Se tem productId e src não é válida, usar API endpoint
    if (productId && originalSrc && !originalSrc.startsWith('/uploads/') && !originalSrc.startsWith('/api/')) {
      return `/api/products/${productId}/primary-image`;
    }

    // Retornar src original se não atender nenhuma condição acima
    return originalSrc;
  };

  // Se não há src ou houve erro, usar fallback
  const processedSrc = getDirectImageUrl(src, productId);
  const imageSrc = !processedSrc || imageError ? fallbackSrc : processedSrc;

  return (
    <div className={`relative ${className}`}>
      {isLoading && !imageError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
      <img
        src={imageSrc}
        alt={alt}
        className={`w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
      />
    </div>
  );
};

export default SafeImage;