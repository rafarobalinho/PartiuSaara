
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Store, Package, Tag, Users } from "lucide-react";
import { Link } from "wouter";

export default function StoreAnalyticsPage() {
  const params = useParams();
  const storeId = params.storeId;

  console.log('[StoreAnalyticsPage] storeId obtido da URL:', storeId);
  console.log('[StoreAnalyticsPage] Parâmetros completos:', params);

  // Buscar dados de estatísticas específicos da loja
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['seller-stats', storeId],
    queryFn: async () => {
      const response = await fetch(`/api/seller/stats?storeId=${storeId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Erro ao carregar estatísticas da loja');
      }
      return response.json();
    },
    enabled: !!storeId
  });

  // Buscar informações da loja
  const { data: store } = useQuery({
    queryKey: ['store', storeId],
    queryFn: async () => {
      const response = await fetch(`/api/stores/${storeId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Erro ao carregar dados da loja');
      }
      return response.json();
    },
    enabled: !!storeId
  });

  if (!storeId) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Erro: ID da loja não encontrado</h1>
          <Link href="/seller/stores">
            <Button className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Lista de Lojas
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Erro ao carregar dados</h1>
          <p className="text-gray-600 mt-2">{error.message}</p>
          <Link href="/seller/stores">
            <Button className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Lista de Lojas
            </Button>
            </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/seller/stores">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Lojas
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Analytics - {store?.name || 'Carregando...'}</h1>
          <p className="text-gray-600">Painel de análise específico desta loja</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/seller/stores/${storeId}/subscription`}>
            <Button variant="outline">
              Gerenciar Plano
            </Button>
          </Link>
          <Link href={`/seller/stores/${storeId}/products`}>
            <Button>
              <Package className="w-4 h-4 mr-2" />
              Ver Produtos
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Produtos cadastrados nesta loja
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promoções Ativas</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPromotions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Promoções em andamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reservas Pendentes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.reservationStats?.find(r => r.status === 'pending')?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Aguardando confirmação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status da Loja</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {store?.isOpen ? 'Aberta' : 'Fechada'}
            </div>
            <p className="text-xs text-muted-foreground">
              Plano: {store?.subscriptionPlan || 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Analytics Sections */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Resumo de Reservas</CardTitle>
            <CardDescription>
              Status das reservas para produtos desta loja
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.reservationStats && stats.reservationStats.length > 0 ? (
              <div className="space-y-2">
                {stats.reservationStats.map((stat, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="capitalize">{stat.status}:</span>
                    <span className="font-semibold">{stat.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Nenhuma reserva encontrada</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Gerenciar aspectos desta loja
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={`/seller/stores/${storeId}/products`}>
              <Button className="w-full" variant="outline">
                <Package className="w-4 h-4 mr-2" />
                Gerenciar Produtos
              </Button>
            </Link>
            <Link href={`/seller/stores/${storeId}/promotions`}>
              <Button className="w-full" variant="outline">
                <Tag className="w-4 h-4 mr-2" />
                Gerenciar Promoções
              </Button>
            </Link>
            <Link href={`/seller/stores/${storeId}/subscription`}>
              <Button className="w-full" variant="outline">
                <Store className="w-4 h-4 mr-2" />
                Configurar Assinatura
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
