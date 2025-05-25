import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface Plan {
  name: string;
  price?: number;
  features: string[];
  priceId?: string;
}

interface PlansResponse {
  freemium: Plan;
  start: Plan;
  pro: Plan;
  premium: Plan;
}

export default function SubscriptionPlansPage() {
  const { toast } = useToast();
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);

  // Buscar planos disponíveis
  const { data: plans, isLoading: plansLoading } = useQuery<PlansResponse>({
    queryKey: ['/api/stripe/plans'],
  });

  // Buscar lojas do usuário
  const { data: stores = [], isLoading: storesLoading } = useQuery({
    queryKey: ['/api/stores/user'],
  });

  // Mutation para criar sessão de checkout
  const createCheckoutMutation = useMutation({
    mutationFn: async ({ plan, storeId }: { plan: string; storeId: number }) => {
      const response = await apiRequest('POST', '/api/stripe/create-checkout-session', {
        plan,
        storeId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Redirecionar para o checkout do Stripe
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar checkout",
        description: error.message || "Erro inesperado",
        variant: "destructive",
      });
    },
  });

  const handleSelectPlan = (planKey: string) => {
    if (!selectedStoreId) {
      toast({
        title: "Selecione uma loja",
        description: "Por favor, selecione qual loja deseja fazer upgrade",
        variant: "destructive",
      });
      return;
    }

    if (planKey === 'freemium') {
      toast({
        title: "Plano gratuito",
        description: "Você já possui acesso ao plano gratuito",
      });
      return;
    }

    createCheckoutMutation.mutate({ plan: planKey, storeId: selectedStoreId });
  };

  const getPlanPrice = (plan: Plan) => {
    if (plan.price === 0 || plan.price === undefined) {
      return 'Gratuito';
    }
    return `R$ ${plan.price}/mês`;
  };

  const getPlanColor = (planKey: string) => {
    switch (planKey) {
      case 'freemium':
        return 'bg-gray-50 border-gray-200';
      case 'start':
        return 'bg-blue-50 border-blue-200';
      case 'pro':
        return 'bg-purple-50 border-purple-200';
      case 'premium':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (plansLoading || storesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Planos de Assinatura
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Escolha o plano ideal para sua loja e desbloqueie recursos avançados
        </p>
      </div>

      {/* Seletor de loja */}
      {stores.length > 0 && (
        <div className="mb-8 max-w-md mx-auto">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecione a loja para upgrade:
          </label>
          <select
            value={selectedStoreId || ''}
            onChange={(e) => setSelectedStoreId(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">Selecione uma loja...</option>
            {stores.map((store: any) => (
              <option key={store.id} value={store.id}>
                {store.name} - Plano atual: {store.subscriptionPlan || 'freemium'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Grid de planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {plans && Object.entries(plans).map(([planKey, plan]) => (
          <Card key={planKey} className={`${getPlanColor(planKey)} transition-all hover:shadow-lg`}>
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-bold capitalize">
                {plan.name}
              </CardTitle>
              <CardDescription className="text-2xl font-bold text-gray-900">
                {getPlanPrice(plan)}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            
            <CardFooter>
              <Button
                onClick={() => handleSelectPlan(planKey)}
                disabled={createCheckoutMutation.isPending || planKey === 'freemium'}
                className="w-full"
                variant={planKey === 'premium' ? 'default' : 'outline'}
              >
                {createCheckoutMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {planKey === 'freemium' ? 'Plano Atual' : 'Escolher Plano'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {stores.length === 0 && (
        <div className="text-center mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            Você precisa ter pelo menos uma loja cadastrada para fazer upgrade de plano.
          </p>
        </div>
      )}
    </div>
  );
}