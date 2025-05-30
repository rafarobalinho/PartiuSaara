import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { useUi } from '@/context/ui-context';
import { useLocation, Link } from 'wouter';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils';
import { SafeImage } from '@/components/ui/safe-image';

interface Reservation {
  id: number;
  productId: number;
  quantity: number;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  // Campos planos adicionados pelo backend
  product_id: number;
  product_name: string;
  product_price: number;
  product_image: string;
  // Novas propriedades para preservar formato visual original
  imageUrl?: string;
  promotion?: {
    id: number;
    type: string; // 'regular' ou 'flash'
    discountPercentage?: number;
    discountAmount?: number;
    priceOverride?: number;
    startsAt?: string;
    endsAt?: string;
  } | null;
  // Objeto completo do produto (pode ser undefined)
  product?: {
    id: number;
    name: string;
    description: string;
    price: number;
    discountedPrice?: number;
    images?: string[];
    store?: {
      id: number;
      name: string;
    };
  };
}

export default function Reservations() {
  const { isAuthenticated } = useAuth();
  const { decrementReservationsCount, syncCounters } = useUi();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const { data: reservations = [], isLoading } = useQuery<Reservation[]>({
    queryKey: ['/api/reservations'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/reservations');
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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest('PUT', `/api/reservations/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      
      // Se for cancelamento ou finalização, atualizar contadores
      if (status === 'cancelled' || status === 'completed') {
        decrementReservationsCount();
        syncCounters();
      }
      
      toast({
        title: 'Status atualizado',
        description: 'O status da reserva foi atualizado com sucesso.',
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao atualizar o status da reserva.',
        variant: "destructive",
      });
      console.error('Error updating reservation status:', error);
    }
  });

  const handleCancelReservation = (id: number) => {
    if (confirm('Tem certeza que deseja cancelar esta reserva?')) {
      updateStatusMutation.mutate({ id, status: 'cancelled' });
    }
  };

  const handleCompleteReservation = (id: number) => {
    updateStatusMutation.mutate({ id, status: 'completed' });
  };
  
  // Mutation para limpar todas as reservas canceladas
  const clearCancelledMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/reservations/cancelled`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
      
      toast({
        title: 'Reservas canceladas removidas',
        description: data.message || 'Todas as reservas canceladas foram removidas com sucesso.',
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao limpar as reservas canceladas.',
        variant: "destructive",
      });
      console.error('Error clearing cancelled reservations:', error);
    }
  });
  
  // Função para limpar todas as reservas canceladas
  const handleClearCancelledReservations = () => {
    if (confirm('Tem certeza que deseja remover todas as reservas canceladas? Esta ação não pode ser desfeita.')) {
      clearCancelledMutation.mutate();
    }
  };

  const filteredReservations = reservations.filter((reservation) => {
    if (activeTab === 'all') return true;
    return reservation.status === activeTab;
  });

  // Format status for display
  const formatStatus = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'completed': return 'Finalizada';
      case 'expired': return 'Expirada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate time remaining for pending reservations
  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiration = new Date(expiresAt);
    const diffMs = expiration.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expirado';
    
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHrs}h ${diffMins}m restantes`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Minhas Reservas</h1>
        <p className="text-gray-600">Gerencie suas reservas de produtos</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-1/4">
          <Card className="p-4">
            <div className="flex flex-col space-y-1">
              <Button asChild variant="ghost" className="justify-start">
                <Link href="/account">
                  <a>
                    <i className="fas fa-user mr-2"></i> Perfil
                  </a>
                </Link>
              </Button>
              <Button asChild variant="ghost" className="justify-start">
                <Link href="/account/wishlist">
                  <a>
                    <i className="fas fa-heart mr-2"></i> Lista de Desejos
                  </a>
                </Link>
              </Button>
              <Button variant="ghost" className="justify-start text-primary">
                <i className="fas fa-bookmark mr-2"></i> Minhas Reservas
              </Button>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:w-3/4">
          <Card className="p-4">
            <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="pending">Pendentes</TabsTrigger>
                <TabsTrigger value="completed">Finalizadas</TabsTrigger>
                <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
                <TabsTrigger value="expired">Expiradas</TabsTrigger>
                <TabsTrigger value="all">Todas</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="space-y-4">
                {/* Botão para limpar reservas canceladas - somente aparece na aba de canceladas */}
                {activeTab === 'cancelled' && filteredReservations.length > 0 && (
                  <div className="flex justify-end mb-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-red-500 text-red-500 hover:bg-red-50"
                      onClick={handleClearCancelledReservations}
                      disabled={clearCancelledMutation.isPending}
                    >
                      {clearCancelledMutation.isPending ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Limpando...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-trash mr-2"></i>
                          Limpar reservas canceladas
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((_, index) => (
                      <div key={index} className="bg-white rounded-lg shadow-sm p-4 flex animate-pulse">
                        <div className="w-24 h-24 bg-gray-200 rounded-md mr-4"></div>
                        <div className="flex-1">
                          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                        </div>
                        <div className="w-32 space-y-2">
                          <div className="h-10 bg-gray-200 rounded"></div>
                          <div className="h-10 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredReservations.length > 0 ? (
                  <div className="space-y-4">
                    {filteredReservations.map((reservation) => (
                      <div key={reservation.id} className="bg-white rounded-lg shadow-sm p-4 border flex flex-col sm:flex-row">
                        <div className="sm:w-24 h-24 rounded-md overflow-hidden mb-4 sm:mb-0 sm:mr-4">
                          <SafeImage 
                            src={`/api/products/${reservation.productId}/primary-image`}
                            alt={reservation.product_name || 'Produto'} 
                            className="w-full h-full object-cover"
                            fallbackSrc="/placeholder-image.jpg"
                            productId={reservation.productId}
                            type="product"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap justify-between mb-2">
                            <Link href={`/products/${reservation.product_id || 0}`} 
                              className="font-medium hover:text-primary hover:underline">
                                {reservation.product_name || 'Produto indisponível'}
                            </Link>
                            <Badge className={getStatusColor(reservation.status)}>
                              {formatStatus(reservation.status)}
                            </Badge>
                          </div>
                          
                          {/* Link para a loja foi removido porque não temos campos planos para ele */}
                          
                          <div className="flex items-center mb-1">
                            <span className="text-lg font-bold text-primary">
                              {formatCurrency(reservation.product_price || 0)}
                            </span>
                            {reservation.quantity > 1 && (
                              <span className="text-sm text-gray-500 ml-2">x{reservation.quantity}</span>
                            )}
                          </div>
                          
                          <div className="text-sm text-gray-500 mb-4">
                            <span>Reservado em: {new Date(reservation.createdAt).toLocaleDateString('pt-BR')}</span>
                            {reservation.status === 'pending' && (
                              <>
                                <span className="mx-2">•</span>
                                <span className="text-yellow-600">{getTimeRemaining(reservation.expiresAt)}</span>
                              </>
                            )}
                          </div>
                          
                          {reservation.status === 'pending' && (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                className="bg-primary text-white hover:bg-primary/90"
                                onClick={() => handleCompleteReservation(reservation.id)}
                              >
                                Marcar como Retirado
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-primary text-primary hover:bg-primary/5"
                                onClick={() => handleCancelReservation(reservation.id)}
                              >
                                Cancelar Reserva
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white rounded-lg">
                    <div className="text-4xl mb-4"><i className="fas fa-bookmark text-gray-300"></i></div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma reserva {activeTab !== 'all' ? formatStatus(activeTab).toLowerCase() : ''}</h3>
                    <p className="text-gray-500 mb-4">
                      {activeTab === 'pending'
                        ? 'Você não tem nenhuma reserva pendente. Reserve produtos para retirar na loja!'
                        : 'Nenhuma reserva encontrada nesta categoria.'}
                    </p>
                    <Button asChild className="bg-primary text-white hover:bg-primary/90">
                      <Link href="/products">
                        <a>Explorar produtos</a>
                      </Link>
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
