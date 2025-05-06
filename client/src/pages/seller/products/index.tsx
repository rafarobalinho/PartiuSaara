import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Interfaces para tipagem
interface Store {
  id: number;
  name: string;
  userId: number;
}

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  discountedPrice: number | null;
  category: string;
  storeId: number;
  stock: number | null;
  createdAt: string;
  images: string[];
  thumbnailUrl?: string;
}

export default function SellerProducts() {
  const { user, isAuthenticated, isSeller } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [productsWithImages, setProductsWithImages] = useState<Product[]>([]);

  // Redirect if not authenticated or not a seller
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (!isSeller) {
      navigate('/account');
    }
  }, [isAuthenticated, isSeller, navigate]);

  // Fetch stores owned by the logged-in seller
  const { 
    data: stores = [], 
    isLoading: isLoadingStores 
  } = useQuery({
    queryKey: ['/api/stores/my-stores'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/stores/my-stores');
        if (!res.ok) {
          throw new Error('Falha ao carregar lojas');
        }
        const data = await res.json();
        console.log('Lojas carregadas:', data);
        // Garantir que temos um array de lojas com IDs válidos
        if (Array.isArray(data)) {
          return data.filter(store => store && typeof store.id === 'number' && !isNaN(store.id));
        }
        return [];
      } catch (error) {
        console.error('Error fetching stores:', error);
        return [];
      }
    },
    enabled: !!isAuthenticated && !!isSeller && !!user
  });

  // Set the selected store when stores are loaded
  useEffect(() => {
    if (Array.isArray(stores) && stores?.length > 0 && !selectedStoreId) {
      try {
        // Garantir que id seja um número válido antes de converter para string
        const storeId = stores[0]?.id;
        if (storeId !== undefined && storeId !== null && !isNaN(storeId)) {
          setSelectedStoreId(storeId.toString());
        }
      } catch (error) {
        console.error('Erro ao definir loja selecionada:', error);
      }
    }
  }, [stores, selectedStoreId]);

  // Fetch products for the selected store
  const { 
    data: products = [], 
    isLoading: isLoadingProducts
  } = useQuery({
    queryKey: ['/api/stores', selectedStoreId, 'products'],
    queryFn: async () => {
      try {
        if (!selectedStoreId) return [];
        
        const res = await fetch(`/api/stores/${selectedStoreId}/products`);
        if (!res.ok) {
          throw new Error('Falha ao carregar produtos');
        }
        
        return await res.json();
      } catch (error) {
        console.error('Error fetching products:', error);
        return [];
      }
    },
    enabled: !!selectedStoreId
  });

  // Fetch images for each product
  useEffect(() => {
    const fetchProductImages = async () => {
      if (!products || !Array.isArray(products) || products.length === 0) return;
      
      setIsLoadingImages(true);
      
      try {
        const productsWithImagePromises = products.map(async (product: Product) => {
          try {
            const response = await fetch(`/api/products/${product.id}/primary-image`);
            
            if (response.ok) {
              const imageUrl = response.url;
              return {
                ...product,
                images: [imageUrl],
                thumbnailUrl: imageUrl
              };
            } 
            
            return {
              ...product,
              images: [],
              thumbnailUrl: ''
            };
          } catch (error) {
            console.error(`Erro ao buscar imagem para o produto ${product.id}:`, error);
            return {
              ...product,
              images: [],
              thumbnailUrl: ''
            };
          }
        });
        
        const productsWithImageResults = await Promise.all(productsWithImagePromises);
        setProductsWithImages(productsWithImageResults);
      } catch (error) {
        console.error('Erro ao processar imagens dos produtos:', error);
      } finally {
        setIsLoadingImages(false);
      }
    };
    
    fetchProductImages();
  }, [products]);

  const isLoading = isLoadingStores || isLoadingProducts || isLoadingImages;

  if (!isAuthenticated || !isSeller) {
    return null;
  }

  // Filter products based on search term
  const filteredProducts = productsWithImages.filter((product: Product) => 
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase())
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
            <i className="fas fa-plus mr-2"></i> Adicionar Produto
          </Link>
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4 space-y-4">
          {/* Store selector */}
          {Array.isArray(stores) && stores?.length > 1 && (
            <div>
              <label htmlFor="store-select" className="block text-sm font-medium text-gray-700 mb-1">
                Selecionar Loja
              </label>
              <Select
                value={selectedStoreId || ''}
                onValueChange={(value) => setSelectedStoreId(value)}
              >
                <SelectTrigger id="store-select" className="w-full max-w-xs">
                  <SelectValue placeholder="Selecione uma loja" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store?.id} value={store?.id?.toString() || ''}>
                      {store?.name || 'Loja sem nome'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Product search */}
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

      {/* Loading state */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array(6).fill(0).map((_, index) => (
            <div key={index} className="border rounded-lg overflow-hidden shadow-sm bg-white animate-pulse">
              <div className="relative pt-[100%] bg-gray-200"></div>
              
              <div className="p-3">
                <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
                <div className="h-5 bg-gray-200 rounded mb-2 w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded mb-3 w-1/3"></div>
                
                <div className="flex gap-1 mt-2">
                  <div className="h-8 bg-gray-200 rounded flex-1"></div>
                  <div className="h-8 bg-gray-200 rounded flex-1"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : Array.isArray(filteredProducts) && filteredProducts?.length > 0 ? (
        <div>
          {/* Mobile grid view */}
          <div className="block md:hidden">
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map(product => (
                <div key={product.id} className="border rounded-lg overflow-hidden shadow-sm bg-white">
                  {/* Fixed proportion image container */}
                  <div className="relative pt-[100%]">
                    <img 
                      src={product.images[0] || '/placeholder-product.jpg'}
                      alt={product.name} 
                      className="absolute top-0 left-0 w-full h-full object-cover" 
                    />
                    {product.discountedPrice && (
                      <div className="absolute top-0 left-0 bg-primary text-white text-xs px-2 py-1 rounded-br">
                        {Math.round((1 - product.discountedPrice / product.price) * 100)}% OFF
                      </div>
                    )}
                  </div>
                  
                  {/* Product info */}
                  <div className="p-2">
                    <h3 className="font-medium text-sm truncate">{product.name}</h3>
                    {product.discountedPrice ? (
                      <div className="flex items-baseline">
                        <p className="text-primary font-bold text-sm">{formatCurrency(product.discountedPrice)}</p>
                        <p className="text-xs text-gray-500 line-through ml-1">{formatCurrency(product.price)}</p>
                      </div>
                    ) : (
                      <p className="text-primary font-bold text-sm">{formatCurrency(product.price)}</p>
                    )}
                    <p className="text-xs text-gray-500 truncate">{product.category}</p>
                    
                    <div className="mt-2 flex gap-1">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1 py-1 text-xs border-gray-300 rounded"
                      >
                        <i className="fas fa-pencil-alt mr-1"></i> Editar
                      </Button>
                      <Button 
                        size="sm"
                        className="flex-1 py-1 text-xs bg-primary hover:bg-primary/90 rounded text-white"
                      >
                        <i className="fas fa-eye mr-1"></i> Ver
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Desktop table view */}
          <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
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
                            <img className="h-10 w-10 object-cover" src={product.images[0] || '/placeholder-product.jpg'} alt={product.name} />
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
              Adicionar Primeiro Produto
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}