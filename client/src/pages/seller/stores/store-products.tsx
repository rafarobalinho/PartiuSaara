import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

export default function StoreProducts() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const queryClient = useQueryClient();

  // Redirecionar se não estiver autenticado ou não for vendedor
  const isAuthenticated = !!user;
  const isSeller = user?.role === 'seller';

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isSeller)) {
      navigate('/auth');
    }
  }, [authLoading, isAuthenticated, isSeller, navigate]);

  // Fetch store
  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ['/api/stores', id],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/stores/${id}`);
        if (!res.ok) {
          throw new Error('Falha ao carregar informações da loja');
        }
        return await res.json();
      } catch (error) {
        console.error('Error fetching store:', error);
        return null;
      }
    },
    enabled: !!isAuthenticated && !!isSeller && !!id
  });

  // Fetch products for this store
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products', { storeId: id }],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/stores/${id}/products`);
        if (!res.ok) {
          throw new Error('Falha ao carregar produtos da loja');
        }
        return await res.json();
      } catch (error) {
        console.error('Error fetching store products:', error);
        return [];
      }
    },
    enabled: !!isAuthenticated && !!isSeller && !!id
  });

  if (!isAuthenticated || !isSeller) {
    return null;
  }

  const isLoading = authLoading || storeLoading || productsLoading;

  // Mutation para alternar o status do produto
  const toggleProductStatusMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await fetch(`/api/products/${productId}/toggle-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Falha ao alternar o status do produto');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidar o cache para forçar o recarregamento dos produtos
      queryClient.invalidateQueries({ queryKey: ['/api/products', { storeId: id }] });
    }
  });
  
  // Filter products based on active tab
  const filteredProducts = products.filter((product: any) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return product.isActive;
    if (activeTab === 'inactive') return !product.isActive;
    if (activeTab === 'promotion') return product.isOnPromotion;
    return true;
  });

  const renderProductCards = () => {
    if (isLoading) {
      return Array(3).fill(0).map((_, index) => (
        <Card key={index} className="overflow-hidden">
          <div className="h-40 bg-gray-200 animate-pulse"></div>
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
          <CardFooter className="border-t bg-gray-50">
            <Skeleton className="h-9 w-full" />
          </CardFooter>
        </Card>
      ));
    }

    if (filteredProducts.length === 0) {
      return (
        <div className="col-span-full">
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="text-4xl mb-4 text-gray-300">
              <i className="fas fa-box-open"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum produto encontrado</h3>
            <p className="text-gray-500 mb-6">Você ainda não possui produtos cadastrados nesta loja{activeTab !== 'all' ? ' com os filtros selecionados' : ''}</p>
            <Button 
              onClick={() => navigate('/seller/products/add')}
              className="bg-primary text-white hover:bg-primary/90"
            >
              <i className="fas fa-plus mr-2"></i>Adicionar Novo Produto
            </Button>
          </div>
        </div>
      );
    }

    return filteredProducts.map((product: any) => (
      <Card key={product.id} className="overflow-hidden">
        <div className="relative h-40 bg-gray-200 overflow-hidden">
          {product.images && product.images.length > 0 ? (
            <img 
              src={product.images[0]} 
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback para quando a imagem falha ao carregar
                e.currentTarget.src = 'https://images.unsplash.com/photo-1606663889134-b1dedb5ed8b7';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <span className="text-gray-400 text-4xl">
                <i className="fas fa-image"></i>
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/50 flex items-end p-4">
            {product.discountedPrice && (
              <Badge className="bg-red-500">
                {Math.round((1 - product.discountedPrice / product.price) * 100)}% OFF
              </Badge>
            )}
            {product.isOnPromotion && (
              <Badge className="bg-primary ml-2">
                Promoção
              </Badge>
            )}
          </div>
        </div>
        <CardHeader>
          <CardTitle>{product.name}</CardTitle>
          <CardDescription>
            Categoria: {product.category}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-2">
            {product.discountedPrice ? (
              <>
                <span className="text-lg font-bold text-primary">
                  R$ {product.discountedPrice.toFixed(2)}
                </span>
                <span className="text-sm text-gray-500 line-through">
                  R$ {product.price.toFixed(2)}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-primary">
                R$ {product.price.toFixed(2)}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 line-clamp-2">
            {product.description}
          </p>
        </CardContent>
        <CardFooter className="flex justify-between border-t bg-gray-50">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/seller/products/${product.id}/edit`)}
          >
            <i className="fas fa-edit mr-2"></i>
            Editar
          </Button>
          <Button 
            variant={product.isActive ? "destructive" : "default"}
            size="sm"
            onClick={() => toggleProductStatusMutation.mutate(product.id)}
            disabled={toggleProductStatusMutation.isPending}
          >
            {toggleProductStatusMutation.isPending && toggleProductStatusMutation.variables === product.id ? (
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]"></span>
            ) : (
              <i className={`fas fa-${product.isActive ? 'times' : 'check'} mr-2`}></i>
            )}
            {product.isActive ? 'Desativar' : 'Ativar'}
          </Button>
        </CardFooter>
      </Card>
    ));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-2">
        <Link href="/seller/stores">
          <span className="text-gray-500 hover:text-primary mr-2 cursor-pointer">
            <i className="fas fa-arrow-left"></i>
          </span>
        </Link>
        <h1 className="text-2xl font-bold">Produtos da Loja</h1>
      </div>

      {store && (
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-gray-200 mr-3 overflow-hidden">
            {store.images && store.images.length > 0 ? (
              <img 
                src={store.images[0]} 
                alt={store.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback para quando a imagem falha ao carregar
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1579202673506-ca3ce28943ef';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <span className="text-gray-400 text-lg">
                  <i className="fas fa-store"></i>
                </span>
              </div>
            )}
          </div>
          <div>
            <h2 className="font-bold">{store.name}</h2>
            <p className="text-gray-600 text-sm">{store.description}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <Button 
          onClick={() => navigate(`/seller/products/add?storeId=${id}`)}
          className="bg-primary text-white hover:bg-primary/90 ml-auto sm:ml-0 sm:order-2"
        >
          <i className="fas fa-plus mr-2"></i>
          Novo Produto
        </Button>
        
        <div className="w-full sm:order-1">
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                <i className="fas fa-boxes mr-2"></i>
                Todos ({products.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                <i className="fas fa-check-circle mr-2"></i>
                Ativos ({products.filter((p: any) => p.isActive).length})
              </TabsTrigger>
              <TabsTrigger value="inactive">
                <i className="fas fa-times-circle mr-2"></i>
                Inativos ({products.filter((p: any) => !p.isActive).length})
              </TabsTrigger>
              <TabsTrigger value="promotion">
                <i className="fas fa-tag mr-2"></i>
                Promoção ({products.filter((p: any) => p.isOnPromotion).length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {renderProductCards()}
      </div>

      {products.length > 0 && filteredProducts.length === 0 && (
        <div className="text-center mt-8 py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">Nenhum produto encontrado com os filtros selecionados.</p>
        </div>
      )}
    </div>
  );
}