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
  const getDirectImageUrl = (originalSrc: string, productId?: number) => {
    // Se já é uma URL direta válida, usar ela
    if (originalSrc && originalSrc.startsWith('/uploads/')) {
      console.log(`🖼️ [SAFE-IMAGE] Usando URL direta: ${originalSrc}`);
      return originalSrc;
    }

    // Se é um endpoint da API, usar endpoint específico para produto
    if (originalSrc && originalSrc.includes('/api/products/') && productId) {
      const apiUrl = `/api/products/${productId}/primary-image`;
      console.log(`🖼️ [SAFE-IMAGE] Usando API para produto ${productId}: ${apiUrl}`);
      return apiUrl;
    }

    // Se não é uma URL válida, retornar src original
    return originalSrc;
  };

  // Se não há src ou houve erro, usar fallback
  const processedSrc = getDirectImageUrl(src, productId);
  const imageSrc = !processedSrc || imageError ? fallbackSrc : processedSrc;

  return (
    <div className={`relative safe-image-debug ${className}`}>
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
        style={{ 
          display: 'block',
          maxWidth: '100%',
          height: 'auto',
          minHeight: '50px'
        }}
      />
      {/* Debug info */}
      <div className="absolute bottom-0 left-0 bg-black bg-opacity-50 text-white text-xs p-1 max-w-full overflow-hidden">
        {imageSrc.substring(imageSrc.lastIndexOf('/') + 1)}
      </div>
    </div>
  );
};

export default SafeImage;