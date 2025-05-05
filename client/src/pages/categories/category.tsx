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
    const min = customMinPrice ? parseInt(customMinPrice, 10) : 0;
    const max = customMaxPrice ? parseInt(customMaxPrice, 10) : 1000;
    
    if (min > max) {
      // Se min > max, invertemos os valores
      setDebouncedPriceRange([max, min]);
    } else {
      setDebouncedPriceRange([min, max]);
    }
    
    setIsCustomRangeActive(true);
    setActivePriceRangeId('');
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
  const { data: products, isLoading: isProductsLoading } = useQuery({
    queryKey: [`/api/products`, {
      category: categorySlug,
      minPrice: debouncedPriceRange[0],
      maxPrice: debouncedPriceRange[1],
      sortBy,
      promotion: filterPromotion
    }],
    queryFn: async () => {
      try {
        setIsFiltering(false);
        
        const params = new URLSearchParams({
          category: categorySlug || '',
          minPrice: debouncedPriceRange[0].toString(),
          maxPrice: debouncedPriceRange[1].toString(),
          sortBy: sortBy,
          promotion: filterPromotion.toString()
        });
        
        console.log('Sending price range to API:', { 
          minPrice: debouncedPriceRange[0], 
          maxPrice: debouncedPriceRange[1]
        });
        
        const url = `/api/products?${params.toString()}`;
        console.log('API request URL:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        
        const data = await response.json();
        console.log('API response products:', data.length);
        return data;
      } catch (error) {
        console.error('Error fetching products:', error);
        setIsFiltering(false);
        return [];
      }
    }
  });

  // Efeito para indicar quando está filtrando
  useEffect(() => {
    setIsFiltering(true);
  }, [debouncedPriceRange, sortBy, filterPromotion]);

  // Reset de todos os filtros
  const handleResetFilters = useCallback(() => {
    setActivePriceRangeId('all');
    setDebouncedPriceRange([0, 1000]);
    setCustomMinPrice('');
    setCustomMaxPrice('');
    setIsCustomRangeActive(false);
    setSortBy('popularity');
    setFilterPromotion(false);
  }, []);

  const isLoading = isCategoryLoading || isProductsLoading || isFiltering;

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
          {isLoading ? (
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
          ) : products && products.length > 0 ? (
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
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg">
              <div className="text-4xl mb-4"><i className="fas fa-search text-gray-300"></i></div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum produto encontrado</h3>
              <p className="text-gray-500 mb-4">Tente ajustar os filtros ou buscar por outra categoria</p>
              <Link href="/categories">
                <Button className="bg-primary text-white hover:bg-primary/90">
                  Ver todas as categorias
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
