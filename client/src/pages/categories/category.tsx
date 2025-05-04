import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { useState } from 'react';
import ProductCard from '@/components/ui/product-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';

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

export default function CategoryPage() {
  const { category: categorySlug } = useParams();
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [sortBy, setSortBy] = useState('popularity');
  const [filterPromotion, setFilterPromotion] = useState(false);

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

  // Fetch category products
  const { data: products, isLoading: isProductsLoading } = useQuery({
    queryKey: [`/api/products?category=${categorySlug}&minPrice=${priceRange[0]}&maxPrice=${priceRange[1]}&sortBy=${sortBy}&promotion=${filterPromotion}`],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          category: categorySlug || '',
          minPrice: priceRange[0].toString(),
          maxPrice: priceRange[1].toString(),
          sortBy: sortBy,
          promotion: filterPromotion.toString()
        });
        const response = await fetch(`/api/products?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching products:', error);
        return [];
      }
    }
  });

  const handlePriceRangeChange = (value: number[]) => {
    setPriceRange(value);
  };

  const isLoading = isCategoryLoading || isProductsLoading;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center mb-4 text-sm">
        <Link href="/categories">
          <a className="text-gray-500 hover:text-primary">Categorias</a>
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
              <Label className="mb-2 block">Faixa de Preço</Label>
              <Slider
                defaultValue={[0, 1000]}
                max={1000}
                step={10}
                value={priceRange}
                onValueChange={handlePriceRangeChange}
                className="mb-2"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>{formatCurrency(priceRange[0])}</span>
                <span>{formatCurrency(priceRange[1])}</span>
              </div>
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
              onClick={() => {
                // Reset filters
                setPriceRange([0, 1000]);
                setSortBy('popularity');
                setFilterPromotion(false);
              }}
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
              <Button asChild className="bg-primary text-white hover:bg-primary/90">
                <Link href="/categories">
                  <a>Ver todas as categorias</a>
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
