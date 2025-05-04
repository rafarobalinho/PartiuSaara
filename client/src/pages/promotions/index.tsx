import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import ProductCard from '@/components/ui/product-card';

interface Promotion {
  id: number;
  type: 'normal' | 'flash';
  discountPercentage: number;
  startTime: string;
  endTime: string;
  productId: number;
  product: {
    id: number;
    name: string;
    description: string;
    price: number;
    discountedPrice?: number;
    images: string[];
    store: {
      id: number;
      name: string;
    };
  };
}

export default function PromotionsPage() {
  const [activeTab, setActiveTab] = useState('all');

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['/api/promotions'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/promotions');
        if (!res.ok) {
          throw new Error('Falha ao carregar promoções');
        }
        return await res.json();
      } catch (error) {
        console.error('Erro ao buscar promoções:', error);
        return [];
      }
    }
  });

  // Filtrar promoções baseado na aba selecionada
  const filteredPromotions = activeTab === 'all'
    ? promotions
    : promotions.filter((promo: Promotion) => promo.type === activeTab);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Promoções Ativas</h1>
        <p className="text-gray-600">
          Confira todas as ofertas e promoções disponíveis nas lojas do Saara
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="flash">Relâmpago</TabsTrigger>
              <TabsTrigger value="normal">Regulares</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="aspect-square bg-gray-200 animate-pulse"></div>
              <div className="p-3">
                <div className="h-4 bg-gray-200 animate-pulse mb-2 w-3/4"></div>
                <div className="h-8 bg-gray-200 animate-pulse mb-2"></div>
                <div className="h-5 bg-gray-200 animate-pulse mb-2 w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredPromotions.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPromotions.map((promotion: Promotion) => (
            <div key={promotion.id} className="relative">
              {promotion.type === 'flash' && (
                <div className="absolute top-2 right-2 z-10">
                  <Badge className="bg-yellow-500 hover:bg-yellow-600">
                    <i className="fas fa-bolt mr-1"></i> Relâmpago
                  </Badge>
                </div>
              )}
              <ProductCard
                product={promotion.product}
                isFlashPromotion={promotion.type === 'flash'}
                discountPercentage={promotion.discountPercentage}
                endTime={new Date(promotion.endTime)}
                startTime={new Date(promotion.startTime)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg">
          <div className="text-4xl mb-4"><i className="fas fa-tag text-gray-300"></i></div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma promoção encontrada</h3>
          <p className="text-gray-500 mb-4">
            Não há promoções ativas no momento. Volte mais tarde!
          </p>
          <Link href="/">
            <span className="text-primary font-medium cursor-pointer">Ir para a página inicial</span>
          </Link>
        </div>
      )}
    </div>
  );
}