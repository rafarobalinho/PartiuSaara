import { useState } from 'react';
import StoresMap from '@/components/ui/StoresMap';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function StoresMapPage() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: stores, isLoading } = useQuery({
    queryKey: ['/api/stores/map'],
    queryFn: async () => {
      const response = await fetch('/api/stores/map');
      if (!response.ok) {
        throw new Error('Falha ao buscar lojas');
      }
      return response.json();
    }
  });

  return (
    <div className="container max-w-7xl mx-auto py-6">
      <PageHeader
        title="Mapa de Lojas"
        description="Encontre lojas próximas a você no Saara"
      />

      <div className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            type="text"
            placeholder="Pesquisar por nome ou categoria de loja..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button>Buscar</Button>
      </div>

      <div className="bg-card rounded-lg shadow-sm border p-4">
        <p className="text-sm text-muted-foreground mb-4">
          Visualize todas as lojas cadastradas na plataforma. Clique em um marcador para ver mais detalhes.
        </p>
        
        <StoresMap height="600px" />
        
        <div className="mt-4 text-xs text-muted-foreground">
          <p>Total de lojas no mapa: {stores?.length || 0}</p>
          <p className="mt-1">Última atualização: {new Date().toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}</p>
        </div>
      </div>
    </div>
  );
}