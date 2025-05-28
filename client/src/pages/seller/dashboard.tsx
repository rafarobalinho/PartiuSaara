
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

interface Store {
  id: number;
  name: string;
  description: string;
  category: string;
  subscriptionPlan: string;
  subscriptionEndDate?: string;
  subscriptionStatus: string;
}

interface StoreStats {
  totalProducts: number;
  totalActiveProducts: number;
  totalReservations: number;
  pendingReservations: number;
  totalCoupons: number;
}

const dummyVisitData = [
  { day: 'Segunda', visits: 120 },
  { day: 'Terça', visits: 150 },
  { day: 'Quarta', visits: 180 },
  { day: 'Quinta', visits: 190 },
  { day: 'Sexta', visits: 220 },
  { day: 'Sábado', visits: 250 },
  { day: 'Domingo', visits: 130 },
];

const dummyCategoryData = [
  { name: 'Moda', value: 35 },
  { name: 'Eletrônicos', value: 25 },
  { name: 'Acessórios', value: 20 },
  { name: 'Casa', value: 15 },
  { name: 'Outros', value: 5 },
];

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

export default function SellerDashboard() {
  const { isAuthenticated, isSeller, user } = useAuth();
  const [, navigate] = useLocation();
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);

  // If not authenticated or not a seller, redirect
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (!isSeller) {
      navigate('/account');
    }
  }, [isAuthenticated, isSeller, navigate]);

  if (!isAuthenticated || !isSeller) {
    return null;
  }

  // Fetch seller's stores data
  const { data: stores = [], isLoading: isStoresLoading } = useQuery({
    queryKey: ['/api/stores/my-stores'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/stores/my-stores');
        if (!response.ok) {
          throw new Error('Falha ao carregar lojas');
        }
        const storesData = await response.json();
        console.log('Lojas carregadas no dashboard:', storesData);
        return storesData as Store[];
      } catch (error) {
        console.error('Error fetching stores:', error);
        return [];
      }
    }
  });

  // Set active store when stores are loaded
  useEffect(() => {
    if (stores.length > 0 && !activeStoreId) {
      setActiveStoreId(stores[0].id.toString());
    }
  }, [stores, activeStoreId]);

  // Fetch store statistics for active store
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['/api/seller/stats', activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) return null;
      
      try {
        const response = await fetch(`/api/seller/stats?storeId=${activeStoreId}`);
        if (!response.ok) {
          throw new Error('Falha ao carregar estatísticas');
        }
        const data = await response.json() as StoreStats;
        console.log('Estatísticas carregadas para loja', activeStoreId, ':', data);
        return data;
      } catch (error) {
        console.error('Error fetching stats:', error);
        return {
          totalProducts: 0,
          totalActiveProducts: 0,
          totalReservations: 0,
          pendingReservations: 0,
          totalCoupons: 0
        } as StoreStats;
      }
    },
    enabled: !!activeStoreId
  });

  const activeStore = stores.find(store => store.id.toString() === activeStoreId);

  // Loading state
  if (isStoresLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // No stores state
  if (stores.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Dashboard do Lojista</h1>
          <p className="text-gray-600 mb-6">Você ainda não possui lojas cadastradas.</p>
          <Button asChild className="bg-primary text-white hover:bg-primary/90">
            <Link href="/seller/stores/add">
              <a>Criar Primeira Loja</a>
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Dashboard do Lojista</h1>
          <p className="text-gray-600">Gerencie suas lojas e acompanhe as estatísticas</p>
        </div>

        <div className="mt-4 md:mt-0 flex space-x-2">
          <Button asChild size="sm" className="bg-primary text-white hover:bg-primary/90">
            <Link href="/seller/products/add">
              <a>Adicionar Produto</a>
            </Link>
          </Button>
          <Button asChild size="sm" className="bg-primary text-white hover:bg-primary/90">
            <Link href="/seller/promotions/add">
              <a>Criar Promoção</a>
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeStoreId || ''} onValueChange={setActiveStoreId} className="w-full">
        {/* Mobile: Scrollable horizontal tabs */}
        <div className="mb-6 md:hidden">
          <div className="overflow-x-auto scrollbar-hide">
            <TabsList className="inline-flex w-max min-w-full px-2">
              {stores.map((store) => (
                <TabsTrigger 
                  key={store.id} 
                  value={store.id.toString()}
                  className="flex flex-col items-center p-3 min-w-[120px] mx-1 relative
                    data-[state=active]:bg-[#F2600C] data-[state=active]:text-white 
                    data-[state=active]:font-bold data-[state=active]:shadow-lg
                    data-[state=active]:border-b-4 data-[state=active]:border-[#C24A00]
                    hover:bg-orange-50 transition-all duration-300
                    before:content-[''] before:absolute before:top-0 before:left-1/2 before:transform before:-translate-x-1/2
                    data-[state=active]:before:w-2 data-[state=active]:before:h-2 
                    data-[state=active]:before:bg-white data-[state=active]:before:rounded-full
                    data-[state=active]:before:-mt-1"
                >
                  <span className="font-medium text-sm truncate max-w-[100px]">{store.name}</span>
                  <Badge 
                    variant="secondary" 
                    className={`mt-1 text-xs ${
                      activeStoreId === store.id.toString() ? 'bg-white/20 text-white border-white/30' :
                      store.subscriptionPlan === 'premium' ? 'bg-purple-100 text-purple-800' :
                      store.subscriptionPlan === 'pro' ? 'bg-blue-100 text-blue-800' :
                      store.subscriptionPlan === 'start' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {store.subscriptionPlan === 'freemium' ? 'Gratuito' : store.subscriptionPlan}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        {/* Desktop: Grid layout */}
        <TabsList className="hidden md:grid w-full grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6 gap-2">
          {stores.map((store) => (
            <TabsTrigger 
              key={store.id} 
              value={store.id.toString()}
              className="flex flex-col items-center p-4 relative h-auto
                data-[state=active]:bg-[#F2600C] data-[state=active]:text-white 
                data-[state=active]:font-bold data-[state=active]:shadow-xl
                data-[state=active]:border-b-4 data-[state=active]:border-[#C24A00]
                data-[state=active]:transform data-[state=active]:scale-105
                hover:bg-orange-50 hover:shadow-md transition-all duration-300
                before:content-['✓'] before:absolute before:top-1 before:right-1
                data-[state=active]:before:opacity-100 before:opacity-0
                data-[state=active]:before:text-white data-[state=active]:before:text-sm
                data-[state=active]:before:font-bold before:transition-opacity before:duration-300"
            >
              <span className="font-medium text-center leading-tight">{store.name}</span>
              <Badge 
                variant="secondary" 
                className={`mt-2 text-xs ${
                  activeStoreId === store.id.toString() ? 'bg-white/20 text-white border-white/30' :
                  store.subscriptionPlan === 'premium' ? 'bg-purple-100 text-purple-800' :
                  store.subscriptionPlan === 'pro' ? 'bg-blue-100 text-blue-800' :
                  store.subscriptionPlan === 'start' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}
              >
                {store.subscriptionPlan === 'freemium' ? 'Gratuito' : store.subscriptionPlan}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {stores.map((store) => (
          <TabsContent key={store.id} value={store.id.toString()} className="space-y-6">
            {/* Store Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold mb-2">{store.name}</h2>
                    <p className="text-gray-600 mb-2">{store.description}</p>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        className={`${
                          store.subscriptionPlan === 'premium' ? 'bg-purple-100 text-purple-800' :
                          store.subscriptionPlan === 'pro' ? 'bg-blue-100 text-blue-800' :
                          store.subscriptionPlan === 'start' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}
                      >
                        Plano {store.subscriptionPlan.charAt(0).toUpperCase() + store.subscriptionPlan.slice(1)}
                      </Badge>
                      {store.subscriptionEndDate && store.subscriptionPlan !== 'freemium' && (
                        <span className="text-sm text-gray-500">
                          Válido até {new Date(store.subscriptionEndDate).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 md:mt-0 flex flex-col space-y-2">
                    <Button asChild className="bg-primary text-white hover:bg-primary/90">
                      <Link href={`/seller/stores/${store.id}/analytics`}>
                        <a>Ver Analytics Completo</a>
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={`/seller/stores/${store.id}/subscription`}>
                        <a>Gerenciar Assinatura</a>
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Store Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Total de Produtos</p>
                      <h3 className="text-2xl font-bold">
                        {isStatsLoading && activeStoreId === store.id.toString() ? '-' : stats?.totalProducts || 0}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {isStatsLoading && activeStoreId === store.id.toString() ? '-' : stats?.totalActiveProducts || 0} ativos
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <i className="fas fa-box"></i>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Reservas Totais</p>
                      <h3 className="text-2xl font-bold">
                        {isStatsLoading && activeStoreId === store.id.toString() ? '-' : stats?.totalReservations || 0}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {isStatsLoading && activeStoreId === store.id.toString() ? '-' : stats?.pendingReservations || 0} pendentes
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <i className="fas fa-bookmark"></i>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Promoções Ativas</p>
                      <h3 className="text-2xl font-bold">
                        {isStatsLoading && activeStoreId === store.id.toString() ? '-' : stats?.totalCoupons || 0}
                      </h3>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <i className="fas fa-ticket-alt"></i>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Status da Loja</p>
                      <div className="flex items-center mt-2">
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          store.subscriptionStatus === 'active' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className="text-sm font-medium">
                          {store.subscriptionStatus === 'active' ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <i className="fas fa-store"></i>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts - Optional, can be removed if too much for summary view */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Visitas na Loja - {store.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={dummyVisitData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="visits" 
                          name="Visitas" 
                          stroke="hsl(var(--chart-1))" 
                          activeDot={{ r: 8 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Produtos por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dummyCategoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {dummyCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas - {store.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center">
                    <Link href={`/seller/stores/${store.id}/products`}>
                      <a>
                        <i className="fas fa-box text-2xl mb-2"></i>
                        <span>Gerenciar Produtos</span>
                      </a>
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center">
                    <Link href="/seller/promotions">
                      <a>
                        <i className="fas fa-percent text-2xl mb-2"></i>
                        <span>Promoções</span>
                      </a>
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center">
                    <Link href="/seller/reservations">
                      <a>
                        <i className="fas fa-bookmark text-2xl mb-2"></i>
                        <span>Reservas</span>
                      </a>
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center">
                    <Link href={`/seller/stores/${store.id}`}>
                      <a>
                        <i className="fas fa-edit text-2xl mb-2"></i>
                        <span>Editar Loja</span>
                      </a>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
