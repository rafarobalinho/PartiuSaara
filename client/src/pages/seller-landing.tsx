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
  Headphones
} from 'lucide-react';

export default function SellerLanding() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header/Navigation */}
      <header className="bg-transparent absolute top-0 left-0 right-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShoppingBag className="h-6 w-6 text-orange-500" />
              <span className="text-white font-medium">
                🔴 Partiu Saara para Lojistas
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gray-900 text-white relative overflow-hidden min-h-screen flex items-center">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                  Transforme sua Loja no<br />
                  Saara em um Sucesso<br />
                  Digital
                </h1>
                <p className="text-lg text-gray-300 leading-relaxed max-w-lg">
                  Conecte-se com milhares de clientes, aumente suas 
                  vendas e faça parte da revolução digital do Mercado 
                  Popular do Saara.
                </p>
              </div>

              <div>
                <Button 
                  size="lg" 
                  className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8 py-4 font-semibold rounded-lg"
                >
                  Cadastre-se →
                </Button>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative">
              <div className="relative">
                <img 
                  src="/uploads/placeholder-unavailable.jpg" 
                  alt="Loja no Saara"
                  className="w-full h-80 object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.src = '/uploads/placeholder-unavailable.jpg';
                  }}
                />

                {/* Vendas Mensais Badge */}
                <div className="absolute top-4 left-4 bg-white rounded-lg p-3 shadow-lg">
                  <div className="text-sm text-gray-600">Vendas Mensais</div>
                  <div className="text-2xl font-bold text-orange-500">+45%</div>
                </div>

                {/* Rating Badge */}
                <div className="absolute bottom-4 right-4 bg-white rounded-lg p-3 shadow-lg">
                  <div className="flex items-center space-x-1">
                    <div className="flex space-x-1">
                      {[1,2,3,4,5].map((star) => (
                        <div key={star} className="w-4 h-4 bg-yellow-400 rounded-sm"></div>
                      ))}
                    </div>
                    <span className="text-sm font-medium ml-2">4.9/5 de satisfação</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Funcionalidades Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="text-orange-500 text-sm font-medium mb-2 tracking-wide uppercase">
              FUNCIONALIDADES
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
              Tudo que você precisa para vender mais
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Gestão pelo Celular */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-orange-100 rounded-lg flex items-center justify-center">
                <Smartphone className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Gestão pelo Celular</h3>
              <p className="text-gray-600">
                Gerencie sua loja, produtos e promoções de qualquer lugar através 
                do seu smartphone.
              </p>
            </div>

            {/* Análise de Vendas */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Análise de Vendas</h3>
              <p className="text-gray-600">
                Acompanhe o desempenho da sua loja com relatórios detalhados e 
                insights valiosos.
              </p>
            </div>

            {/* Promoções Relâmpago */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-orange-100 rounded-lg flex items-center justify-center">
                <Megaphone className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Promoções Relâmpago</h3>
              <p className="text-gray-600">
                Crie promoções especiais para atrair clientes próximos à sua loja em tempo 
                real.
              </p>
            </div>

            {/* Gestão de Clientes */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Gestão de Clientes</h3>
              <p className="text-gray-600">
                Construa relacionamentos duradouros com seus clientes através da nossa 
                plataforma.
              </p>
            </div>

            {/* Reserva de Produtos */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-orange-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Reserva de Produtos</h3>
              <p className="text-gray-600">
                Permita que clientes reservem produtos antes de visitar sua loja 
                física.
              </p>
            </div>

            {/* Localização Inteligente */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-orange-100 rounded-lg flex items-center justify-center">
                <MapPin className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Localização Inteligente</h3>
              <p className="text-gray-600">
                Aumente sua visibilidade para clientes próximos ao Saara através de 
                geolocalização.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Por que escolher Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="text-orange-500 text-sm font-medium tracking-wide uppercase">
                  POR QUE ESCOLHER O PARTIU SAARA?
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                  Impulsione seu Negócio no<br />
                  Maior Centro Comercial<br />
                  Popular do Rio
                </h2>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Junte-se a centenas de lojistas que já estão transformando 
                  seus negócios através da nossa plataforma.
                </p>
              </div>

              <div className="space-y-6">
                {/* Aumente sua Visibilidade */}
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Eye className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Aumente sua Visibilidade</h3>
                    <p className="text-gray-600">
                      Seja encontrado por milhares de clientes que buscam produtos 
                      no Saara diariamente.
                    </p>
                  </div>
                </div>

                {/* Zero Comissão */}
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Banknote className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Zero Comissão</h3>
                    <p className="text-gray-600">
                      Não cobramos comissão sobre suas vendas. Apenas uma 
                      mensalidade fixa e acessível.
                    </p>
                  </div>
                </div>

                {/* Suporte Especializado */}
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Headphones className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Suporte Especializado</h3>
                    <p className="text-gray-600">
                      Conte com nossa equipe para ajudar você a aproveitar ao 
                      máximo a plataforma.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Image Section */}
            <div className="relative">
              <div className="relative">
                <img 
                  src="/uploads/placeholder-unavailable.jpg" 
                  alt="Lojista usando sistema"
                  className="w-full h-96 object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.src = '/uploads/placeholder-unavailable.jpg';
                  }}
                />

                {/* Lojas Ativas Badge */}
                <div className="absolute bottom-4 right-4 bg-white rounded-lg p-4 shadow-lg">
                  <div className="text-3xl font-bold text-orange-500">+300</div>
                  <div className="text-sm text-gray-600">Lojas Ativas</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-3xl lg:text-4xl font-bold">
              Comece a Vender Mais Hoje Mesmo
            </h2>
            <p className="text-xl text-orange-100 max-w-2xl mx-auto">
              Cadastre-se gratuitamente e experimente por 14 dias todas as funcionalidades do 
              Partiu Saara
            </p>

            <div className="pt-4">
              <Link href="/auth/register">
                <Button 
                  size="lg" 
                  className="bg-gray-900 text-white hover:bg-gray-800 text-lg px-10 py-4 font-semibold rounded-lg"
                >
                  Começar Agora
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <ShoppingBag className="h-8 w-8 text-orange-500" />
            <span className="text-2xl font-bold">
              Partiu <span className="text-orange-500">Saara</span>
            </span>
          </div>
          <p className="text-gray-400">
            &copy; 2025 Partiu Saara. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}