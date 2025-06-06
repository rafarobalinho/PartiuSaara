import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from 'wouter';
import { 
  ShoppingBag, 
  Percent, 
  Navigation, 
  Heart, 
  DollarSign, 
  Clock, 
  Star, 
  Package, 
  MapPin, 
  Zap
} from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header/Navigation */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold text-gray-900">
                  Partiu <span className="text-primary">Saara</span>
                </span>
              </div>
              <nav className="hidden md:flex space-x-6">
                <a href="#categorias" className="text-gray-600 hover:text-primary transition-colors">
                  Categorias
                </a>
                <a href="#promocoes" className="text-gray-600 hover:text-primary transition-colors">
                  Promoções
                </a>
                <a href="#lojas" className="text-gray-600 hover:text-primary transition-colors">
                  Lojas
                </a>
                <a href="#como-funciona" className="text-gray-600 hover:text-primary transition-colors">
                  Como Funciona
                </a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost" className="text-gray-600">
                  Entrar
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-primary text-white hover:bg-primary/90">
                  Cadastrar
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
                O MAIOR MERCADO POPULAR DO RIO
                <br />
                <span className="text-orange-200">NA PALMA DA SUA MÃO</span>
              </h1>
              <p className="text-xl text-orange-100 leading-relaxed">
            Veja centenas de lojas, aproveite descontos exclusivos e
                encontre tudo o que precisa com facilidade na Saara.
              </p>

              {/* Seção Principal - CLIENTES */}
              <div className="mb-8">
                <Link href="/register">
                  <Button 
                    size="lg" 
                    className="
                      bg-white 
                      text-primary 
                      hover:bg-gray-100 
                      text-lg 
                      px-8 
                      py-4 
                      shadow-lg 
                      hover:shadow-xl 
                      transition-all 
                      duration-300 
                      ease-in-out
                      transform
                      hover:scale-105
                      active:scale-95
                    "
                  >
                    Cadastrar Agora
                  </Button>
                </Link>
              </div>

              {/* Separador Visual */}
              <div className="w-full h-px bg-orange-300/30 mb-6"></div>

             {/* Seção Secundária - LOJISTAS */}
            <div className="bg-[#0D0D0D] backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-[#F2600C] rounded-full animate-pulse"></div>
                    <span className="text-[#F2600C] text-sm font-semibold uppercase tracking-wide">
                      Especial para Lojistas
                    </span>
                  </div>
                  <p className="text-white text-lg leading-relaxed">
                    Você tem um comércio na Saara e quer conhecer as vantagens do Partiu Saara?
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Button 
                    className="
                      bg-[#F2600C] 
                      text-[#F2F2F2] 
                      border-0
                      font-semibold 
                      px-6 
                      py-3 
                      transition-all 
                      duration-300 
                      ease-in-out
                      hover:bg-[#F2F2F2] 
                      hover:text-[#F2600C] 
                      hover:scale-110
                      hover:shadow-2xl
                      active:scale-105
                      active:bg-[#F2F2F2] 
                      active:text-[#F2600C]
                      transform
                    "
                  >
                    Clique Aqui
                  </Button>
                </div>
              </div>
            </div>
          </div>
            
            {/* Hero Image */}
            <div className="relative">
              <div className="relative z-00">
                <div className="w-full max-w-lg mx-auto bg-gradient-to-br from-orange-200 to-orange-300 rounded-lg shadow-2xl p-8 flex items-center justify-center">
                  <div className="text-center">
                    <ShoppingBag className="h-32 w-32 text-primary mx-auto mb-4" />
                    <p className="text-primary font-semibold text-lg">Experiência de compras única na Saara</p>
                  </div>
                </div>
              </div>
              
              {/* Floating Discount Cards */}
              <div className="absolute -top-4 -right-4 lg:right-8 space-y-3">
                <div className="bg-white text-primary rounded-lg p-4 shadow-lg transform rotate-3">
                  <div className="text-3xl font-bold">20%</div>
                  <div className="text-sm">off</div>
                </div>
                <div className="bg-white text-primary rounded-lg p-4 shadow-lg transform -rotate-3">
                  <div className="text-3xl font-bold">30%</div>
                  <div className="text-sm">off</div>
                </div>
                <div className="bg-white text-primary rounded-lg p-4 shadow-lg transform rotate-3">
                  <div className="text-3xl font-bold">40%</div>
                  <div className="text-sm">off</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24 bg-white" id="como-funciona">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              O MAIOR MERCADO POPULAR DO RIO
              <br />
              DE JANEIRO NA PALMA DA SUA MÃO
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Veja centenas de lojas, aproveite descontos exclusivos e
              encontre tudo o que precisa com facilidade na Saara.
            </p>
            <Link href="/register">
              <Button size="lg" className="bg-primary text-white hover:bg-primary/90">
                Cadastrar Agora
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <Card className="p-8 text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Percent className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Descontos Exclusivos</h3>
              <p className="text-gray-600">
                Economize com ofertas especiais em diversas lojas
              </p>
            </Card>

            <Card className="p-8 text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Navigation className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Navegação Inteligente</h3>
              <p className="text-gray-600">
                Encontre facilmente o caminho para suas lojas favoritas
              </p>
            </Card>

            <Card className="p-8 text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Favoritos</h3>
              <p className="text-gray-600">
                Salve produtos e lojas para acessar rapidamente
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
                alt="Pessoa escolhendo roupas em um closet organizado"
                className="w-full rounded-lg shadow-xl"
              />
            </div>
            
            <div className="space-y-8">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-8">
                Tudo que você precisa em um só lugar
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Economia</h3>
                    <p className="text-gray-600">
                      Aproveite descontos exclusivos e economize em todas as suas compras
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Praticidade</h3>
                    <p className="text-gray-600">
                      Encontre tudo o que precisa sem perder tempo procurando
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Star className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Experiência Personalizada</h3>
                    <p className="text-gray-600">
                      Receba recomendações baseadas nos seus interesses e histórico
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Categorias Organizadas</h3>
                    <p className="text-gray-600">
                      Encontre facilmente o que procura com nossas categorias bem organizadas
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Reserva de Produtos</h3>
                    <p className="text-gray-600">
                      Reserve produtos com desconto e retire na loja quando quiser
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Lojas Conectadas</h3>
                    <p className="text-gray-600">
                      Conecte-se diretamente com as melhores lojas da SAARA
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Rotas Inteligentes</h3>
                    <p className="text-gray-600">
                      Nunca mais se perca na Saara. Encontre produtos e use nosso mapa para ir direto para a Loja.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-r from-primary to-orange-500 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Comece a economizar agora mesmo
          </h2>
          <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
            Cadastre-se na Partiu SAARA e descubra um novo jeito de fazer compras
          </p>
          <Link href="/register">
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-4"
            >
              Cadastre-se
            </Button>
          </Link>
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
                O maior mercado popular do Rio de Janeiro na palma da sua mão.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Links Rápidos</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Categorias</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Promoções</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Lojas</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Como Funciona</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Suporte</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Para Lojistas</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Cadastre sua Loja</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Planos e Preços</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Suporte Lojista</a></li>
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