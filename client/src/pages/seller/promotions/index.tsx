import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';

interface Promotion {
  id: number;
  type: 'normal' | 'flash';
  discountPercentage?: number;
  discountAmount?: number;
  startTime: string;
  endTime: string;
  productId: number;
  createdAt: string;
  product: {
    id: number;
    name: string;
    price: number;
    discountedPrice?: number;
    images: string[];
  };
}

export default function SellerPromotions() {
  const { isAuthenticated, isSeller } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('all');

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

  // Fetch promotions from seller's store using the API endpoint with proper error handling
  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['/api/seller/promotions'],
    queryFn: async () => {
      try {
        // Using apiRequest instead of fetch for better error handling
        const response = await fetch('/api/seller/promotions', {
          credentials: 'include', // Importante para enviar cookies de autenticação
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // Log para diagnóstico
        console.log('API response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log('API error response:', errorText);
          throw new Error(`Failed to fetch promotions: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Resposta da API (promoções do vendedor):', data);
        
        // Map the API response to our expected format
        // If the API returns 'regular' type, convert it to 'normal' for frontend display
        return (data || []).map((promo: any) => ({
          ...promo,
          type: promo.type === 'regular' ? 'normal' : promo.type,
        })) as Promotion[];
      } catch (error) {
        console.error('Error fetching promotions:', error);
        return [];
      }
    }
  });

  // Filter promotions based on selected tab
  const filteredPromotions = promotions.filter((promotion: Promotion) => {
    const now = new Date();
    const endDate = new Date(promotion.endTime);
    const startDate = new Date(promotion.startTime);
    
    if (activeTab === 'all') return true;
    if (activeTab === 'active' && now <= endDate && now >= startDate) return true;
    if (activeTab === 'upcoming' && now < startDate) return true;
    if (activeTab === 'ended' && now > endDate) return true;
    if (activeTab === 'flash' && promotion.type === 'flash') return true;
    
    return false;
  });

  // Check if a promotion is active
  const isPromotionActive = (startTime: string, endTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);
    return now >= start && now <= end;
  };

  // Format promotion dates
  const formatPromotionDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate discount or sale amount
  const calculateDiscount = (promotion: Promotion) => {
    if (promotion.discountPercentage) {
      return `${promotion.discountPercentage}%`;
    } else if (promotion.discountAmount) {
      return formatCurrency(promotion.discountAmount);
    }
    return '';
  };
  
  // Calculate promotional price based on discount
  const calculatePromotionalPrice = (product: any, promotion: Promotion) => {
    if (!product || !promotion) return 'N/A';
    
    const originalPrice = product.price;
    
    if (promotion.discountPercentage) {
      const discountedPrice = originalPrice * (1 - (promotion.discountPercentage / 100));
      return formatCurrency(discountedPrice);
    }
    
    return product.discountedPrice ? formatCurrency(product.discountedPrice) : 'N/A';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Promoções</h1>
          <p className="text-gray-600">Gerencie as promoções e ofertas dos seus produtos</p>
        </div>
        
        <Button asChild className="mt-4 md:mt-0 bg-primary text-white hover:bg-primary/90">
          <Link href="/seller/promotions/add">
            <span className="flex items-center"><i className="fas fa-plus mr-2"></i> Criar Promoção</span>
          </Link>
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="active">Ativas</TabsTrigger>
              <TabsTrigger value="upcoming">Agendadas</TabsTrigger>
              <TabsTrigger value="ended">Encerradas</TabsTrigger>
              <TabsTrigger value="flash">Relâmpago</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-4 flex animate-pulse">
              <div className="w-16 h-16 bg-gray-200 rounded-md mr-4"></div>
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
              <div className="w-32 space-y-2">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredPromotions.length > 0 ? (
        <div className="space-y-4">
          {filteredPromotions.map((promotion: Promotion) => {
            const isActive = isPromotionActive(promotion.startTime, promotion.endTime);
            const isUpcoming = new Date() < new Date(promotion.startTime);
            const isEnded = new Date() > new Date(promotion.endTime);
            
            return (
              <Card key={promotion.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  {promotion.type === 'flash' && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-yellow-100 text-yellow-800 px-2 py-0.5 text-xs">
                        <i className="fas fa-bolt mr-1"></i> Relâmpago
                      </Badge>
                    </div>
                  )}
                  
                  <div className="md:w-1/4 p-4 bg-gray-50 flex items-center">
                    <div className="w-full">
                      <div className="flex items-center mb-2">
                        <div className="w-12 h-12 rounded-md overflow-hidden mr-3">
                          <img 
                            src={promotion.product.images[0]} 
                            alt={promotion.product.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h3 className="font-medium">{promotion.product.name}</h3>
                          <div className="text-sm text-gray-500">
                            ID: #{promotion.productId}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-sm mb-1">
                        <span className="font-medium text-gray-600">Preço original:</span> {formatCurrency(promotion.product.price)}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-600">Preço promocional:</span> {' '}
                        <span className="text-primary font-medium">
                          {calculatePromotionalPrice(promotion.product, promotion)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="md:w-3/4 p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between">
                      <div>
                        <div className="mb-2 flex items-center">
                          <h3 className="font-medium mr-2">Desconto de {calculateDiscount(promotion)}</h3>
                          {isActive && (
                            <Badge className="bg-green-100 text-green-800 px-2 py-0.5 text-xs">Ativa</Badge>
                          )}
                          {isUpcoming && (
                            <Badge className="bg-blue-100 text-blue-800 px-2 py-0.5 text-xs">Agendada</Badge>
                          )}
                          {isEnded && (
                            <Badge className="bg-gray-100 text-gray-800 px-2 py-0.5 text-xs">Encerrada</Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <i className="far fa-calendar-alt mr-1"></i> 
                          {formatPromotionDate(promotion.startTime)} até {formatPromotionDate(promotion.endTime)}
                        </div>
                      </div>
                      
                      <div className="mt-4 md:mt-0 flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-primary text-primary hover:bg-primary/5"
                          disabled={isEnded}
                        >
                          <i className="fas fa-pencil-alt mr-1"></i> Editar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-red-500 text-red-500 hover:bg-red-50"
                          disabled={isEnded}
                        >
                          <i className="fas fa-trash-alt mr-1"></i> Excluir
                        </Button>
                      </div>
                    </div>
                    
                    {promotion.type === 'flash' && isActive && (
                      <div className="mt-4 p-2 bg-yellow-50 rounded-md border border-yellow-200 text-sm text-yellow-800">
                        <i className="fas fa-clock mr-1"></i> Promoção relâmpago ativa! Termina em breve.
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg">
          <div className="text-4xl mb-4"><i className="fas fa-tag text-gray-300"></i></div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma promoção encontrada</h3>
          <p className="text-gray-500 mb-4">
            {activeTab !== 'all' ? 'Não há promoções nesta categoria.' : 'Você ainda não criou nenhuma promoção.'}
          </p>
          <Button asChild className="bg-primary text-white hover:bg-primary/90">
            <Link href="/seller/promotions/add">
              <span className="flex items-center">Criar Primeira Promoção</span>
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}