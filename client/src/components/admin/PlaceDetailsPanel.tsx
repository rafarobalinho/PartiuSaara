import React from 'react';
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
import { Loader2, RefreshCw, Star, Phone, Globe, Clock, MapPin } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Interface para as propriedades do componente
interface PlaceDetailsProps {
  storeId: number;
  placeName?: string;
}

// Interface para os detalhes do lugar
interface PlaceDetails {
  place_id?: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  url?: string;
  vicinity?: string;
  utc_offset_minutes?: number;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    open_now?: boolean;
    periods?: Array<{
      open: {
        day: number;
        time: string;
      };
      close: {
        day: number;
        time: string;
      };
    }>;
    weekday_text?: string[];
  };
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
  }>;
}

// Função para formatar os dias da semana
const formatWeekday = (day: number): string => {
  const days = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado'
  ];
  return days[day] || '';
};

// Função para formatar o horário
const formatTime = (time: string): string => {
  if (time.length === 4) {
    return `${time.substring(0, 2)}:${time.substring(2, 4)}`;
  }
  return time;
};

export default function PlaceDetailsPanel({ storeId, placeName }: PlaceDetailsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Busca os detalhes do lugar
  const { 
    data: placeDetails, 
    isLoading: isLoadingDetails,
    error: placeDetailsError,
    refetch: refetchPlaceDetails
  } = useQuery<PlaceDetails>({
    queryKey: ['/api/admin/stores', storeId, 'place-details'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/stores/${storeId}/place-details`);
      return res.json();
    },
    enabled: !!storeId
  });

  // Mutação para atualizar os detalhes do lugar
  const refreshPlaceDetailsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/admin/stores/${storeId}/refresh-place-details`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Detalhes atualizados',
        description: 'Os detalhes do Google Places foram atualizados com sucesso.',
        variant: 'default',
      });
      
      queryClient.invalidateQueries({
        queryKey: ['/api/admin/stores', storeId, 'place-details']
      });
    },
    onError: (err: Error) => {
      toast({
        title: 'Erro ao atualizar',
        description: `Não foi possível atualizar os detalhes: ${err.message}`,
        variant: 'destructive',
      });
    }
  });

  // Renderiza um esqueleto de carregamento
  if (isLoadingDetails) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      </div>
    );
  }

  // Renderiza mensagem de erro
  if (placeDetailsError) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">
            Erro ao carregar detalhes do lugar
          </p>
          <Button 
            variant="outline" 
            onClick={() => refetchPlaceDetails()}
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  // Não tem detalhes mas tem ID da loja
  if (!placeDetails || !placeDetails.place_id) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">
            Não há detalhes do Google Places disponíveis para esta loja.
          </p>
          <Button 
            onClick={() => refreshPlaceDetailsMutation.mutate()}
            disabled={refreshPlaceDetailsMutation.isPending}
          >
            {refreshPlaceDetailsMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Buscar Detalhes
          </Button>
        </div>
      </div>
    );
  }

  // Renderiza os detalhes do lugar
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">
            {placeName || 'Detalhes do Lugar'}
          </h3>
          <p className="text-gray-600 text-sm">
            {placeDetails.formatted_address || placeDetails.vicinity}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => refreshPlaceDetailsMutation.mutate()}
          disabled={refreshPlaceDetailsMutation.isPending}
        >
          {refreshPlaceDetailsMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Atualizar
        </Button>
      </div>

      {placeDetails.rating && (
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <Star className="h-5 w-5 text-yellow-500 mr-1 fill-yellow-500" />
            <span className="font-medium">{placeDetails.rating.toFixed(1)}</span>
          </div>
          <span className="text-gray-500 text-sm">
            ({placeDetails.user_ratings_total || 0} avaliações)
          </span>
        </div>
      )}

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Informações de contato */}
        <div>
          <h4 className="text-sm font-medium mb-3">Informações de Contato</h4>
          <ul className="space-y-3">
            {placeDetails.formatted_phone_number && (
              <li className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm">{placeDetails.formatted_phone_number}</p>
                  {placeDetails.international_phone_number && (
                    <p className="text-xs text-gray-500">{placeDetails.international_phone_number}</p>
                  )}
                </div>
              </li>
            )}
            
            {placeDetails.website && (
              <li className="flex items-start gap-2">
                <Globe className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <a 
                    href={placeDetails.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {new URL(placeDetails.website).hostname}
                  </a>
                </div>
              </li>
            )}
            
            {placeDetails.url && (
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <a 
                    href={placeDetails.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Ver no Google Maps
                  </a>
                </div>
              </li>
            )}
          </ul>
        </div>

        {/* Horário de funcionamento */}
        {placeDetails.opening_hours && placeDetails.opening_hours.weekday_text && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horário de Funcionamento
              {placeDetails.opening_hours.open_now !== undefined && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  placeDetails.opening_hours.open_now 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {placeDetails.opening_hours.open_now ? 'Aberto' : 'Fechado'}
                </span>
              )}
            </h4>
            <ul className="space-y-1 text-sm">
              {placeDetails.opening_hours.weekday_text.map((text, index) => (
                <li key={index} className="text-gray-700">{text}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Google Maps Place ID (para referência) */}
      <div className="pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          <span className="font-medium">Google Place ID:</span> {placeDetails.place_id}
        </p>
      </div>
    </div>
  );
}