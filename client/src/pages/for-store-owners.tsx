import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Smartphone, BarChart2, Megaphone, Users, ShoppingCart, MapPin } from 'lucide-react';
import { LandingImage } from '@/components/landing/LandingImage';

export default function ForStoreOwners() {
  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-[#1E1E1E] text-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <div className="inline-block bg-primary/20 text-primary rounded-full px-4 py-1 mb-4">
                <span className="flex items-center text-sm font-medium">
                  Partiu Saara para Lojistas
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Transforme sua Loja no Saara em um Sucesso Digital
              </h1>
              <p className="text-lg text-gray-300 mb-8">
                Conecte-se com milhares de clientes, aumente suas vendas e faça parte da revolução digital do Mercado Popular do Saara.
              </p>
              <Button asChild className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-md flex items-center">
                <Link href="/auth?tab=register&role=seller">
                  Cadastre-se <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="md:w-1/2 relative">
              <div className="relative rounded-lg overflow-hidden">
                <LandingImage 
                  src="/landing/sellers/hero-banner.jpg" 
                  alt="Loja no Saara" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg">
                  <div className="text-primary font-bold">Vendas Mensais</div>
                  <div className="text-3xl font-bold text-gray-900">+45%</div>
                </div>
                <div className="absolute bottom-4 right-4 bg-white p-2 rounded-lg shadow-lg flex items-center">
                  <div className="flex text-yellow-400">
                    <span>★</span>
                    <span>★</span>
                    <span>★</span>
                    <span>★</span>
                    <span>★</span>
                  </div>
                  <div className="ml-2 text-sm text-gray-900">4.8/5 de satisfação</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-primary mb-2 font-medium">FUNCIONALIDADES</h2>
            <h3 className="text-3xl md:text-4xl font-bold">Tudo que você precisa para vender mais</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Smartphone className="text-primary w-8 h-8 mb-4" />
              <h4 className="text-xl font-semibold mb-2">Gestão pelo Celular</h4>
              <p className="text-gray-600">
                Gerencie sua loja, produtos e promoções de qualquer lugar através do seu smartphone.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <BarChart2 className="text-primary w-8 h-8 mb-4" />
              <h4 className="text-xl font-semibold mb-2">Análise de Vendas</h4>
              <p className="text-gray-600">
                Acompanhe o desempenho da sua loja com relatórios detalhados e insights valiosos.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Megaphone className="text-primary w-8 h-8 mb-4" />
              <h4 className="text-xl font-semibold mb-2">Promoções Relâmpago</h4>
              <p className="text-gray-600">
                Crie promoções especiais para atrair clientes próximos à sua loja em tempo real.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Users className="text-primary w-8 h-8 mb-4" />
              <h4 className="text-xl font-semibold mb-2">Gestão de Clientes</h4>
              <p className="text-gray-600">
                Construa relacionamentos duradouros com seus clientes através da nossa plataforma.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <ShoppingCart className="text-primary w-8 h-8 mb-4" />
              <h4 className="text-xl font-semibold mb-2">Reserva de Produtos</h4>
              <p className="text-gray-600">
                Permita que clientes reservem produtos antes de visitar sua loja física.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <MapPin className="text-primary w-8 h-8 mb-4" />
              <h4 className="text-xl font-semibold mb-2">Localização Inteligente</h4>
              <p className="text-gray-600">
                Aumente sua visibilidade para clientes próximos ao Saara através de geolocalização.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/2 mb-8 md:mb-0">
              <h2 className="text-primary mb-2 font-medium">POR QUE ESCOLHER O PARTIU SAARA?</h2>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">
                Impulsione seu Negócio no Maior Centro Comercial Popular do Rio
              </h3>
              <p className="text-gray-600 mb-8">
                Junte-se a centenas de lojistas que já estão transformando seus negócios através da nossa plataforma.
              </p>

              <div className="space-y-6">
                <div className="flex">
                  <CheckCircle className="text-primary h-6 w-6 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Aumente sua Visibilidade</h4>
                    <p className="text-gray-600">Seja encontrado por milhares de clientes que buscam produtos no Saara diariamente.</p>
                  </div>
                </div>

                <div className="flex">
                  <CheckCircle className="text-primary h-6 w-6 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Zero Comissão</h4>
                    <p className="text-gray-600">Não cobramos comissão sobre suas vendas. Apenas uma mensalidade fixa e acessível.</p>
                  </div>
                </div>

                <div className="flex">
                  <CheckCircle className="text-primary h-6 w-6 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">Suporte Especializado</h4>
                    <p className="text-gray-600">Conte com nossa equipe para ajudar você a aproveitar ao máximo a plataforma.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="md:w-1/2 relative">
              <div className="relative rounded-lg overflow-hidden">
                <img 
                  src="/uploads/store-pos-system.jpg" 
                  alt="Sistema de vendas em uma loja" 
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.src = '/uploads/placeholder-pos.jpg';
                  }}
                />
                <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg">
                  <div className="text-primary font-bold">+300</div>
                  <div className="text-sm text-gray-900">Lojas Ativas</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary to-secondary text-white text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Comece a Vender Mais Hoje Mesmo</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto">
            Cadastre-se gratuitamente e experimente por 14 dias todas as funcionalidades do Partiu Saara.
          </p>
          <Button asChild className="bg-black hover:bg-gray-900 text-white px-8 py-3 rounded-md inline-flex items-center">
            <Link href="/auth?tab=register&role=seller">
              Começar Agora
            </Link>
          </Button>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Perguntas Frequentes</h2>
            <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
              Tire suas dúvidas sobre como o Partiu Saara pode ajudar seu negócio a crescer no mercado digital.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-2">Como funciona o cadastro de loja?</h3>
              <p className="text-gray-600">
                O cadastro é simples e leva apenas alguns minutos. Você precisará informar dados básicos da sua loja, 
                como nome, CNPJ, endereço e uma breve descrição. Após a validação, sua loja estará pronta para receber pedidos.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-2">Quanto custa utilizar o Partiu Saara?</h3>
              <p className="text-gray-600">
                Oferecemos planos a partir de R$ 49,90 por mês, sem comissões sobre vendas. Você pode 
                experimentar gratuitamente por 14 dias e depois escolher o plano que melhor atende às suas necessidades.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-2">Como os clientes encontrarão minha loja?</h3>
              <p className="text-gray-600">
                Utilizamos geolocalização para mostrar sua loja aos clientes próximos. Além disso, os clientes 
                podem pesquisar por categoria, nome de produto ou loja. Quanto mais completo for seu cadastro, 
                melhor será o posicionamento da sua loja nos resultados.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-2">Como funciona o sistema de reservas?</h3>
              <p className="text-gray-600">
                Os clientes podem reservar produtos pelo aplicativo e retirá-los em sua loja física. 
                Você recebe uma notificação quando há uma nova reserva e pode gerenciar todas elas pelo painel administrativo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 bg-gray-100">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Pronto para transformar seu negócio?</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Junte-se aos lojistas que já estão aumentando suas vendas com o Partiu Saara.
          </p>
          <Button asChild className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-md inline-flex items-center">
            <Link href="/auth?tab=register&role=seller">
              Criar minha conta de lojista
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}