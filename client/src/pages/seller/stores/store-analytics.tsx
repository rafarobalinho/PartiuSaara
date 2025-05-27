
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { useLocation, useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface StoreStats {
  totalProducts: number;
  totalReservations: number;
  pendingReservations: number;
  totalCoupons: number;
}

export default function StoreAnalyticsPage() {
  const { isAuthenticated, isSeller } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams();
  const storeId = params.storeId;

  console.log('[StoreAnalyticsPage] storeId obtido da URL:', storeId);
  console.log('[StoreAnalyticsPage] Parâmetros da URL completos:', params);

  // Redirect if not authenticated or not a seller
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (!isSeller) {
      navigate('/account');
    }
  }, [isAuthenticated, isSeller, navigate]);

  // Fetch store-specific statistics
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['/api/seller/stats', storeId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/seller/stats?storeId=${storeId}`);
        if (!response.ok) {
          throw new Error('Falha ao carregar estatísticas da loja');
        }
        const data = await response.json() as StoreStats;
        console.log('[StoreAnalyticsPage] Dados recebidos da API:', data);
        return data;
      } catch (error) {
        console.error('[StoreAnalyticsPage] Erro ao buscar estatísticas:', error);
        throw error;
      }
    },
    enabled: !!storeId && !!isAuthenticated && !!isSeller
  });

  if (!isAuthenticated || !isSeller) {
    return null;
  }

  if (!storeId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erro: ID da loja não encontrado</h1>
          <Button onClick={() => navigate('/seller/stores')}>
            Voltar para Minhas Lojas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/seller/stores')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">Analytics para Loja ID: {storeId}</h1>
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <p>Carregando estatísticas da loja...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-8">
          <p className="text-red-600">Erro ao carregar estatísticas: {error.message}</p>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Reservas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReservations}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reservas Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingReservations}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Cupons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCoupons}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Dados de Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify({ storeId, stats, isLoading, error: error?.message }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
