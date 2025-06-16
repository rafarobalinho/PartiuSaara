import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { 
  ShoppingBag, 
  Store, 
  TrendingUp, 
  Users, 
  BarChart3, 
  MapPin,
  CreditCard,
  Shield,
  Smartphone,
  Zap,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

export default function SellerLanding() {
  const plans = [
    {
      name: 'Freemium',
      price: 'Grátis',
      period: '',
      description: 'Perfeito para começar',
      features: [
        'Cadastro básico da loja',
        'Até 10 produtos',
        'Localização no mapa',
        'Suporte por email'
      ],
      buttonText: 'Começar Grátis',
      popular: false
    },
    {
      name: 'Start',
      price: 'R$ 29',
      period: '/mês',
      description: 'Para lojas em crescimento',
      features: [
        'Até 50 produtos',
        'Promoções básicas',
        'Analytics básico',
        'Chat com clientes',
        'Imagens ilimitadas'
      ],
      buttonText: 'Assinar Start',
      popular: true
    },
    {
      name: 'Pro',
      price: 'R$ 59',
      period: '/mês',
      description: 'Para lojas estabelecidas',
      features: [
        'Produtos ilimitados',
        'Promoções avançadas',
        'Analytics completo',
        'Destaque na busca',
        'Reservas de produtos',
        'Suporte prioritário'
      ],
      buttonText: 'Assinar Pro',
      popular: false
    },
    {
      name: 'Premium',
      price: 'R$ 99',
      period: '/mês',
      description: 'Para grandes operações',
      features: [
        'Múltiplas lojas',
        'API personalizada',
        'Relatórios avançados',
        'Gerente de conta',
        'Integração com sistemas',
        'Suporte 24/7'
      ],
      buttonText: 'Assinar Premium',
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header/Navigation */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-gray-900">
                Partiu <span className="text-primary">Saara</span>
              </span>
              <Badge variant="secondary" className="ml-2">Para Lojistas</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="ghost" className="text-gray-600">
                  Já tenho conta
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button className="bg-primary text-white hover:bg-primary/90">
                  Criar Conta
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary to-orange-500 text-white overflow-hidden">
        <div className="container mx-auto px-4 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                TRANSFORME SUA LOJA NA
                <br />
                <span className="text-orange-200">SAARA EM DIGITAL</span>
              </h1>
              <p className="text-xl text-orange-100 leading-relaxed">
                Conecte-se com milhares de clientes, aumente suas vendas e 
                modernize sua loja com a plataforma digital da Saara.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-4"
                >
                  Cadastrar Minha Loja
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-white text-white hover:bg-white hover:text-primary text-lg px-8 py-4"
                >
                  Ver Demonstração
                </Button>
              </div>
              <div className="flex items-center space-x-6 pt-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">500+</div>
                  <div className="text-orange-200">Lojas Conectadas</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">50K+</div>
                  <div className="text-orange-200">Clientes Ativos</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">95%</div>
                  <div className="text-orange-200">Satisfação</div>
                </div>
              </div>
            </div>
            
            {/* Hero Image */}
            <div className="relative">
              <div className="relative z-10 bg-white rounded-xl shadow-2xl p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Painel da Loja</h3>
                    <Badge className="bg-green-100 text-green-800">Online</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-primary">127</div>
                      <div className="text-sm text-gray-600">Vendas este mês</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-600">+23%</div>
                      <div className="text-sm text-gray-600">Crescimento</div>
                    </div>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <span className="text-primary font-medium">Vendas aumentaram 40% este mês!</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Por que escolher o Partiu Saara?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A plataforma completa para transformar sua loja física em um negócio digital de sucesso
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-8 text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Mais Clientes</h3>
              <p className="text-gray-600">
                Alcance milhares de pessoas que visitam a Saara e descobrem lojas pelo app
              </p>
            </Card>

            <Card className="p-8 text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Vendas Aumentadas</h3>
              <p className="text-gray-600">
                Lojas parceiras relatam aumento médio de 40% nas vendas após se cadastrarem
              </p>
            </Card>

            <Card className="p-8 text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Analytics Completo</h3>
              <p className="text-gray-600">
                Entenda seu negócio com relatórios detalhados de vendas e comportamento dos clientes
              </p>
            </Card>

            <Card className="p-8 text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Localização Inteligente</h3>
              <p className="text-gray-600">
                Clientes encontram sua loja facilmente com navegação GPS integrada
              </p>
            </Card>

            <Card className="p-8 text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Smartphone className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Fácil de Usar</h3>
              <p className="text-gray-600">
                Interface simples e intuitiva. Cadastre produtos e gerencie sua loja em minutos
              </p>
            </Card>

            <Card className="p-8 text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Seguro e Confiável</h3>
              <p className="text-gray-600">
                Seus dados e de seus clientes protegidos com a mais alta tecnologia de segurança
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Planos que se adaptam ao seu negócio
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comece grátis e evolua conforme sua loja cresce. Sem taxas ocultas, sem surpresas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative p-8 border-0 shadow-lg hover:shadow-xl transition-shadow ${plan.popular ? 'ring-2 ring-primary' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white">
                    Mais Popular
                  </Badge>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-primary">{plan.price}</span>
                    <span className="text-gray-600">{plan.period}</span>
                  </div>
                  <p className="text-gray-600">{plan.description}</p>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full ${plan.popular ? 'bg-primary text-white hover:bg-primary/90' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                  size="lg"
                >
                  {plan.buttonText}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Como funciona?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Em poucos passos sua loja estará online e vendendo mais
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Cadastre sua Loja</h3>
              <p className="text-gray-600">
                Informe os dados básicos da sua loja e confirme sua localização na Saara
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Adicione Produtos</h3>
              <p className="text-gray-600">
                Cadastre seus produtos com fotos, preços e descrições. É rápido e fácil
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Comece a Vender</h3>
              <p className="text-gray-600">
                Sua loja fica visível para milhares de pessoas. Acompanhe as vendas pelo painel
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-r from-primary to-orange-500 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Pronto para transformar sua loja?
          </h2>
          <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
            Junte-se a centenas de lojistas que já aumentaram suas vendas com o Partiu Saara
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-4"
              >
                Cadastrar Minha Loja Grátis
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg"
              className="border-white text-white hover:bg-white hover:text-primary text-lg px-8 py-4"
            >
              Falar com Consultor
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <ShoppingBag className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold">
                  Partiu <span className="text-primary">Saara</span>
                </span>
              </div>
              <p className="text-gray-400">
                A plataforma digital que conecta sua loja aos clientes da Saara.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Recursos</h3>
              <ul className="space-y-2 text-gray-400">
                <li><span className="hover:text-white transition-colors cursor-pointer">Cadastro de Produtos</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Analytics</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Promoções</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Reservas</span></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Suporte</h3>
              <ul className="space-y-2 text-gray-400">
                <li><span className="hover:text-white transition-colors cursor-pointer">Central de Ajuda</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Guia de Início</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Contato</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">WhatsApp</span></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><span className="hover:text-white transition-colors cursor-pointer">Termos de Uso</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Política de Privacidade</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Contratos</span></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Partiu Saara. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}