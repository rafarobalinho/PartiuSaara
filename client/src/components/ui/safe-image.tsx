
import React, { useState } from 'react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  productId?: number;
  storeId?: number;
  type?: 'product' | 'store';
}

export const SafeImage: React.FC<SafeImageProps> = ({ 
  src, 
  alt, 
  className = '', 
  fallbackSrc = '/assets/default-product-image.jpg',
  productId,
  storeId,
  type = 'product'
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleImageError = () => {
    console.log(`❌ [SAFE-IMAGE] Erro ao carregar imagem: ${src}`);
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    console.log(`✅ [SAFE-IMAGE] Imagem carregada com sucesso: ${src}`);
    setImageError(false);
    setIsLoading(false);
  };

  // Processar src para garantir que use URL direta em vez de API endpoint
  const getDirectImageUrl = (originalSrc: string) => {
    // Se já é uma URL direta válida, usar ela
    if (originalSrc && originalSrc.startsWith('/uploads/')) {
      console.log(`🖼️ [SAFE-IMAGE] Usando URL direta: ${originalSrc}`);
      return originalSrc;
    }

    // Se não há src ou é uma URL de API, usar fallback
    if (!originalSrc || originalSrc.includes('/api/')) {
      console.log(`🖼️ [SAFE-IMAGE] URL inválida ou API, usando fallback: ${originalSrc}`);
      return fallbackSrc;
    }

    // Se não é uma URL válida, retornar src original
    return originalSrc;
  };

  // Se não há src ou houve erro, usar fallback
  const processedSrc = getDirectImageUrl(src);
  const imageSrc = !processedSrc || imageError ? fallbackSrc : processedSrc;

  return (
    <div className={`relative ${className}`}>
      {isLoading && !imageError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
      <img
        src={imageSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
      />
    </div>
  );
};

// Add default export
export default SafeImage;
