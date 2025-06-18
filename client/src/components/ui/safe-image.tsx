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

  // Se não há src ou houve erro, usar fallback
  const imageSrc = !src || imageError ? fallbackSrc : src;

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