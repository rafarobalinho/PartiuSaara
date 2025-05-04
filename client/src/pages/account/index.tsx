import { useAuth } from '@/context/auth-context';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserData {
  id: number;
  username: string;
  email: string;
  name: string;
  role: 'customer' | 'seller';
  createdAt?: string;
  stats?: {
    wishlistCount: number;
    reservationsCount: number;
    favoriteStoresCount: number;
  };
}

interface Reservation {
  id: number;
  productId: number;
  quantity: number;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  expiresAt: string;
  createdAt: string;
  product: {
    id: number;
    name: string;
    images: string[];
    price: number;
    discountedPrice?: number;
    store: {
      id: number;
      name: string;
    };
  };
}

export default function Account() {
  const { user, isAuthenticated, isSeller, logout } = useAuth();
  const [, navigate] = useLocation();

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const { data: userData, isLoading: isUserDataLoading } = useQuery({
    queryKey: ['/api/users/me'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/users/me');
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
      }
    }
  });

  const { data: recentReservations = [], isLoading: isReservationsLoading } = useQuery({
    queryKey: ['/api/reservations?limit=3'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/reservations?limit=3');
        if (!response.ok) {
          throw new Error('Failed to fetch reservations');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching reservations:', error);
        return [];
      }
    }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Minha Conta</h1>
        <p className="text-gray-600">Gerencie suas informações e acompanhe suas atividades</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Menu</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex flex-col space-y-1">
                <Button variant="ghost" className="justify-start">
                  <i className="fas fa-user mr-2"></i> Perfil
                </Button>
                <Button asChild variant="ghost" className="justify-start">
                  <Link href="/account/wishlist">
                    <a>
                      <i className="fas fa-heart mr-2"></i> Lista de Desejos
                    </a>
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="justify-start">
                  <Link href="/account/reservations">
                    <a>
                      <i className="fas fa-bookmark mr-2"></i> Minhas Reservas
                    </a>
                  </Link>
                </Button>
                {isSeller && (
                  <Button asChild variant="ghost" className="justify-start">
                    <Link href="/seller/dashboard">
                      <a>
                        <i className="fas fa-store mr-2"></i> Painel do Lojista
                      </a>
                    </Link>
                  </Button>
                )}
                <div className="pt-4 mt-2 border-t border-gray-200">
                  <Button variant="ghost" className="justify-start w-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={logout}>
                    <i className="fas fa-sign-out-alt mr-2"></i> Sair
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* User Info Card */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <i className="fas fa-user text-3xl"></i>
                </div>
                
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{userData?.name || user?.username}</h2>
                  <p className="text-gray-500">{userData?.email || user?.email}</p>
                  
                  <div className="flex items-center mt-2">
                    <Badge variant="outline" className="mr-2">
                      {userData?.role === 'seller' ? 'Lojista' : 'Consumidor'}
                    </Badge>
                    {userData?.createdAt && (
                      <span className="text-xs text-gray-500">
                        Membro desde {new Date(userData.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
                
                <Button variant="outline" className="flex-shrink-0">
                  <i className="fas fa-edit mr-2"></i> Editar Perfil
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500">Lista de Desejos</p>
                    <h3 className="text-2xl font-bold">{userData?.stats?.wishlistCount || 0}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <i className="fas fa-heart"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500">Reservas</p>
                    <h3 className="text-2xl font-bold">{userData?.stats?.reservationsCount || 0}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <i className="fas fa-bookmark"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500">Lojas Favoritas</p>
                    <h3 className="text-2xl font-bold">{userData?.stats?.favoriteStoresCount || 0}</h3>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <i className="fas fa-store"></i>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="reservations">
                <TabsList className="mb-4">
                  <TabsTrigger value="reservations">Reservas</TabsTrigger>
                  <TabsTrigger value="wishlist">Lista de Desejos</TabsTrigger>
                </TabsList>
                
                <TabsContent value="reservations">
                  {isReservationsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((_, index) => (
                        <div key={index} className="flex items-center p-3 border rounded-lg">
                          <div className="w-16 h-16 bg-gray-200 animate-pulse rounded-md mr-4"></div>
                          <div className="flex-1">
                            <div className="h-5 bg-gray-200 animate-pulse rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2"></div>
                          </div>
                          <div className="h-8 bg-gray-200 animate-pulse rounded w-20"></div>
                        </div>
                      ))}
                    </div>
                  ) : recentReservations.length > 0 ? (
                    <div className="space-y-4">
                      {recentReservations.map((reservation: Reservation) => (
                        <div key={reservation.id} className="flex items-center p-3 border rounded-lg">
                          <div className="w-16 h-16 rounded-md mr-4 overflow-hidden">
                            <img 
                              src={reservation.product.images[0]} 
                              alt={reservation.product.name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{reservation.product.name}</h4>
                            <p className="text-sm text-gray-500">
                              {reservation.product.store.name} • {new Date(reservation.createdAt).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div>
                            <Badge className={
                              reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              reservation.status === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {reservation.status === 'pending' ? 'Pendente' :
                               reservation.status === 'completed' ? 'Concluída' :
                               reservation.status === 'expired' ? 'Expirada' : 'Cancelada'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      
                      <div className="mt-4 text-center">
                        <Button asChild variant="link" className="text-primary">
                          <Link href="/account/reservations">
                            <a>Ver todas as reservas</a>
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4"><i className="fas fa-bookmark text-gray-300"></i></div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma reserva ainda</h3>
                      <p className="text-gray-500 mb-4">Você ainda não fez nenhuma reserva de produto.</p>
                      <Button asChild className="bg-primary text-white hover:bg-primary/90">
                        <Link href="/products">
                          <a>Explorar produtos</a>
                        </Link>
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="wishlist">
                  {/* Similar to reservations tab but with wishlist data */}
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4"><i className="fas fa-heart text-gray-300"></i></div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Lista de desejos</h3>
                    <p className="text-gray-500 mb-4">Veja todos os produtos da sua lista de desejos.</p>
                    <Button asChild className="bg-primary text-white hover:bg-primary/90">
                      <Link href="/account/wishlist">
                        <a>Ver lista de desejos</a>
                      </Link>
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Add this missing Badge component
function Badge({ children, className = "", variant = "default" }) {
  const variantClasses = {
    default: "bg-primary text-white",
    secondary: "bg-gray-100 text-gray-800",
    outline: "border border-gray-200 text-gray-800",
  };
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
