import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { useLocation, calculateDistance, formatDistance } from '@/hooks/use-location';
import StoreCard from '@/components/ui/store-card';
import { Button } from '@/components/ui/button';

interface Store {
  id: number;
  name: string;
  description: string;
  category: string;
  tags: string[];
  rating: number;
  reviewCount: number;
  images: string[];
  isOpen: boolean;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
}

export default function NearbyStores() {
  const { coordinates } = useLocation();
  
  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['/api/stores/nearby', coordinates?.latitude, coordinates?.longitude],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (coordinates) {
          params.append('lat', coordinates.latitude.toString());
          params.append('lng', coordinates.longitude.toString());
        }
        
        const res = await fetch(`/api/stores/nearby?${params.toString()}`);
        if (!res.ok) {
          throw new Error('Failed to fetch nearby stores');
        }
        return await res.json();
      } catch (error) {
        console.error('Error fetching nearby stores:', error);
        return [];
      }
    },
    enabled: !!coordinates
  });

  const storesWithDistance = stores.map((store: Store) => {
    let distance = null;
    if (coordinates && store.location) {
      distance = calculateDistance(
        coordinates.latitude,
        coordinates.longitude,
        store.location.latitude,
        store.location.longitude
      );
    }
    return { ...store, distance };
  }).sort((a: Store & { distance: number }, b: Store & { distance: number }) => 
    (a.distance || Infinity) - (b.distance || Infinity)
  );

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center">
          <i className="fas fa-map-marker-alt text-primary mr-2"></i>
          Lojas próximas a você
        </h2>
        <Link href="/stores" className="text-primary text-sm font-medium">
          Ver mapa <i className="fas fa-map mr-1"></i>
        </Link>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {isLoading ? (
          // Skeleton loading state
          Array(10).fill(0).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
              <div className="aspect-square bg-gray-200 animate-pulse relative">
                {/* Badge de categoria */}
                <div className="absolute top-0 left-0 p-1">
                  <div className="h-4 bg-gray-300 animate-pulse w-12 rounded-md"></div>
                </div>
                
                {/* Status e favoritos no rodapé da imagem */}
                <div className="absolute bottom-0 left-0 right-0 p-1 flex justify-between items-center bg-gray-300/20">
                  <div className="h-4 bg-gray-300 animate-pulse w-12 rounded-full"></div>
                  <div className="h-4 bg-gray-300 animate-pulse w-4 rounded-full"></div>
                </div>
              </div>
              <div className="p-2 flex-grow flex flex-col">
                {/* Nome da loja */}
                <div className="h-3 bg-gray-200 animate-pulse w-full mb-1"></div>
                <div className="h-3 bg-gray-200 animate-pulse w-3/4 mb-1"></div>
                
                {/* Avaliações */}
                <div className="h-2 bg-gray-200 animate-pulse w-2/3 mb-1"></div>
                
                {/* Descrição */}
                <div className="h-8 bg-gray-200 animate-pulse w-full rounded-sm"></div>
              </div>
            </div>
          ))
        ) : !coordinates ? (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500 mb-2">Permita o acesso à sua localização para ver lojas próximas</p>
            <Button onClick={() => window.location.reload()} className="bg-primary text-white hover:bg-primary/90">
              Atualizar localização
            </Button>
          </div>
        ) : storesWithDistance.length > 0 ? (
          storesWithDistance.map((store: Store & { distance: number }) => (
            <StoreCard 
              key={store.id} 
              store={store} 
              distance={store.distance ? formatDistance(store.distance) : null}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">Nenhuma loja encontrada próxima à sua localização.</p>
          </div>
        )}
      </div>
    </div>
  );
}
