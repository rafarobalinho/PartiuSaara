import React, { useState } from 'react';
import { INLINE_IMAGES } from '../../data/inlineImages';

interface LandingImageProps {
  // Pode ser uma chave do objeto INLINE_IMAGES ou um caminho normal
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
  
  // Verificar se a src é uma chave no objeto INLINE_IMAGES
  const inlineImage = INLINE_IMAGES[src];
  
  // Se for uma chave válida, usar a imagem em base64
  if (inlineImage) {
    return (
      <img 
        src={inlineImage} 
        alt={alt} 
        className={className}
        loading="lazy"
      />
    );
  }
  
  // Caso contrário, usar o caminho normal com tratamento de erro
  return (
    <img 
      src={src.startsWith('/') ? src : `/${src}`} 
      alt={alt} 
      className={className}
      onError={handleError}
      loading="lazy"
    />
  );
}