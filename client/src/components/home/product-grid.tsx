import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import ProductCard from '@/components/ui/product-card';

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

// Interface para produtos do sistema de highlights
interface HighlightProduct {
  storeId: number;
  storeName: string;
  subscriptionPlan: string;
  isInTrial: boolean;
  highlightWeight: number;
  lastHighlightedAt: string | null;
  totalImpressions: number;
  productId: number;
  productName: string;
  productPrice: number;
  productCategory: string;
  productCreatedAt: string;
  calculatedWeight: number;
  lastHighlighted: string | null;
}

export default function ProductGrid() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['/api/highlights/home'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/highlights/home');
        if (!res.ok) {
          throw new Error('Failed to fetch highlights');
        }
        const result = await res.json();

        // Combinar produtos de todas as seções em uma lista
        const allHighlights = Object.values(result.highlights || {}).flat() as HighlightProduct[];

        // ✅ DEDUPLICAR por productId (remover produtos duplicados)
        const uniqueHighlights = allHighlights.filter((highlight, index, array) => 
          array.findIndex(h => h.productId === highlight.productId) === index
        );

        // Converter para o formato esperado pelo ProductCard
        const formattedProducts: Product[] = uniqueHighlights.map((highlight) => ({
          id: highlight.productId,
          name: highlight.productName,
          description: '', // Não temos descrição no highlight
          price: highlight.productPrice,
          discountedPrice: undefined, // Pode ser adicionado se necessário
          category: highlight.productCategory,
          images: [], // Será carregado pelo ProductCard via API
          store: {
            id: highlight.storeId,
            name: highlight.storeName
          }
        }));

        // Retornar no formato esperado (primeiros 8 produtos)
        return formattedProducts.slice(0, 8);
      } catch (error) {
        console.error('Error fetching highlights:', error);
        return [];
      }
    }
  });

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Destaques da semana</h2>
        <Link href="/products">
          <a className="text-primary text-sm font-medium">
            Ver todos <i className="fas fa-chevron-right text-xs ml-1"></i>
          </a>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {isLoading ? (
          // Skeleton loading state
          Array(4).fill(0).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-square bg-gray-200 animate-pulse"></div>
              <div className="p-3">
                <div className="h-4 bg-gray-200 animate-pulse mb-1 w-1/3"></div>
                <div className="h-10 bg-gray-200 animate-pulse mb-2"></div>
                <div className="h-5 bg-gray-200 animate-pulse mb-3 w-1/2"></div>
                <div className="h-8 bg-gray-200 animate-pulse w-full rounded-lg"></div>
              </div>
            </div>
          ))
        ) : products.length > 0 ? (
          products.map((product: Product) => (
            <ProductCard
              key={product.id}
              product={{
                ...product,
                images: product.images || []
              }}
              showCategory={true}
              showFullWidthButton={true}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">Nenhum produto em destaque disponível no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}