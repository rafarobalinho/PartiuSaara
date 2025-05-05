import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { useUi } from '@/context/ui-context';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils';

interface ProductImage {
  id: number;
  image_url: string;
  thumbnail_url: string;
  is_primary: boolean;
}

interface WishlistItem {
  id: number;
  userId: number;
  productId: number;
  createdAt?: string;
  product: {
    id: number;
    name: string;
    description: string;
    price: number;
    discountedPrice?: number;
    images: ProductImage[];
    store: {
      id: number;
      name: string;
      description?: string;
    };
  };
}

export default function Wishlist() {
  const { isAuthenticated } = useAuth();
  const { 
    decrementWishlistCount, 
    incrementReservationsCount, 
    syncCounters,
    syncFavorites,
    removeFavoriteProduct
  } = useUi();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const { data: wishlistItems = [], isLoading } = useQuery({
    queryKey: ['/api/wishlist'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/wishlist');
        if (!response.ok) {
          throw new Error('Failed to fetch wishlist');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching wishlist:', error);
        return [];
      }
    }
  });

  const removeItemMutation = useMutation({
    mutationFn: async (productId: number) => {
      return apiRequest('DELETE', `/api/wishlist/${productId}`, {});
    },
    onSuccess: () => {
      // Invalidar as consultas para atualizar os dados
      queryClient.invalidateQueries({ queryKey: ['/api/wishlist'] });
      
      // Atualizar contador de favoritos
      decrementWishlistCount();
      
      // Sincronizar contadores e favoritos com o servidor
      syncCounters();
      syncFavorites();
      
      toast({
        title: 'Item removido',
        description: 'O produto foi removido da sua lista de desejos com sucesso.',
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao remover o produto da lista de desejos.',
        variant: "destructive",
      });
      console.error('Error removing item from wishlist:', error);
    }
  });

  const reserveMutation = useMutation({
    mutationFn: async (productId: number) => {
      return apiRequest('POST', `/api/reservations`, { productId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      
      // Atualizar contador de reservas
      incrementReservationsCount();
      
      // Sincronizar contadores com o servidor
      syncCounters();
      
      toast({
        title: 'Reserva criada',
        description: 'O produto foi reservado com sucesso. Você tem 72 horas para retirar.',
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

  const handleRemoveItem = (productId: number) => {
    // Atualize o estado local imediatamente para feedback instantâneo
    removeFavoriteProduct(productId);
    
    // Em seguida, faça a mutação para o servidor
    removeItemMutation.mutate(productId);
  };

  const handleReserve = (productId: number) => {
    reserveMutation.mutate(productId);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Minha Lista de Desejos</h1>
        <p className="text-gray-600">Gerencie os produtos que você salvou para comprar depois</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-1/4">
          <Card className="p-4">
            <div className="flex flex-col space-y-1">
              <Button asChild variant="ghost" className="justify-start">
                <Link href="/account">
                  <a>
                    <i className="fas fa-user mr-2"></i> Perfil
                  </a>
                </Link>
              </Button>
              <Button variant="ghost" className="justify-start text-primary">
                <i className="fas fa-heart mr-2"></i> Lista de Desejos
              </Button>
              <Button asChild variant="ghost" className="justify-start">
                <Link href="/account/reservations">
                  <a>
                    <i className="fas fa-bookmark mr-2"></i> Minhas Reservas
                  </a>
                </Link>
              </Button>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:w-3/4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm p-4 flex animate-pulse">
                  <div className="w-24 h-24 bg-gray-200 rounded-md mr-4"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                  </div>
                  <div className="w-32 space-y-2">
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : wishlistItems.length > 0 ? (
            <div className="space-y-4">
              {wishlistItems.map((item: WishlistItem) => (
                <div key={item.id} className="bg-white rounded-lg shadow-sm p-4 flex flex-col sm:flex-row">
                  <div className="sm:w-24 h-24 rounded-md overflow-hidden mb-4 sm:mb-0 sm:mr-4">
                    <img 
                      src={item.product && item.product.images && item.product.images.length > 0 
                        ? item.product.images[0].image_url 
                        : '/placeholder-image.jpg'} 
                      alt={item.product ? item.product.name : 'Produto'} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    {item.product && (
                      <>
                        <Link href={`/products/${item.product.id}`}>
                          <a className="font-medium hover:text-primary hover:underline">
                            {item.product.name || 'Produto sem nome'}
                          </a>
                        </Link>
                        {item.product.store && (
                          <Link href={`/stores/${item.product.store.id}`}>
                            <a className="text-sm text-gray-500 hover:text-primary block mb-2">
                              <i className="fas fa-store mr-1"></i> {item.product.store.name || 'Loja'}
                            </a>
                          </Link>
                        )}
                        <div className="flex items-center mb-4">
                          {item.product.discountedPrice ? (
                            <>
                              <span className="text-sm line-through text-gray-400 mr-2">
                                {formatCurrency(item.product.price)}
                              </span>
                              <span className="text-lg font-bold text-primary">
                                {formatCurrency(item.product.discountedPrice)}
                              </span>
                            </>
                          ) : (
                            <span className="text-lg font-bold text-primary">
                              {formatCurrency(item.product.price)}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="sm:w-32 flex sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2">
                    {item.product && (
                      <>
                        <Button
                          className="flex-1 sm:flex-none bg-primary text-white hover:bg-primary/90"
                          onClick={() => handleReserve(item.product.id)}
                        >
                          Reservar
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      className="flex-1 sm:flex-none border-primary text-primary hover:bg-primary/5"
                      onClick={() => handleRemoveItem(item.productId)}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg">
              <div className="text-4xl mb-4"><i className="fas fa-heart text-gray-300"></i></div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Sua lista de desejos está vazia</h3>
              <p className="text-gray-500 mb-4">Adicione produtos à sua lista para acompanhar promoções e preços.</p>
              <Button asChild className="bg-primary text-white hover:bg-primary/90">
                <Link href="/products">
                  <a>Explorar produtos</a>
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
