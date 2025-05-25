
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { StripeCheckoutButton } from './stripe-checkout-button';

interface SubscriptionManagerProps {
  userId: number;
  onSubscriptionChange?: (data: any) => void;
}

export function SubscriptionManager({
  userId,
  onSubscriptionChange
}: SubscriptionManagerProps) {
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubscription();
  }, [userId]);

  const fetchSubscription = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/subscriptions/details');
      if (!response.ok) {
        throw new Error('Erro ao carregar assinatura');
      }
      
      const data = await response.json();
      setSubscription(data);
      
      if (onSubscriptionChange) {
        onSubscriptionChange(data);
      }
    } catch (error) {
      console.error('Erro ao carregar assinatura:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os detalhes da assinatura',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Erro ao cancelar assinatura');
      }
      
      const data = await response.json();
      setSubscription(prev => ({
        ...prev,
        status: 'canceled',
        cancel_at_period_end: true
      }));
      
      toast({
        title: 'Assinatura cancelada',
        description: 'Sua assinatura será encerrada ao final do período atual',
      });
      
      if (onSubscriptionChange) {
        onSubscriptionChange(data);
      }
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível cancelar a assinatura',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando informações da assinatura...</p>
        </CardContent>
      </Card>
    );
  }

  // Sem assinatura ativa
  if (!subscription || subscription.status === 'canceled') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhuma assinatura ativa</CardTitle>
          <CardDescription>
            Escolha um plano para acessar recursos premium
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              <span>Você está utilizando o plano gratuito com recursos limitados</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <StripeCheckoutButton
            planId="start"
            interval="monthly"
            userId={userId}
            onSuccess={fetchSubscription}
            variant="default"
          >
            Assinar plano Start
          </StripeCheckoutButton>
          
          <StripeCheckoutButton
            planId="pro"
            interval="monthly"
            userId={userId}
            onSuccess={fetchSubscription}
            variant="outline"
          >
            Assinar plano Pro
          </StripeCheckoutButton>
        </CardFooter>
      </Card>
    );
  }

  // Assinatura ativa
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Sua assinatura
          {subscription.cancel_at_period_end && " (Cancelamento agendado)"}
        </CardTitle>
        <CardDescription>
          Gerenciar assinatura e pagamentos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Status:</span>
            <span className={`px-2 py-1 rounded-full text-sm font-medium ${
              subscription.status === 'active'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {subscription.status === 'active' ? 'Ativa' : subscription.status}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">Plano:</span>
            <span>{getPlanName(subscription.items.data[0]?.price.product)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">Valor:</span>
            <span>
              {formatCurrency(subscription.items.data[0]?.price.unit_amount / 100)}
              {subscription.items.data[0]?.price.recurring.interval === 'month' ? '/mês' : '/ano'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">Próxima cobrança:</span>
            <span>{formatDate(subscription.current_period_end * 1000)}</span>
          </div>
          
          {subscription.cancel_at_period_end && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                <span className="text-yellow-800">
                  Sua assinatura será cancelada em {formatDate(subscription.current_period_end * 1000)}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {!subscription.cancel_at_period_end && (
          <Button 
            variant="destructive" 
            onClick={handleCancelSubscription}
            disabled={isCancelling}
          >
            {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cancelar assinatura
          </Button>
        )}
        
        <Button 
          variant="outline" 
          onClick={() => window.open('https://billing.stripe.com/p/login/test', '_blank')}
        >
          Gerenciar faturas
        </Button>
      </CardFooter>
    </Card>
  );
}

// Função auxiliar para formatar valor monetário
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Função auxiliar para formatar data
function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(timestamp));
}

// Função auxiliar para obter nome do plano
function getPlanName(productId: string): string {
  // Esta função deve ser implementada conforme seus produtos no Stripe
  const productMap = {
    'prod_TEST_START': 'Start',
    'prod_TEST_PRO': 'Pro',
    'prod_TEST_PREMIUM': 'Premium',
    'prod_LIVE_START': 'Start',
    'prod_LIVE_PRO': 'Pro',
    'prod_LIVE_PREMIUM': 'Premium',
  };
  
  return productMap[productId] || 'Plano Personalizado';
}
