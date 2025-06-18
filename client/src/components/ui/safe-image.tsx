import React, { useState, useEffect } from 'react';

interface SafeImageProps {
  src: string;
  alt?: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  onLoad?: () => void;
  fallbackSrc?: string;
  productId?: number;
  storeId?: number;
  reservationId?: number;
  type?: 'product' | 'store' | 'reservation';
}

/**
 * Componente unificado para exibição segura de imagens com tratamento de erros
 * Lida com diferentes formatos de URL, URLs blob, e fornece fallbacks automáticos
 * Suporta novas rotas de API de imagens seguras
 */
export function SafeImage({
  src,
  alt = 'Imagem',
  className = 'w-full h-full object-cover',
  width,
  height,
  onLoad,
  fallbackSrc = '/placeholder-image.jpg',
  productId,
  storeId,
  reservationId,
  type
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);

  // Processar a URL de imagem com base em seu formato
  useEffect(() => {
    // Resetar estados quando a prop src mudar
    setError(false);
    setLoadAttempts(0);
    
    // Priorização de parâmetros de ID para rotas de API seguras
    if (type) {
      if (type === 'product' && productId) {
        const apiUrl = `/api/products/${productId}/primary-image`;
        setImgSrc(apiUrl);
        console.log(`🖼️ [SAFE-IMAGE] Usando API para produto ${productId}:`, apiUrl);
        return;
      } else if (type === 'store' && storeId) {
        const apiUrl = `/api/stores/${storeId}/primary-image`;
        setImgSrc(apiUrl);
        console.log(`🖼️ [SAFE-IMAGE] Usando API para loja ${storeId}:`, apiUrl);
        return;
      } else if (type === 'reservation' && reservationId) {
        // Para reservas, usamos o caminho do produto associado diretamente
        // em vez de tentar uma rota específica para reservas que pode estar com erro
        const apiUrl = `/api/products/${productId}/primary-image`;
        setImgSrc(apiUrl);
        console.log(`🖼️ [SAFE-IMAGE] Usando API para reserva (produto ${productId}):`, apiUrl);
        return;
      }
    }
    
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
    
    // Converter URLs diretas para nossas novas rotas seguras de API
    if (src.match(/\/uploads\/stores\/(\d+)\/products\/(\d+)/)) {
      // Extrair IDs da URL direta
      const match = src.match(/\/uploads\/stores\/(\d+)\/products\/(\d+)/);
      if (match) {
        const extractedStoreId = match[1];
        const extractedProductId = match[2];
        setImgSrc(`/api/products/${extractedProductId}/primary-image`);
        return;
      }
    } else if (src.match(/\/uploads\/stores\/(\d+)/)) {
      // Extrair ID da loja
      const match = src.match(/\/uploads\/stores\/(\d+)/);
      if (match) {
        const extractedStoreId = match[1];
        setImgSrc(`/api/stores/${extractedStoreId}/primary-image`);
        return;
      }
    }
    
    // Se for URL de API para imagem principal de loja ou produto, mantém
    // Se for URL de API para reserva, converte para caminho do produto se possível
    if (src.match(/\/api\/stores\/\d+\/primary-image/) || 
        src.match(/\/api\/products\/\d+\/primary-image/)) {
      setImgSrc(src);
      console.log('SafeImage: Mantendo caminho de API válido:', src);
      return;
    }
    
    // Se for um caminho de reserva, converte para caminho de produto
    if (src.match(/\/api\/reservations\/(\d+)\/image/)) {
      // Se temos productId, usar o caminho de imagem do produto
      if (productId) {
        const newSrc = `/api/products/${productId}/primary-image`;
        console.log('SafeImage: Convertendo caminho de reserva para produto:', newSrc);
        setImgSrc(newSrc);
        return;
      }
      // Se não temos productId, extrair id da reserva e obter o produto
      const match = src.match(/\/api\/reservations\/(\d+)\/image/);
      if (match) {
        const reservationId = match[1];
        console.log('SafeImage: Caminho de reserva detectado, usando caminho para produto relacionado se disponível');
        // Se tivermos dados da reserva no src, usar o productId dela
        if (src.indexOf('?productId=') > 0) {
          const productIdMatch = src.match(/\?productId=(\d+)/);
          if (productIdMatch) {
            const extractedProductId = productIdMatch[1];
            const newSrc = `/api/products/${extractedProductId}/primary-image`;
            console.log('SafeImage: Extraído productId do URL:', newSrc);
            setImgSrc(newSrc);
            return;
          }
        }
        // Se não foi possível extrair, vamos usar o fallback 
        setImgSrc(fallbackSrc);
        return;
      }
    }
    
    // URLs de imagem de produto diretas (timestamp-id)
    if (src.match(/\/uploads\/\d+-\d+\.(jpg|png|jpeg|gif)/i)) {
      // Se temos productId, usar a API segura
      if (productId) {
        setImgSrc(`/api/products/${productId}/primary-image`);
      } else {
        setImgSrc(src);
      }
      return;
    }
    
    // Para outros tipos de URL
    setImgSrc(src);
  }, [src, fallbackSrc, productId, storeId, reservationId, type]);

  // Tratar erro de carregamento
  const handleError = () => {
    // Registrar tentativa de erro
    const newAttemptCount = loadAttempts + 1;
    setLoadAttempts(newAttemptCount);
    console.error(`❌ [SAFE-IMAGE] Erro ao carregar imagem (tentativa ${newAttemptCount}):`, {
      src: imgSrc,
      productId,
      storeId,
      type,
      attempt: newAttemptCount
    });
    
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
      const entityType = parts[2]; // 'stores' ou 'products' ou 'reservations'
      const entityId = parts[3]; // o ID
      
      // Tentar obter a imagem de uploads
      if (newAttemptCount === 1) {
        if (entityType === 'products' && productId) {
          // Tentar a URL de thumbnail como fallback
          const newSrc = `/api/products/${productId}/thumbnail`;
          console.log('SafeImage: Tentando thumbnail do produto:', newSrc);
          setImgSrc(newSrc);
        } else if (entityType === 'stores' && storeId) {
          // Tentar caminho de upload direto para a loja
          const newSrc = `/uploads/stores/${storeId}/logo.jpg`;
          console.log('SafeImage: Tentando caminho direto para logo da loja:', newSrc);
          setImgSrc(newSrc);
        } else if (entityType === 'reservations') {
          // Para reservas, tentar usar o ID do produto diretamente
          if (productId) {
            const newSrc = `/api/products/${productId}/primary-image`;
            console.log('SafeImage: Tentando imagem do produto associado à reserva:', newSrc);
            setImgSrc(newSrc);
          } else {
            // Se não temos o ID do produto, ir direto para o fallback
            console.log('SafeImage: Reserva sem ID de produto, usando fallback');
            setImgSrc(fallbackSrc);
            setError(true);
          }
        } else {
          // Usar caminho de fallback diretamente para evitar erros
          setImgSrc(fallbackSrc);
          setError(true);
        }
      } else {
        // Segunda tentativa: usar caminho absoluto
        setImgSrc(fallbackSrc);
        setError(true);
      }
    } else if (imgSrc?.startsWith('/uploads/')) {
      // Tentativas específicas baseadas na estrutura de URL
      if (imgSrc.includes('/stores/') && imgSrc.includes('/products/')) {
        // Extrair IDs da URL para usar APIs seguras
        const match = imgSrc.match(/\/uploads\/stores\/(\d+)\/products\/(\d+)/);
        if (match && newAttemptCount === 1) {
          const storeId = match[1];
          const productId = match[2];
          const newSrc = `/api/products/${productId}/primary-image`;
          console.log('Tentando API segura para produto:', newSrc);
          setImgSrc(newSrc);
          return;
        }
      }
      
      // Tentativas genéricas para outros caminhos de upload
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