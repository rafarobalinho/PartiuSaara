import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MapPin, Map } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GeocodingPanel from '@/components/admin/GeocodingPanel';
import { useAuth } from '@/hooks/use-auth';

export default function LocationSettings() {
  const { storeId } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [customLocation, setCustomLocation] = useState({
    latitude: '',
    longitude: ''
  });

  // Buscar dados da loja
  const { data: store, isLoading } = useQuery({
    queryKey: [`/api/stores/${storeId}`],
    enabled: !!storeId
  });

  // Preencher o estado com as coordenadas atuais quando os dados da loja forem carregados
  useEffect(() => {
    if (store?.location) {
      setCustomLocation({
        latitude: store.location.latitude.toString(),
        longitude: store.location.longitude.toString()
      });
    }
  }, [store]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold">Loja não encontrada</h2>
        <p className="text-muted-foreground">Não foi possível encontrar informações desta loja.</p>
      </div>
    );
  }

  // Verifica se o usuário é dono da loja
  const isOwner = store.userId === user?.id;
  if (!isOwner) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold">Acesso negado</h2>
        <p className="text-muted-foreground">Você não tem permissão para editar esta loja.</p>
      </div>
    );
  }

  // Função para geocodificar o endereço da loja
  const handleGeocode = async () => {
    try {
      setIsUpdating(true);
      toast({
        title: "Processando",
        description: "Geocodificando endereço...",
      });

      const response = await apiRequest('POST', '/api/admin/geocode', {
        address: store.address
      });
      
      if (!response.ok) throw new Error('Falha ao geocodificar endereço');
      
      const geocodeResult = await response.json();
      
      // Atualizar a localização da loja com as coordenadas obtidas
      await apiRequest('PUT', `/api/admin/stores/${storeId}/location`, {
        location: geocodeResult.location,
        place_id: geocodeResult.place_id
      });
      
      // Invalidar o cache para recarregar os dados da loja
      queryClient.invalidateQueries({ queryKey: [`/api/stores/${storeId}`] });
      
      toast({
        title: "Sucesso",
        description: "Localização atualizada com sucesso!",
        variant: "default",
      });
      
      // Atualizar o estado local
      setCustomLocation({
        latitude: geocodeResult.location.latitude.toString(),
        longitude: geocodeResult.location.longitude.toString()
      });
    } catch (error) {
      console.error('Erro ao geocodificar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível geocodificar o endereço.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Função para atualizar manualmente as coordenadas
  const handleUpdateLocation = async () => {
    try {
      setIsUpdating(true);
      
      if (!customLocation.latitude || !customLocation.longitude) {
        toast({
          title: "Campos incompletos",
          description: "Por favor, informe latitude e longitude.",
          variant: "destructive",
        });
        return;
      }
      
      const latitude = parseFloat(customLocation.latitude);
      const longitude = parseFloat(customLocation.longitude);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        toast({
          title: "Valores inválidos",
          description: "Latitude e longitude devem ser números válidos.",
          variant: "destructive",
        });
        return;
      }
      
      // Atualizar a localização da loja com as coordenadas informadas
      await apiRequest('PUT', `/api/admin/stores/${storeId}/location`, {
        location: { latitude, longitude }
      });
      
      // Invalidar o cache para recarregar os dados da loja
      queryClient.invalidateQueries({ queryKey: [`/api/stores/${storeId}`] });
      
      toast({
        title: "Sucesso",
        description: "Localização atualizada com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao atualizar localização:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a localização.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row items-start gap-6">
        <div className="w-full lg:w-2/3 space-y-6">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Configurações de Localização</h1>
          </div>
          
          <p className="text-muted-foreground">
            Gerencie as coordenadas geográficas da sua loja. Elas são usadas para exibir sua loja no mapa e permitir que clientes encontrem sua localização mais facilmente.
          </p>
          
          <Tabs defaultValue="automatic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="automatic">Geocodificação automática</TabsTrigger>
              <TabsTrigger value="manual">Configuração manual</TabsTrigger>
            </TabsList>
            
            <TabsContent value="automatic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Geocodificação por endereço</CardTitle>
                  <CardDescription>
                    Obtenha automaticamente as coordenadas geográficas a partir do endereço da sua loja.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border p-4 bg-muted/40">
                    <h3 className="font-medium mb-2">Endereço atual</h3>
                    <p className="text-sm">
                      {store.address.street}, {store.address.city}, {store.address.state}, {store.address.zipCode}
                    </p>
                  </div>
                  
                  {store.location && (
                    <div className="mt-4 rounded-md border p-4 bg-muted/40">
                      <h3 className="font-medium mb-2">Coordenadas atuais</h3>
                      <p className="text-sm">
                        <span className="font-medium">Latitude:</span> {store.location.latitude.toFixed(6)}<br/>
                        <span className="font-medium">Longitude:</span> {store.location.longitude.toFixed(6)}
                      </p>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={handleGeocode} 
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Map className="mr-2 h-4 w-4" />
                        Geocodificar endereço
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="manual" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configuração manual</CardTitle>
                  <CardDescription>
                    Informe manualmente as coordenadas geográficas da sua loja.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input 
                        id="latitude" 
                        placeholder="Ex: -22.9068" 
                        value={customLocation.latitude}
                        onChange={(e) => setCustomLocation(prev => ({ ...prev, latitude: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Valor decimal entre -90 e 90
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input 
                        id="longitude" 
                        placeholder="Ex: -43.1729" 
                        value={customLocation.longitude}
                        onChange={(e) => setCustomLocation(prev => ({ ...prev, longitude: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Valor decimal entre -180 e 180
                      </p>
                    </div>
                    
                    <p className="text-sm">
                      <span className="font-medium">Dica:</span> Você pode obter coordenadas precisas usando o Google Maps. 
                      Basta clicar com o botão direito no local desejado e copiar as coordenadas.
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={handleUpdateLocation} 
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Atualizando...
                      </>
                    ) : (
                      'Salvar coordenadas'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="w-full lg:w-1/3">
          <GeocodingPanel />
        </div>
      </div>
    </div>
  );
}