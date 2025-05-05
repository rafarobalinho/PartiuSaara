import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

interface Store {
  id: number;
  name: string;
  address: any;
}

interface GeocodingResult {
  latitude: number;
  longitude: number;
  placeId: string;
  formattedAddress: string;
}

const GeocodingPanel = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [storesLoading, setStoresLoading] = useState<boolean>(true);
  const [geocodingResult, setGeocodingResult] = useState<GeocodingResult | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const { toast } = useToast();

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  // Carregar lojas do usuário
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const response = await fetch('/api/stores/my-stores');
        if (!response.ok) {
          throw new Error('Falha ao carregar lojas');
        }
        
        const data = await response.json();
        setStores(data);
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível carregar suas lojas",
          variant: "destructive",
        });
      } finally {
        setStoresLoading(false);
      }
    };

    fetchStores();
  }, [toast]);

  // Quando uma loja é selecionada, preencher o endereço
  useEffect(() => {
    if (selectedStoreId) {
      const store = stores.find(store => store.id === parseInt(selectedStoreId));
      if (store && store.address) {
        try {
          const addressObj = typeof store.address === 'string' 
            ? JSON.parse(store.address) 
            : store.address;
            
          const addressStr = `${addressObj.street}, ${addressObj.city}, ${addressObj.state}, ${addressObj.zipCode}`;
          setAddress(addressStr);
        } catch (error) {
          console.error('Erro ao processar endereço:', error);
          setAddress('');
        }
      }
    }
  }, [selectedStoreId, stores]);

  // Função para geocodificar um endereço
  const geocodeAddress = async () => {
    if (!address.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira um endereço válido",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setGeocodingResult(null);

    try {
      const response = await fetch('/api/admin/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        throw new Error('Falha ao geocodificar endereço');
      }

      const data = await response.json();
      setGeocodingResult(data);
      
      toast({
        title: "Sucesso",
        description: "Endereço geocodificado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível geocodificar o endereço",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para salvar as coordenadas na loja
  const saveCoordinates = async () => {
    if (!selectedStoreId || !geocodingResult) {
      toast({
        title: "Erro",
        description: "Selecione uma loja e geocodifique um endereço primeiro",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/stores/${selectedStoreId}/location`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: geocodingResult.latitude,
          longitude: geocodingResult.longitude,
          placeId: geocodingResult.placeId,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar coordenadas');
      }

      toast({
        title: "Sucesso",
        description: "Coordenadas salvas com sucesso na loja",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as coordenadas",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Renderização do mapa com os resultados da geocodificação
  const renderMap = () => {
    if (!isLoaded || !geocodingResult) return null;

    return (
      <div className="h-60 w-full rounded-md overflow-hidden border border-border mb-4">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={{ lat: geocodingResult.latitude, lng: geocodingResult.longitude }}
          zoom={15}
        >
          <Marker
            position={{ lat: geocodingResult.latitude, lng: geocodingResult.longitude }}
          />
        </GoogleMap>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Configuração de Localização</CardTitle>
        <CardDescription>
          Geocodifique o endereço da sua loja para exibi-la no mapa interativo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="store">Loja</Label>
            <Select
              value={selectedStoreId}
              onValueChange={setSelectedStoreId}
              disabled={storesLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma loja" />
              </SelectTrigger>
              <SelectContent>
                {stores.map(store => (
                  <SelectItem key={store.id} value={store.id.toString()}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Textarea
              id="address"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Rua, número, bairro, cidade, estado, CEP"
              className="min-h-[80px]"
            />
          </div>

          <Button 
            onClick={geocodeAddress} 
            disabled={loading || !address.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Geocodificando...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                Geocodificar Endereço
              </>
            )}
          </Button>

          {geocodingResult && (
            <div className="space-y-4 mt-6">
              <div className="space-y-1">
                <Label>Resultado da Geocodificação</Label>
                {renderMap()}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="latitude" className="text-xs">Latitude</Label>
                    <Input 
                      id="latitude" 
                      value={geocodingResult.latitude} 
                      readOnly 
                    />
                  </div>
                  <div>
                    <Label htmlFor="longitude" className="text-xs">Longitude</Label>
                    <Input 
                      id="longitude" 
                      value={geocodingResult.longitude} 
                      readOnly 
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <Label htmlFor="formattedAddress" className="text-xs">Endereço Formatado</Label>
                  <Input 
                    id="formattedAddress" 
                    value={geocodingResult.formattedAddress} 
                    readOnly 
                  />
                </div>
                <div className="mt-2">
                  <Label htmlFor="placeId" className="text-xs">Place ID</Label>
                  <Input 
                    id="placeId" 
                    value={geocodingResult.placeId} 
                    readOnly 
                  />
                </div>
              </div>

              <Button 
                onClick={saveCoordinates} 
                disabled={isSaving || !selectedStoreId}
                variant="default"
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Salvar Coordenadas na Loja
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start">
        <p className="text-xs text-muted-foreground">
          Ao geocodificar o endereço da sua loja, você permite que os clientes a localizem facilmente no mapa da plataforma. 
          Isso aumenta a visibilidade do seu negócio e melhora a experiência do usuário.
        </p>
      </CardFooter>
    </Card>
  );
};

export default GeocodingPanel;