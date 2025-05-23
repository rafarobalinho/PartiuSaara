
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";

export default function StripeConfigPage() {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/stripe/config');
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setConfig(data);
    } catch (err) {
      setError(err.message || 'Erro ao carregar configuração');
      console.error('Erro ao carregar configuração:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/stripe/test');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro ${response.status}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      setTestResult(data);
    },
    onError: (error) => {
      setTestResult({ success: false, error: error.message });
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando configuração...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Erro ao carregar configuração</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={fetchConfig}>Tentar novamente</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Configuração do Stripe</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status atual</CardTitle>
            <CardDescription>Configuração do ambiente de pagamentos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Modo:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                config.mode === 'test' 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {config.mode === 'test' ? 'TESTE' : 'PRODUÇÃO'}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Chaves de teste:</span>
                {config.hasTestKeys ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span>Chaves de produção:</span>
                {config.hasLiveKeys ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span>URL da aplicação:</span>
                <span className="text-sm text-gray-600">{config.appUrl || 'Não definido'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Ambiente Node:</span>
                <span className="text-sm text-gray-600">{config.nodeEnv || 'Não definido'}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button onClick={fetchConfig} variant="outline">Atualizar</Button>
            <Button 
              onClick={() => testConnectionMutation.mutate()}
              disabled={testConnectionMutation.isPending}
            >
              {testConnectionMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Testar conexão
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Resultado do teste</CardTitle>
            <CardDescription>
              Verifique se a conexão com o Stripe está funcionando corretamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!testResult && !testConnectionMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-6 text-center text-gray-500">
                <AlertTriangle className="h-12 w-12 mb-4 text-gray-400" />
                <p>Nenhum teste realizado ainda.</p>
                <p className="text-sm">Clique em "Testar conexão" para verificar a integração com o Stripe.</p>
              </div>
            )}
            
            {testConnectionMutation.isPending && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Testando conexão...</span>
              </div>
            )}
            
            {testResult && (
              <div className="space-y-4">
                <div className="flex items-center">
                  {testResult.success ? (
                    <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-500 mr-2" />
                  )}
                  <span className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                    {testResult.message || (testResult.success ? 'Conexão bem-sucedida!' : 'Falha na conexão')}
                  </span>
                </div>
                
                {testResult.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                    {testResult.error}
                  </div>
                )}
                
                {testResult.products && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2">Produtos ({testResult.products.length})</h3>
                      <div className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-sm">
                        {testResult.products.map(product => (
                          <div key={product.id} className="mb-1">
                            {product.name} - {product.active ? 'Ativo' : 'Inativo'}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                
                {testResult.prices && (
                  <>
                    <div>
                      <h3 className="font-semibold mb-2">Preços ({testResult.prices.length})</h3>
                      <div className="max-h-48 overflow-y-auto bg-gray-50 p-2 rounded text-sm">
                        {testResult.prices.map(price => (
                          <div key={price.id} className="mb-1">
                            ID: {price.id.substring(0, 10)}... - 
                            {price.unit_amount ? 
                              ` ${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}` : 
                              ' Custom'
                            }
                            {price.recurring ? 
                              ` (${price.recurring.interval})` : 
                              ' (one-time)'
                            }
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
