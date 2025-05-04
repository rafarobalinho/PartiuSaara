import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  discountedPrice?: number;
  category: string;
  images: string[];
  stock?: number;
  createdAt: string;
}

export default function SellerProducts() {
  const { isAuthenticated, isSeller } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');

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

  // Pegar as lojas do vendedor 
  const { data: stores = [], isLoading: storesLoading } = useQuery({
    queryKey: ['/api/stores'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/stores');
        if (!response.ok) {
          throw new Error('Falha ao buscar lojas');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching stores:', error);
        return [];
      }
    }
  });

  // Fetch products from seller's stores
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products/seller'],
    queryFn: async () => {
      try {
        // Se não tiver lojas, retorna array vazio
        if (stores.length === 0) {
          return [];
        }
        
        // Pegar produtos de todas as lojas do vendedor
        let allProducts: Product[] = [];
        for (const store of stores) {
          const response = await fetch(`/api/stores/${store.id}/products`);
          if (response.ok) {
            const storeProducts = await response.json();
            allProducts = [...allProducts, ...storeProducts];
          }
        }
        return allProducts;
      } catch (error) {
        console.error('Error fetching products:', error);
        return [];
      }
    },
    enabled: stores.length > 0
  });
  
  const isLoading = storesLoading || productsLoading;

  const filteredProducts = products.filter((product: Product) => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Meus Produtos</h1>
          <p className="text-gray-600">Gerencie seus produtos, preços e estoque</p>
        </div>
        
        <Button asChild className="mt-4 md:mt-0 bg-primary text-white hover:bg-primary/90">
          <Link href="/seller/products/add">
            <a><i className="fas fa-plus mr-2"></i> Adicionar Produto</a>
          </Link>
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="relative">
            <Input
              type="text"
              placeholder="Buscar produtos por nome, descrição ou categoria..."
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
          </form>
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
      ) : filteredProducts.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produto
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preço
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estoque
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product: Product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-md overflow-hidden">
                          <img className="h-10 w-10 object-cover" src={product.images[0]} alt={product.name} />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">ID: #{product.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.discountedPrice ? (
                        <div>
                          <div className="text-sm font-medium text-primary">{formatCurrency(product.discountedPrice)}</div>
                          <div className="text-xs text-gray-500 line-through">{formatCurrency(product.price)}</div>
                        </div>
                      ) : (
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(product.price)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.stock ?? 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.stock === 0 ? (
                        <Badge className="bg-red-100 text-red-800 px-2 py-0.5 text-xs">Esgotado</Badge>
                      ) : product.discountedPrice ? (
                        <Badge className="bg-primary/10 text-primary px-2 py-0.5 text-xs">Em Promoção</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 px-2 py-0.5 text-xs">Ativo</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-gray-600 hover:text-primary"
                        >
                          <i className="fas fa-pencil-alt"></i>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-gray-600 hover:text-red-600"
                        >
                          <i className="fas fa-trash"></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg">
          <div className="text-4xl mb-4"><i className="fas fa-box text-gray-300"></i></div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum produto encontrado</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Nenhum produto corresponde à sua busca.' : 'Você ainda não cadastrou nenhum produto.'}
          </p>
          <Button asChild className="bg-primary text-white hover:bg-primary/90">
            <Link href="/seller/products/add">
              <a>Adicionar Primeiro Produto</a>
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}