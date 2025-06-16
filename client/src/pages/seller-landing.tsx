
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
  ArrowRight,
  Star,
  Target,
  Award
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
        'Até 5 produtos',
        'Localização no mapa',
        'Chat com consumidores',
        'Suporte por email'
      ],
      buttonText: 'Começar Grátis',
      popular: false
    },
    {
      name: 'Start',
      price: 'R$ 149',
      period: '/mês',
      description: 'Para lojas em crescimento',
      features: [
        'Até 10 produtos',
        '5 cupons promocionais',
        'Analytics básico',
        'Chat prioritário',
        'Imagens ilimitadas'
      ],
      buttonText: 'Assinar Start',
      popular: true
    },
    {
      name: 'Pro',
      price: 'R$ 249',
      period: '/mês',
      description: 'Para lojas estabelecidas',
      features: [
        'Até 50 produtos',
        'Promoções ilimitadas',
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
      price: 'R$ 399',
      period: '/mês',
      description: 'Para grandes operações',
      features: [
        'Produtos ilimitados',
        'Múltiplas lojas',
        'API personalizada',
        'Relatórios avançados',
        'Gerente de conta',
        'Suporte 24/7'
      ],
      buttonText: 'Assinar Premium',
      popular: false
    }
  ];

  const benefits = [
    {
      icon: <Users className="h-8 w-8 text-blue-600" />,
      title: 'Mais Clientes',
      description: 'Alcance milhares de pessoas que visitam a Saara e descobrem lojas pelo app'
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-green-600" />,
      title: 'Vendas Aumentadas',
      description: 'Lojas parceiras relatam aumento médio de 40% nas vendas após se cadastrarem'
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-purple-600" />,
      title: 'Analytics Completo',
      description: 'Entenda seu negócio com relatórios detalhados de vendas e comportamento dos clientes'
    },
    {
      icon: <MapPin className="h-8 w-8 text-orange-500" />,
      title: 'Localização Inteligente',
      description: 'Clientes encontram sua loja facilmente com navegação GPS integrada'
    },
    {
      icon: <Smartphone className="h-8 w-8 text-red-600" />,
      title: 'Fácil de Usar',
      description: 'Interface simples e intuitiva. Cadastre produtos e gerencie sua loja em minutos'
    },
    {
      icon: <Shield className="h-8 w-8 text-yellow-600" />,
      title: 'Seguro e Confiável',
      description: 'Seus dados e de seus clientes protegidos com a mais alta tecnologia de segurança'
    }
  ];

  const features = [
    {
      icon: <Store className="h-12 w-12 text-orange-500" />,
      title: 'Gestão Completa',
      description: 'Controle total sobre produtos, estoque, preços e promoções em um só lugar'
    },
    {
      icon: <Target className="h-12 w-12 text-blue-500" />,
      title: 'Promoções Inteligentes',
      description: 'Crie campanhas direcionadas e aumente suas vendas com cupons e descontos'
    },
    {
      icon: <Award className="h-12 w-12 text-green-500" />,
      title: 'Destaque na Busca',
      description: 'Apareça primeiro nos resultados e seja encontrado mais facilmente pelos clientes'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header/Navigation */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShoppingBag className="h-8 w-8 text-orange-500" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-gray-900">
                  Partiu <span className="text-orange-500">Saara</span>
                </span>
                <Badge variant="secondary" className="text-xs w-fit">Para Lojistas</Badge>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="ghost" className="text-gray-600">
                  Já tenho conta
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button className="bg-orange-500 text-white hover:bg-orange-600">
                  Criar Conta
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="container mx-auto px-4 py-20 lg:py-32 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge className="bg-white/20 text-white border-white/30">
                  🚀 Plataforma #1 da Saara
                </Badge>
                <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                  Transforme sua loja na
                  <br />
                  <span className="text-yellow-300">Saara Digital</span>
                </h1>
                <p className="text-xl text-orange-100 leading-relaxed max-w-lg">
                  Conecte-se com milhares de clientes, aumente suas vendas e 
                  modernize sua loja com a plataforma digital líder da Saara.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-white text-orange-600 hover:bg-gray-100 text-lg px-8 py-4 font-semibold"
                >
                  Cadastrar Minha Loja Grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-white text-white hover:bg-white hover:text-orange-600 text-lg px-8 py-4"
                >
                  Ver Demonstração
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold">500+</div>
                  <div className="text-orange-200 text-sm">Lojas Conectadas</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">50K+</div>
                  <div className="text-orange-200 text-sm">Clientes Ativos</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">95%</div>
                  <div className="text-orange-200 text-sm">Satisfação</div>
                </div>
              </div>
            </div>
            
            {/* Hero Dashboard Preview */}
            <div className="relative">
              <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-8 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900">Dashboard da Loja</h3>
                    <Badge className="bg-green-100 text-green-800">• Online</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                      <div className="text-3xl font-bold text-orange-600">247</div>
                      <div className="text-sm text-gray-600">Vendas este mês</div>
                      <div className="flex items-center mt-2 text-green-600 text-sm">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        +23%
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                      <div className="text-3xl font-bold text-blue-600">1.2K</div>
                      <div className="text-sm text-gray-600">Visualizações</div>
                      <div className="flex items-center mt-2 text-green-600 text-sm">
                        <Users className="h-4 w-4 mr-1" />
                        +15%
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white">
                    <div className="flex items-center space-x-2">
                      <Star className="h-5 w-5 text-yellow-300" />
                      <span className="font-medium">Vendas aumentaram 40% este mês!</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Funcionalidades que fazem a diferença
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Tudo que você precisa para transformar sua loja física em um negócio digital de sucesso
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {features.map((feature, index) => (
              <Card key={index} className="p-8 text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Por que escolher o Partiu Saara?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Benefícios comprovados que impulsionam o crescimento do seu negócio
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="p-8 text-center border-0 shadow-lg hover:shadow-xl transition-shadow group">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Planos que crescem com seu negócio
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comece grátis e evolua conforme sua loja cresce. Transparência total, sem surpresas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative p-8 border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 ${plan.popular ? 'ring-4 ring-orange-500 scale-105' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-orange-500 text-white px-4 py-2 text-sm font-semibold">
                      🔥 Mais Popular
                    </Badge>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{plan.name}</h3>
                  <div className="mb-3">
                    <span className="text-4xl font-bold text-orange-500">{plan.price}</span>
                    <span className="text-gray-600 text-lg">{plan.period}</span>
                  </div>
                  <p className="text-gray-600">{plan.description}</p>
                </div>
                
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full ${plan.popular ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
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

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-orange-500 to-red-500 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Pronto para transformar sua loja?
            </h2>
            <p className="text-xl text-orange-100 mb-10 max-w-2xl mx-auto">
              Junte-se a centenas de lojistas que já aumentaram suas vendas com o Partiu Saara. 
              Comece grátis hoje mesmo!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link href="/auth/register">
                <Button 
                  size="lg" 
                  className="bg-white text-orange-600 hover:bg-gray-100 text-lg px-10 py-4 font-semibold"
                >
                  Cadastrar Minha Loja Grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-white text-white hover:bg-white hover:text-orange-600 text-lg px-10 py-4 font-semibold"
              >
                Falar com Consultor
              </Button>
            </div>
            
            <div className="mt-12 text-orange-200">
              <p className="text-sm">✓ Sem taxa de adesão • ✓ Cancele quando quiser • ✓ Suporte especializado</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <ShoppingBag className="h-10 w-10 text-orange-500" />
                <span className="text-3xl font-bold">
                  Partiu <span className="text-orange-500">Saara</span>
                </span>
              </div>
              <p className="text-gray-400 max-w-md mb-6">
                A plataforma digital que conecta sua loja aos milhares de clientes que visitam a Saara todos os dias.
              </p>
              <div className="flex space-x-4">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  Facebook
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  Instagram
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  WhatsApp
                </Button>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-6">Recursos</h3>
              <ul className="space-y-3 text-gray-400">
                <li><span className="hover:text-white transition-colors cursor-pointer">Cadastro de Produtos</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Analytics</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Promoções</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Reservas</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Integrações</span></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-6">Suporte</h3>
              <ul className="space-y-3 text-gray-400">
                <li><span className="hover:text-white transition-colors cursor-pointer">Central de Ajuda</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Guia de Início</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Contato</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">WhatsApp</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Termos de Uso</span></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Partiu Saara. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
