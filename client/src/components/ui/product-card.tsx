import { useState } from 'react';
import { Link } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { formatCurrency, calculateDiscountPercentage, getTimeRemaining, getProgressPercentage } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useUi } from '@/context/ui-context';
import { useToast } from '@/hooks/use-toast';
import { SafeImage } from './safe-image';

// Função que verifica se uma imagem deve ser usada
function getValidImage(imageUrl: string | undefined, fallbackUrl: string): string {
  // Se não tiver URL, usa a imagem padrão
  if (!imageUrl) return fallbackUrl;

  // Retorna a URL original passada pelo banco de dados
  return imageUrl;
}



interface ProductImage {
  id: number;
  image_url: string;
  thumbnail_url: string;
  is_primary: boolean;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  discountedPrice?: number;
  category?: string;
  images: ProductImage[] | string[];
  store?: {
    id: number;
    name: string;
  };
  imageUrl?: string; // Adicionado imageUrl para a URL direta
}

interface ProductCardProps {
  product: Product;
  isFlashPromotion?: boolean;
  discountPercentage?: number;
  endTime?: Date;
  startTime?: Date;
  showCategory?: boolean;
  showFullWidthButton?: boolean;
}

export default function ProductCard({
  product,
  isFlashPromotion = false,
  discountPercentage,
  endTime,
  startTime,
  showCategory = false,
  showFullWidthButton = false
}: ProductCardProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { 
    incrementWishlistCount, 
    decrementWishlistCount, 
    incrementReservationsCount, 
    syncCounters,
    isProductFavorite,
    addFavoriteProduct,
    removeFavoriteProduct,
    syncFavorites
  } = useUi();
  const queryClient = useQueryClient();

  const calculateCurrentDiscount = () => {
    if (discountPercentage) return discountPercentage;
    if (product.discountedPrice && product.price > product.discountedPrice) {
      return calculateDiscountPercentage(product.price, product.discountedPrice);
    }
    return 0;
  };

  const displayPrice = product.discountedPrice || product.price;
  const discount = calculateCurrentDiscount();
  const progressWidth = startTime && endTime ? getProgressPercentage(startTime.toString(), endTime.toString()) : 0;
  // Usamos {} para criar uma versão vazia do objeto de tempo quando não há endTime
  const timeRemaining = endTime ? getTimeRemaining(endTime.toString()) : { days: 0, hours: 0, minutes: 0, seconds: 0 };

  const toggleWishlistMutation = useMutation({
    mutationFn: async () => {
      // Pega o estado atual antes da mutação
      const currentlyFavorited = isProductFavorite(product.id);

      // Atualiza o estado local imediatamente para feedback instantâneo
      if (currentlyFavorited) {
        // Remover da lista de favoritos
        removeFavoriteProduct(product.id);
        decrementWishlistCount();
      } else {
        // Adicionar à lista de favoritos
        addFavoriteProduct(product.id);
        incrementWishlistCount();
      }

      // Faz a requisição para o servidor
      return apiRequest(
        currentlyFavorited ? 'DELETE' : 'POST',
        `/api/wishlist/${product.id}`,
        {}
      );
    },
    onSuccess: () => {
      // Verifica o estado atual após a operação
      const isFavorited = isProductFavorite(product.id);

      // Sincronizar com o servidor
      syncCounters();
      syncFavorites();

      toast({
        title: !isFavorited ? 'Removido dos favoritos' : 'Adicionado aos favoritos',
        description: !isFavorited ? 
          `${product.name} foi removido da sua lista de desejos.` : 
          `${product.name} foi adicionado à sua lista de desejos.`,
        variant: "default",
      });
    },
    onError: (error) => {
      // Verifica o estado atual para decidir como reverter a operação
      const isFavorited = isProductFavorite(product.id);

      // Reverte a operação local em caso de erro no servidor
      if (isFavorited) {
        // Se está como favorito agora, mas houve erro ao tentar remover no servidor, então remova do estado
        removeFavoriteProduct(product.id);
        decrementWishlistCount();
      } else {
        // Se não está como favorito agora, mas houve erro ao tentar adicionar no servidor, então adicione de volta
        addFavoriteProduct(product.id);
        incrementWishlistCount();
      }

      // Sincroniza com o servidor para garantir consistência
      syncFavorites();
      syncCounters();

      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao atualizar os favoritos.',
        variant: "destructive",
      });
      console.error('Error toggling wishlist:', error);
    }
  });

  const reserveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        'POST',
        `/api/reservations`,
        { productId: product.id }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });

      // Atualizar contador
      incrementReservationsCount();

      // Sincronizar contadores com o servidor
      syncCounters();

      toast({
        title: 'Reserva criada',
        description: `${product.name} foi reservado com sucesso. Você tem 72 horas para retirar.`,
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao reservar o produto.',
        variant: "destructive",
      });
      console.error('Error reserving product:', error);
    }
  });

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para adicionar produtos aos favoritos.',
        variant: "default",
      });
      return;
    }

    toggleWishlistMutation.mutate();
  };

  const handleReserve = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para reservar produtos.',
        variant: "default",
      });
      return;
    }

    reserveMutation.mutate();
  };

  return (
    <Link href={`/products/${product.id}`}>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 relative group block cursor-pointer h-full flex flex-col">
        {/* Etiqueta de desconto */}
        {discount > 0 && (
          <div className="bg-primary text-white text-xs font-bold absolute top-2 left-0 py-1 px-2 rounded-r-lg z-10">
            -{discount}%
          </div>
        )}

        {/* Botão de favorito */}
        <div className="absolute top-2 right-2 z-10">
          <button 
            className={`${isProductFavorite(product.id) ? 'text-primary' : 'text-gray-400 hover:text-primary'} bg-white rounded-full p-1.5 shadow-sm h-8 w-8 flex items-center justify-center`}
            onClick={handleWishlistToggle}
          >
            <i className={`${isProductFavorite(product.id) ? 'fas fa-heart' : 'far fa-heart'} text-sm text-center`}></i>
          </button>
        </div>

        {/* Container de imagem - Mais destacado */}
        <div className="relative overflow-hidden bg-white pb-[100%] w-full">
          {isFlashPromotion && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 z-10">
              <div 
                className="h-full bg-primary" 
                style={{ width: `${100 - progressWidth}%` }}
              ></div>
            </div>
          )}

          <div className="absolute inset-0 w-full h-full">
            <SafeImage
              entityType="product"    // <-- Dizendo que é um produto
              entityId={product.id}   // <-- Passando o ID do produto, que é o que ele precisa
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Conteúdo do card - textos e botões */}
        <div className="p-3 flex-grow flex flex-col">
          {/* Categoria ou loja */}
          {showCategory ? (
            <div className="text-xs text-gray-500 mb-1">{product.category}</div>
          ) : (
            <div className="text-xs text-gray-500 mb-1 flex items-center">
              <i className="fas fa-store mr-1"></i> 
              <span className="truncate">{product.store?.name || 'Loja'}</span>
            </div>
          )}

          {/* Nome do produto - limitado a 2 linhas */}
          <h3 className="text-sm font-medium line-clamp-2 mb-auto">{product.name}</h3>

          {/* Preço com formatação para desconto */}
          <div className="mt-2 flex items-baseline">
            {product.discountedPrice ? (
              <>
                <span className="text-xs line-through text-gray-400">{formatCurrency(product.price)}</span>
                <span className="text-primary font-bold text-base ml-2">{formatCurrency(product.discountedPrice)}</span>
              </>
            ) : (
              <span className="text-primary font-bold text-base">{formatCurrency(product.price)}</span>
            )}
          </div>

          {/* Contagem regressiva para promoções */}
          {(isFlashPromotion || discountPercentage) && endTime && (
            <div className="mt-2 bg-gray-50 p-2 rounded-md border border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">
                  {isFlashPromotion ? 'Relâmpago' : 'Promoção'}
                </span>
                <div className="text-xs text-primary font-medium px-1 py-0 bg-primary/10 rounded">
                  {discount}% OFF
                </div>
              </div>
              <div className="flex items-center text-xs text-primary font-medium">
                <i className="fas fa-clock mr-1"></i>
                <span>
                  Acaba em {timeRemaining.days > 0 ? `${timeRemaining.days}d ` : ''}
                  {timeRemaining.hours}h {timeRemaining.minutes}m
                </span>
              </div>
            </div>
          )}

          {/* Botão de reserva - varia conforme propriedade showFullWidthButton */}
          {showFullWidthButton ? (
            <Button
              className="w-full mt-3 bg-primary text-white py-1.5 rounded-lg text-sm hover:bg-primary/90"
              onClick={handleReserve}
            >
              Reservar
            </Button>
          ) : (
            <div className="flex justify-end items-center mt-2">
              <Button
                size="sm"
                className="bg-primary text-white text-xs px-3 py-1 rounded-full hover:bg-primary/90"
                onClick={handleReserve}
              >
                Reservar
              </Button>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}