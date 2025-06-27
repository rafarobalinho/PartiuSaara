import React, { useState, useEffect } from 'react';

// Tipos de entidade para generalizar o uso
type EntityType = 'product' | 'store' | 'promotion';

interface SafeImageProps {
  alt: string;
  className?: string;
  fallbackSrc?: string;

  // Novas props que substituem a 'src' original
  entityType: EntityType;
  entityId: number | string;

  // Opcional para buscar thumbnails ou imagens específicas
  imageType?: 'primary-image' | 'thumbnail' | 'image' | 'flash-image'; 
}

export const SafeImage: React.FC<SafeImageProps> = ({
  alt,
  className = '',
  fallbackSrc = '/placeholder-image.jpg',
  entityType,
  entityId,
  imageType = 'primary-image',
}) => {
  const [imageSrc, setImageSrc] = useState<string>(fallbackSrc);
  const [isLoading, setIsLoading] = useState(true);

  // Hook para construir a URL e resetar o estado quando a entidade mudar
  useEffect(() => {
    setIsLoading(true);

    if (!entityId) {
      setIsLoading(false);
      return;
    }

    // Constrói a URL da API dinamicamente - SEMPRE usar API para produtos
    let apiUrl = '';
    if (entityType === 'product') {
      // ✅ CAMINHO OBRIGATÓRIO: /api/products/{id}/{imageType}
      apiUrl = `/api/products/${entityId}/${imageType}`;
    } else if (entityType === 'store') {
      apiUrl = `/api/stores/${entityId}/${imageType}`;
    }
    
    if (!apiUrl) {
      console.warn(`[SAFE-IMAGE] Tipo de entidade não suportado: ${entityType}`);
      setImageSrc(fallbackSrc);
      setIsLoading(false);
      return;
    }

    console.log(`[SAFE-IMAGE] Carregando imagem: ${apiUrl}`);
    setImageSrc(apiUrl);

  }, [entityId, entityType, imageType]); // Roda sempre que uma dessas props mudar

  const handleImageError = () => {
    // Se a URL da API falhar, não faz nada, pois o 'src' já está apontando
    // para uma rota de API, que por sua vez já redireciona para o placeholder.
    // O fallback aqui é mais para erros de rede inesperados.
    setImageSrc(fallbackSrc); 
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
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