import React, { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Info,
  Phone,
  Globe,
  Star,
  Clock,
  MessageSquare,
  Store,
  Loader2,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

interface PlaceDetailsProps {
  storeId: number;
  placeName?: string;
}

export default function PlaceDetailsPanel({ storeId, placeName }: PlaceDetailsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Buscar detalhes do lugar para uma loja específica
  const { 
    data: placeDetails,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: [`/api/admin/store-place-details/${storeId}`],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/store-place-details/${storeId}`);
      return await res.json();
    },
    enabled: !!storeId,
    refetchOnWindowFocus: false
  });

  // Mutation para atualizar os detalhes do lugar
  const updateDetailsMutation = useMutation({
    mutationFn: async (storeId: number) => {
      const res = await apiRequest('POST', `/api/admin/update-store-details/${storeId}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Detalhes atualizados",
        description: `Detalhes do lugar atualizados com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/store-place-details/${storeId}`] });
      setDialogOpen(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Erro ao atualizar detalhes",
        description: err.message,
        variant: "destructive",
      });
    }
  });

  // Função para formatar horários de funcionamento
  const formatOpeningHours = (hours: any) => {
    if (!hours || !hours.weekday_text) return "Horário não disponível";
    return hours.weekday_text;
  };

  // Renderizar avaliações
  const renderRating = (rating: number) => {
    return (
      <div className="flex items-center">
        <Star className="w-5 h-5 text-yellow-500 mr-1" />
        <span className="font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  // Handler para atualizar os detalhes
  const handleUpdateDetails = () => {
    updateDetailsMutation.mutate(storeId);
  };

  // Se estiver carregando
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Store className="mr-2 h-5 w-5" />
            Carregando detalhes...
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </CardContent>
      </Card>
    );
  }

  // Se ocorreu um erro
  if (isError || !placeDetails?.success) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : placeDetails?.error || 'Erro desconhecido';
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
            Detalhes não disponíveis
          </CardTitle>
          <CardDescription>
            {placeDetails?.message || 'Não foi possível carregar os detalhes do lugar.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500">{errorMessage}</div>
          
          <div className="mt-6 flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => refetch()}
              className="flex items-center"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar Novamente
            </Button>
            
            <Button 
              onClick={handleUpdateDetails}
              disabled={updateDetailsMutation.isPending}
              className="flex items-center"
            >
              {updateDetailsMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Atualizar Detalhes
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Dados do lugar
  const place = placeDetails.data;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl flex items-center">
              <Store className="mr-2 h-5 w-5" />
              {place.name || placeName || `Loja ID ${storeId}`}
            </CardTitle>
            <CardDescription>
              Detalhes obtidos do Google Places - Última atualização: {new Date(place.last_updated).toLocaleString()}
            </CardDescription>
          </div>
          <Badge className={place.business_status === 'OPERATIONAL' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
            {place.business_status === 'OPERATIONAL' ? 'Em Operação' : place.business_status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Informações básicas */}
        <div className="space-y-3">
          <div className="flex items-start">
            <Info className="h-5 w-5 mr-3 mt-0.5 text-gray-500" />
            <div>
              <h3 className="font-medium">Endereço</h3>
              <p className="text-gray-600">{place.formatted_address}</p>
            </div>
          </div>
          
          {place.phone_number && (
            <div className="flex items-start">
              <Phone className="h-5 w-5 mr-3 mt-0.5 text-gray-500" />
              <div>
                <h3 className="font-medium">Telefone</h3>
                <p className="text-gray-600">{place.phone_number}</p>
              </div>
            </div>
          )}
          
          {place.website && (
            <div className="flex items-start">
              <Globe className="h-5 w-5 mr-3 mt-0.5 text-gray-500" />
              <div>
                <h3 className="font-medium">Website</h3>
                <a 
                  href={place.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {place.website}
                </a>
              </div>
            </div>
          )}
        </div>
        
        <Separator />
        
        {/* Avaliações e categorias */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium flex items-center mb-2">
              <Star className="h-5 w-5 mr-2 text-yellow-500" />
              Avaliações
            </h3>
            
            {place.rating ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {renderRating(place.rating)}
                    <span className="text-gray-500 ml-2">
                      ({place.total_ratings} avaliações)
                    </span>
                  </div>
                </div>
                <Progress value={place.rating * 20} className="h-2" />
              </div>
            ) : (
              <p className="text-gray-500">Sem avaliações disponíveis</p>
            )}
          </div>
          
          <div>
            <h3 className="font-medium flex items-center mb-2">
              <Store className="h-5 w-5 mr-2 text-gray-500" />
              Categorias
            </h3>
            
            {place.types && place.types.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {place.types.map((type: string, index: number) => (
                  <Badge key={index} variant="outline" className="capitalize">
                    {type.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Sem categorias disponíveis</p>
            )}
          </div>
        </div>
        
        <Separator />
        
        {/* Horários e Avaliações */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Horários */}
          <div>
            <h3 className="font-medium flex items-center mb-2">
              <Clock className="h-5 w-5 mr-2 text-gray-500" />
              Horários de Funcionamento
            </h3>
            
            {place.opening_hours && place.opening_hours.weekday_text ? (
              <ul className="space-y-1 text-sm">
                {place.opening_hours.weekday_text.map((day: string, index: number) => (
                  <li key={index} className="text-gray-600">{day}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Horários não disponíveis</p>
            )}
          </div>
          
          {/* Resumo */}
          <div>
            <h3 className="font-medium flex items-center mb-2">
              <MessageSquare className="h-5 w-5 mr-2 text-gray-500" />
              Resumo Editorial
            </h3>
            
            {place.editorial_summary ? (
              <p className="text-gray-600">{place.editorial_summary}</p>
            ) : (
              <p className="text-gray-500">Resumo não disponível</p>
            )}
          </div>
        </div>
        
        {/* Reviews */}
        {place.reviews && place.reviews.length > 0 && (
          <>
            <Separator />
            
            <div>
              <h3 className="font-medium flex items-center mb-3">
                <MessageSquare className="h-5 w-5 mr-2 text-gray-500" />
                Avaliações Recentes
              </h3>
              
              <div className="space-y-4">
                {place.reviews.slice(0, 3).map((review: any, index: number) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">{review.author_name}</div>
                      {renderRating(review.rating)}
                    </div>
                    <p className="text-sm text-gray-600">{review.text}</p>
                    <div className="text-xs text-gray-400 mt-2">
                      {new Date(review.time * 1000).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                
                {place.reviews.length > 3 && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        Ver todas as {place.reviews.length} avaliações
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Todas as Avaliações</DialogTitle>
                        <DialogDescription>
                          {place.reviews.length} avaliações para {place.name}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 mt-4">
                        {place.reviews.map((review: any, index: number) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <div className="font-medium">{review.author_name}</div>
                              {renderRating(review.rating)}
                            </div>
                            <p className="text-sm text-gray-600">{review.text}</p>
                            <div className="text-xs text-gray-400 mt-2">
                              {new Date(review.time * 1000).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end space-x-2">
        <Button 
          variant="outline" 
          onClick={() => refetch()}
          className="flex items-center"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {}}
              className="flex items-center"
            >
              Atualizar Detalhes via API
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atualizar detalhes do Google Places</DialogTitle>
              <DialogDescription>
                Isso fará uma nova requisição à API do Google Places para obter dados atualizados.
                Essa operação pode levar alguns segundos.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <p>Tem certeza que deseja atualizar os detalhes para:</p>
              <p className="font-semibold mt-1">{place.name || placeName || `Loja ID ${storeId}`}</p>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleUpdateDetails}
                disabled={updateDetailsMutation.isPending}
              >
                {updateDetailsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : 'Atualizar Detalhes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}