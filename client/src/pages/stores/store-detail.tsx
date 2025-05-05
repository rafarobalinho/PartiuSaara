import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import ProductCard from '@/components/ui/product-card';
import { useLocation, calculateDistance, formatDistance } from '@/hooks/use-location';

// Função que verifica se uma imagem deve ser usada
function getValidImage(imageUrl: string | undefined, fallbackUrl: string): string {
  // Se não tiver URL, usa a imagem padrão
  if (!imageUrl) return fallbackUrl;
  
  // Retorna a URL original passada pelo banco de dados
  return imageUrl;
}

interface Store {
  id: number;
  name: string;
  description: string;
  category: string;
  tags: string[];
  rating: number;
  reviewCount: number;
  images: string[];
  isOpen: boolean;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  discountedPrice?: number;
  category: string;
  images: string[];
  store: {
    id: number;
    name: string;
  };
}

interface Coupon {
  id: number;
  code: string;
  description: string;
  storeId: number;
  discountAmount?: number;
  discountPercentage?: number;
  endTime: string;
}

export default function StoreDetail() {
  const { id } = useParams();
  const { coordinates } = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState('products');

  // Fetch store info
  const { data: store, isLoading } = useQuery({
    queryKey: [`/api/stores/${id}`],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/stores/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch store');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching store:', error);
        return null;
      }
    }
  });

  // Fetch store products
  const { data: products = [], isLoading: isProductsLoading } = useQuery({
    queryKey: [`/api/stores/${id}/products`],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/stores/${id}/products`);
        if (!response.ok) {
          throw new Error('Failed to fetch store products');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching store products:', error);
        return [];
      }
    },
    enabled: !!store
  });

  // Fetch store coupons
  const { data: coupons = [], isLoading: isCouponsLoading } = useQuery({
    queryKey: [`/api/stores/${id}/coupons`],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/stores/${id}/coupons`);
        if (!response.ok) {
          throw new Error('Failed to fetch store coupons');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching store coupons:', error);
        return [];
      }
    },
    enabled: !!store && activeTab === 'coupons'
  });

  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para adicionar lojas aos favoritos.',
        variant: "default",
      });
      return;
    }

    try {
      await apiRequest(
        isFavorite ? 'DELETE' : 'POST',
        `/api/favorite-stores/${id}`,
        {}
      );
      
      setIsFavorite(!isFavorite);
      toast({
        title: isFavorite ? 'Loja removida dos favoritos' : 'Loja adicionada aos favoritos',
        description: isFavorite ? 
          `${store.name} foi removida das suas lojas favoritas.` : 
          `${store.name} foi adicionada às suas lojas favoritas.`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao atualizar os favoritos.',
        variant: "destructive",
      });
      console.error('Error toggling favorite store:', error);
    }
  };

  const getDistance = () => {
    if (!coordinates || !store?.location) return null;
    
    const distance = calculateDistance(
      coordinates.latitude,
      coordinates.longitude,
      store.location.latitude,
      store.location.longitude
    );
    
    return formatDistance(distance);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="h-64 bg-gray-200 animate-pulse"></div>
          <div className="p-6">
            <div className="h-8 bg-gray-200 animate-pulse rounded w-1/3 mb-4"></div>
            <div className="h-5 bg-gray-200 animate-pulse rounded w-1/4 mb-4"></div>
            <div className="h-20 bg-gray-200 animate-pulse rounded mb-4"></div>
            <div className="h-10 bg-gray-200 animate-pulse rounded mb-4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4"><i className="fas fa-exclamation-circle text-gray-300"></i></div>
        <h2 className="text-xl font-bold mb-2">Loja não encontrada</h2>
        <p className="text-gray-600 mb-6">A loja que você está procurando não existe ou foi removida.</p>
        <Button asChild className="bg-primary text-white hover:bg-primary/90">
          <Link href="/stores">
            <a>Ver todas as lojas</a>
          </Link>
        </Button>
      </div>
    );
  }

  const distance = getDistance();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center mb-6 text-sm">
        <Link href="/stores" className="text-gray-500 hover:text-primary">
          Lojas
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <Link href={`/categories/${store.category}`} className="text-gray-500 hover:text-primary">
          {store.category}
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="font-medium text-gray-900">{store.name}</span>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
        {/* Store Banner */}
        <div className="h-64 relative bg-white overflow-hidden">
          <img 
            src={`/api/stores/${store.id}/primary-image`}
            alt={store.name} 
            className="w-full h-full object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="w-full h-full bg-gray-200 flex items-center justify-center hidden">
            <i className="fas fa-store text-gray-400 text-6xl"></i>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{store.name}</h1>
                <div className="flex items-center">
                  <Badge variant="secondary" className="mr-2">{store.category}</Badge>
                  <div className="flex items-center text-sm">
                    <i className="fas fa-star text-yellow-400 mr-1"></i>
                    <span>{store.rating.toFixed(1)}</span>
                    <span className="mx-1">•</span>
                    <span>{store.reviewCount} avaliações</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleFavoriteToggle}
                  variant="outline"
                  className="bg-white/20 hover:bg-white/30 border-white/50 text-white"
                >
                  <i className={`${isFavorite ? 'fas' : 'far'} fa-heart mr-2`}></i>
                  {isFavorite ? 'Favoritada' : 'Favoritar'}
                </Button>
                
                <Button asChild className="bg-primary text-white hover:bg-primary/90">
                  <a href={`https://maps.google.com/?q=${store.address.street},${store.address.city}`} target="_blank" rel="noopener noreferrer">
                    <i className="fas fa-directions mr-2"></i>
                    Como chegar
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Store Info */}
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${store.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <i className={`fas fa-${store.isOpen ? 'check-circle' : 'times-circle'} mr-1`}></i>
              {store.isOpen ? 'Aberta agora' : 'Fechada'}
            </span>
            
            {distance && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm">
                <i className="fas fa-map-marker-alt mr-1"></i>
                {distance} de distância
              </span>
            )}
            
            {store.tags.map((tag, index) => (
              <span key={index} className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm">
                {tag}
              </span>
            ))}
          </div>
          
          <div className="prose max-w-none mb-6">
            <p className="text-gray-700">{store.description}</p>
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-medium mb-2">Endereço</h3>
            <address className="not-italic text-gray-700">
              {store.address.street}<br />
              {store.address.city}, {store.address.state}<br />
              CEP: {store.address.zipCode}
            </address>
          </div>
        </div>
      </div>

      {/* Store Tabs */}
      <Tabs defaultValue="products" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="coupons">Cupons</TabsTrigger>
          <TabsTrigger value="info">Informações</TabsTrigger>
        </TabsList>
        
        <TabsContent value="products" className="mt-0">
          {isProductsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array(10).fill(0).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="pb-[100%] relative w-full bg-gray-200 animate-pulse"></div>
                  <div className="p-3">
                    <div className="h-4 bg-gray-200 animate-pulse mb-1 w-1/3"></div>
                    <div className="h-8 bg-gray-200 animate-pulse mb-2"></div>
                    <div className="h-5 bg-gray-200 animate-pulse mb-3 w-1/2"></div>
                    <div className="h-8 bg-gray-200 animate-pulse w-full rounded-lg"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {products.map((product: Product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showCategory={true}
                  showFullWidthButton={true}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg">
              <div className="text-4xl mb-4"><i className="fas fa-box-open text-gray-300"></i></div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum produto disponível</h3>
              <p className="text-gray-500">Esta loja ainda não cadastrou produtos.</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="coupons" className="mt-0">
          {isCouponsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(3).fill(0).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-32 bg-gray-200 animate-pulse"></div>
                  <div className="p-4">
                    <div className="h-6 bg-gray-200 animate-pulse mb-2 w-1/2"></div>
                    <div className="h-4 bg-gray-200 animate-pulse mb-3 w-3/4"></div>
                    <div className="h-10 bg-gray-200 animate-pulse rounded-lg"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : coupons.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coupons.map((coupon: Coupon) => (
                <div key={coupon.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-32 bg-gradient-to-r from-primary to-secondary relative flex items-center justify-center">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10">
                      <i className="fas fa-ticket-alt text-9xl transform rotate-45 text-white"></i>
                    </div>
                    <div className="text-center text-white z-10">
                      <div className="text-sm mb-1">Economize {coupon.discountPercentage ? `${coupon.discountPercentage}%` : coupon.discountAmount ? `R$${coupon.discountAmount}` : ''}</div>
                      <div className="text-xl font-bold border-2 border-white rounded-lg px-4 py-1">{coupon.code}</div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-gray-500 mb-2">Válido até {new Date(coupon.endTime).toLocaleDateString('pt-BR')}</div>
                    <p className="text-sm text-gray-600 mb-3">{coupon.description}</p>
                    <Button 
                      className="w-full bg-primary text-white hover:bg-primary/90"
                      onClick={() => {
                        navigator.clipboard.writeText(coupon.code);
                        toast({
                          title: 'Cupom copiado!',
                          description: 'Código copiado para a área de transferência.',
                          variant: "default",
                        });
                      }}
                    >
                      Copiar Cupom
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg">
              <div className="text-4xl mb-4"><i className="fas fa-ticket-alt text-gray-300"></i></div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum cupom disponível</h3>
              <p className="text-gray-500">Esta loja ainda não possui cupons de desconto.</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="info" className="mt-0">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-medium mb-4">Sobre a Loja</h3>
                <div className="prose max-w-none">
                  <p className="text-gray-700">{store.description}</p>
                </div>
                
                <h3 className="text-lg font-medium mt-6 mb-3">Horário de Funcionamento</h3>
                <table className="min-w-full">
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="py-2 text-sm font-medium">Segunda a Sexta</td>
                      <td className="py-2 text-sm text-gray-600">09:00 - 18:00</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-sm font-medium">Sábado</td>
                      <td className="py-2 text-sm text-gray-600">09:00 - 13:00</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-sm font-medium">Domingo</td>
                      <td className="py-2 text-sm text-gray-600">Fechado</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Localização</h3>
                <div className="h-64 bg-gray-200 rounded-lg mb-4 relative">
                  {/* This would be replaced with an actual map component */}
                  <div className="w-full h-full bg-cover bg-center" style={{backgroundImage: `url('/api/stores/${store.id}/primary-image')`}}>
                    <div className="absolute inset-0 bg-black/10"></div>
                  </div>
                  
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-3 shadow-lg pulse-animation">
                    <i className="fas fa-map-marker-alt text-primary text-xl"></i>
                  </div>
                </div>
                
                <address className="not-italic text-gray-700 mb-4">
                  {store.address.street}<br />
                  {store.address.city}, {store.address.state}<br />
                  CEP: {store.address.zipCode}
                </address>
                
                <div className="flex space-x-2">
                  <Button asChild className="bg-primary text-white hover:bg-primary/90">
                    <a href={`https://maps.google.com/?q=${store.address.street},${store.address.city}`} target="_blank" rel="noopener noreferrer">
                      <i className="fas fa-directions mr-2"></i>
                      Como chegar
                    </a>
                  </Button>
                  
                  <Button variant="outline">
                    <i className="fas fa-phone mr-2"></i>
                    Contato
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
