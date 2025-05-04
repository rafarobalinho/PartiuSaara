import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, calculateDistance, formatDistance } from '@/hooks/use-location';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StoreCard from '@/components/ui/store-card';

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
  location: {
    latitude: number;
    longitude: number;
  };
}

export default function Stores() {
  const { coordinates, loading: locationLoading } = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [mapVisible, setMapVisible] = useState(false);
  
  // Categories query
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/categories');
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
      }
    }
  });

  // Stores query
  const { data: stores = [], isLoading } = useQuery({
    queryKey: [`/api/stores?search=${searchTerm}&category=${selectedCategory}`],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          search: searchTerm,
          category: selectedCategory === 'all' ? '' : selectedCategory
        });
        
        if (coordinates) {
          params.append('lat', coordinates.latitude.toString());
          params.append('lng', coordinates.longitude.toString());
        }
        
        const response = await fetch(`/api/stores?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch stores');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching stores:', error);
        return [];
      }
    }
  });

  // Calculate distances
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The query will automatically refetch due to the searchTerm dependency
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Lojas do SAARA</h1>
        <p className="text-gray-600">Encontre as melhores lojas perto de você</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-center gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Buscar lojas por nome ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10"
            />
            <Button 
              type="submit" 
              variant="ghost" 
              size="icon" 
              className="absolute right-0 top-0 h-full text-gray-400 hover:text-primary"
            >
              <i className="fas fa-search"></i>
            </Button>
          </div>
          
          <div className="w-full md:w-48">
            <Select
              value={selectedCategory}
              onValueChange={(value) => setSelectedCategory(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((category: any) => (
                  <SelectItem key={category.id} value={category.slug}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            type="button" 
            variant={mapVisible ? "default" : "outline"}
            onClick={() => setMapVisible(!mapVisible)}
            className="w-full md:w-auto"
          >
            <i className={`fas fa-${mapVisible ? 'list' : 'map-marker-alt'} mr-2`}></i>
            {mapVisible ? 'Ver lista' : 'Ver mapa'}
          </Button>
        </form>
      </div>

      <Tabs defaultValue="list" value={mapVisible ? "map" : "list"} onValueChange={(value) => setMapVisible(value === "map")}>
        <TabsList className="hidden">
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="map">Mapa</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-0">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-[16/9] bg-gray-200 animate-pulse"></div>
                  <div className="p-3">
                    <div className="flex justify-between items-center mb-2">
                      <div className="h-4 bg-gray-200 animate-pulse w-1/3"></div>
                      <div className="h-4 bg-gray-200 animate-pulse w-1/4"></div>
                    </div>
                    <div className="h-12 bg-gray-200 animate-pulse mb-3"></div>
                    <div className="flex flex-wrap gap-2">
                      <div className="h-6 bg-gray-200 animate-pulse w-20 rounded-full"></div>
                      <div className="h-6 bg-gray-200 animate-pulse w-24 rounded-full"></div>
                      <div className="h-6 bg-gray-200 animate-pulse w-16 rounded-full"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : storesWithDistance.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {storesWithDistance.map((store: Store & { distance: number }) => (
                <StoreCard 
                  key={store.id} 
                  store={store} 
                  distance={store.distance ? formatDistance(store.distance) : null}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg">
              <div className="text-4xl mb-4"><i className="fas fa-store text-gray-300"></i></div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma loja encontrada</h3>
              <p className="text-gray-500">Tente buscar por outro termo ou categoria</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="map" className="mt-0">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="h-[600px] relative">
              {/* In a real application, this would be replaced with an actual map component */}
              <div className="w-full h-full bg-cover bg-center" style={{backgroundImage: "url('https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80')"}}>
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="bg-white/90 p-6 rounded-lg max-w-md text-center">
                    <h3 className="text-xl font-bold mb-2">Mapa de Lojas</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {locationLoading ? 'Obtendo sua localização...' : coordinates 
                        ? 'Encontre as lojas próximas a você no mapa' 
                        : 'Permita o acesso à sua localização para ver lojas no mapa'}
                    </p>
                    {!coordinates && !locationLoading && (
                      <Button onClick={() => window.location.reload()} className="bg-primary text-white hover:bg-primary/90">
                        Atualizar localização
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* This would be replaced with actual markers in a real map implementation */}
                {storesWithDistance.slice(0, 5).map((store, index) => (
                  <div 
                    key={store.id}
                    className="absolute bg-white rounded-full p-2 shadow-lg pulse-animation"
                    style={{ 
                      left: `${Math.random() * 80 + 10}%`, 
                      top: `${Math.random() * 80 + 10}%` 
                    }}
                  >
                    <i className="fas fa-map-marker-alt text-primary text-xl"></i>
                  </div>
                ))}
              </div>
            </div>
            
            {storesWithDistance.length > 0 && (
              <div className="p-4 border-t border-gray-200">
                <h3 className="font-medium mb-3">Lojas próximas ({storesWithDistance.length})</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loja</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distância</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {storesWithDistance.slice(0, 5).map((store) => (
                        <tr key={store.id}>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-100 mr-2">
                                {store.images?.[0] ? (
                                  <img src={store.images[0]} alt={store.name} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    <i className="fas fa-store text-primary"></i>
                                  </div>
                                )}
                              </div>
                              <div className="font-medium">{store.name}</div>
                            </div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{store.category}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {store.distance ? formatDistance(store.distance) : '-'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs rounded-full ${store.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {store.isOpen ? 'Aberta' : 'Fechada'}
                            </span>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-right text-sm">
                            <Link href={`/stores/${store.id}`}>
                              <Button variant="link" className="text-primary">
                                Ver loja
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
