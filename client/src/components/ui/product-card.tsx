import { useState } from 'react';
import { Link } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { formatCurrency, calculateDiscountPercentage, getTimeRemaining, getProgressPercentage } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';

// Função que verifica se uma imagem deve ser usada
function getValidImage(imageUrl: string | undefined, fallbackUrl: string): string {
  // Se não tiver URL, usa a imagem padrão
  if (!imageUrl) return fallbackUrl;
  
  // Retorna a URL original passada pelo banco de dados
  return imageUrl;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  discountedPrice?: number;
  category?: string;
  images: string[];
  store: {
    id: number;
    name: string;
  };
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
  const queryClient = useQueryClient();
  const [isWishlisted, setIsWishlisted] = useState(false);

  const calculateCurrentDiscount = () => {
    if (discountPercentage) return discountPercentage;
    if (product.discountedPrice && product.price > product.discountedPrice) {
      return calculateDiscountPercentage(product.price, product.discountedPrice);
    }
    return 0;
  };

  const displayPrice = product.discountedPrice || product.price;
  const discount = calculateCurrentDiscount();
  const progressWidth = startTime && endTime ? getProgressPercentage(startTime, endTime) : 0;
  const timeRemaining = endTime ? getTimeRemaining(endTime) : '';

  const toggleWishlistMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        isWishlisted ? 'DELETE' : 'POST',
        `/api/wishlist/${product.id}`,
        {}
      );
    },
    onSuccess: () => {
      setIsWishlisted(!isWishlisted);
      queryClient.invalidateQueries({ queryKey: ['/api/wishlist'] });
      toast({
        title: isWishlisted ? 'Removido dos favoritos' : 'Adicionado aos favoritos',
        description: isWishlisted ? 
          `${product.name} foi removido da sua lista de desejos.` : 
          `${product.name} foi adicionado à sua lista de desejos.`,
        variant: "default",
      });
    },
    onError: (error) => {
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
      <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow relative group block cursor-pointer">
        {discount > 0 && (
          <div className="bg-primary text-white text-xs font-bold absolute top-2 left-0 py-1 px-2 rounded-r-lg z-10">
            -{discount}%
          </div>
        )}
        
        <div className="absolute top-2 right-2 z-10">
          <button 
            className={`${isWishlisted ? 'text-primary' : 'text-gray-400 hover:text-primary'} bg-white rounded-full p-1.5 shadow-sm`}
            onClick={handleWishlistToggle}
          >
            <i className={isWishlisted ? 'fas fa-heart' : 'far fa-heart'}></i>
          </button>
        </div>
        
        <div className="relative overflow-hidden bg-white" style={{ height: "200px", width: "100%" }}>
          {isFlashPromotion && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 z-10">
              <div 
                className="h-full bg-primary" 
                style={{ width: `${100 - progressWidth}%` }}
              ></div>
            </div>
          )}
          
          <img 
            src={product.images && product.images.length > 0 ? product.images[0] : '/placeholder-image.jpg'}
            alt={product.name}
            className="w-full h-full object-cover object-center p-0"
          />
        </div>
        
        <div className="p-3">
          {showCategory && (
            <div className="text-xs text-gray-500 mb-1">{product.category}</div>
          )}
          
          {!showCategory && (
            <div className="text-xs text-gray-500 mb-1 flex items-center">
              <i className="fas fa-store mr-1"></i> 
              <span className="truncate">{product.store.name}</span>
            </div>
          )}
          
          <h3 className="text-sm font-medium line-clamp-2 h-10">{product.name}</h3>
          
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
          
          {showFullWidthButton ? (
            <Button
              className="w-full mt-3 bg-primary text-white py-1.5 rounded-lg text-sm hover:bg-primary/90"
              onClick={handleReserve}
            >
              Reservar
            </Button>
          ) : (
            <div className="flex justify-between items-center mt-2">
              {isFlashPromotion && timeRemaining && (
                <div className="text-xs text-gray-500">
                  <i className="fas fa-clock"></i> {timeRemaining}
                </div>
              )}
              
              <Button
                size="sm"
                className="bg-primary text-white text-xs px-3 py-1 rounded-full hover:bg-primary/90 ml-auto"
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
