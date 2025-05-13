interface LandingImageProps {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
}

export function LandingImage({ 
  src, 
  alt = "", 
  className = "", 
  width, 
  height 
}: LandingImageProps) {
  // Não usa a lógica de SafeImage, simplesmente renderiza a imagem diretamente
  return (
    <img 
      src={src} 
      alt={alt}
      className={`rounded-lg ${className}`}
      loading="lazy"
      decoding="async"
      width={width}
      height={height}
    />
  );
}