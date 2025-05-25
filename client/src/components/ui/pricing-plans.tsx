
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Switch } from './switch';
import { Label } from './label';
import { Check } from 'lucide-react';
import { StripeMode } from './stripe-mode';
import { StripeCheckoutButton } from './stripe-checkout-button';

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  highlighted?: boolean;
}

interface PricingPlansProps {
  userId?: number;
  currentPlanId?: string;
}

export function PricingPlans({ userId, currentPlanId }: PricingPlansProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans: PricingPlan[] = [
    {
      id: 'freemium',
      name: 'Freemium',
      description: 'Para quem está começando',
      priceMonthly: 0,
      priceYearly: 0,
      features: [
        'Até 10 produtos',
        'Exposição básica na plataforma',
        'Processamento de pedidos',
        'Painel de vendedor básico',
      ],
    },
    {
      id: 'start',
      name: 'Start',
      description: 'Para pequenos empreendedores',
      priceMonthly: 49.90,
      priceYearly: 479.00,
      features: [
        'Até 50 produtos',
        'Criação de até 5 cupons por mês',
        'Dashboard com relatórios básicos',
        'Exposição média na plataforma',
        'Processamento de pedidos',
        'Painel de vendedor completo',
      ],
      highlighted: true,
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'Para negócios em crescimento',
      priceMonthly: 99.90,
      priceYearly: 959.00,
      features: [
        'Produtos ilimitados',
        'Cupons ilimitados',
        'Promoções relâmpago',
        'Dashboard com análises avançadas',
        'Destaque nos resultados de busca',
        'Badge "Pro" na vitrine da loja',
        'Suporte prioritário',
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      description: 'Para empresas estabelecidas',
      priceMonthly: 199.90,
      priceYearly: 1919.00,
      features: [
        'Todos os recursos do Pro',
        'Destaque fixo na página inicial',
        'Badge "Premium" na vitrine',
        'Analytics completo com comparativos',
        'Notificações para todos usuários',
        'Gerente de conta dedicado',
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center space-y-4">
        <div className="flex items-center space-x-2">
          <StripeMode className="mb-4" />
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="billing-cycle"
            checked={billingCycle === 'yearly'}
            onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
          />
          <Label htmlFor="billing-cycle">
            Cobrança anual
            {billingCycle === 'yearly' && (
              <span className="ml-2 text-sm text-green-600 font-medium">
                (2 meses grátis)
              </span>
            )}
          </Label>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`flex flex-col ${
              plan.highlighted ? 'border-primary shadow-md' : ''
            }`}
          >
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="mb-4">
                <p className="text-3xl font-bold">
                  {formatCurrency(billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {billingCycle === 'monthly' ? 'por mês' : 'por ano'}
                </p>
              </div>
              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {plan.id === currentPlanId ? (
                <Button disabled className="w-full">
                  Plano atual
                </Button>
              ) : (
                <StripeCheckoutButton
                  planId={plan.id}
                  interval={billingCycle}
                  userId={userId}
                  className="w-full"
                  variant={plan.highlighted ? 'default' : 'outline'}
                >
                  {plan.id === 'freemium' ? 'Começar grátis' : 'Assinar agora'}
                </StripeCheckoutButton>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Função auxiliar para formatar valor monetário
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
