import { useState } from 'react';
import { Link } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
        {/* Imagem com ratio mais vertical (3:4) */}
        <div className="aspect-[3/4] relative overflow-hidden bg-white">
          <img 
            src={`/api/stores/${store.id}/primary-image`}
            alt={`Vista da loja ${store.name}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="w-full h-full bg-gray-200 flex items-center justify-center hidden">
            <i className="fas fa-store text-gray-400 text-4xl"></i>
          </div>
          
          {/* Badges e botões */}
          <div className="absolute top-0 left-0 right-0 p-3 flex justify-between">
            <Badge className="bg-primary text-white text-xs py-1 px-2 rounded-lg">
              {store.category}
            </Badge>
            <button 
              className={`${isFavorite ? 'text-primary' : 'text-gray-400 hover:text-primary'} bg-white rounded-full p-1.5 shadow-sm`}
              onClick={handleFavoriteToggle}
            >
              <i className={isFavorite ? 'fas fa-heart' : 'far fa-heart'}></i>
            </button>
          </div>
          
          {/* Status de operação (Aberta/Fechada) */}
          <div className="absolute top-12 left-0 p-2">
            <span className={`text-xs ${store.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} py-0.5 px-2 rounded-full shadow-sm`}>
              {store.isOpen ? 'Aberta agora' : 'Fechada'}
            </span>
          </div>
          
          {/* Informações principais sobre a loja */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white p-3">
            <h3 className="font-bold text-lg">{store.name}</h3>
            <div className="flex items-center text-sm">
              <i className="fas fa-star text-yellow-400 mr-1"></i> 
              <span>{store.rating ? store.rating.toFixed(1) : '0.0'}</span>
              <span className="mx-1">•</span>
              <span>{store.reviewCount || 0} avaliações</span>
            </div>
            {distance && (
              <div className="text-sm text-white mt-1">
                <i className="fas fa-map-marker-alt mr-1"></i> {distance} de distância
              </div>
            )}
          </div>
        </div>
        
        {/* Descrição e tags */}
        <div className="p-3 flex-grow flex flex-col justify-between">
          <p className="text-sm line-clamp-2 text-gray-600 mb-3">
            {store.description}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {store.tags && store.tags.length > 0 ? (
              store.tags.slice(0, 3).map((tag, index) => (
                <span key={index} className="text-xs bg-gray-100 text-gray-700 py-0.5 px-2 rounded-full">
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-xs bg-gray-100 text-gray-700 py-0.5 px-2 rounded-full">
                Loja
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
