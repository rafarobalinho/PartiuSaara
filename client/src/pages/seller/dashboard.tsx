import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
}

interface Stats {
  totalProducts: number;
  totalReservations: number;
  totalCoupons: number;
  pendingReservations: number;
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
  const { isAuthenticated, isSeller } = useAuth();
  const [, navigate] = useLocation();

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

  // Fetch seller's store data
  const { data: store, isLoading: isStoreLoading } = useQuery({
    queryKey: ['/api/stores?owner=true'],
    queryFn: async () => {
      try {
        const stores = await fetch('/api/stores?owner=true').then(res => res.json());
        return stores[0] || null; // Get the first store (assuming one store per seller)
      } catch (error) {
        console.error('Error fetching store:', error);
        return null;
      }
    }
  });

  // Fetch store statistics
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['/api/seller/stats'],
    queryFn: async () => {
      try {
        // In a real app, this would be an actual API endpoint
        return {
          totalProducts: 32,
          totalReservations: 47,
          totalCoupons: 8,
          pendingReservations: 5
        } as Stats;
      } catch (error) {
        console.error('Error fetching stats:', error);
        return {
          totalProducts: 0,
          totalReservations: 0,
          totalCoupons: 0,
          pendingReservations: 0
        } as Stats;
      }
    },
    enabled: !!store
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Dashboard do Lojista</h1>
          <p className="text-gray-600">Gerencie sua loja e acompanhe as estatísticas</p>
        </div>
        
        {store && (
          <div className="mt-4 md:mt-0 flex flex-col items-end">
            <div className="flex items-center mb-1">
              <span className="font-medium">{store.name}</span>
              <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                {store.subscriptionPlan === 'freemium' ? 'Plano Gratuito' : 'Plano ' + store.subscriptionPlan.charAt(0).toUpperCase() + store.subscriptionPlan.slice(1)}
              </span>
            </div>
            {store.subscriptionPlan !== 'freemium' && store.subscriptionEndDate && (
              <span className="text-xs text-gray-500">
                Assinatura válida até {new Date(store.subscriptionEndDate).toLocaleDateString('pt-BR')}
              </span>
            )}
            {store.subscriptionPlan === 'freemium' && (
              <Button asChild size="sm" className="mt-2 bg-primary text-white hover:bg-primary/90">
                <Link href="/seller/subscription">
                  <a>Fazer upgrade do plano</a>
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Produtos</p>
                <h3 className="text-2xl font-bold">{isStatsLoading ? '-' : stats?.totalProducts}</h3>
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
                <p className="text-gray-500 text-sm">Reservas</p>
                <h3 className="text-2xl font-bold">{isStatsLoading ? '-' : stats?.totalReservations}</h3>
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
                <p className="text-gray-500 text-sm">Cupons Ativos</p>
                <h3 className="text-2xl font-bold">{isStatsLoading ? '-' : stats?.totalCoupons}</h3>
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
                <p className="text-gray-500 text-sm">Reservas Pendentes</p>
                <h3 className="text-2xl font-bold">{isStatsLoading ? '-' : stats?.pendingReservations}</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <i className="fas fa-clock"></i>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Visitas na Loja</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
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
            <div className="h-80">
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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Reservas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3">Produto</th>
                    <th className="px-6 py-3">Cliente</th>
                    <th className="px-6 py-3">Data</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white border-b">
                    <td className="px-6 py-4 font-medium">Smartphone XYZ</td>
                    <td className="px-6 py-4">João Silva</td>
                    <td className="px-6 py-4">10/05/2023</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        Pendente
                      </span>
                    </td>
                  </tr>
                  <tr className="bg-white border-b">
                    <td className="px-6 py-4 font-medium">Tênis Runner</td>
                    <td className="px-6 py-4">Maria Souza</td>
                    <td className="px-6 py-4">09/05/2023</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Finalizada
                      </span>
                    </td>
                  </tr>
                  <tr className="bg-white border-b">
                    <td className="px-6 py-4 font-medium">Bolsa Elite</td>
                    <td className="px-6 py-4">Carlos Oliveira</td>
                    <td className="px-6 py-4">08/05/2023</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Finalizada
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-center">
              <Button asChild variant="outline" size="sm">
                <Link href="/seller/reservations">
                  <a>Ver todas as reservas</a>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vistos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Produto A', views: 400 },
                    { name: 'Produto B', views: 300 },
                    { name: 'Produto C', views: 250 },
                    { name: 'Produto D', views: 200 },
                    { name: 'Produto E', views: 150 },
                  ]}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="views" name="Visualizações" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-center">
              <Button asChild variant="outline" size="sm">
                <Link href="/seller/analytics">
                  <a>Ver analytics completo</a>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
