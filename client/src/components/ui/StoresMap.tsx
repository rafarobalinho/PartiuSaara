import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from '@tanstack/react-query';
import { Loader2, Store, MapPin } from 'lucide-react';
import { Link } from 'wouter';

// Componente do mapa de lojas temporário
export default function StoresMap() {
  // Buscar as lojas da API
  const { data: stores = [], isLoading, isError } = useQuery({
    queryKey: ['/api/stores/map']
  });
  
  // Log dos dados recebidos para debug
  useEffect(() => {
    if (stores) {
      console.log('Dados recebidos:', stores);
    }
  }, [stores]);
  
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
        ) : !Array.isArray(stores) || stores.length === 0 ? (
          <div className="text-center py-8">
            <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Nenhuma loja encontrada</h3>
            <p className="text-muted-foreground">
              Não há lojas cadastradas com coordenadas geográficas.
            </p>
          </div>
        ) : (
          <div>
            <div className="bg-gray-100 h-[400px] rounded-lg flex items-center justify-center">
              <div className="text-center">
                <p className="mb-4 text-lg font-medium">Mapa temporariamente indisponível</p>
                <p className="mb-4 text-muted-foreground">
                  Aguardando configuração da API do Google Maps
                </p>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Tentar novamente
                </Button>
              </div>
            </div>
            
            <div className="mt-6 space-y-4">
              <h3 className="text-xl font-medium">Lojas disponíveis</h3>
              
              <div className="space-y-4">
                {Array.isArray(stores) && stores.map(store => (
                  <Card key={store.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-medium">{store.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {store.address?.street}, {store.address?.city} - {store.address?.state}
                        </p>
                        <p className="text-sm mt-2">{store.description}</p>
                      </div>
                      <Button size="sm" asChild>
                        <Link to={`/stores/${store.id}`}>
                          Ver loja
                        </Link>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            
            <div className="mt-4 text-sm text-muted-foreground">
              <p>
                {stores.length} {stores.length === 1 ? 'loja encontrada' : 'lojas encontradas'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between gap-4">
        <Button
          variant="outline"
          className="flex-1"
          disabled
        >
          <MapPin className="h-4 w-4 mr-2" />
          Usar minha localização
        </Button>
        
        <Button
          variant="outline"
          className="flex-1"
          disabled
        >
          <Store className="h-4 w-4 mr-2" />
          Ver todas as lojas
        </Button>
      </CardFooter>
    </Card>
  );
}