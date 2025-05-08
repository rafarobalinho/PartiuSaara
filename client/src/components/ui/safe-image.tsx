import React, { useState, useEffect } from 'react';

interface SafeImageProps {
  src: string;
  alt?: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  onLoad?: () => void;
  fallbackSrc?: string;
}

/**
 * Componente unificado para exibição segura de imagens com tratamento de erros
 * Lida com diferentes formatos de URL, URLs blob, e fornece fallbacks automáticos
 */
export function SafeImage({
  src,
  alt = 'Imagem',
  className = 'w-full h-full object-cover',
  width,
  height,
  onLoad,
  fallbackSrc = '/uploads/image-unavailable.jpg'
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);

  // Processar a URL de imagem com base em seu formato
  useEffect(() => {
    // Resetar estados quando a prop src mudar
    setError(false);
    setLoadAttempts(0);
    
    // Determinar a URL correta da imagem
    if (!src) {
      setImgSrc(fallbackSrc);
      return;
    }
    
    // Verificar o formato da URL
    if (src.startsWith('blob:')) {
      console.warn('⚠️ URL blob detectada, usando fallback:', src);
      setImgSrc(fallbackSrc);
      return;
    }
    
    // Se for URL de API para imagem principal de loja ou produto
    if (src.match(/\/api\/stores\/\d+\/primary-image/) || 
        src.match(/\/api\/products\/\d+\/primary-image/)) {
      setImgSrc(src);
      return;
    }
    
    // Se for caminho para upload direto com timestamp-id
    if (src.match(/\/uploads\/\d+-\d+\.(jpg|png|jpeg|gif)/i)) {
      setImgSrc(src);
      return;
    }
    
    // Para outros tipos de URL
    setImgSrc(src);
  }, [src, fallbackSrc]);

  // Tratar erro de carregamento
  const handleError = () => {
    // Registrar tentativa de erro
    const newAttemptCount = loadAttempts + 1;
    setLoadAttempts(newAttemptCount);
    console.warn(`Erro ao carregar imagem (tentativa ${newAttemptCount}):`, imgSrc);
    
    // Se já tentamos três vezes, usar a imagem de fallback
    if (newAttemptCount >= 3) {
      console.error('Esgotadas as tentativas de carregamento, usando placeholder:', src);
      setImgSrc(fallbackSrc);
      setError(true);
      return;
    }
    
    // Estratégias de fallback baseadas no tipo de URL
    if (imgSrc?.startsWith('/api/')) {
      // Se é uma URL de API, tentar acessar a imagem diretamente
      const parts = imgSrc.split('/');
      const entityType = parts[2]; // 'stores' ou 'products'
      const entityId = parts[3]; // o ID
      
      // Tentar obter a imagem de uploads
      if (newAttemptCount === 1) {
        const newSrc = `/uploads/${entityType}-${entityId}.jpg`;
        console.log('Tentando caminho alternativo:', newSrc);
        setImgSrc(newSrc);
      } else {
        // Segunda tentativa: usar caminho absoluto
        setImgSrc(fallbackSrc);
        setError(true);
      }
    } else if (imgSrc?.startsWith('/uploads/')) {
      // Se é um caminho de upload, tentar variações
      if (newAttemptCount === 1) {
        // Primeira tentativa: remover a barra inicial
        const newSrc = imgSrc.substring(1);
        console.log('Tentando sem a barra inicial:', newSrc);
        setImgSrc(newSrc);
      } else if (newAttemptCount === 2) {
        // Segunda tentativa: caminho completo com origem
        const origin = window.location.origin;
        const newSrc = `${origin}${imgSrc}`;
        console.log('Tentando com caminho absoluto:', newSrc);
        setImgSrc(newSrc);
      } else {
        // Última tentativa: usar o fallback
        setImgSrc(fallbackSrc);
        setError(true);
      }
    } else {
      // Para outros tipos de URL, usar fallback diretamente
      setImgSrc(fallbackSrc);
      setError(true);
    }
  };
  
  if (!imgSrc) {
    return null;
  }
  
  return (
    <img 
      src={imgSrc} 
      alt={alt} 
      className={className}
      width={width}
      height={height}
      onError={handleError}
      onLoad={onLoad}
    />
  );
}

export default SafeImage;