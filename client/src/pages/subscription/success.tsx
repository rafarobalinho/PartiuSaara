import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SubscriptionSuccessPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Opcional: Invalidar cache de dados da loja após sucesso
    // queryClient.invalidateQueries({ queryKey: ['/api/stores/user'] });
  }, []);

  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-md mx-auto text-center">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-green-800">
              Assinatura Ativada!
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-green-700">
              Parabéns! Sua assinatura foi processada com sucesso e já está ativa.
            </p>
            
            <p className="text-sm text-gray-600">
              Agora você tem acesso a todos os recursos do seu novo plano.
            </p>
            
            <div className="space-y-2 pt-4">
              <Button 
                onClick={() => setLocation('/seller/dashboard')}
                className="w-full"
              >
                Ir para Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setLocation('/subscription/manage')}
                className="w-full"
              >
                Gerenciar Assinatura
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}