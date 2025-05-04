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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          // Skeleton loading state
          Array(3).fill(0).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-[16/9] bg-gray-200 animate-pulse"></div>
              <div className="p-3">
                <div className="flex justify-between items-center mb-2">
                  <div className="h-4 bg-gray-200 animate-pulse w-1/3"></div>
                  <div className="h-4 bg-gray-200 animate-pulse w-1/4"></div>
                </div>
                <div className="h-12 bg-gray-200 animate-pulse mb-3"></div>
                <div className="flex flex-wrap gap-2">
                  <div className="h-6 bg-gray-200 animate-pulse w-20 rounded-full"></div>
                  <div className="h-6 bg-gray-200 animate-pulse w-24 rounded-full"></div>
                  <div className="h-6 bg-gray-200 animate-pulse w-16 rounded-full"></div>
                </div>
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
