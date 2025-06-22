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

  const { data: stores = [], isLoading, error } = useQuery({
    queryKey: ['/api/stores/nearby', coordinates?.latitude, coordinates?.longitude],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (coordinates) {
          params.append('lat', coordinates.latitude.toString());
          params.append('lng', coordinates.longitude.toString());
          params.append('radius', '50'); // Aumentar raio para 50km
        }

        const res = await fetch(`/api/stores/nearby?${params.toString()}`);
        if (!res.ok) {
          throw new Error('Failed to fetch nearby stores');
        }
        const result = await res.json();
        console.log('🏪 Lojas próximas encontradas:', result.length);
        return result;
      } catch (error) {
        console.error('Error fetching nearby stores:', error);
        return [];
      }
    },
    enabled: !!coordinates,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    retry: 1 // Tentar apenas uma vez
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

  // 🎯 LÓGICA INTELIGENTE: Não renderizar se não há lojas próximas
  const hasNearbyStores = storesWithDistance.length > 0;
  const isLocationAvailable = !!coordinates;

  // Se não há coordenadas OU não há lojas próximas, não renderizar a seção
  if (!isLocationAvailable || (!isLoading && !hasNearbyStores)) {
    return null; // 🚫 Não exibe a seção
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center">
          <i className="fas fa-map-marker-alt text-primary mr-2"></i>
          Lojas próximas a você
          {hasNearbyStores && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({storesWithDistance.length} {storesWithDistance.length === 1 ? 'loja' : 'lojas'})
            </span>
          )}
        </h2>
        <Link href="/stores" className="text-primary text-sm font-medium hover:underline">
          Ver mapa <i className="fas fa-map mr-1"></i>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {isLoading ? (
          // 💀 Skeleton loading state
          Array(8).fill(0).map((_, index) => (
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
        ) : error ? (
          // 🚨 Estado de erro (mas só mostra se já estava carregando)
          <div className="col-span-full text-center py-4">
            <p className="text-red-500 text-sm">
              Erro ao carregar lojas próximas. 
              <button 
                onClick={() => window.location.reload()} 
                className="ml-1 text-primary hover:underline"
              >
                Tentar novamente
              </button>
            </p>
          </div>
        ) : (
          // ✅ Lojas encontradas - renderizar normalmente
          storesWithDistance.map((store: Store & { distance: number }) => (
            <StoreCard 
              key={store.id} 
              store={store} 
              distance={store.distance ? formatDistance(store.distance) : null}
            />
          ))
        )}
      </div>

      {/* 📍 Informação adicional para o usuário */}
      {hasNearbyStores && !isLoading && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Mostrando lojas em um raio de 50km da sua localização
          </p>
        </div>
      )}
    </div>
  );
}
