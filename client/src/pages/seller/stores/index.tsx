import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
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
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SellerStores() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [storeToDelete, setStoreToDelete] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAuthenticated = !!user;
  const isSeller = user?.role === 'seller';

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isSeller)) {
      navigate('/auth');
    }
  }, [authLoading, isAuthenticated, isSeller, navigate]);

  // ==================================================================
  // CORREÇÃO APLICADA AQUI
  // Agora buscamos na API correta e não precisamos mais filtrar no frontend.
  // ==================================================================
  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['/api/stores/my-stores'], // Chave de query correta
    queryFn: async () => {
      // Usando a função apiRequest para consistência e autenticação
      const response = await apiRequest('GET', '/api/stores/my-stores');
      if (!response.ok) {
        throw new Error('Falha ao carregar suas lojas');
      }
      return await response.json();
    },
    enabled: !!isAuthenticated && !!isSeller
  });

  const deleteStoreMutation = useMutation({
    mutationFn: async (storeId: number) => {
      const response = await apiRequest('DELETE', `/api/stores/${storeId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir loja');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores/my-stores'] });
      toast({
        title: "Loja excluída",
        description: "Sua loja foi excluída com sucesso",
      });
      setStoreToDelete(null);
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir loja",
        description: error.message || 'Ocorreu um erro ao excluir a loja',
        variant: "destructive"
      });
    }
  });

  const handleDeleteStore = (storeId: number) => {
    setStoreToDelete(storeId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteStore = () => {
    if (storeToDelete) {
      deleteStoreMutation.mutate(storeToDelete);
    }
  };

  if (!isAuthenticated || !isSeller) {
    return null; 
  }

  const filteredStores = stores.filter((store: any) => {
    if (activeTab === 'all') return true;
    return activeTab === 'open' ? store.is_open : !store.is_open; // Usando is_open do banco
  });

  const renderStoreCards = () => {
    if (isLoading) {
      return Array(3).fill(0).map((_, index) => (
        <Card key={index} className="overflow-hidden">
          <Skeleton className="h-40 w-full" />
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
           <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
          </CardContent>
          <CardFooter className="border-t p-3">
             <div className="grid grid-cols-2 md:grid-cols-5 gap-2 w-full">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
             </div>
          </CardFooter>
        </Card>
      ));
    }

    if (filteredStores.length === 0) {
      return (
        <div className="col-span-full">
          <div className="text-center py-12 bg-white rounded-lg border">
             <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma loja encontrada</h3>
            <p className="text-gray-500 mb-6">Você ainda não possui lojas ou nenhuma corresponde ao filtro.</p>
            <Button onClick={() => navigate('/seller/stores/add-store')}>
              Criar Nova Loja
            </Button>
          </div>
        </div>
      );
    }

    return filteredStores.map((store: any) => (
      <Card key={store.id} className="overflow-hidden flex flex-col">
        {/* Lógica de imagem simplificada */}
        <div className="h-40 bg-cover bg-center bg-gray-200" style={{
          backgroundImage: `url(${store.primary_image_api_url || '/placeholder-image.jpg'})`,
        }}>
          <div className="h-full w-full bg-gradient-to-t from-black/50 flex items-end p-2">
            <Badge className={store.is_open ? 'bg-green-500' : 'bg-red-500'}>
              {store.is_open ? 'Aberta' : 'Fechada'}
            </Badge>
          </div>
        </div>
        <CardHeader>
          <CardTitle className="line-clamp-1">{store.name}</CardTitle>
          <CardDescription>
            Categoria: {store.category}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-sm text-gray-500 line-clamp-2">
            {store.description}
          </p>
        </CardContent>
        <CardFooter className="border-t bg-gray-50 p-2">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => navigate(`/seller/stores/${store.id}/edit`)}>
              Editar
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/seller/stores/${store.id}/products`)}>
              Produtos
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/seller/stores/${store.id}/analytics`)}>
              Análises
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/seller/stores/${store.id}/subscription`)}>
              Assinatura
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDeleteStore(store.id)} className="text-red-500 hover:text-red-700">
              Excluir
            </Button>
          </div>
        </CardFooter>
      </Card>
    ));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Minhas Lojas</h1>
          <p className="text-gray-600">Gerencie suas lojas.</p>
        </div>
        <Button onClick={() => navigate('/seller/stores/add-store')}>
          Nova Loja
        </Button>
      </div>

      <div className="mb-6">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">Todas ({stores.length})</TabsTrigger>
            <TabsTrigger value="open">Abertas ({stores.filter((s: any) => s.is_open).length})</TabsTrigger>
            <TabsTrigger value="closed">Fechadas ({stores.filter((s: any) => !s.is_open).length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {renderStoreCards()}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a loja e todos os produtos associados a ela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStoreToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteStore} className="bg-red-600 hover:bg-red-700">
              {deleteStoreMutation.isPending ? 'Excluindo...' : 'Sim, excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}