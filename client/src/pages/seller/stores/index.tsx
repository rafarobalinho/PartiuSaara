import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
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
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

export default function SellerStores() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('all');

  // Redirecionar se não estiver autenticado ou não for vendedor
  const isAuthenticated = !!user;
  const isSeller = user?.role === 'seller';

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isSeller)) {
      navigate('/auth');
    }
  }, [authLoading, isAuthenticated, isSeller, navigate]);

  // Fetch seller's stores
  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['/api/stores'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/stores');
        if (!res.ok) {
          throw new Error('Falha ao carregar lojas');
        }
        const allStores = await res.json();
        // Filter stores by current user
        return allStores.filter((store: any) => store.userId === user?.id);
      } catch (error) {
        console.error('Error fetching stores:', error);
        return [];
      }
    },
    enabled: !!isAuthenticated && !!isSeller
  });

  if (!isAuthenticated || !isSeller) {
    return null;
  }

  // Filter stores based on active tab
  const filteredStores = stores.filter((store: any) => {
    if (activeTab === 'all') return true;
    return activeTab === 'open' ? store.isOpen : !store.isOpen;
  });

  const renderStoreCards = () => {
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

    if (filteredStores.length === 0) {
      return (
        <div className="col-span-full">
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="text-4xl mb-4 text-gray-300">
              <i className="fas fa-store-slash"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma loja encontrada</h3>
            <p className="text-gray-500 mb-6">Você ainda não possui lojas cadastradas nesta categoria</p>
            <Button 
              onClick={() => navigate('/seller/stores/add-store')}
              className="bg-primary text-white hover:bg-primary/90"
            >
              <i className="fas fa-plus mr-2"></i>Criar Nova Loja
            </Button>
          </div>
        </div>
      );
    }

    return filteredStores.map((store: any) => (
      <Card key={store.id} className="overflow-hidden">
        <div className="h-40 bg-cover bg-center" style={{
          backgroundImage: `url(${store.images?.[0] || 'https://images.unsplash.com/photo-1579202673506-ca3ce28943ef'})`,
        }}>
          <div className="h-full w-full bg-gradient-to-b from-black/10 to-black/50 flex items-end p-4">
            <Badge className={store.isOpen ? 'bg-green-500' : 'bg-red-500'}>
              {store.isOpen ? 'Aberta' : 'Fechada'}
            </Badge>
          </div>
        </div>
        <CardHeader>
          <CardTitle>{store.name}</CardTitle>
          <CardDescription>
            Categoria: {store.category}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 line-clamp-2 mb-2">
            {store.description}
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {store.tags?.map((tag: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t bg-gray-50">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/seller/stores/${store.id}`)}
          >
            <i className="fas fa-edit mr-2"></i>
            Editar
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/seller/stores/${store.id}/products`)}
          >
            <i className="fas fa-box mr-2"></i>
            Produtos
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/seller/stores/${store.id}/analytics`)}
          >
            <i className="fas fa-chart-bar mr-2"></i>
            Análises
          </Button>
        </CardFooter>
      </Card>
    ));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Minhas Lojas</h1>
          <p className="text-gray-600">Gerencie suas lojas no SAARA</p>
        </div>
        <Button 
          onClick={() => navigate('/seller/stores/add-store')}
          className="bg-primary text-white hover:bg-primary/90"
        >
          <i className="fas fa-plus mr-2"></i>
          Nova Loja
        </Button>
      </div>

      <div className="mb-6">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
            <TabsTrigger value="all">
              <i className="fas fa-store mr-2"></i>
              Todas ({stores.length})
            </TabsTrigger>
            <TabsTrigger value="open">
              <i className="fas fa-door-open mr-2"></i>
              Abertas ({stores.filter((s: any) => s.isOpen).length})
            </TabsTrigger>
            <TabsTrigger value="closed">
              <i className="fas fa-door-closed mr-2"></i>
              Fechadas ({stores.filter((s: any) => !s.isOpen).length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {renderStoreCards()}
      </div>

      {stores.length > 0 && filteredStores.length === 0 && (
        <div className="text-center mt-8 py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">Nenhuma loja encontrada com os filtros selecionados.</p>
        </div>
      )}
    </div>
  );
}