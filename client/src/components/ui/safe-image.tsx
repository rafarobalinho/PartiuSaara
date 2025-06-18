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
  productId,
  storeId 
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleImageError = () => {
    console.error(`🔴 Erro ao carregar imagem:`, {
      originalSrc: src,
      processedSrc: imageSrc,
      productId,
      storeId
    });
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    console.log(`✅ Imagem carregada com sucesso:`, {
      originalSrc: src,
      processedSrc: imageSrc,
      productId,
      storeId
    });
    setImageError(false);
    setIsLoading(false);
  };

  // Processar src para garantir que use URL direta em vez de API endpoint
  const getDirectImageUrl = (originalSrc: string, productId?: number, storeId?: number) => {
    console.log(`🔍 Processando URL de imagem:`, {
      originalSrc,
      productId,
      storeId
    });

    // Se não há src ou é um placeholder, retornar fallback
    if (!originalSrc || originalSrc.includes('placeholder')) {
      console.log('⚠️ URL vazia ou placeholder, usando fallback');
      return fallbackSrc;
    }

    // Se já é uma URL direta válida com a estrutura correta, usar ela
    if (originalSrc.startsWith('/uploads/stores/')) {
      console.log('✅ URL já está no formato correto');
      return originalSrc;
    }

    // Se é um endpoint da API e temos os IDs necessários, construir URL direta
    if (originalSrc.includes('/api/products/') && productId && storeId) {
      const directUrl = `/uploads/stores/${storeId}/products/${productId}/image.jpg`;
      console.log(`🔄 Convertendo endpoint API para URL direta: ${directUrl}`);
      return directUrl;
    }

    // Se é um endpoint da API mas faltam IDs, manter endpoint
    if (originalSrc.includes('/api/')) {
      console.warn('⚠️ Endpoint API sem IDs necessários, mantendo original');
      return originalSrc;
    }

    // Se é uma URL absoluta (http/https), usar como está
    if (originalSrc.startsWith('http://') || originalSrc.startsWith('https://')) {
      console.log('✅ URL absoluta, mantendo como está');
      return originalSrc;
    }

    console.log('⚠️ URL não reconhecida, usando original');
    return originalSrc;
  };

  // Se não há src ou houve erro, usar fallback
  const processedSrc = getDirectImageUrl(src, productId, storeId);
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