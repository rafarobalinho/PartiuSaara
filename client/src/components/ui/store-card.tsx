import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

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
}

interface PlaceDetails {
  rating: number | null;
  total_ratings: number | null;
  opening_hours: string | null;
  business_status: string | null;
}

interface StoreCardProps {
  store: Store;
  distance: string | null;
}

export default function StoreCard({ store, distance }: StoreCardProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFavorite, setIsFavorite] = useState(false);

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        isFavorite ? 'DELETE' : 'POST', 
        `/api/favorite-stores/${store.id}`,
        {}
      );
    },
    onSuccess: () => {
      setIsFavorite(!isFavorite);
      queryClient.invalidateQueries({ queryKey: ['/api/favorite-stores'] });
      toast({
        title: isFavorite ? 'Loja removida dos favoritos' : 'Loja adicionada aos favoritos',
        description: isFavorite ? 
          `${store.name} foi removida das suas lojas favoritas.` : 
          `${store.name} foi adicionada às suas lojas favoritas.`,
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao atualizar os favoritos.',
        variant: "destructive",
      });
      console.error('Error toggling favorite store:', error);
    }
  });

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para adicionar lojas aos favoritos.',
        variant: "default",
      });
      return;
    }
    
    toggleFavoriteMutation.mutate();
  };

  return (
    <Link href={`/stores/${store.id}`}>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow block h-full flex flex-col">
        {/* Imagem com ratio 1:1 (quadrado) para seguir o modelo de referência */}
        <div className="aspect-square relative overflow-hidden bg-white">
          <img 
            src={`/api/stores/${store.id}/primary-image`}
            alt={`Loja ${store.name}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="w-full h-full bg-gray-200 flex items-center justify-center hidden">
            <i className="fas fa-store text-gray-400 text-4xl"></i>
          </div>
          
          {/* Badge de categoria no canto superior esquerdo - mais compacto */}
          <div className="absolute top-0 left-0 p-1">
            <Badge className="bg-primary text-white text-[10px] py-0.5 px-1.5 rounded-md">
              {store.category}
            </Badge>
          </div>
          
          {/* Status e coração de favoritos no canto inferior - mais compacto */}
          <div className="absolute bottom-0 left-0 right-0 p-1 flex justify-between items-center">
            <span className={`text-[10px] ${store.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} py-0.5 px-1.5 rounded-full shadow-sm`}>
              {store.isOpen ? 'Aberto' : 'Fechado'}
            </span>
            <button 
              className={`${isFavorite ? 'text-[#F2600C]' : 'text-gray-200 hover:text-[#F2600C]'} bg-white rounded-full shadow-sm flex items-center justify-center h-5 w-5`}
              onClick={handleFavoriteToggle}
            >
              <i className={isFavorite ? 'fas fa-heart text-[10px]' : 'far fa-heart text-[10px]'}></i>
            </button>
          </div>
        </div>
        
        {/* Informações da loja - mais compactas */}
        <div className="p-2 flex-grow flex flex-col">
          {/* Nome da loja com limite de 2 linhas - fonte menor */}
          <h3 className="font-medium text-xs line-clamp-2 mb-0.5 text-gray-800">
            {store.name}
          </h3>
          
          {/* Exibição de avaliações em linha - fonte menor */}
          <div className="flex items-center text-[10px] text-gray-500 mb-1">
            <i className="fas fa-star text-yellow-400 mr-0.5"></i> 
            <span>{store.rating ? store.rating.toFixed(1) : '0.0'}</span>
            <span className="mx-0.5">•</span>
            <span>{store.reviewCount || 0} avaliações</span>
            {distance && (
              <>
                <span className="mx-0.5">•</span>
                <span><i className="fas fa-map-marker-alt mr-0.5"></i>{distance}</span>
              </>
            )}
          </div>
          
          {/* Descrição da loja - mais compacta */}
          <p className="text-[10px] text-gray-600 line-clamp-2 mt-0.5">
            {store.description}
          </p>
        </div>
      </div>
    </Link>
  );
}
