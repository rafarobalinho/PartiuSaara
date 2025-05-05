import React, { useEffect, useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface Store {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  location: {
    latitude: number;
    longitude: number;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  images: string[] | null;
}

interface StoresMapProps {
  className?: string;
  height?: string;
  width?: string;
}

const containerStyle = {
  width: '100%',
  height: '100%'
};

// Centralização inicial no Rio de Janeiro
const defaultCenter = {
  lat: -22.9068,
  lng: -43.1729
};

const StoresMap: React.FC<StoresMapProps> = ({ className, height = '500px', width = '100%' }) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(12);

  // Usar uma única referência de isLoaded para evitar conflitos de configuração
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  console.log('Usando Google Maps API Key:', apiKey ? 'Configurada' : 'Não configurada');
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Carregar lojas do backend
  useEffect(() => {
    console.log('Inicializando mapa com API key:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'Configurada' : 'Não configurada');
    
    const fetchStores = async () => {
      try {
        console.log('Iniciando busca de lojas para o mapa');
        setLoading(true);
        const response = await fetch('/api/stores/map');
        
        console.log('Resposta recebida:', response.status);
        
        if (!response.ok) {
          throw new Error(`Falha ao buscar lojas para o mapa: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Dados recebidos:', data);
        setStores(data);
        
        // Ajustar o zoom e centro do mapa para mostrar todas as lojas
        if (data.length > 0) {
          console.log('Ajustando visualização para mostrar', data.length, 'lojas');
          fitBoundsToStores(data);
        } else {
          console.log('Nenhuma loja com localização encontrada');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error('Erro detalhado ao buscar lojas:', err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  // Ajustar o zoom e centro do mapa para mostrar todas as lojas
  const fitBoundsToStores = (stores: Store[]) => {
    if (!map || stores.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    
    stores.forEach(store => {
      bounds.extend({
        lat: store.location.latitude,
        lng: store.location.longitude
      });
    });
    
    map.fitBounds(bounds);
    
    // Se houver apenas uma loja, definir um zoom adequado
    if (stores.length === 1) {
      setMapCenter({
        lat: stores[0].location.latitude,
        lng: stores[0].location.longitude
      });
      setMapZoom(15);
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md text-red-800">
        <h3 className="font-semibold">Erro ao carregar o mapa</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`} 
        style={{ height, width }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando mapa...</span>
      </div>
    );
  }

  return (
    <div 
      className={`rounded-md overflow-hidden border border-border ${className}`} 
      style={{ height, width }}
    >
      {loading ? (
        <div className="h-full w-full flex items-center justify-center bg-muted/20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Carregando lojas...</span>
        </div>
      ) : (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter}
          zoom={mapZoom}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            fullscreenControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            zoomControl: true
          }}
        >
          {stores.map(store => (
            <Marker
              key={store.id}
              position={{
                lat: store.location.latitude,
                lng: store.location.longitude
              }}
              onClick={() => setSelectedStore(store)}
              title={store.name}
            />
          ))}

          {selectedStore && (
            <InfoWindow
              position={{
                lat: selectedStore.location.latitude,
                lng: selectedStore.location.longitude
              }}
              onCloseClick={() => setSelectedStore(null)}
            >
              <Card className="w-64 shadow-none border-none">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-base">{selectedStore.name}</CardTitle>
                  {selectedStore.category && (
                    <CardDescription className="text-xs">{selectedStore.category}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="p-3 pt-1 pb-1">
                  {selectedStore.images && selectedStore.images.length > 0 && (
                    <div className="w-full h-24 overflow-hidden rounded-md mb-2">
                      <img 
                        src={selectedStore.images[0]} 
                        alt={selectedStore.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  {selectedStore.description && (
                    <p className="text-xs text-gray-600 mb-2">{selectedStore.description}</p>
                  )}
                  <div className="text-xs">
                    <p>{selectedStore.address.street}</p>
                    <p>{selectedStore.address.city}, {selectedStore.address.state}</p>
                    <p>{selectedStore.address.zipCode}</p>
                  </div>
                </CardContent>
                <CardFooter className="p-3 pt-1 flex justify-center">
                  <Button size="sm" variant="outline" asChild className="w-full">
                    <a href={`/stores/${selectedStore.id}`}>Ver loja</a>
                  </Button>
                </CardFooter>
              </Card>
            </InfoWindow>
          )}
        </GoogleMap>
      )}
    </div>
  );
};

export default StoresMap;