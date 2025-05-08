import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { SafeImage } from './safe-image';

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
  const [isStoreOpen, setIsStoreOpen] = useState(store.isOpen);
  
  // Buscar os detalhes do lugar na API
  const { data: placeDetails } = useQuery({
    queryKey: [`/api/stores/${store.id}/place-details`],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/stores/${store.id}/place-details`);
        if (response.ok) {
          return await response.json();
        }
        return null;
      } catch (error) {
        console.error('Erro ao carregar detalhes do lugar:', error);
        return null;
      }
    },
    enabled: !!store.id
  });
  
  // Traduzir dias da semana do inglês para português
  const translateDayOfWeek = (day: string): string => {
    const translations: Record<string, string> = {
      'Monday': 'Segunda',
      'Tuesday': 'Terça',
      'Wednesday': 'Quarta',
      'Thursday': 'Quinta',
      'Friday': 'Sexta',
      'Saturday': 'Sábado',
      'Sunday': 'Domingo'
    };
    
    for (const [eng, pt] of Object.entries(translations)) {
      if (day.startsWith(eng)) {
        return day.replace(eng, pt);
      }
    }
    return day;
  };
  
  // Verificar status de funcionamento baseado nos detalhes do lugar
  useEffect(() => {
    if (placeDetails?.business_status) {
      if (placeDetails.business_status === 'OPERATIONAL') {
        setIsStoreOpen(true);
      } else if (['CLOSED_TEMPORARILY', 'CLOSED_PERMANENTLY'].includes(placeDetails.business_status)) {
        setIsStoreOpen(false);
      }
    }
  }, [placeDetails]);

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
          <SafeImage 
            src={`/api/stores/${store.id}/primary-image`}
            alt={`Loja ${store.name}`}
            className="w-full h-full object-cover"
            onLoad={() => console.log(`Imagem da loja ${store.id} carregada com sucesso`)}
            fallbackSrc="/assets/default-store-image.jpg"
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
            <span className={`text-[10px] ${isStoreOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} py-0.5 px-1.5 rounded-full shadow-sm`}>
              {isStoreOpen ? 'Aberto' : 'Fechado'}
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
            <span>{placeDetails?.rating ? placeDetails.rating.toFixed(1) : (store.rating ? store.rating.toFixed(1) : '0.0')}</span>
            <span className="mx-0.5">•</span>
            <span>{placeDetails?.total_ratings || store.reviewCount || 0} avaliações</span>
            {distance && (
              <>
                <span className="mx-0.5">•</span>
                <span><i className="fas fa-map-marker-alt mr-0.5"></i>{distance}</span>
              </>
            )}
          </div>
          
          {/* Horários de funcionamento - se disponíveis */}
          {placeDetails?.opening_hours && (
            <div className="mt-0.5 mb-1">
              <div 
                className="text-[10px] text-gray-600 cursor-pointer flex items-center" 
                title="Horários de funcionamento"
              >
                <i className="far fa-clock mr-0.5"></i> 
                {(() => {
                  try {
                    const horariosJson = JSON.parse(placeDetails.opening_hours);
                    if (Array.isArray(horariosJson)) {
                      // Exibir apenas o primeiro horário traduzido
                      const firstDay = horariosJson[0] || "";
                      return translateDayOfWeek(firstDay);
                    }
                    return "Horários disponíveis";
                  } catch {
                    return "Horários disponíveis";
                  }
                })()}
              </div>
            </div>
          )}
          
          {/* Descrição da loja - mais compacta */}
          <p className="text-[10px] text-gray-600 line-clamp-2 mt-0.5">
            {store.description}
          </p>
        </div>
      </div>
    </Link>
  );
}
