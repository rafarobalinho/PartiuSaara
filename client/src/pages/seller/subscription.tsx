import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: string[];
  limits: {
    products: number;
    promotions: number;
    flashPromotions: number;
    coupons: number;
  };
}

interface Subscription {
  plan: SubscriptionPlan;
  endDate: string;
  store: {
    id: number;
    name: string;
  };
}

export default function SellerSubscription() {
  const { isAuthenticated, isSeller } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // If not authenticated or not a seller, redirect
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (!isSeller) {
      navigate('/account');
    }
  }, [isAuthenticated, isSeller, navigate]);

  if (!isAuthenticated || !isSeller) {
    return null;
  }

  // Fetch subscription plans
  const { data: plans = [], isLoading: isPlansLoading } = useQuery({
    queryKey: ['/api/subscriptions/plans'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/subscriptions/plans');
        if (!response.ok) {
          throw new Error('Failed to fetch subscription plans');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching subscription plans:', error);
        return [];
      }
    }
  });

  // Fetch current subscription
  const { data: subscription, isLoading: isSubscriptionLoading } = useQuery({
    queryKey: ['/api/subscriptions/my-plan'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/subscriptions/my-plan');
        if (!response.ok) {
          throw new Error('Failed to fetch current subscription');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching current subscription:', error);
        return null;
      }
    }
  });

  useEffect(() => {
    if (subscription?.plan) {
      setSelectedPlan(subscription.plan.id);
    }
  }, [subscription]);

  // Purchase subscription mutation
  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlan) return null;

      return apiRequest('POST', '/api/subscriptions/purchase', {
        planId: selectedPlan,
        interval: billingCycle
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/my-plan'] });
      toast({
        title: 'Assinatura atualizada',
        description: 'Sua assinatura foi atualizada com sucesso!',
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao atualizar sua assinatura. Tente novamente.',
        variant: "destructive",
      });
      console.error('Error purchasing subscription:', error);
    }
  });

    const stripeCheckoutMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlan) {
        throw new Error('Nenhum plano selecionado');
      }

      console.log('🚀 Iniciando checkout para:', selectedPlan);

      // Chamar o endpoint da sua API para iniciar o checkout do Stripe
      const response = await apiRequest('POST', '/api/stripe/checkout', {
        planId: selectedPlan,
        interval: billingCycle,
      });

      console.log('✅ Checkout data:', response);
      if (response.mode === 'test') {
        console.log('🧪 MODO TESTE ATIVO - Nenhum pagamento real será processado');
      }

      return response; // Retorna toda a resposta, não apenas a URL
    },
    onSuccess: (data) => {

// Função de checkout com logging seguro
const initiateCheckout = async (planId: string, interval: string) => {
  setLoading(true);
  try {
    logger.info("Iniciando checkout", { planId, interval });
    
    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ planId, interval }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      logger.error("❌ Erro de checkout", error);
      toast({
        title: "Erro ao processar pagamento",
        description: "Por favor, tente novamente mais tarde.",
        variant: "destructive",
      });
      return;
    }
    
    const data = await response.json();
    logger.success("Checkout bem-sucedido, redirecionando");
    
    // Redirecionar para a URL do Stripe
    if (data.url) {
      window.location.href = data.url;
    }
  } catch (error) {
    logger.error("Erro na requisição para", "/api/stripe/checkout", error);
    toast({
      title: "Falha ao conectar ao servidor",
      description: "Verifique sua conexão e tente novamente.",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};

      // Log do modo para usuário (apenas em desenvolvimento)
      if (data.mode === 'test') {
        console.log('🧪 MODO TESTE ATIVO - Nenhum pagamento real será processado');
      }
      
      if (data.url) {
        // Redirecionar o usuário para a página de checkout do Stripe
        window.location.href = data.url;
      } else if (data.success) {
        toast({
          title: 'Sucesso!',
          description: data.message || 'Plano ativado com sucesso',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Erro',
          description: 'Ocorreu um erro ao iniciar o checkout. Tente novamente.',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('❌ Erro de checkout:', error);
      
      let errorMessage = 'Erro ao iniciar checkout';
      
      if (error.message?.includes('failed to fetch')) {
        errorMessage = 'Erro de conexão. Verifique sua internet.';
      } else if (error.message?.includes('Invalid plan')) {
        errorMessage = 'Plano selecionado inválido.';
      } else {
        errorMessage = error.message || 'Erro desconhecido';
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });


  const handlePurchase = () => {
    if (selectedPlan === subscription?.plan?.id) {
      toast({
        title: 'Plano atual',
        description: 'Você já está inscrito neste plano.',
        variant: "default",
      });
      return;
    }

    if (!selectedPlan) {
      toast({
        title: 'Selecione um plano',
        description: 'Por favor, selecione um plano para continuar.',
        variant: "destructive",
      });
      return;
    }

    //purchaseMutation.mutate();
    stripeCheckoutMutation.mutate();
  };

  // Calculate annual savings
  const calculateSavings = (plan: SubscriptionPlan) => {
    const monthlyTotal = plan.price.monthly * 12;
    const yearlyCost = plan.price.yearly;
    return monthlyTotal - yearlyCost;
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Planos de Assinatura</h1>
        <p className="text-gray-600">Escolha o plano ideal para sua loja</p>
      </div>

      {(isPlansLoading || isSubscriptionLoading) ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-lg shadow-sm p-2 inline-flex items-center">
              <span className={`px-4 py-2 rounded-md ${billingCycle === 'monthly' ? 'bg-primary text-white' : ''}`}>
                Mensal
              </span>
              <Switch
                checked={billingCycle === 'yearly'}
                onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
                className="mx-2"
              />
              <div className="px-4 py-2 rounded-md flex items-center space-x-2">
                <span className={billingCycle === 'yearly' ? 'bg-primary text-white px-2 py-1 rounded-md' : ''}>
                  Anual
                </span>
                {billingCycle === 'yearly' && (
                  <span className="bg-green-100 text-green-800 px-2 py-0.5 text-xs rounded-full">
                    Economize até 20%
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {plans.map((plan) => {
              const isCurrentPlan = subscription?.plan?.id === plan.id;
              const isPremiumPlan = plan.id === 'premium';
              const isFreePlan = plan.id === 'freemium';

              return (
                <Card 
                  key={plan.id} 
                  className={`relative overflow-hidden ${
                    selectedPlan === plan.id 
                      ? 'ring-2 ring-primary' 
                      : ''
                  } ${
                    isPremiumPlan 
                      ? 'border-primary shadow-lg' 
                      : ''
                  }`}
                >
                  {isPremiumPlan && (
                    <div className="absolute top-0 right-0">
                      <div className="bg-primary text-white text-xs px-4 py-1 transform rotate-45 translate-x-6 translate-y-3">
                        Popular
                      </div>
                    </div>
                  )}

                  <CardHeader>
                    <CardTitle className={isPremiumPlan ? 'text-primary' : ''}>
                      {plan.name}
                    </CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold">
                          {formatCurrency(plan.price[billingCycle] === 0 ? 0 : plan.price[billingCycle] / (billingCycle === 'yearly' ? 12 : 1))}
                        </span>
                        <span className="text-gray-500 ml-1">
                          {isFreePlan ? '' : `/${billingCycle === 'yearly' ? 'mês' : 'mês'}`}
                        </span>
                      </div>
                      {billingCycle === 'yearly' && !isFreePlan && (
                        <div className="text-sm text-gray-500">
                          {formatCurrency(plan.price.yearly)} por ano
                          <span className="text-green-600 ml-1">
                            (economia de {formatCurrency(calculateSavings(plan))})
                          </span>
                        </div>
                      )}
                    </div>

                    <RadioGroup value={selectedPlan || ''} onValueChange={setSelectedPlan}>
                      <div className="flex items-center space-x-2 mb-6">
                        <RadioGroupItem value={plan.id} id={`plan-${plan.id}`} />
                        <Label htmlFor={`plan-${plan.id}`} className="font-medium">
                          {isCurrentPlan ? 'Plano atual' : 'Selecionar plano'}
                        </Label>
                      </div>
                    </RadioGroup>

                    <div className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-baseline">
                          <i className="fas fa-check text-green-500 mr-2 text-sm"></i>
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className={`w-full ${isPremiumPlan ? 'bg-primary text-white hover:bg-primary/90' : ''}`}
                      variant={isPremiumPlan ? 'default' : 'outline'}
                      onClick={() => setSelectedPlan(plan.id)}
                    >
                      {isCurrentPlan ? 'Plano Atual' : 'Escolher Plano'}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div className="mb-4 md:mb-0">
                <h3 className="text-lg font-bold mb-2">Resumo da Assinatura</h3>
                {selectedPlan && (
                  <div className="space-y-1">
                    <p className="text-gray-600">
                      Plano selecionado: <span className="font-medium">{plans.find(p => p.id === selectedPlan)?.name}</span>
                    </p>
                    <p className="text-gray-600">
                      Ciclo de cobrança: <span className="font-medium">{billingCycle === 'monthly' ? 'Mensal' : 'Anual'}</span>
                    </p>
                    <p className="text-gray-600">
                      Valor: <span className="font-medium">
                        {formatCurrency(plans.find(p => p.id === selectedPlan)?.price[billingCycle] || 0)}
                        {billingCycle === 'monthly' ? '/mês' : '/ano'}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => navigate('/seller/dashboard')}
                >
                  Voltar
                </Button>
                <Button 
                  className="bg-primary text-white hover:bg-primary/90"
                  onClick={handlePurchase}
                  disabled={!selectedPlan || selectedPlan === subscription?.plan?.id || purchaseMutation.isPending}
                >
                  {purchaseMutation.isPending 
                    ? 'Processando...' 
                    : selectedPlan === subscription?.plan?.id 
                      ? 'Plano Atual' 
                      : 'Atualizar Assinatura'}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Perguntas Frequentes</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Como funciona a cobrança?</h4>
                <p className="text-gray-600 text-sm">
                  A cobrança é feita automaticamente a cada período, de acordo com o ciclo de cobrança escolhido (mensal ou anual).
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Posso mudar de plano a qualquer momento?</h4>
                <p className="text-gray-600 text-sm">
                  Sim, você pode fazer upgrade do seu plano a qualquer momento. O valor será calculado proporcionalmente ao tempo restante.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Como cancelar minha assinatura?</h4>
                <p className="text-gray-600 text-sm">
                  Você pode cancelar sua assinatura a qualquer momento através do painel de controle. Ao cancelar, você voltará para o plano Freemium.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}