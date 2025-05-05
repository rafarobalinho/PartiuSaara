import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';

// Definição do estilo padrão para o mapa
const containerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '500px'
};

// Centro do mapa padrão (Rio de Janeiro, Saara)
const defaultCenter = {
  lat: -22.904,
  lng: -43.175
};

// Opções do mapa
const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  clickableIcons: true,
  styles: [
    {
      featureType: 'poi.business',
      stylers: [{ visibility: 'on' }]
    },
    {
      featureType: 'transit',
      elementType: 'labels.icon',
      stylers: [{ visibility: 'on' }]
    }
  ]
};

// Interface para as lojas
interface Store {
  id: number;
  name: string;
  description?: string;
  category?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode?: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  images?: string[];
}

export default function StoresMap() {
  const { toast } = useToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  // Carregar a API do Google Maps
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  // Buscar lojas da API
  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/stores/map');
        
        if (!response.ok) {
          throw new Error('Falha ao buscar lojas');
        }
        
        const data = await response.json();
        console.log('Dados recebidos:', data);
        
        setStores(data);
      } catch (error) {
        console.error('Erro ao carregar lojas:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as lojas no mapa',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, [toast]);

  // Lidar com erro ao carregar a API
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-xl font-semibold text-red-500 mb-2">Erro ao carregar o mapa</div>
        <p className="text-gray-600 text-center max-w-md">
          Não foi possível carregar o Google Maps. Verifique sua conexão com a internet ou tente novamente mais tarde.
        </p>
      </div>
    );
  }

  // Exibir carregamento
  if (!isLoaded || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] bg-gray-50 rounded-lg border border-gray-200">
        <LoaderCircle className="h-10 w-10 animate-spin text-orange-500 mb-4" />
        <div className="text-lg font-medium">Carregando mapa e lojas...</div>
      </div>
    );
  }

  // Verificar se não há lojas
  if (stores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-xl font-semibold mb-2">Nenhuma loja encontrada</div>
        <p className="text-gray-600 text-center max-w-md">
          Não foram encontradas lojas com endereços cadastrados.
        </p>
      </div>
    );
  }

  // Renderizar o mapa
  return (
    <div className="h-full w-full rounded-lg overflow-hidden border border-gray-200">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={14}
        options={mapOptions}
      >
        {/* Marcadores para cada loja */}
        {stores.map((store) => (
          <Marker
            key={store.id}
            position={{
              lat: store.location.latitude,
              lng: store.location.longitude
            }}
            onClick={() => setSelectedStore(store)}
            // O tipo correto para o ícone do marcador
            icon={'/marker-icon.svg'}
          />
        ))}

        {/* Janela de informações para a loja selecionada */}
        {selectedStore && (
          <InfoWindow
            position={{
              lat: selectedStore.location.latitude,
              lng: selectedStore.location.longitude
            }}
            onCloseClick={() => setSelectedStore(null)}
          >
            <div className="p-2 max-w-xs">
              <h3 className="text-lg font-semibold text-gray-900">{selectedStore.name}</h3>
              {selectedStore.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{selectedStore.description}</p>
              )}
              <p className="text-sm text-gray-800 mt-2 font-medium">
                {selectedStore.address.street}
              </p>
              <p className="text-sm text-gray-600">
                {selectedStore.address.city}, {selectedStore.address.state}{' '}
                {selectedStore.address.zipCode && `- ${selectedStore.address.zipCode}`}
              </p>
              <div className="mt-3">
                <a
                  href={`/stores/${selectedStore.id}`}
                  className="text-sm font-medium text-orange-600 hover:text-orange-800"
                >
                  Ver detalhes da loja →
                </a>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}