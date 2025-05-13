import { useState, useEffect } from 'react';

/**
 * Interface para as propriedades do componente StaticImage
 * Este componente é dedicado exclusivamente para imagens estáticas das landing pages
 */
interface StaticImageProps {
  /** Nome do arquivo de imagem dentro da pasta /public/landing/ */
  filename: string;
  /** Texto alternativo para a imagem */
  alt: string;
  /** Classes CSS adicionais */
  className?: string;
  /** Largura da imagem */
  width?: number;
  /** Altura da imagem */
  height?: number;
}

/**
 * Componente totalmente isolado para exibição de imagens estáticas nas landing pages
 * 
 * Este componente é COMPLETAMENTE separado do sistema de imagens principal da aplicação
 * e serve exclusivamente arquivos estáticos da pasta /public/landing/
 * 
 * @example
 * <StaticImage filename="sellers/hero-banner.jpg" alt="Banner principal" />
 */
export function StaticImage({ filename, alt, className = '', width, height }: StaticImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Constrói o caminho da imagem (garantindo que não há barras duplicadas)
  const imagePath = `/landing/${filename.startsWith('/') ? filename.substring(1) : filename}`;
  
  useEffect(() => {
    // Verifica se a imagem existe e carrega corretamente
    const img = new Image();
    img.src = imagePath;
    img.onload = () => setIsLoading(false);
    img.onerror = () => {
      console.error(`Erro ao carregar imagem estática: ${imagePath}`);
      setIsLoading(false);
      setError(true);
    };
    
    return () => {
      // Limpa o evento ao desmontar para evitar memory leaks
      img.onload = null;
      img.onerror = null;
    };
  }, [imagePath]);
  
  // Estado de carregamento
  if (isLoading) {
    return (
      <div 
        className={`bg-gray-200 animate-pulse ${className}`} 
        style={{ 
          width: width ? `${width}px` : '100%', 
          height: height ? `${height}px` : '250px' 
        }}
        aria-label="Carregando imagem..."
      />
    );
  }
  
  // Estado de erro
  if (error) {
    return (
      <div 
        className={`bg-gray-100 flex items-center justify-center text-gray-500 ${className}`}
        style={{ 
          width: width ? `${width}px` : '100%', 
          height: height ? `${height}px` : '250px' 
        }}
      >
        <p>Imagem não encontrada</p>
      </div>
    );
  }
  
  // Renderização normal da imagem
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