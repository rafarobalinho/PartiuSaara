import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import ProductCard from '@/components/ui/product-card';

interface FlashPromotion {
  id: number;
  productId: number;
  discountPercentage: number;
  startTime: string;
  endTime: string;
  product: Product;
}

interface Product {
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
}

export default function PromoSection() {
  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['/api/promotions/flash'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/promotions/flash');
        if (!res.ok) {
          throw new Error('Failed to fetch flash promotions');
        }
        return await res.json();
      } catch (error) {
        console.error('Error fetching flash promotions:', error);
        return [];
      }
    }
  });

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold flex items-center">
          <i className="fas fa-bolt text-primary mr-2"></i>
          Promoções Relâmpago
        </h2>
        <Link href="/products?type=flash">
          <a className="text-primary text-sm font-medium">
            Ver todas <i className="fas fa-chevron-right text-xs ml-1"></i>
          </a>
        </Link>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {isLoading ? (
          // Skeleton loading state
          Array(5).fill(0).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow relative group">
              <div className="aspect-square bg-gray-200 animate-pulse"></div>
              <div className="p-3">
                <div className="h-4 bg-gray-200 animate-pulse mb-2 w-3/4"></div>
                <div className="h-8 bg-gray-200 animate-pulse mb-2"></div>
                <div className="h-5 bg-gray-200 animate-pulse mb-2 w-1/2"></div>
                <div className="flex justify-between items-center mt-2">
                  <div className="h-4 bg-gray-200 animate-pulse w-1/3"></div>
                  <div className="h-6 bg-gray-200 animate-pulse w-1/4 rounded-full"></div>
                </div>
              </div>
            </div>
          ))
        ) : promotions.length > 0 ? (
          promotions.map((promotion: FlashPromotion) => (
            <ProductCard
              key={promotion.id}
              product={promotion.product}
              isFlashPromotion={true}
              discountPercentage={promotion.discountPercentage}
              endTime={new Date(promotion.endTime)}
              startTime={new Date(promotion.startTime)}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">Nenhuma promoção relâmpago disponível no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
