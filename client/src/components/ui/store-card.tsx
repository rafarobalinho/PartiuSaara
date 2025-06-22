import { Link } from 'wouter';
import { SafeImage } from './safe-image';
import { Badge } from './badge';
import { Star } from 'lucide-react';

interface StoreCardProps {
  store: {
    id: number;
    name: string;
    description: string;
    category: string;
    primary_image_api_url?: string | null;
    is_open: boolean;
    // Adicione outras props que você usa, como 'rating' e 'reviewCount'
    rating?: number;
    reviewCount?: number;
  };
  distance?: string | null;
}

export function StoreCard({ store, distance }: StoreCardProps) {
  // A lógica de placeDetails foi comentada
  /* useEffect(() => { ... }, []); */

  return (
    <Link href={`/stores/${store.id}`} key={store.id}>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 block h-full flex flex-col relative">
        <div className="aspect-square relative overflow-hidden bg-white">
          <SafeImage
            entityType="store"
            entityId={store.id}
            alt={`Loja ${store.name}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 p-1">
             <span className={`text-[10px] ${store.is_open ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} py-0.5 px-1.5 rounded-full shadow-sm`}>
              {store.is_open ? 'Aberto' : 'Fechado'}
            </span>
          </div>
        </div>
        <div className="p-2 flex-grow flex flex-col">
          <h3 className="font-medium text-xs line-clamp-2 mb-0.5 text-gray-900 font-semibold">
            {store.name}
          </h3>
          <div className="flex items-center text-[10px] text-gray-500 mb-1">
            <i className="fas fa-star text-yellow-400 mr-0.5"></i> 
            <span>{store.rating?.toFixed(1) || '0.0'}</span>
            <span className="mx-0.5">•</span>
            <span>{store.reviewCount || 0} avaliações</span>
            {distance && (
              <>
                <span className="mx-0.5">•</span>
                <span><i className="fas fa-map-marker-alt mr-0.5"></i>{distance}</span>
              </>
            )}
          </div>
          <p className="text-[10px] text-gray-600 line-clamp-2 mt-0.5 flex-grow">
            {store.description}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default StoreCard;