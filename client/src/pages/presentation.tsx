import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from 'wouter';
import { 
  ShoppingBag, 
  MapPin, 
  Users, 
  TrendingUp, 
  Smartphone, 
  Store, 
  BarChart3,
  MessageCircle,
  Target,
  Award,
  CheckCircle,
  ArrowRight,
  Globe,
  Shield,
  AlertCircle,
  Zap,
  Heart,
  Search
} from 'lucide-react';

export default function Presentation() {
  const primaryColor = '#EB690A';
  const secondaryColor = '#F28B50';
  const lightColor = '#F2B591';
  const grayColor = '#F2F2F2';
  const blackColor = '#0D0D0D';

  return (
    <div className="min-h-screen" style={{ backgroundColor: grayColor }}>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <ShoppingBag className="h-10 w-10" style={{ color: primaryColor }} />
              <span className="text-3xl font-bold" style={{ color: blackColor }}>
                Partiu <span style={{ color: primaryColor }}>Saara</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 1. Boas-vindas e Apresentação */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl lg:text-6xl font-bold mb-8" style={{ color: blackColor }}>
            Bem-vindos ao <span style={{ color: primaryColor }}>Partiu Saara</span>
          </h1>
          <p className="text-xl lg:text-2xl mb-12 max-w-4xl mx-auto leading-relaxed" style={{ color: blackColor }}>
            Uma plataforma criada para <strong>valorizar</strong>, <strong>digitalizar</strong> e <strong>impulsionar</strong> os lojistas do maior polo popular do Brasil.
          </p>
          <div className="bg-gradient-to-r from-orange-100 to-orange-50 rounded-lg p-8 max-w-3xl mx-auto">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <Award className="h-8 w-8" style={{ color: primaryColor }} />
              <span className="text-lg font-semibold" style={{ color: blackColor }}>
                O Maior Polo Popular do Brasil
              </span>
            </div>
            <p className="text-lg" style={{ color: blackColor }}>
              Transformando o tradicional comércio da Saara em uma experiência digital moderna e acessível.
            </p>
          </div>
        </div>
      </section>

      {/* 2. O Problema */}
      <section className="py-16 lg:py-24" style={{ backgroundColor: grayColor }}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6" style={{ color: blackColor }}>
              O Problema que Enfrentamos
            </h2>
            <p className="text-xl mb-8" style={{ color: blackColor }}>
              O comércio do Centro do Rio enfrenta desafios sérios:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <AlertCircle className="h-8 w-8" style={{ color: primaryColor }} />,
                title: "Comissões Abusivas",
                description: "Marketplaces tradicionais cobram comissão POR VENDA"
              },
              {
                icon: <Users className="h-8 w-8" style={{ color: primaryColor }} />,
                title: "Dificuldade de Atração",
                description: "Dificuldade para atrair clientes novos para a loja física"
              },
              {
                icon: <BarChart3 className="h-8 w-8" style={{ color: primaryColor }} />,
                title: "Falta de Dados",
                description: "Falta de dados sobre comportamento do consumidor"
              },
              {
                icon: <Globe className="h-8 w-8" style={{ color: primaryColor }} />,
                title: "Presença Digital Inconsistente",
                description: "Dificuldade em ter consistência na presença digital"
              },
              {
                icon: <Target className="h-8 w-8" style={{ color: primaryColor }} />,
                title: "Ferramentas Limitadas",
                description: "Ausência de ferramentas modernas de marketing"
              },
              {
                icon: <Shield className="h-8 w-8" style={{ color: primaryColor }} />,
                title: "Concorrência Desleal",
                description: "Concorrência com grandes players de e-commerce"
              }
            ].map((problem, index) => (
              <Card key={index} className="p-6 bg-white shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center space-x-4 mb-4">
                  {problem.icon}
                  <h3 className="text-lg font-bold" style={{ color: blackColor }}>
                    {problem.title}
                  </h3>
                </div>
                <p style={{ color: blackColor }}>{problem.description}</p>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12 p-6 bg-white rounded-lg shadow-lg max-w-3xl mx-auto">
            <p className="text-lg font-medium" style={{ color: blackColor }}>
              <strong>Essas barreiras limitam o crescimento dos lojistas, mesmo com grande fluxo de consumidores.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* 3. A Solução */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6" style={{ color: primaryColor }}>
              A Nossa Solução
            </h2>
            <p className="text-xl mb-8 max-w-4xl mx-auto" style={{ color: blackColor }}>
              O Partiu Saara é um aplicativo que conecta consumidores aos lojistas do Saara por meio de funcionalidades inovadoras:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Store className="h-12 w-12" style={{ color: primaryColor }} />,
                title: "Catálogo Digital",
                description: "Catálogo digital de produtos completo e organizado"
              },
              {
                icon: <Target className="h-12 w-12" style={{ color: primaryColor }} />,
                title: "Promoções e Reservas",
                description: "Sistema inteligente de promoções e reservas"
              },
              {
                icon: <MapPin className="h-12 w-12" style={{ color: primaryColor }} />,
                title: "Mapa Interativo",
                description: "Mapa interativo com rotas até a loja"
              },
              {
                icon: <MessageCircle className="h-12 w-12" style={{ color: primaryColor }} />,
                title: "WhatsApp Direto",
                description: "Link direto para o WhatsApp dos lojistas"
              },
              {
                icon: <BarChart3 className="h-12 w-12" style={{ color: primaryColor }} />,
                title: "Gestão Simplificada",
                description: "Ferramentas de gestão e CRM simplificado"
              }
            ].map((solution, index) => (
              <Card key={index} className="p-8 text-center bg-white shadow-lg hover:shadow-xl transition-shadow border-0">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: lightColor }}>
                  {solution.icon}
                </div>
                <h3 className="text-xl font-bold mb-4" style={{ color: blackColor }}>
                  {solution.title}
                </h3>
                <p style={{ color: blackColor }}>{solution.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Dados que comprovam a oportunidade */}
      <section className="py-16 lg:py-24" style={{ backgroundColor: primaryColor }}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6 text-white">
              Dados que Comprovam a Oportunidade
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                stat: "90%",
                description: "dos brasileiros pesquisam online antes de comprar",
                source: "(Google/PEGN)"
              },
              {
                stat: "50%+",
                description: "das compras físicas são influenciadas por pesquisas online",
                source: "(Think with Google)"
              },
              {
                stat: "54%",
                description: "dos consumidores do Sudeste pesquisam antes da compra presencial",
                source: "(Futura)"
              },
              {
                stat: "50%+",
                description: "visitam a loja em até 1 dia após a busca",
                source: "(Conversão)"
              }
            ].map((data, index) => (
              <Card key={index} className="p-6 text-center bg-white shadow-lg">
                <div className="text-4xl lg:text-5xl font-bold mb-4" style={{ color: primaryColor }}>
                  {data.stat}
                </div>
                <p className="text-lg mb-2" style={{ color: blackColor }}>
                  {data.description}
                </p>
                <p className="text-sm font-medium" style={{ color: secondaryColor }}>
                  {data.source}
                </p>
              </Card>
            ))}
          </div>

          <div className="text-center mt-16">
            <div className="bg-white rounded-lg p-8 max-w-4xl mx-auto shadow-xl">
              <h3 className="text-2xl font-bold mb-4" style={{ color: blackColor }}>
                Faixa Predominante: 25 a 44 anos (economicamente ativa)
              </h3>
              <p className="text-lg" style={{ color: blackColor }}>
                <strong>Comportamento híbrido cada vez mais forte:</strong> o consumidor pesquisa online e decide visitar a loja física. 
                <span style={{ color: primaryColor }}> Nosso app responde diretamente a esse comportamento.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Diferenciais Competitivos */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6" style={{ color: blackColor }}>
              Diferenciais Competitivos do <span style={{ color: primaryColor }}>Partiu Saara</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                icon: <Target className="h-8 w-8" style={{ color: primaryColor }} />,
                title: "Foco exclusivo no comércio popular"
              },
              {
                icon: <Smartphone className="h-8 w-8" style={{ color: primaryColor }} />,
                title: "Presença digital integrada com experiência física"
              },
              {
                icon: <TrendingUp className="h-8 w-8" style={{ color: primaryColor }} />,
                title: "Estimula visitas nas lojas, levando a vendas incrementais"
              },
              {
                icon: <Heart className="h-8 w-8" style={{ color: primaryColor }} />,
                title: "Entrada gratuita de lojistas no app"
              },
              {
                icon: <MapPin className="h-8 w-8" style={{ color: primaryColor }} />,
                title: "Mapa integrado do Google que mostra como chegar nas lojas"
              },
              {
                icon: <BarChart3 className="h-8 w-8" style={{ color: primaryColor }} />,
                title: "Ferramentas acessíveis de gestão de marketing dos lojistas"
              }
            ].map((differential, index) => (
              <div key={index} className="flex items-start space-x-4 p-6 rounded-lg" style={{ backgroundColor: grayColor }}>
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6" style={{ color: primaryColor }} />
                </div>
                <div className="flex items-center space-x-3">
                  {differential.icon}
                  <p className="text-lg font-medium" style={{ color: blackColor }}>
                    {differential.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Impacto Esperado */}
      <section className="py-16 lg:py-24" style={{ backgroundColor: secondaryColor }}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6 text-white">
              Impacto Esperado no Polo Saara
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <TrendingUp className="h-10 w-10 text-white" />,
                title: "Aumento na frequência de visitas ao centro comercial"
              },
              {
                icon: <MapPin className="h-10 w-10 text-white" />,
                title: "Acesso facilitado às lojas por rotas e mapa interativo"
              },
              {
                icon: <Users className="h-10 w-10 text-white" />,
                title: "Atração de um novo perfil de consumidor (mais jovem, digital)"
              },
              {
                icon: <Award className="h-10 w-10 text-white" />,
                title: "Valoração do Saara como polo inovador e estruturado digitalmente"
              },
              {
                icon: <Shield className="h-10 w-10 text-white" />,
                title: "Poder de competitividade em um mercado cada vez mais digital"
              },
              {
                icon: <MessageCircle className="h-10 w-10 text-white" />,
                title: "Capacidade de falar com todos os usuários cadastrados interessados em uma loja"
              }
            ].map((impact, index) => (
              <Card key={index} className="p-6 bg-white shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                    {impact.icon}
                  </div>
                </div>
                <p className="text-lg font-medium" style={{ color: blackColor }}>
                  {impact.title}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Parcerias */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6" style={{ color: blackColor }}>
              Parcerias que <span style={{ color: primaryColor }}>Buscamos</span>
            </h2>
            <p className="text-xl mb-8" style={{ color: blackColor }}>
              Com o apoio do Polo Saara, Sindilojas e Fecomércio, queremos:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="h-12 w-12" style={{ color: primaryColor }} />,
                title: "Acelerar a adesão de lojistas",
                description: "Facilitar o processo de cadastro e onboarding dos comerciantes"
              },
              {
                icon: <Target className="h-12 w-12" style={{ color: primaryColor }} />,
                title: "Co-criar campanhas promocionais integradas",
                description: "Desenvolver estratégias de marketing conjunto para maximizar resultados"
              },
              {
                icon: <Award className="h-12 w-12" style={{ color: primaryColor }} />,
                title: "Posicionar o Saara como referência nacional",
                description: "Tornar o Saara modelo em comércio popular digitalizado"
              }
            ].map((partnership, index) => (
              <Card key={index} className="p-8 text-center bg-white shadow-lg hover:shadow-xl transition-shadow border-0">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: lightColor }}>
                  {partnership.icon}
                </div>
                <h3 className="text-xl font-bold mb-4" style={{ color: blackColor }}>
                  {partnership.title}
                </h3>
                <p style={{ color: blackColor }}>{partnership.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Fechamento */}
      <section className="py-16 lg:py-24" style={{ backgroundColor: blackColor }}>
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold mb-8 text-white">
            O Partiu Saara não é apenas um aplicativo
          </h2>
          <p className="text-xl lg:text-2xl mb-8 max-w-4xl mx-auto text-white leading-relaxed">
            É uma <span style={{ color: primaryColor }}>ponte entre o tradicional e o digital</span>, 
            entre o comércio popular e o consumidor do smartphone.
          </p>
          <p className="text-xl mb-12 max-w-4xl mx-auto text-white">
            Com o apoio de vocês, podemos transformar o Saara em um exemplo de 
            <strong> revitalização econômica</strong> com base em tecnologia acessível e inclusiva.
          </p>
          
          <div className="bg-white rounded-lg p-8 max-w-3xl mx-auto shadow-xl">
            <h3 className="text-2xl font-bold mb-6" style={{ color: primaryColor }}>
              Muito obrigado!
            </h3>
            <p className="text-xl font-medium mb-6" style={{ color: blackColor }}>
              Vamos juntos nessa jornada.
            </p>
            <Button 
              size="lg" 
              className="text-white text-lg px-8 py-4"
              style={{ backgroundColor: primaryColor }}
            >
              Fazer Parceria Conosco
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <ShoppingBag className="h-8 w-8" style={{ color: primaryColor }} />
            <span className="text-2xl font-bold" style={{ color: blackColor }}>
              Partiu <span style={{ color: primaryColor }}>Saara</span>
            </span>
          </div>
          <p style={{ color: blackColor }}>
            Transformando o maior polo popular do Brasil através da tecnologia
          </p>
        </div>
      </footer>
    </div>
  );
}