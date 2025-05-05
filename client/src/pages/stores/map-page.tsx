import React from 'react';
import StoresMap from '@/components/ui/StoresMap';
import { Card } from '@/components/ui/card';

export default function MapPage() {
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Encontre lojas próximas</h1>
      
      <p className="mb-8 text-muted-foreground">
        Utilize o mapa abaixo para localizar as lojas cadastradas em nossa plataforma.
        Você pode usar sua localização atual para encontrar as lojas mais próximas de você.
      </p>
      
      <StoresMap />
      
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-medium mb-2">Dicas para usar o mapa</h2>
          <ul className="space-y-2 text-sm">
            <li>• Clique nos marcadores para ver os detalhes das lojas</li>
            <li>• Use os botões abaixo do mapa para centralizar na sua localização ou ver todas as lojas</li>
            <li>• Clique em "Como chegar" para abrir a navegação no Google Maps</li>
            <li>• Você pode ampliar ou reduzir o zoom usando os controles do mapa ou a roda do mouse</li>
          </ul>
        </Card>
        
        <Card className="p-6">
          <h2 className="text-lg font-medium mb-2">Não encontrou o que procura?</h2>
          <p className="text-sm mb-4">
            Se você não conseguir encontrar uma loja específica no mapa, pode ser que ela ainda não tenha cadastrado sua localização geográfica.
          </p>
          <p className="text-sm">
            Você também pode usar nossa <a href="/stores" className="text-primary underline">listagem de lojas</a> para encontrar o estabelecimento que procura.
          </p>
        </Card>
      </div>
    </div>
  );
}