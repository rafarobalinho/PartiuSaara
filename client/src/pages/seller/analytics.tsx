import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

export default function SellerAnalytics() {
  const { isAuthenticated, isSeller } = useAuth();
  const [, navigate] = useLocation();
  const [dateRange, setDateRange] = useState('week');

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

  // Mock analytics data
  const visitsData = {
    week: [
      { day: 'Seg', visits: 45 },
      { day: 'Ter', visits: 52 },
      { day: 'Qua', visits: 49 },
      { day: 'Qui', visits: 65 },
      { day: 'Sex', visits: 87 },
      { day: 'Sáb', visits: 115 },
      { day: 'Dom', visits: 90 },
    ],
    month: [
      { day: 'Semana 1', visits: 320 },
      { day: 'Semana 2', visits: 280 },
      { day: 'Semana 3', visits: 390 },
      { day: 'Semana 4', visits: 420 },
    ],
    year: [
      { day: 'Jan', visits: 1200 },
      { day: 'Fev', visits: 1400 },
      { day: 'Mar', visits: 1650 },
      { day: 'Abr', visits: 1500 },
      { day: 'Mai', visits: 1780 },
      { day: 'Jun', visits: 1620 },
      { day: 'Jul', visits: 1800 },
      { day: 'Ago', visits: 2000 },
      { day: 'Set', visits: 1850 },
      { day: 'Out', visits: 1950 },
      { day: 'Nov', visits: 2200 },
      { day: 'Dez', visits: 2500 },
    ]
  };

  const productViewsData = [
    { name: 'Produto A', views: 320 },
    { name: 'Produto B', views: 280 },
    { name: 'Produto C', views: 250 },
    { name: 'Produto D', views: 210 },
    { name: 'Produto E', views: 190 },
  ];

  const reservationSourceData = [
    { name: 'Busca', value: 45 },
    { name: 'Categoria', value: 25 },
    { name: 'Home', value: 15 },
    { name: 'Promoções', value: 10 },
    { name: 'Direto', value: 5 },
  ];

  const reservationsByCategoryData = [
    { name: 'Eletrônicos', value: 35 },
    { name: 'Moda', value: 25 },
    { name: 'Acessórios', value: 20 },
    { name: 'Calçados', value: 15 },
    { name: 'Casa', value: 5 },
  ];

  const salesByHourData = [
    { hour: '06-08', sales: 3 },
    { hour: '08-10', sales: 8 },
    { hour: '10-12', sales: 15 },
    { hour: '12-14', sales: 20 },
    { hour: '14-16', sales: 18 },
    { hour: '16-18', sales: 25 },
    { hour: '18-20', sales: 30 },
    { hour: '20-22', sales: 20 },
  ];

  const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
  
  const currentVisitsData = visitsData[dateRange];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Análise e Métricas</h1>
          <p className="text-gray-600">Acompanhe o desempenho da sua loja e produtos</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex space-x-2">
          <Button 
            variant={dateRange === 'week' ? 'default' : 'outline'} 
            size="sm"
            className={dateRange === 'week' ? 'bg-primary text-white' : ''}
            onClick={() => setDateRange('week')}
          >
            Semana
          </Button>
          <Button 
            variant={dateRange === 'month' ? 'default' : 'outline'} 
            size="sm"
            className={dateRange === 'month' ? 'bg-primary text-white' : ''}
            onClick={() => setDateRange('month')}
          >
            Mês
          </Button>
          <Button 
            variant={dateRange === 'year' ? 'default' : 'outline'} 
            size="sm"
            className={dateRange === 'year' ? 'bg-primary text-white' : ''}
            onClick={() => setDateRange('year')}
          >
            Ano
          </Button>
        </div>
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
                  data={currentVisitsData}
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
            <CardTitle>Origem das Reservas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reservationSourceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {reservationSourceData.map((entry, index) => (
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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Visualizados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={productViewsData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={90} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="views" name="Visualizações" fill="hsl(var(--chart-2))" barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reservas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reservationsByCategoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {reservationsByCategoryData.map((entry, index) => (
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Vendas por Horário</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={salesByHourData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" name="Reservas" fill="hsl(var(--chart-3))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <h3 className="text-lg font-medium mb-2">Relatório Completo</h3>
        <p className="text-gray-600 mb-4">Exporte um relatório detalhado com todos os dados e métricas da sua loja</p>
        <Button className="bg-primary text-white hover:bg-primary/90">
          <i className="fas fa-download mr-2"></i> Exportar Relatório
        </Button>
      </div>
    </div>
  );
}