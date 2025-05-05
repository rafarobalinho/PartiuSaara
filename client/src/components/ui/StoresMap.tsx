import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from '@tanstack/react-query';
import { Loader2, Store, MapPin, Navigation } from 'lucide-react';
import { Link } from 'wouter';

// Estilização customizada para o mapa
const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '10px'
};

// Centro inicial do mapa (Rio de Janeiro, Centro)
const center = {
  lat: -22.9068,
  lng: -43.1729
};

// Opções do mapa
const options = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true
};

// Componente do mapa de lojas
export default function StoresMap() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  
  // Carregar a chave da API do Google Maps
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'Não configurada';
  console.log('Usando Google Maps API Key:', GOOGLE_MAPS_API_KEY === 'Não configurada' ? 'Não configurada' : 'Configurada');
  
  // Carregar o script do Google Maps
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });
  
  console.log('Inicializando mapa com API key:', GOOGLE_MAPS_API_KEY === 'Não configurada' ? 'Não configurada' : 'Configurada');
  
  // Buscar as lojas da API
  const { data: stores, isLoading, isError } = useQuery({
    queryKey: ['/api/stores/map'],
    onSuccess: (data) => {
      console.log('Dados recebidos:', data);
    }
  });
  
  console.log('Iniciando busca de lojas para o mapa');
  
  // Ajustar o mapa para mostrar todas as lojas
  const fitBounds = useCallback(() => {
    if (mapRef.current && stores && stores.length > 0) {
      console.log('Ajustando visualização para mostrar', stores.length, 'lojas');
      const bounds = new google.maps.LatLngBounds();
      
      stores.forEach(store => {
        if (store.location && store.location.latitude && store.location.longitude) {
          bounds.extend({
            lat: parseFloat(store.location.latitude),
            lng: parseFloat(store.location.longitude)
          });
        }
      });
      
      // Se temos a localização do usuário, inclua-a
      if (userLocation) {
        bounds.extend(userLocation);
      }
      
      mapRef.current.fitBounds(bounds, {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50
      });
      
      // Se há apenas uma loja, dê zoom apropriado
      if (stores.length === 1) {
        mapRef.current.setZoom(15);
      }
    }
  }, [stores, userLocation]);
  
  // Obter a localização do usuário
  const getUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Erro ao obter localização do usuário:', error);
        },
        { enableHighAccuracy: true }
      );
    } else {
      console.log('Geolocalização não suportada pelo navegador');
    }
  }, []);
  
  // Quando as lojas forem carregadas, ajustar o mapa
  useEffect(() => {
    if (stores && stores.length > 0) {
      fitBounds();
    }
  }, [stores, fitBounds]);
  
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    fitBounds();
  }, [fitBounds]);
  
  // Renderizar o componente com base no estado de carregamento
  if (loadError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Erro ao carregar o mapa</CardTitle>
          <CardDescription>
            Não foi possível carregar o Google Maps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">
            Erro: {loadError.message}
          </div>
          <p className="mt-2">
            Verifique se a chave da API do Google Maps está configurada corretamente.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  if (!isLoaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando mapa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Lojas
        </CardTitle>
        <CardDescription>
          Encontre as lojas cadastradas no marketplace.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="text-center py-8">
            <div className="text-red-500 mb-2">Erro ao carregar as lojas</div>
            <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
          </div>
        ) : !stores || stores.length === 0 ? (
          <div className="text-center py-8">
            <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Nenhuma loja encontrada</h3>
            <p className="text-muted-foreground">
              Não há lojas cadastradas com coordenadas geográficas.
            </p>
          </div>
        ) : (
          <>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={userLocation || center}
              zoom={12}
              options={options}
              onLoad={onMapLoad}
            >
              {/* Marcador da localização do usuário */}
              {userLocation && (
                <Marker
                  position={userLocation}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#4285F4',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                  }}
                  title="Sua localização"
                />
              )}
              
              {/* Marcadores das lojas */}
              {stores.map(store => (
                <Marker
                  key={store.id}
                  position={{
                    lat: parseFloat(store.location.latitude),
                    lng: parseFloat(store.location.longitude)
                  }}
                  onClick={() => setSelectedStore(store)}
                  icon={{
                    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                  }}
                />
              ))}
              
              {/* Janela de informações quando uma loja é selecionada */}
              {selectedStore && (
                <InfoWindow
                  position={{
                    lat: parseFloat(selectedStore.location.latitude),
                    lng: parseFloat(selectedStore.location.longitude)
                  }}
                  onCloseClick={() => setSelectedStore(null)}
                >
                  <div className="p-1">
                    <h3 className="font-medium text-base">{selectedStore.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {selectedStore.address.street}, {selectedStore.address.city}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        asChild
                      >
                        <Link to={`/stores/${selectedStore.id}`}>
                          Ver loja
                        </Link>
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => {
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedStore.location.latitude},${selectedStore.location.longitude}`;
                          window.open(url, '_blank');
                        }}
                      >
                        <Navigation className="h-3 w-3 mr-1" />
                        Como chegar
                      </Button>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
            
            <div className="mt-4 text-sm text-muted-foreground">
              <p>
                {stores.length} {stores.length === 1 ? 'loja encontrada' : 'lojas encontradas'}
              </p>
            </div>
          </>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between gap-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={getUserLocation}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Usar minha localização
        </Button>
        
        <Button
          variant="outline"
          className="flex-1"
          onClick={fitBounds}
          disabled={!stores || stores.length === 0}
        >
          <Store className="h-4 w-4 mr-2" />
          Ver todas as lojas
        </Button>
      </CardFooter>
    </Card>
  );
}