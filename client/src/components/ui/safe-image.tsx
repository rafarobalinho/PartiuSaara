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
  fallbackSrc = '/placeholder-image.jpg',
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
    // Se não há src válida, usar fallback
    if (!originalSrc || originalSrc.includes('placeholder') || originalSrc.includes('default')) {
      return fallbackSrc;
    }

    // Se já é uma URL direta válida no formato correto, usar ela
    if (originalSrc && originalSrc.startsWith('/uploads/stores/')) {
      return originalSrc;
    }

    // Se é uma URL de uploads genérica, manter como está
    if (originalSrc && originalSrc.startsWith('/uploads/')) {
      return originalSrc;
    }

    // EVITAR endpoints da API - usar URL direta se possível
    if (originalSrc && originalSrc.includes('/api/products/')) {
      // Se temos productId, tentar construir URL direta
      if (productId) {
        // Extrair informações do endpoint para construir URL direta
        console.warn(`Convertendo endpoint API para URL direta: ${originalSrc}`);
        return fallbackSrc; // Por enquanto usar fallback
      }
      return originalSrc;
    }

    // Retornar src original se for válida
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