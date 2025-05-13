import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LandingImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

/**
 * Componente para exibir imagens estáticas nas landing pages
 * As imagens devem ser colocadas no diretório /public/landing/
 * Exemplo de uso: <LandingImage src="lojista-hero.jpg" alt="Hero" />
 */
export function LandingImage({ src, alt, className = '', width, height }: LandingImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Constrói o caminho da imagem
  const imagePath = `/landing/${src}`;
  
  useEffect(() => {
    const img = new Image();
    img.src = imagePath;
    img.onload = () => setIsLoading(false);
    img.onerror = () => {
      console.error(`Erro ao carregar imagem: ${imagePath}`);
      setIsLoading(false);
      setError(true);
    };
  }, [imagePath]);
  
  if (isLoading) {
    return (
      <Skeleton 
        className={`${className} bg-gray-200`} 
        style={{ width: width ? `${width}px` : '100%', height: height ? `${height}px` : '250px' }}
      />
    );
  }
  
  if (error) {
    return (
      <div 
        className={`${className} bg-gray-100 flex items-center justify-center`}
        style={{ width: width ? `${width}px` : '100%', height: height ? `${height}px` : '250px' }}
      >
        <p className="text-gray-500">Imagem não encontrada</p>
      </div>
    );
  }
  
  return (
    <img 
      src={imagePath}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading="lazy"
    />
  );
}