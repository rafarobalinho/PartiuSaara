import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useSearch } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProductCard from '@/components/ui/product-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  discountedPrice?: number;
  category: string;
  images: string[];
  store: {
    id: number;
    name: string;
  };
}

interface Coupon {
  id: number;
  code: string;
  description: string;
  storeId: number;
  store: {
    id: number;
    name: string;
    images: string[];
  };
  discountAmount?: number;
  discountPercentage?: number;
  endTime: string;
}

export default function Products() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialType = params.get('type') || 'all';
  const [currentTab, setCurrentTab] = useState(initialType);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('popularity');

  // Products query
  const { data: products = [], isLoading: isProductsLoading } = useQuery({
    queryKey: [`/api/products?type=${currentTab === 'coupons' ? 'all' : currentTab}&search=${searchTerm}&sortBy=${sortBy}`],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          type: currentTab === 'coupons' ? 'all' : currentTab,
          search: searchTerm,
          sortBy
        });
        
        const response = await fetch(`/api/products?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching products:', error);
        return [];
      }
    },
    enabled: currentTab !== 'coupons'
  });

  // Coupons query
  const { data: coupons = [], isLoading: isCouponsLoading } = useQuery({
    queryKey: [`/api/coupons?search=${searchTerm}`],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          search: searchTerm
        });
        
        const response = await fetch(`/api/coupons?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch coupons');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching coupons:', error);
        return [];
      }
    },
    enabled: currentTab === 'coupons'
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The query will automatically refetch due to the searchTerm dependency
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Produtos e Promoções</h1>
        <p className="text-gray-600">Encontre as melhores ofertas do SAARA</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Buscar produtos, lojas ou cupons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10"
            />
            <Button 
              type="submit" 
              variant="ghost" 
              size="icon" 
              className="absolute right-0 top-0 h-full text-gray-400 hover:text-primary"
            >
              <i className="fas fa-search"></i>
            </Button>
          </div>
          
          {currentTab !== 'coupons' && (
            <div className="hidden md:block w-48">
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popularity">Popularidade</SelectItem>
                  <SelectItem value="price_asc">Menor Preço</SelectItem>
                  <SelectItem value="price_desc">Maior Preço</SelectItem>
                  <SelectItem value="newest">Mais Recentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </form>
      </div>

      <Tabs defaultValue={initialType} value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="mb-6 bg-white">
          <TabsTrigger value="all">Todos os Produtos</TabsTrigger>
          <TabsTrigger value="flash">Promoções Relâmpago</TabsTrigger>
          <TabsTrigger value="coupons">Cupons de Desconto</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          {isProductsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array(8).fill(0).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-gray-200 animate-pulse"></div>
                  <div className="p-3">
                    <div className="h-4 bg-gray-200 animate-pulse mb-1 w-1/3"></div>
                    <div className="h-10 bg-gray-200 animate-pulse mb-2"></div>
                    <div className="h-5 bg-gray-200 animate-pulse mb-3 w-1/2"></div>
                    <div className="h-8 bg-gray-200 animate-pulse w-full rounded-lg"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product: Product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showCategory={true}
                  showFullWidthButton={true}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg">
              <div className="text-4xl mb-4"><i className="fas fa-box-open text-gray-300"></i></div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum produto encontrado</h3>
              <p className="text-gray-500">Tente buscar por outro termo ou explorar categorias</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="flash" className="mt-0">
          {isProductsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array(8).fill(0).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-gray-200 animate-pulse"></div>
                  <div className="p-3">
                    <div className="h-4 bg-gray-200 animate-pulse mb-1 w-1/3"></div>
                    <div className="h-10 bg-gray-200 animate-pulse mb-2"></div>
                    <div className="h-5 bg-gray-200 animate-pulse mb-3 w-1/2"></div>
                    <div className="flex justify-between">
                      <div className="h-4 bg-gray-200 animate-pulse w-1/3"></div>
                      <div className="h-6 bg-gray-200 animate-pulse w-1/4 rounded-full"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product: Product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isFlashPromotion={true}
                  endTime={new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000)} // Example - in real app this would come from the backend
                  startTime={new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg">
              <div className="text-4xl mb-4"><i className="fas fa-bolt text-gray-300"></i></div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma promoção relâmpago ativa</h3>
              <p className="text-gray-500">Fique atento! Novas promoções surgem a todo momento</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="coupons" className="mt-0">
          {isCouponsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(6).fill(0).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-32 bg-gray-200 animate-pulse"></div>
                  <div className="p-4">
                    <div className="h-6 bg-gray-200 animate-pulse mb-2 w-1/3"></div>
                    <div className="h-4 bg-gray-200 animate-pulse mb-3 w-3/4"></div>
                    <div className="h-10 bg-gray-200 animate-pulse rounded-lg"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : coupons.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coupons.map((coupon: Coupon) => (
                <div key={coupon.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-32 bg-gradient-to-r from-primary to-secondary relative flex items-center justify-center">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10">
                      <i className="fas fa-ticket-alt text-9xl transform rotate-45 text-white"></i>
                    </div>
                    <div className="text-center text-white z-10">
                      <div className="text-sm mb-1">Economize {coupon.discountPercentage ? `${coupon.discountPercentage}%` : coupon.discountAmount ? `R$${coupon.discountAmount}` : ''}</div>
                      <div className="text-xl font-bold border-2 border-white rounded-lg px-4 py-1">{coupon.code}</div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center mb-2">
                      <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                        <img src={coupon.store.images[0]} alt={coupon.store.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h3 className="font-medium">{coupon.store.name}</h3>
                        <p className="text-xs text-gray-500">Válido até {new Date(coupon.endTime).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{coupon.description}</p>
                    <Button className="w-full bg-primary text-white hover:bg-primary/90">
                      Copiar Cupom
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg">
              <div className="text-4xl mb-4"><i className="fas fa-ticket-alt text-gray-300"></i></div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum cupom encontrado</h3>
              <p className="text-gray-500">Volte mais tarde para novos cupons de desconto</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
