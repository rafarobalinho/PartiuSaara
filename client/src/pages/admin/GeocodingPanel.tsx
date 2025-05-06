import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  Map, 
  Loader2, 
  RefreshCw, 
  Edit, 
  Trash, 
  ChevronDown, 
  ChevronUp,
  Info
} from 'lucide-react';
import {
  GoogleMap,
  Marker,
  useJsApiLoader
} from '@react-google-maps/api';
import PlaceDetailsPanel from '@/components/admin/PlaceDetailsPanel';

// Tipo para uma loja com informações de geocodificação
interface StoreWithGeoStatus {
  id: number;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode?: string;
  };
  location: {
    latitude: number | null;
    longitude: number | null;
  } | null;
  geocodingStatus: 'geocoded' | 'pending' | 'incomplete_address';
  hasValidCoordinates: boolean;
  hasCompleteAddress: boolean;
  fullAddress: string;
}

// Definindo o centro inicial do mapa (default: Rio de Janeiro)
const defaultCenter = { lat: -22.9068, lng: -43.1729 };

export default function GeocodingPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStore, setSelectedStore] = useState<StoreWithGeoStatus | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [editCoordinates, setEditCoordinates] = useState(false);
  const [newCoordinates, setNewCoordinates] = useState({ latitude: 0, longitude: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'ascending' | 'descending' } | null>(null);

  // Carregar a API do Google Maps
  const { isLoaded: isMapsApiLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places']
  });

  // Buscar todas as lojas com seus dados de geocodificação
  const { 
    data: storesData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/admin/stores-geocoding'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/stores-geocoding');
      return await res.json();
    }
  });

  // Mutation para geocodificar uma loja
  const geocodeStoreMutation = useMutation({
    mutationFn: async (storeId: number) => {
      const res = await apiRequest('POST', `/api/admin/geocode-store/${storeId}`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Geocodificação realizada",
        description: `Loja ${data.store.name} geocodificada com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores-geocoding'] });
    },
    onError: (err: Error) => {
      toast({
        title: "Erro na geocodificação",
        description: err.message,
        variant: "destructive",
      });
    }
  });

  // Mutation para atualizar coordenadas manualmente
  const updateCoordinatesMutation = useMutation({
    mutationFn: async ({ storeId, coords }: { storeId: number, coords: { latitude: number, longitude: number } }) => {
      const res = await apiRequest('POST', `/api/admin/update-store-coordinates/${storeId}`, coords);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Coordenadas atualizadas",
        description: `Coordenadas da loja ${data.store.name} atualizadas com sucesso.`,
      });
      setEditCoordinates(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores-geocoding'] });
    },
    onError: (err: Error) => {
      toast({
        title: "Erro ao atualizar coordenadas",
        description: err.message,
        variant: "destructive",
      });
    }
  });

  // Mutation para geocodificar todas as lojas
  const geocodeAllStoresMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/geocode-all-stores');
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Geocodificação em lote concluída",
        description: `${data.success} lojas geocodificadas com sucesso. ${data.failed} falhas.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores-geocoding'] });
    },
    onError: (err: Error) => {
      toast({
        title: "Erro na geocodificação em lote",
        description: err.message,
        variant: "destructive",
      });
    }
  });

  // Função para mostrar uma loja no mapa
  const showStoreOnMap = (store: StoreWithGeoStatus) => {
    setSelectedStore(store);
    
    if (store.hasValidCoordinates && store.location) {
      setMapCenter({ 
        lat: store.location.latitude as number, 
        lng: store.location.longitude as number 
      });
      
      // Preencher as coordenadas no formulário de edição
      setNewCoordinates({
        latitude: store.location.latitude as number,
        longitude: store.location.longitude as number
      });
    }
  };
  
  // Mutation para obter detalhes do Google Places
  const getPlaceDetailsMutation = useMutation({
    mutationFn: async (storeId: number) => {
      const res = await apiRequest('POST', `/api/admin/update-store-details/${storeId}`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Detalhes obtidos com sucesso",
        description: `Detalhes da loja foram atualizados a partir do Google Places.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores-geocoding'] });
    },
    onError: (err: Error) => {
      toast({
        title: "Erro ao obter detalhes",
        description: err.message,
        variant: "destructive",
      });
    }
  });

  // Função para ordenar lojas
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Aplicar ordenação e filtragem às lojas
  const getFilteredAndSortedStores = () => {
    if (!storesData || !storesData.stores) return [];
    
    // Filtrar por termo de busca
    let filteredStores = storesData.stores.filter((store: StoreWithGeoStatus) => {
      return (
        store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.fullAddress.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
    
    // Aplicar ordenação
    if (sortConfig !== null) {
      filteredStores.sort((a: any, b: any) => {
        // Função de comparação especial para nested properties (como 'location.latitude')
        const getSortValue = (obj: any, path: string) => {
          const parts = path.split('.');
          let value = obj;
          for (const part of parts) {
            if (value === null || value === undefined) return null;
            value = value[part];
          }
          return value;
        };

        const aValue = getSortValue(a, sortConfig.key);
        const bValue = getSortValue(b, sortConfig.key);
        
        if (aValue === null || aValue === undefined) return sortConfig.direction === 'ascending' ? 1 : -1;
        if (bValue === null || bValue === undefined) return sortConfig.direction === 'ascending' ? -1 : 1;
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filteredStores;
  };

  // Função para renderizar o indicador de ordenação
  const renderSortIndicator = (key: string) => {
    if (sortConfig?.key !== key) return null;
    return sortConfig?.direction === 'ascending' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  // Função para lidar com coordenadas atualizadas no mapa
  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!editCoordinates || !e.latLng) return;
    
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    
    setNewCoordinates({
      latitude: lat,
      longitude: lng
    });
  };

  // Função para atualizar coordenadas
  const handleCoordinateUpdate = () => {
    if (!selectedStore) return;
    
    updateCoordinatesMutation.mutate({
      storeId: selectedStore.id,
      coords: newCoordinates
    });
  };

  // Se estiver carregando
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500 mb-4" />
        <p className="text-lg">Carregando dados de geocodificação...</p>
      </div>
    );
  }

  // Se ocorreu um erro
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao carregar dados</h2>
        <p className="text-gray-600 mb-4">{error instanceof Error ? error.message : 'Erro desconhecido'}</p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
        </Button>
      </div>
    );
  }

  // Lojas filtradas e ordenadas
  const filteredStores = getFilteredAndSortedStores();
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MapPin className="h-7 w-7 text-orange-500" />
            Gerenciamento de Geocodificação
          </h1>
          <p className="text-gray-600 mt-2">
            Gerencie e corrija as coordenadas geográficas das lojas cadastradas no marketplace.
          </p>
        </div>
        
        <div className="flex gap-3 flex-wrap">
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          
          <Button 
            onClick={() => geocodeAllStoresMutation.mutate()}
            disabled={geocodeAllStoresMutation.isPending}
            className="flex items-center gap-2"
          >
            {geocodeAllStoresMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Map className="h-4 w-4" />
            )}
            Geocodificar Todas
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total de Lojas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{storesData?.total || 0}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Geocodificadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{storesData?.geocoded || 0}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">{storesData?.pending || 0}</p>
            <p className="text-sm text-gray-500">
              {storesData?.incomplete || 0} com endereços incompletos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <Input
          className="pl-10"
          placeholder="Buscar por nome da loja ou endereço..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabela de lojas */}
      <Card className="mb-8">
        <CardContent className="p-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100" 
                  onClick={() => requestSort('id')}
                >
                  <span className="flex items-center gap-1">
                    ID {renderSortIndicator('id')}
                  </span>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('name')}
                >
                  <span className="flex items-center gap-1">
                    Nome {renderSortIndicator('name')}
                  </span>
                </TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('geocodingStatus')}
                >
                  <span className="flex items-center gap-1">
                    Status {renderSortIndicator('geocodingStatus')}
                  </span>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('location.latitude')}
                >
                  <span className="flex items-center gap-1">
                    Coordenadas {renderSortIndicator('location.latitude')}
                  </span>
                </TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-32">
                    <p className="text-gray-500">Nenhuma loja encontrada</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStores.map((store: StoreWithGeoStatus) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.id}</TableCell>
                    <TableCell>{store.name}</TableCell>
                    <TableCell>
                      {store.hasCompleteAddress ? store.fullAddress : (
                        <span className="text-red-500">Endereço incompleto</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {store.geocodingStatus === 'geocoded' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">
                          <CheckCircle className="h-3 w-3" />
                          Geocodificado
                        </span>
                      ) : store.geocodingStatus === 'incomplete_address' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs">
                          <AlertTriangle className="h-3 w-3" />
                          Endereço incompleto
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs">
                          <AlertTriangle className="h-3 w-3" />
                          Pendente
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {store.hasValidCoordinates && store.location && 
                        store.location.latitude !== null && store.location.longitude !== null ? (
                        <span>
                          {Number(store.location.latitude).toFixed(6)}, {Number(store.location.longitude).toFixed(6)}
                        </span>
                      ) : (
                        <span className="text-gray-400">Não disponível</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => showStoreOnMap(store)}
                          title="Ver no mapa"
                        >
                          <Map className="h-4 w-4" />
                        </Button>
                        {store.hasCompleteAddress && (
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => geocodeStoreMutation.mutate(store.id)}
                            disabled={geocodeStoreMutation.isPending}
                            title="Geocodificar"
                          >
                            {geocodeStoreMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MapPin className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        
                        {/* Botão para visualizar detalhes do Google Places */}
                        {store.geocodingStatus === 'geocoded' && (
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => getPlaceDetailsMutation.mutate(store.id)}
                            disabled={getPlaceDetailsMutation.isPending}
                            title="Obter detalhes do Google Places"
                          >
                            {getPlaceDetailsMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Info className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="border-t px-6 py-3">
          <p className="text-gray-500 text-sm">
            Mostrando {filteredStores.length} de {storesData?.total || 0} lojas
          </p>
        </CardFooter>
      </Card>

      {/* Mapa e painel lateral */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Mapa de Visualização</CardTitle>
            <CardDescription>
              {selectedStore ? (
                <>Exibindo: <span className="font-medium">{selectedStore.name}</span></>
              ) : (
                'Selecione uma loja para visualizar no mapa'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 h-[500px] relative">
            {!isMapsApiLoaded ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={mapCenter}
                zoom={15}
                options={{
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: true,
                }}
                onClick={handleMapClick}
              >
                {editCoordinates && newCoordinates.latitude && (
                  <Marker
                    position={{
                      lat: newCoordinates.latitude,
                      lng: newCoordinates.longitude
                    }}
                  />
                )}
                
                {selectedStore?.hasValidCoordinates && selectedStore?.location && !editCoordinates && 
                  selectedStore.location.latitude !== null && selectedStore.location.longitude !== null && (
                  <Marker
                    position={{
                      lat: Number(selectedStore.location.latitude),
                      lng: Number(selectedStore.location.longitude)
                    }}
                  />
                )}
              </GoogleMap>
            )}
            
            {editCoordinates && (
              <div className="absolute bottom-4 left-4 right-4 bg-white p-3 rounded-md shadow-md">
                <p className="text-sm font-medium mb-2">
                  Clique no mapa para ajustar as coordenadas ou arraste o marcador
                </p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <Label htmlFor="lat">Latitude</Label>
                    <Input
                      id="lat"
                      value={newCoordinates.latitude || ''}
                      onChange={(e) => setNewCoordinates({
                        ...newCoordinates,
                        latitude: parseFloat(e.target.value)
                      })}
                      type="number"
                      step="0.000001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lng">Longitude</Label>
                    <Input
                      id="lng"
                      value={newCoordinates.longitude || ''}
                      onChange={(e) => setNewCoordinates({
                        ...newCoordinates,
                        longitude: parseFloat(e.target.value)
                      })}
                      type="number"
                      step="0.000001"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setEditCoordinates(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCoordinateUpdate}
                    disabled={updateCoordinatesMutation.isPending}
                  >
                    {updateCoordinatesMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Salvar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Detalhes da Loja</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedStore ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{selectedStore.name}</h3>
                  <p className="text-gray-600">{selectedStore.fullAddress}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm mb-1">Status de Geocodificação</h4>
                  {selectedStore.geocodingStatus === 'geocoded' ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span>Geocodificado com sucesso</span>
                    </div>
                  ) : selectedStore.geocodingStatus === 'incomplete_address' ? (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      <span>Endereço incompleto</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="h-5 w-5" />
                      <span>Pendente de geocodificação</span>
                    </div>
                  )}
                </div>
                
                {selectedStore.hasValidCoordinates && selectedStore.location && 
                  selectedStore.location.latitude !== null && selectedStore.location.longitude !== null && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Coordenadas</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-700">
                          <span className="font-medium">Lat:</span> {Number(selectedStore.location.latitude).toFixed(6)}
                        </p>
                        <p className="text-gray-700">
                          <span className="font-medium">Lng:</span> {Number(selectedStore.location.longitude).toFixed(6)}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setEditCoordinates(true)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="pt-2">
                  <div className="flex gap-2">
                    {selectedStore.hasCompleteAddress ? (
                      <Button
                        onClick={() => geocodeStoreMutation.mutate(selectedStore.id)}
                        disabled={geocodeStoreMutation.isPending}
                        className="flex-1"
                      >
                        {geocodeStoreMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <MapPin className="h-4 w-4 mr-2" />
                        )}
                        Geocodificar
                      </Button>
                    ) : (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="flex-1">
                            <Edit className="h-4 w-4 mr-2" />
                            Editar Endereço
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Endereço incompleto</DialogTitle>
                            <DialogDescription>
                              Este endereço está incompleto e precisa ser atualizado na edição da loja.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <p className="text-sm text-gray-600">
                              Para corrigir o endereço, vá até a página de edição da loja e preencha todos os campos obrigatórios:
                            </p>
                            <ul className="list-disc pl-5 mt-2 text-sm text-gray-600">
                              <li>Rua/Avenida</li>
                              <li>Cidade</li>
                              <li>Estado</li>
                              <li>CEP (recomendado)</li>
                            </ul>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => window.location.href = `/seller/stores/${selectedStore.id}`}>
                              Ir para edição da loja
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6">
                <MapPin className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500 text-center">
                  Selecione uma loja na tabela para ver seus detalhes e gerenciar sua localização
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}