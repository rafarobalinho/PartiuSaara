import React from 'react';
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
  Award,
  PlayCircle,
  Phone,
  Mail,
  Globe
} from 'lucide-react';

export default function SellerLanding() {
  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
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
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-gray-600 hover:text-orange-500 transition-colors">
                Funcionalidades
              </a>
              <a href="#benefits" className="text-gray-600 hover:text-orange-500 transition-colors">
                Benefícios
              </a>
              <a href="#cta" className="text-gray-600 hover:text-orange-500 transition-colors">
                Começar
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" className="text-gray-600">
                Login
              </Button>
              <Button className="bg-orange-500 text-white hover:bg-orange-600">
                Cadastrar Loja
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="container mx-auto px-4 py-20 lg:py-32 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge className="bg-white/20 text-white border-white/30 mb-4">
                  🚀 Plataforma #1 da Saara
                </Badge>
                <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
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
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Ver Demonstração
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8">
                <div className="text-center">
                  <div className="text-4xl font-bold">500+</div>
                  <div className="text-orange-200 text-sm">Lojas Conectadas</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold">50K+</div>
                  <div className="text-orange-200 text-sm">Clientes Ativos</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold">95%</div>
                  <div className="text-orange-200 text-sm">Satisfação</div>
                </div>
              </div>
            </div>

            {/* Hero Image/Dashboard Preview */}
            <div className="relative">
              <div className="relative z-10 bg-white rounded-3xl shadow-2xl p-8 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-gray-900">Dashboard da Loja</h3>
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
              {/* Background decoration */}
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-yellow-300 rounded-full opacity-20"></div>
              <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-red-400 rounded-full opacity-20"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="bg-orange-100 text-orange-800 mb-4">Funcionalidades</Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Funcionalidades que fazem a diferença
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Tudo que você precisa para transformar sua loja física em um negócio digital de sucesso
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Store className="h-12 w-12 text-orange-500" />,
                title: 'Gestão Completa de Loja',
                description: 'Controle total sobre produtos, estoque, preços e promoções em um só lugar'
              },
              {
                icon: <Target className="h-12 w-12 text-blue-500" />,
                title: 'Promoções Inteligentes',
                description: 'Crie campanhas direcionadas e aumente suas vendas com cupons e descontos'
              },
              {
                icon: <BarChart3 className="h-12 w-12 text-green-500" />,
                title: 'Analytics Avançado',
                description: 'Entenda seu negócio com relatórios detalhados de vendas e comportamento'
              },
              {
                icon: <MapPin className="h-12 w-12 text-purple-500" />,
                title: 'Localização Inteligente',
                description: 'Clientes encontram sua loja facilmente com navegação GPS integrada'
              },
              {
                icon: <Users className="h-12 w-12 text-red-500" />,
                title: 'Conexão com Clientes',
                description: 'Chat direto, notificações e fidelização de clientes em tempo real'
              },
              {
                icon: <Award className="h-12 w-12 text-yellow-500" />,
                title: 'Destaque na Busca',
                description: 'Apareça primeiro nos resultados e seja encontrado mais facilmente'
              }
            ].map((feature, index) => (
              <Card key={index} className="p-8 text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-white">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
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
      <section id="benefits" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="bg-green-100 text-green-800 mb-4">Benefícios</Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Por que escolher o Partiu Saara?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Benefícios comprovados que impulsionam o crescimento do seu negócio na Saara
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <TrendingUp className="h-8 w-8 text-green-600" />,
                title: 'Aumento de 40% nas Vendas',
                description: 'Lojas parceiras relatam crescimento médio de 40% nas vendas após se cadastrarem'
              },
              {
                icon: <Users className="h-8 w-8 text-blue-600" />,
                title: 'Milhares de Clientes',
                description: 'Alcance os milhares de pessoas que visitam a Saara diariamente'
              },
              {
                icon: <Smartphone className="h-8 w-8 text-purple-600" />,
                title: 'Fácil de Usar',
                description: 'Interface simples e intuitiva. Configure sua loja em minutos'
              },
              {
                icon: <Shield className="h-8 w-8 text-yellow-600" />,
                title: 'Seguro e Confiável',
                description: 'Seus dados protegidos com a mais alta tecnologia de segurança'
              },
              {
                icon: <Zap className="h-8 w-8 text-orange-600" />,
                title: 'Resultados Rápidos',
                description: 'Veja o crescimento da sua loja já nas primeiras semanas'
              },
              {
                icon: <CreditCard className="h-8 w-8 text-red-600" />,
                title: 'Sem Taxa de Adesão',
                description: 'Comece grátis e pague apenas conforme sua loja cresce'
              }
            ].map((benefit, index) => (
              <Card key={index} className="p-8 border-0 shadow-lg hover:shadow-xl transition-all duration-300 group bg-white">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg border">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">{benefit.title}</h3>
                <p className="text-gray-600 text-center">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="py-20 bg-gradient-to-r from-orange-500 to-red-500 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <Badge className="bg-white/20 text-white border-white/30 mb-6">
              🎯 Última Chance
            </Badge>
            <h2 className="text-4xl lg:text-6xl font-bold mb-6">
              Pronto para transformar sua loja?
            </h2>
            <p className="text-xl text-orange-100 mb-10 max-w-2xl mx-auto">
              Junte-se a centenas de lojistas que já aumentaram suas vendas com o Partiu Saara. 
              Comece grátis hoje mesmo!
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
              <Button 
                size="lg" 
                className="bg-white text-orange-600 hover:bg-gray-100 text-lg px-10 py-4 font-semibold"
              >
                Cadastrar Minha Loja Grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-white text-white hover:bg-white hover:text-orange-600 text-lg px-10 py-4 font-semibold"
              >
                <Phone className="mr-2 h-5 w-5" />
                Falar com Consultor
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-orange-200 text-sm">
              <div className="flex items-center justify-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Sem taxa de adesão
              </div>
              <div className="flex items-center justify-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Cancele quando quiser
              </div>
              <div className="flex items-center justify-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Suporte especializado
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modal Signup (Hidden by default) */}
      <div id="modal-signup" className="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Cadastre sua loja</h3>
          <form className="space-y-4">
            <input type="text" placeholder="Nome da loja" className="w-full p-3 border rounded-lg" />
            <input type="email" placeholder="Email" className="w-full p-3 border rounded-lg" />
            <input type="tel" placeholder="Telefone" className="w-full p-3 border rounded-lg" />
            <Button className="w-full bg-orange-500 text-white">
              Cadastrar Agora
            </Button>
          </form>
        </div>
      </div>

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
                  <Globe className="h-4 w-4 mr-2" />
                  Site
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <Phone className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
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