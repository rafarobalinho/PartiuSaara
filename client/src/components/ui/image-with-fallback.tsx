import React, { useState, useEffect } from 'react';

interface ImageWithFallbackProps {
  src: string;
  alt?: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  onLoad?: () => void;
}

/**
 * Componente de imagem com fallback robusto
 * Tenta diferentes versões do caminho da imagem em caso de erro
 */
export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt = 'Imagem',
  className = 'w-full h-full object-cover',
  width,
  height,
  onLoad,
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [errorCount, setErrorCount] = useState<number>(0);
  
  // Resetar estado quando a fonte muda
  useEffect(() => {
    setImgSrc(src);
    setErrorCount(0);
  }, [src]);
  
  const handleError = () => {
    console.warn(`Erro ao carregar imagem (tentativa ${errorCount + 1}):`, imgSrc);
    
    // Limitar tentativas de fallback
    if (errorCount >= 3) {
      console.error('Esgotadas as tentativas de carregamento, usando placeholder:', src);
      setImgSrc('https://placehold.co/300x300/F2600C/FFFFFF?text=INDISPONÍVEL');
      return;
    }
    
    // Estratégias de fallback
    if (errorCount === 0) {
      // Primeira tentativa: se começar com /uploads/, tenta sem a barra inicial
      if (imgSrc.startsWith('/uploads/')) {
        const newSrc = imgSrc.substring(1);
        console.log('Tentando sem a barra inicial:', newSrc);
        setImgSrc(newSrc);
      } else if (imgSrc.startsWith('blob:')) {
        // Se for um blob URL, substitui por placeholder
        console.log('URL blob detectada, substituindo por placeholder');
        setImgSrc('https://placehold.co/300x300/CCCCCC/666666?text=Processando...');
      } else {
        // Caso não seja um formato reconhecido, tenta com o caminho /public/uploads/...
        const filename = imgSrc.split('/').pop();
        if (filename) {
          const newSrc = `/public/uploads/${filename}`;
          console.log('Tentando caminho alternativo:', newSrc);
          setImgSrc(newSrc);
        } else {
          setImgSrc('https://placehold.co/300x300/F2600C/FFFFFF?text=ERRO');
        }
      }
    } else if (errorCount === 1) {
      // Segunda tentativa: tenta o caminho completo com origem
      const origin = window.location.origin;
      let newSrc = '';
      
      if (imgSrc.startsWith('/')) {
        newSrc = `${origin}${imgSrc}`;
      } else {
        newSrc = `${origin}/${imgSrc}`;
      }
      
      console.log('Tentando com caminho absoluto:', newSrc);
      setImgSrc(newSrc);
    } else if (errorCount === 2) {
      // Terceira tentativa: tenta caminho direto para uploads
      const filename = imgSrc.split('/').pop();
      if (filename) {
        console.log('Tentando caminho direto de uploads:', `/uploads/${filename}`);
        setImgSrc(`/uploads/${filename}`);
      } else {
        setImgSrc('https://placehold.co/300x300/F2600C/FFFFFF?text=ERRO');
      }
    }
    
    setErrorCount(prev => prev + 1);
  };
  
  return (
    <img 
      src={imgSrc} 
      alt={alt} 
      className={className}
      width={width}
      height={height}
      onError={handleError}
      onLoad={onLoad}
      {...props}
    />
  );
};

export default ImageWithFallback;