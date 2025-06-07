import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { useLocation, Link, useParams } from 'wouter';
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
  const { isAuthenticated, isSeller, user, refreshStores } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Obter storeId dos parâmetros da URL
  const params = useParams();
  const storeIdFromUrl = params.storeId ? parseInt(params.storeId as string) : null;

  console.log('[PaginaAssinaturaLoja] storeId obtido da URL:', storeIdFromUrl);
  console.log('[PaginaAssinaturaLoja] Parâmetros da URL completos:', params);
  console.log('[PaginaAssinaturaLoja] URL atual:', window.location.href);

  // If not authenticated or not a seller, redirect
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (!isSeller) {
      navigate('/account');
    }
  }, [isAuthenticated, isSeller, navigate]);

  // Verificar se storeId está presente na URL
  useEffect(() => {
    if (!storeIdFromUrl) {
      console.log('[PaginaAssinaturaLoja] ❌ storeId não encontrado na URL, redirecionando para lista de lojas');
      toast({
        title: 'Loja não especificada',
        description: 'Por favor, selecione uma loja para gerenciar assinatura.',
        variant: 'destructive',
      });
      navigate('/seller/stores');
      return;
    }

    // Verificar se o usuário tem acesso a esta loja
    if (user?.stores && user.stores.length > 0) {
      const userOwnsStore = user.stores.some(store => store.id === storeIdFromUrl);
      if (!userOwnsStore) {
        console.log('[PaginaAssinaturaLoja] ❌ Usuário não possui acesso à loja ID:', storeIdFromUrl);
        toast({
          title: 'Acesso negado',
          description: 'Você não tem permissão para gerenciar esta loja.',
          variant: 'destructive',
        });
        navigate('/seller/stores');
        return;
      }
    }
  }, [storeIdFromUrl, user, navigate, toast]);

  if (!isAuthenticated || !isSeller || !storeIdFromUrl) {
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

  // Fetch current subscription for this specific store
  const { data: subscription, isLoading: isSubscriptionLoading, refetch: refetchSubscription } = useQuery({
    queryKey: ['/api/subscriptions/my-plan', storeIdFromUrl],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/subscriptions/my-plan?storeId=${storeIdFromUrl}`);
        if (!response.ok) {
          throw new Error('Failed to fetch current subscription');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching current subscription:', error);
        return null;
      }
    },
    enabled: !!storeIdFromUrl
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
        interval: billingCycle,
        storeId: storeIdFromUrl
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/my-plan', storeIdFromUrl] });
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

      if (!storeIdFromUrl) {
        throw new Error('ID da loja não encontrado na URL');
      }

      console.log('[handlePurchase] Usando storeId da URL para API:', storeIdFromUrl);

      // Preparar payload usando o storeId da URL
      const payload = {
        planId: selectedPlan,
        interval: billingCycle,
        storeId: storeIdFromUrl,
      };

      console.log('[handlePurchase] Payload final para /api/stripe/checkout:', payload);

      try {
        // Fazer requisição direta usando fetch para ter controle total
        const response = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        console.log('[handlePurchase] 📡 Status da resposta:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[handlePurchase] ❌ Erro HTTP:', response.status, errorText);
          throw new Error(`Erro ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('[handlePurchase] ✅ Resposta completa do checkout:', result);

        if (result.mode === 'test') {
          console.log('[handlePurchase] 🧪 MODO TESTE ATIVO - Nenhum pagamento real será processado');
        }

        return result;
      } catch (error) {
        console.error('[handlePurchase] ❌ Erro na requisição:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('[stripeCheckout] ✅ Resposta recebida:', JSON.stringify(data, null, 2));

      // Verificar estrutura da resposta
      if (!data || typeof data !== 'object') {
        console.error('[stripeCheckout] ❌ Resposta inválida - não é um objeto:', data);
        toast({
          title: 'Erro',
          description: 'Resposta inválida do servidor. Tente novamente.',
          variant: 'destructive',
        });
        return;
      }

      // Log do modo para usuário (apenas em desenvolvimento)
      if (data.mode === 'test') {
        console.log('🧪 MODO TESTE ATIVO - Nenhum pagamento real será processado');
      }

      // Verificar se temos uma URL de checkout para redirecionamento
      if (data.success && data.url) {
        console.log('[stripeCheckout] 🚀 Redirecionando para checkout URL:', data.url);

        // Validar se a URL é válida
        try {
          new URL(data.url);
          console.log('[stripeCheckout] ✅ URL válida, iniciando redirecionamento...');
          // Redirecionar o usuário para a página de checkout do Stripe
          window.location.href = data.url;
          return;
        } catch (urlError) {
          console.error('[stripeCheckout] ❌ URL inválida:', data.url, urlError);
          toast({
            title: 'Erro',
            description: 'URL de checkout inválida. Contate o suporte.',
            variant: 'destructive',
          });
          return;
        }
      }

      // Se não temos URL mas temos success, mostrar mensagem de sucesso
      if (data.success && !data.url) {
        console.log('[stripeCheckout] ✅ Operação bem-sucedida sem redirecionamento');
        toast({
          title: 'Sucesso!',
          description: data.message || 'Plano ativado com sucesso',
          variant: 'default',
        });
        // Invalidar queries para atualizar dados
        queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/my-plan', storeIdFromUrl] });
        return;
      }

      // Se chegou até aqui, algo deu errado
      console.error('[stripeCheckout] ❌ Resposta inesperada ou sem URL:', data);
      toast({
        title: 'Erro',
        description: data.error || 'Falha ao iniciar checkout. Tente novamente.',
        variant: 'destructive',
      });
    },
    onError: (error) => {
      console.error('❌ Erro de checkout:', error);

      let errorMessage = 'Erro ao iniciar checkout';

      if (error.message?.includes('failed to fetch')) {
        errorMessage = 'Erro de conexão. Verifique sua internet.';
      } else if (error.message?.includes('Invalid plan')) {
        errorMessage = 'Plano selecionado inválido.';
      } else if (error.message?.includes('No such price')) {
        errorMessage = 'Erro de configuração do plano. Contate o suporte.';
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
    console.log('[handlePurchase] 🎯 handlePurchase chamado para loja ID:', storeIdFromUrl);
    console.log('[handlePurchase] 📋 selectedPlan:', selectedPlan);
    console.log('[handlePurchase] 📋 subscription atual:', subscription);
    console.log('[handlePurchase] 📋 billingCycle:', billingCycle);

    if (selectedPlan === subscription?.plan?.id) {
      console.log('[handlePurchase] ⚠️ Tentativa de comprar plano atual - ação bloqueada');
      toast({
        title: 'Plano atual',
        description: 'Você já está inscrito neste plano.',
        variant: "default",
      });
      return;
    }

    if (!selectedPlan) {
      console.log('[handlePurchase] ❌ Nenhum plano selecionado - ação bloqueada');
      toast({
        title: 'Selecione um plano',
        description: 'Por favor, selecione um plano para continuar.',
        variant: "destructive",
      });
      return;
    }

    if (!storeIdFromUrl) {
      console.log('[handlePurchase] ❌ storeId não encontrado na URL - ação bloqueada');
      toast({
        title: 'Erro',
        description: 'ID da loja não encontrado. Tente novamente.',
        variant: "destructive",
      });
      return;
    }

    console.log('[handlePurchase] ✅ Iniciando processo de compra via Stripe para loja:', storeIdFromUrl);
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

  // Obter informações da loja atual
  const currentStore = user?.stores?.find(store => store.id === storeIdFromUrl);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const sessionId = urlParams.get('session_id');

    if (success === 'true' && sessionId) {
      console.log('✅ Retorno do Stripe detectado - Checkout realizado com sucesso!', { 
        sessionId,
        storeId: storeIdFromUrl,
        url: window.location.href 
      });

      toast({
        title: "Pagamento realizado com sucesso!",
        description: "Sua assinatura foi ativada. Atualizando informações...",
      });

      // Aguardar um pouco para o webhook processar
      setTimeout(() => {
        console.log('🔄 Recarregando dados após retorno do Stripe...');
        refetchSubscription();

        // Também recarregar as lojas no contexto
        if (refreshStores) {
          refreshStores();
        }
      }, 2000);

      // Limpar URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [storeIdFromUrl, refetchSubscription, refreshStores]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <nav className="flex items-center space-x-2 text-gray-600 mb-4">
          <Link href="/seller/stores" className="hover:text-gray-800">
            Minhas Lojas
          </Link>
          <span>/</span>
          <span className="text-gray-800 font-medium">
            {currentStore?.name || `Loja #${storeIdFromUrl}`}
          </span>
          <span>/</span>
          <span className="text-gray-800">Assinatura</span>
        </nav>

        <h1 className="text-2xl font-bold mb-2">
          Planos de Assinatura - {currentStore?.name || `Loja #${storeIdFromUrl}`}
        </h1>
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
                      Loja: <span className="font-medium">{currentStore?.name || `Loja #${storeIdFromUrl}`}</span>
                    </p>
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
                  onClick={() => navigate('/seller/stores')}
                >
                  Voltar
                </Button>
                <Button 
                  className="bg-primary text-white hover:bg-primary/90"
                  onClick={handlePurchase}
                  disabled={!selectedPlan || selectedPlan === subscription?.plan?.id || stripeCheckoutMutation.isPending}
                >
                  {stripeCheckoutMutation.isPending 
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