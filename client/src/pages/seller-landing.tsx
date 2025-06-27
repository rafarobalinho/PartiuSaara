
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';

import { 
  ShoppingBag,
  Smartphone,
  TrendingUp,
  Megaphone,
  Users,
  ShoppingCart,
  MapPin,
  Eye,
  Banknote,
  Headphones,
  Star,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

export default function SellerLanding() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header/Navigation */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100 fixed top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShoppingBag className="h-8 w-8 text-orange-500" />
              <span className="text-xl font-bold">
                Partiu <span className="text-orange-500">Saara</span>
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="ghost" className="text-gray-700 hover:text-orange-500">
                  Entrar
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                  Cadastrar Loja
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-orange-900 text-white relative overflow-hidden min-h-screen flex items-center pt-20">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 px-4 py-2 text-sm font-medium">
                  ✨ Revolucione sua Loja
                </Badge>
                <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                  Transforme sua Loja no
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">
                    Saara em um Sucesso
                  </span>
                  <span className="block">Digital</span>
                </h1>
                <p className="text-xl text-gray-300 leading-relaxed max-w-2xl">
                  Conecte-se com milhares de clientes, aumente suas 
                  vendas e faça parte da revolução digital do Mercado 
                  Popular do Saara.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button 
                    size="lg" 
                    className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8 py-4 font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 group"
                  >
                    Cadastre-se Grátis
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="border-white/30 text-white hover:bg-white/10 text-lg px-8 py-4 font-semibold rounded-lg"
                >
                  Ver Demonstração
                </Button>
              </div>

              {/* Social Proof */}
              <div className="flex items-center space-x-6 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">300+</div>
                  <div className="text-sm text-gray-400">Lojas Ativas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">45k+</div>
                  <div className="text-sm text-gray-400">Clientes</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center space-x-1">
                    {[1,2,3,4,5].map((star) => (
                      <Star key={star} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <div className="text-sm text-gray-400">4.9/5 Satisfação</div>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative">
              <div className="relative">
                <img 
                  src="/assets/photo-1441986300917-64674bd600d8.jpg" 
                  alt="Loja no Saara"
                  className="w-full h-96 object-cover rounded-2xl shadow-2xl"
                />

                {/* Floating Cards */}
                <div className="absolute -top-6 -left-6 bg-white rounded-2xl p-4 shadow-2xl">
                  <div className="text-sm text-gray-600 mb-1">Vendas Mensais</div>
                  <div className="text-3xl font-bold text-green-500">+45%</div>
                </div>

                <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl p-4 shadow-2xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex space-x-1">
                      {[1,2,3,4,5].map((star) => (
                        <Star key={star} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <span className="text-sm font-medium">4.9/5</span>
                  </div>
                  <div className="text-xs text-gray-600">Satisfação dos Clientes</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <Badge className="bg-orange-100 text-orange-700 border-orange-200 px-4 py-2 text-sm font-medium mb-4">
              FUNCIONALIDADES PODEROSAS
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Tudo que você precisa para
              <span className="block text-orange-500">vender mais</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Nossa plataforma oferece ferramentas completas para transformar sua loja física 
              em um negócio digital de sucesso.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature Cards */}
            {[
              {
                icon: <Smartphone className="h-8 w-8 text-orange-500" />,
                title: "Gestão pelo Celular",
                description: "Gerencie sua loja, produtos e promoções de qualquer lugar através do seu smartphone."
              },
              {
                icon: <TrendingUp className="h-8 w-8 text-orange-500" />,
                title: "Análise de Vendas",
                description: "Acompanhe o desempenho da sua loja com relatórios detalhados e insights valiosos."
              },
              {
                icon: <Megaphone className="h-8 w-8 text-orange-500" />,
                title: "Promoções Relâmpago",
                description: "Crie promoções especiais para atrair clientes próximos à sua loja em tempo real."
              },
              {
                icon: <Users className="h-8 w-8 text-orange-500" />,
                title: "Gestão de Clientes",
                description: "Construa relacionamentos duradouros com seus clientes através da nossa plataforma."
              },
              {
                icon: <ShoppingCart className="h-8 w-8 text-orange-500" />,
                title: "Reserva de Produtos",
                description: "Permita que clientes reservem produtos antes de visitar sua loja física."
              },
              {
                icon: <MapPin className="h-8 w-8 text-orange-500" />,
                title: "Localização Inteligente",
                description: "Aumente sua visibilidade para clientes próximos ao Saara através de geolocalização."
              }
            ].map((feature, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 group">
                <div className="w-16 h-16 mx-auto bg-orange-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-200 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">{feature.title}</h3>
                <p className="text-gray-600 text-center leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <Badge className="bg-orange-100 text-orange-700 border-orange-200 px-4 py-2 text-sm font-medium">
                  POR QUE ESCOLHER O PARTIU SAARA?
                </Badge>
                <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                  Impulsione seu Negócio no
                  <span className="block text-orange-500">Maior Centro Comercial</span>
                  <span className="block">Popular do Rio</span>
                </h2>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Junte-se a centenas de lojistas que já estão transformando 
                  seus negócios através da nossa plataforma.
                </p>
              </div>

              <div className="space-y-6">
                {[
                  {
                    icon: <Eye className="h-6 w-6 text-orange-500" />,
                    title: "Aumente sua Visibilidade",
                    description: "Seja encontrado por milhares de clientes que buscam produtos no Saara diariamente."
                  },
                  {
                    icon: <Banknote className="h-6 w-6 text-orange-500" />,
                    title: "Zero Comissão",
                    description: "Não cobramos comissão sobre suas vendas. Apenas uma mensalidade fixa e acessível."
                  },
                  {
                    icon: <Headphones className="h-6 w-6 text-orange-500" />,
                    title: "Suporte Especializado",
                    description: "Conte com nossa equipe para ajudar você a aproveitar ao máximo a plataforma."
                  }
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      {benefit.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{benefit.title}</h3>
                      <p className="text-gray-600 leading-relaxed">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Image Section */}
            <div className="relative">
              <div className="relative">
                <img 
                  src="/assets/photo-1556740738-b6a63e27c4df.jpg" 
                  alt="Lojista usando sistema"
                  className="w-full h-96 object-cover rounded-2xl shadow-2xl"
                />

                {/* Success Metrics */}
                <div className="absolute -bottom-8 -left-8 bg-white rounded-2xl p-6 shadow-2xl border">
                  <div className="text-4xl font-bold text-orange-500 mb-2">+300</div>
                  <div className="text-gray-600 font-medium">Lojas Ativas</div>
                  <div className="flex items-center mt-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm text-green-600">Crescimento 25%/mês</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-4xl lg:text-5xl font-bold leading-tight">
              Comece a Vender Mais
              <span className="block">Hoje Mesmo</span>
            </h2>
            <p className="text-xl text-orange-100 max-w-3xl mx-auto leading-relaxed">
              Cadastre-se gratuitamente e experimente por 14 dias todas as funcionalidades do 
              Partiu Saara. Sem compromisso, sem taxas ocultas.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/register">
                <Button 
                  size="lg" 
                  className="bg-white text-orange-600 hover:bg-gray-100 text-lg px-10 py-4 font-bold rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300"
                >
                  Começar Agora - Grátis
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-white/30 text-white hover:bg-white/10 text-lg px-10 py-4 font-semibold rounded-lg"
              >
                Falar com Especialista
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center space-x-8 pt-8 text-orange-200">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>14 dias grátis</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>Sem compromisso</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>Suporte incluído</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center space-x-3 mb-8">
              <ShoppingBag className="h-10 w-10 text-orange-500" />
              <span className="text-3xl font-bold">
                Partiu <span className="text-orange-500">Saara</span>
              </span>
            </div>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Transformando o comércio tradicional do Saara através da tecnologia. 
              Conectamos lojistas e clientes de forma inovadora e eficiente.
            </p>
            <div className="border-t border-gray-800 pt-8">
              <p className="text-gray-500">
                &copy; 2025 Partiu Saara. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
