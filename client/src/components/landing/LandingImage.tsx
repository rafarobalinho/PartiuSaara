import React, { useState } from 'react';

interface LandingImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function LandingImage({ src, alt, className = "" }: LandingImageProps) {
  const [hasError, setHasError] = useState(false);
  
  // Função para lidar com erros de carregamento
  const handleError = () => {
    console.error(`Erro ao carregar imagem: ${src}`);
    setHasError(true);
  };
  
  if (hasError) {
    return (
      <div className={`bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center ${className}`} style={{ minHeight: '200px' }}>
        <p className="text-indigo-600 font-medium">{alt || "Imagem não disponível"}</p>
      </div>
    );
  }
  
  // Garantir que a URL comece com uma barra
  const imageSrc = src.startsWith('/') ? src : `/${src}`;
  
  return (
    <img 
      src={imageSrc} 
      alt={alt} 
      className={className}
      onError={handleError}
      loading="lazy"
    />
  );
}