import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle, Map } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';

/**
 * Painel para administradores executarem geocodificação em massa de lojas
 */
export default function GeocodingPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const handleGeocodeAll = async () => {
    try {
      setIsLoading(true);
      setResults(null);
      
      toast({
        title: "Processando geocodificação",
        description: "Iniciando geocodificação de todas as lojas sem coordenadas...",
      });
      
      const response = await apiRequest('POST', '/api/admin/geocode-all-stores');
      const data = await response.json();
      
      setResults(data);
      
      toast({
        title: "Geocodificação concluída",
        description: `${data.success} lojas geocodificadas com sucesso de um total de ${data.total}.`,
        variant: "default",
      });
    } catch (error) {
      console.error('Erro ao geocodificar lojas:', error);
      toast({
        title: "Erro na geocodificação",
        description: "Não foi possível completar o processo. Verifique os logs para mais detalhes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5" />
          Geocodificação de Lojas
        </CardTitle>
        <CardDescription>
          Processa automaticamente todas as lojas sem coordenadas geográficas, adicionando latitude e longitude com base nos endereços.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Geocodificando lojas...</p>
          </div>
        ) : results ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold">{results.total}</div>
                <div className="text-sm text-muted-foreground">Total de lojas</div>
              </div>
              <div className="rounded-lg border p-3 text-center bg-green-50">
                <div className="text-2xl font-bold text-green-600">{results.success}</div>
                <div className="text-sm text-muted-foreground">Geocodificadas</div>
              </div>
              <div className="rounded-lg border p-3 text-center bg-red-50">
                <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                <div className="text-sm text-muted-foreground">Falhas</div>
              </div>
            </div>
            
            {results.details && results.details.length > 0 && (
              <div className="mt-4 border rounded-lg">
                <div className="py-2 px-4 font-medium border-b bg-muted/50">
                  Detalhes do processamento
                </div>
                <div className="p-0 max-h-60 overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white border-b">
                      <tr>
                        <th className="p-2 text-left text-sm">ID</th>
                        <th className="p-2 text-left text-sm">Status</th>
                        <th className="p-2 text-left text-sm">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.details.map((detail: any, index: number) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-muted/20' : ''}>
                          <td className="p-2 text-sm">{detail.id}</td>
                          <td className="p-2">
                            {detail.status === 'success' ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Sucesso
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Falha
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-sm">
                            {detail.status === 'success' 
                              ? `Coordenadas: ${detail.data?.location?.latitude.toFixed(6)}, ${detail.data?.location?.longitude.toFixed(6)}`
                              : detail.reason
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 space-y-3 text-center">
            <Map className="h-16 w-16 text-muted-foreground/50" />
            <div>
              <p className="font-medium">Geocodificação em massa</p>
              <p className="text-sm text-muted-foreground">
                Usado para processar todas as lojas que têm endereço mas não possuem coordenadas geográficas.
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleGeocodeAll} 
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Processando...' : 'Iniciar geocodificação em massa'}
        </Button>
      </CardFooter>
    </Card>
  );
}