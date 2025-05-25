
import { useState } from 'react';
import { Button, ButtonProps } from './button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StripeCheckoutButtonProps extends ButtonProps {
  planId: string;
  interval?: 'monthly' | 'yearly';
  userId?: number;
  redirectUrl?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export function StripeCheckoutButton({
  planId,
  interval = 'monthly',
  userId,
  redirectUrl,
  onSuccess,
  onError,
  children,
  ...props
}: StripeCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCheckout = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          interval,
          userId,
          redirectUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar checkout');
      }

      const data = await response.json();

      // Log do modo (teste/produção)
      if (data.mode === 'test') {
        console.log('🧪 MODO TESTE ATIVO - Nenhum pagamento real será processado');
      }

      if (onSuccess) {
        onSuccess(data);
      }

      // Se precisar redirecionar para o Stripe
      if (data.needsRedirect && data.url) {
        window.location.href = data.url;
      } else if (data.success) {
        // Caso de plano gratuito ou outro caso sem redirecionamento
        toast({
          title: 'Sucesso!',
          description: data.message || 'Plano ativado com sucesso',
        });
      }
    } catch (error) {
      console.error('Erro no checkout:', error);
      
      if (onError) {
        onError(error);
      }
      
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao processar pagamento',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleCheckout} 
      disabled={isLoading} 
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processando...
        </>
      ) : (
        children || 'Assinar'
      )}
    </Button>
  );
}
