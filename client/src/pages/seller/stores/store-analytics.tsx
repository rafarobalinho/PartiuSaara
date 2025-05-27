
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { useLocation, useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Package, ShoppingCart, Clock, Tag, TrendingUp, Users, Eye, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';

interface StoreStats {
  totalProducts: number;
  totalReservations: number;
  pendingReservations: number;
  totalCoupons: number;
}

interface Store {
  id: number;
  name: string;
  description: string;
  category: string;
  isOpen: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
}

// Dados mockados para demonstração - em produção viriam da API
const mockChartData = {
  weeklyStats: [
    { day: 'Seg', products: 12, reservations: 8, views: 145 },
    { day: 'Ter', products: 15, reservations: 12, views: 189 },
    { day: 'Qua', products: 10, reservations: 6, views: 167 },
    { day: 'Qui', products: 18, reservations: 15, views: 203 },
    { day: 'Sex', products: 22, reservations: 18, views: 234 },
    { day: 'Sáb', products: 28, reservations: 25, views: 289 },
    { day: 'Dom', products: 20, reservations: 16, views: 198 }
  ],
  categoryDistribution: [
    { name: 'Eletrônicos', value: 35, color: '#8884d8' },
    { name: 'Roupas', value: 25, color: '#82ca9d' },
    { name: 'Casa', value: 20, color: '#ffc658' },
    { name: 'Livros', value: 12, color: '#ff7c7c' },
    { name: 'Outros', value: 8, color: '#8dd1e1' }
  ],
  monthlyTrend: [
    { month: 'Jan', revenue: 4500, orders: 45 },
    { month: 'Fev', revenue: 5200, orders: 52 },
    { month: 'Mar', revenue: 4800, orders: 48 },
    { month: 'Abr', revenue: 6100, orders: 61 },
    { month: 'Mai', revenue: 7200, orders: 72 },
    { month: 'Jun', revenue: 6800, orders: 68 }
  ]
};

export default function StoreAnalyticsPage() {
  const { isAuthenticated, isSeller } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams();
  const storeId = params.storeId;

  console.log('[StoreAnalyticsPage] storeId obtido da URL:', storeId);

  // Redirect if not authenticated or not a seller
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (!isSeller) {
      navigate('/account');
    }
  }, [isAuthenticated, isSeller, navigate]);

  // Buscar informações da loja
  const { data: store } = useQuery({
    queryKey: [`/api/stores/${storeId}`],
    queryFn: async () => {
      const response = await fetch(`/api/stores/${storeId}`);
      if (!response.ok) throw new Error('Falha ao carregar dados da loja');
      return await response.json() as Store;
    },
    enabled: !!storeId && !!isAuthenticated && !!isSeller
  });

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

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = "text-blue-600" }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className={`text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'} flex items-center`}>
            <TrendingUp className="h-3 w-3 mr-1" />
            {trendValue}% vs mês anterior
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
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
        <div>
          <h1 className="text-2xl font-bold">
            Analytics - {store?.name || `Loja ID: ${storeId}`}
          </h1>
          <p className="text-gray-600">Análise detalhada do desempenho da sua loja</p>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando estatísticas da loja...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-8">
          <p className="text-red-600">Erro ao carregar estatísticas: {error.message}</p>
        </div>
      )}

      {stats && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="sales">Vendas</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Cards de Estatísticas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total de Produtos"
                value={stats.totalProducts}
                icon={Package}
                trend="up"
                trendValue={12}
                color="text-blue-600"
              />
              <StatCard
                title="Total de Reservas"
                value={stats.totalReservations}
                icon={ShoppingCart}
                trend="up"
                trendValue={8}
                color="text-green-600"
              />
              <StatCard
                title="Reservas Pendentes"
                value={stats.pendingReservations}
                icon={Clock}
                trend="down"
                trendValue={3}
                color="text-orange-600"
              />
              <StatCard
                title="Cupons Ativos"
                value={stats.totalCoupons}
                icon={Tag}
                trend="up"
                trendValue={15}
                color="text-purple-600"
              />
            </div>

            {/* Gráficos da Semana */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Atividade Semanal</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={mockChartData.weeklyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="products" fill="#8884d8" name="Produtos" />
                      <Bar dataKey="reservations" fill="#82ca9d" name="Reservas" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Visualizações da Loja</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={mockChartData.weeklyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="views" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={mockChartData.categoryDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {mockChartData.categoryDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status dos Produtos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Produtos Ativos</span>
                    <span className="text-sm font-bold text-green-600">{stats.totalProducts}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Em Estoque</span>
                    <span className="text-sm font-bold text-blue-600">{Math.floor(stats.totalProducts * 0.8)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Estoque Baixo</span>
                    <span className="text-sm font-bold text-orange-600">{Math.floor(stats.totalProducts * 0.15)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Sem Estoque</span>
                    <span className="text-sm font-bold text-red-600">{Math.floor(stats.totalProducts * 0.05)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sales" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tendência de Vendas (6 Meses)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={mockChartData.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Receita (R$)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="orders" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="Pedidos"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Taxa de Conversão</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">3.2%</div>
                  <p className="text-sm text-gray-600">Visitantes que fizeram reservas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tempo Médio na Loja</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">2m 45s</div>
                  <p className="text-sm text-gray-600">Tempo de navegação</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Avaliação Média</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">
                    {store?.rating || 4.5} ⭐
                  </div>
                  <p className="text-sm text-gray-600">
                    {store?.reviewCount || 0} avaliações
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Informações da Loja */}
            <Card>
              <CardHeader>
                <CardTitle>Informações da Loja</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold">Nome</h3>
                    <p className="text-gray-600">{store?.name}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Categoria</h3>
                    <p className="text-gray-600">{store?.category}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Status</h3>
                    <p className={store?.isOpen ? "text-green-600" : "text-red-600"}>
                      {store?.isOpen ? "Aberta" : "Fechada"}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Data de Criação</h3>
                    <p className="text-gray-600">
                      {store?.createdAt ? new Date(store.createdAt).toLocaleDateString('pt-BR') : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Seção de Debug (pode ser removida em produção) */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Dados de Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify({ storeId, stats, store: store ? { id: store.id, name: store.name } : null }, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
