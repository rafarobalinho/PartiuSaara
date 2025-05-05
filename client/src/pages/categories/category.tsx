import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { useState, useEffect, useCallback } from 'react';
import ProductCard from '@/components/ui/product-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
}

// Definição das faixas de preço predefinidas
const PRICE_RANGES = [
  { id: 'all', label: 'Todos os preços', range: [0, 1000] },
  { id: 'under-150', label: 'Até R$150', range: [0, 150] },
  { id: '150-300', label: 'R$150 a R$300', range: [150, 300] },
  { id: '300-500', label: 'R$300 a R$500', range: [300, 500] },
  { id: 'above-500', label: 'Acima de R$500', range: [500, 1000] }
];

export default function CategoryPage() {
  const { category: categorySlug } = useParams();
  
  // Estado para as faixas de preço
  const [activePriceRangeId, setActivePriceRangeId] = useState<string>('all');
  const [debouncedPriceRange, setDebouncedPriceRange] = useState<[number, number]>([0, 1000]);
  
  // Estado para filtro personalizado
  const [customMinPrice, setCustomMinPrice] = useState<string>('');
  const [customMaxPrice, setCustomMaxPrice] = useState<string>('');
  const [isCustomRangeActive, setIsCustomRangeActive] = useState<boolean>(false);
  
  // Outros filtros
  const [sortBy, setSortBy] = useState('popularity');
  const [filterPromotion, setFilterPromotion] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  // Função para aplicar uma faixa de preço predefinida
  const applyPriceRange = useCallback((rangeId: string) => {
    const selectedRange = PRICE_RANGES.find(r => r.id === rangeId);
    if (selectedRange) {
      setActivePriceRangeId(rangeId);
      setDebouncedPriceRange(selectedRange.range as [number, number]);
      setIsCustomRangeActive(false);
    }
  }, []);

  // Função para aplicar filtro de preço personalizado
  const applyCustomPriceRange = useCallback(() => {
    // Convertemos os valores e aplicamos limites razoáveis
    const min = customMinPrice ? Math.max(0, parseInt(customMinPrice, 10)) : 0;
    const max = customMaxPrice ? Math.min(10000, parseInt(customMaxPrice, 10)) : 1000;
    
    console.log('Aplicando faixa de preço personalizada:', { min, max });
    
    if (min >= max) {
      // Se min >= max, usamos um intervalo padrão ajustado
      const adjustedMax = min + 100;
      setDebouncedPriceRange([min, adjustedMax]);
      setCustomMaxPrice(adjustedMax.toString());
      console.log('Faixa de preço ajustada:', { min, adjustedMax });
    } else {
      setDebouncedPriceRange([min, max]);
    }
    
    setIsCustomRangeActive(true);
    setActivePriceRangeId('');
    
    // Garantir que os valores nos campos são consistentes
    setCustomMinPrice(min.toString());
    if (!customMaxPrice) {
      setCustomMaxPrice(max.toString());
    }
  }, [customMinPrice, customMaxPrice]);

  // Fetch category info
  const { data: category, isLoading: isCategoryLoading } = useQuery({
    queryKey: [`/api/categories/${categorySlug}`],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/categories/${categorySlug}`);
        if (!response.ok) {
          throw new Error('Failed to fetch category');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching category:', error);
        return null;
      }
    }
  });

  // Fetch category products com os filtros aplicados
  const { 
    data: products = [], 
    isLoading: isProductsLoading, 
    error: productsError,
    isError,
    isFetching
  } = useQuery({
    queryKey: [`/api/products`, {
      category: categorySlug,
      minPrice: debouncedPriceRange[0],
      maxPrice: debouncedPriceRange[1],
      sortBy,
      promotion: filterPromotion
    }],
    queryFn: async ({ queryKey }) => {
      try {
        // Extrair parâmetros da query key
        const [_, params] = queryKey;
        const queryParams = params as any;
        
        const urlParams = new URLSearchParams({
          category: queryParams.category || '',
          minPrice: queryParams.minPrice.toString(),
          maxPrice: queryParams.maxPrice.toString(),
          sortBy: queryParams.sortBy,
          promotion: queryParams.promotion.toString()
        });
        
        console.log('Sending price range to API:', { 
          minPrice: queryParams.minPrice, 
          maxPrice: queryParams.maxPrice,
          category: queryParams.category,
          sortBy: queryParams.sortBy
        });
        
        const url = `/api/products?${urlParams.toString()}`;
        console.log('API request URL:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch products: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        console.log('API response products:', data.length);
        
        // Notificar que o processo de filtragem terminou
        setTimeout(() => setIsFiltering(false), 100);
        
        return data;
      } catch (error) {
        console.error('Error fetching products:', error);
        // Mesmo em caso de erro, desative o estado de filtragem
        setTimeout(() => setIsFiltering(false), 100);
        throw error;
      }
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 1
  });

  // Efeito para indicar quando os filtros mudam
  useEffect(() => {
    // Apenas defina o estado de filtragem se algum dos parâmetros de consulta mudar
    console.log('Filtros mudaram:', { debouncedPriceRange, sortBy, filterPromotion });
    setIsFiltering(true);
    
    // Limpar o estado de filtragem após um tempo, se a consulta não terminar por algum motivo
    const timer = setTimeout(() => {
      setIsFiltering(false);
    }, 5000); // Timeout de segurança
    
    return () => clearTimeout(timer);
  }, [debouncedPriceRange, sortBy, filterPromotion]);

  // Efeito para resetar os filtros quando a categoria muda
  useEffect(() => {
    console.log('Categoria mudou, resetando filtros:', categorySlug);
    setActivePriceRangeId('all');
    setDebouncedPriceRange([0, 1000]);
    setCustomMinPrice('');
    setCustomMaxPrice('');
    setIsCustomRangeActive(false);
    setSortBy('popularity');
    setFilterPromotion(false);
  }, [categorySlug]);

  // Reset de todos os filtros
  const handleResetFilters = useCallback(() => {
    console.log('Resetando todos os filtros manualmente');
    setActivePriceRangeId('all');
    setDebouncedPriceRange([0, 1000]);
    setCustomMinPrice('');
    setCustomMaxPrice('');
    setIsCustomRangeActive(false);
    setSortBy('popularity');
    setFilterPromotion(false);
  }, []);

  // Controlamos o estado de carregamento melhorando a lógica para evitar falsos estados de carregamento
  const isLoading = isCategoryLoading || isProductsLoading || (isFiltering && !products);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center mb-4 text-sm">
        <Link href="/categories">
          <span className="text-gray-500 hover:text-primary cursor-pointer">Categorias</span>
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="font-medium text-gray-900">{category?.name || categorySlug}</span>
      </div>

      {/* Category Header */}
      <div className="mb-6">
        {isLoading ? (
          <div className="h-8 bg-gray-200 animate-pulse rounded w-40 mb-2"></div>
        ) : (
          <div className="flex items-center mb-2">
            <h1 className="text-2xl font-bold mr-3">{category?.name}</h1>
            {category?.icon && (
              <i className={`${category.icon} text-xl text-primary`}></i>
            )}
          </div>
        )}
        <p className="text-gray-600">
          Encontre os melhores produtos em {category?.name || 'esta categoria'}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters Sidebar */}
        <div className="lg:w-1/4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-semibold mb-4">Filtros</h3>
            
            <div className="mb-6">
              <Label className="mb-2 block font-medium">Faixa de Preço</Label>
              
              {/* Botões de faixas de preço predefinidas */}
              <div className="space-y-2 mb-4">
                {PRICE_RANGES.map((range) => (
                  <Button
                    key={range.id}
                    type="button"
                    onClick={() => applyPriceRange(range.id)}
                    className={cn(
                      "w-full justify-start font-normal bg-white border text-left mb-1 hover:bg-gray-50 text-gray-700",
                      range.id === activePriceRangeId 
                        ? "border-primary bg-primary/5 text-primary" 
                        : "border-gray-200"
                    )}
                    variant="outline"
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
              
              {/* Filtro de preço personalizado */}
              <div className="mt-4 border border-gray-200 rounded-md p-3">
                <Label className="block text-sm font-medium mb-2">Personalizar faixa</Label>
                <div className="flex items-center gap-2">
                  <div className="w-1/2">
                    <Label htmlFor="min-price" className="text-xs text-gray-500">Min</Label>
                    <Input
                      id="min-price"
                      type="number"
                      placeholder="Min"
                      value={customMinPrice}
                      onChange={(e) => setCustomMinPrice(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="w-1/2">
                    <Label htmlFor="max-price" className="text-xs text-gray-500">Max</Label>
                    <Input
                      id="max-price"
                      type="number"
                      placeholder="Max"
                      value={customMaxPrice}
                      onChange={(e) => setCustomMaxPrice(e.target.value)}
                      className="h-8"
                    />
                  </div>
                </div>
                <Button 
                  onClick={applyCustomPriceRange}
                  className="w-full mt-3 bg-primary text-white py-2 px-4 rounded hover:bg-primary/90 transition-colors h-8 text-sm"
                >
                  <Search className="h-3.5 w-3.5 mr-2" />
                  Aplicar
                </Button>
              </div>

              {/* Mostrar intervalo atual de preço */}
              {isCustomRangeActive && (
                <div className="mt-2 text-sm text-gray-600 flex justify-between">
                  <span>Intervalo atual:</span>
                  <span className="font-medium">
                    {formatCurrency(debouncedPriceRange[0])} - {formatCurrency(debouncedPriceRange[1])}
                  </span>
                </div>
              )}
            </div>

            <div className="mb-6">
              <Label className="mb-2 block">Ordenar por</Label>
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popularity">Popularidade</SelectItem>
                  <SelectItem value="price_asc">Menor Preço</SelectItem>
                  <SelectItem value="price_desc">Maior Preço</SelectItem>
                  <SelectItem value="newest">Mais Recentes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mb-6">
              <Label className="mb-2 block">Promoções</Label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="promotion-filter"
                  checked={filterPromotion}
                  onChange={() => setFilterPromotion(!filterPromotion)}
                  className="mr-2"
                />
                <label htmlFor="promotion-filter" className="text-sm">Mostrar apenas promoções</label>
              </div>
            </div>

            <Button 
              className="w-full bg-primary text-white hover:bg-primary/90"
              onClick={handleResetFilters}
            >
              Limpar Filtros
            </Button>
          </div>
        </div>

        {/* Products Grid */}
        <div className="lg:w-3/4">
          {isLoading && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array(6).fill(0).map((_, index) => (
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
          )}
          
          {!isLoading && isError && (
            <div className="text-center py-16 bg-white rounded-lg">
              <div className="text-4xl mb-4 text-red-500"><i className="fas fa-exclamation-circle"></i></div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Erro ao carregar produtos</h3>
              <p className="text-gray-500 mb-4">
                {productsError instanceof Error 
                  ? productsError.message 
                  : "Ocorreu um erro ao tentar carregar os produtos. Tente novamente."}
              </p>
              <Button 
                onClick={handleResetFilters}
                className="bg-primary text-white hover:bg-primary/90 mx-auto"
              >
                Limpar Filtros e Tentar Novamente
              </Button>
            </div>
          )}
          
          {!isLoading && !isError && products && products.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <Badge variant="outline" className="px-3 py-1">
                  {products.length} produtos encontrados
                </Badge>
                
                <div className="flex items-center text-sm">
                  <span className="text-gray-500 mr-2">Visualizar:</span>
                  <button className="w-8 h-8 flex items-center justify-center rounded border text-primary">
                    <i className="fas fa-th-large"></i>
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center rounded border text-gray-400 ml-1">
                    <i className="fas fa-list"></i>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {products.map((product: Product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    showCategory={false}
                    showFullWidthButton={true}
                  />
                ))}
              </div>
              
              {/* Indicador de filtragem em andamento */}
              {isFetching && !isLoading && (
                <div className="mt-4 py-2 bg-gray-50 text-center rounded-md text-sm text-gray-500 flex items-center justify-center">
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Atualizando resultados...
                </div>
              )}
            </div>
          )}
          
          {!isLoading && !isError && (!products || products.length === 0) && (
            <div className="text-center py-16 bg-white rounded-lg">
              <div className="text-4xl mb-4"><i className="fas fa-search text-gray-300"></i></div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum produto encontrado</h3>
              <p className="text-gray-500 mb-4">
                {debouncedPriceRange[0] > 0 || debouncedPriceRange[1] < 1000
                  ? "Tente ajustar o filtro de preço ou remover alguns filtros."
                  : "Não há produtos disponíveis nesta categoria no momento."}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  onClick={handleResetFilters}
                  className="bg-primary/90 text-white hover:bg-primary"
                >
                  Limpar Filtros
                </Button>
                <Link href="/categories">
                  <Button className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50">
                    Ver todas as categorias
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
