import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Link } from 'wouter';
import { useState } from 'react';
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
  Search,
  X
} from 'lucide-react';

export default function Presentation() {
  const [selectedSolution, setSelectedSolution] = useState<string | null>(null);
  
  const primaryColor = '#EB690A';
  const secondaryColor = '#F28B50';
  const lightColor = '#F2B591';
  const grayColor = '#F2F2F2';
  const blackColor = '#0D0D0D';

  const solutions = [
    {
      id: 'catalogo',
      icon: <Store className="h-12 w-12" style={{ color: primaryColor }} />,
      title: "Catálogo Digital",
      description: "Catálogo digital de produtos completo e organizado",
      detailedDescription: "Sistema completo de gestão de produtos com fotos, descrições detalhadas, preços e categorização inteligente. Permite aos lojistas criar vitrines digitais atrativas e organizadas.",
      features: [
        "Upload de múltiplas imagens por produto",
        "Categorização automática e manual",
        "Controle de estoque em tempo real",
        "Descrições detalhadas com especificações",
        "Preços promocionais e descontos"
      ]
    },
    {
      id: 'promocoes',
      icon: <Target className="h-12 w-12" style={{ color: primaryColor }} />,
      title: "Promoções e Reservas",
      description: "Sistema inteligente de promoções e reservas",
      detailedDescription: "Plataforma avançada para criação de campanhas promocionais e sistema de reservas que conecta clientes diretamente com as lojas.",
      features: [
        "Criação de promoções por tempo limitado",
        "Sistema de reserva de produtos",
        "Notificações automáticas para clientes",
        "Controle de quantidade de reservas",
        "Histórico de promoções e performance"
      ]
    },
    {
      id: 'mapa',
      icon: <MapPin className="h-12 w-12" style={{ color: primaryColor }} />,
      title: "Mapa Interativo",
      description: "Mapa interativo com rotas até a loja",
      detailedDescription: "Integração completa com Google Maps oferecendo localização precisa das lojas e navegação otimizada para os clientes.",
      features: [
        "Localização GPS precisa das lojas",
        "Rotas otimizadas em tempo real",
        "Informações de trânsito e transporte público",
        "Visualização de lojas próximas",
        "Estimativa de tempo de chegada"
      ]
    },
    {
      id: 'whatsapp',
      icon: <MessageCircle className="h-12 w-12" style={{ color: primaryColor }} />,
      title: "WhatsApp Direto",
      description: "Link direto para o WhatsApp dos lojistas",
      detailedDescription: "Conexão instantânea entre clientes e lojistas através do WhatsApp, facilitando negociações e atendimento personalizado.",
      features: [
        "Link direto para WhatsApp da loja",
        "Mensagens pré-definidas sobre produtos",
        "Integração com catálogo de produtos",
        "Histórico de conversas organizadas",
        "Atendimento personalizado e rápido"
      ]
    },
    {
      id: 'gestao',
      icon: <BarChart3 className="h-12 w-12" style={{ color: primaryColor }} />,
      title: "Gestão Simplificada",
      description: "Ferramentas de gestão e CRM simplificado",
      detailedDescription: "Suite completa de ferramentas de gestão empresarial adaptada para o comércio popular, com interface intuitiva e funcionalidades essenciais.",
      features: [
        "Dashboard com métricas principais",
        "Controle de vendas e estoque",
        "Relatórios de performance",
        "Gestão de clientes (CRM básico)",
        "Análise de dados de visitação"
      ]
    }
  ];

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
            {solutions.map((solution, index) => (
              <Card 
                key={index} 
                className="p-8 text-center bg-white shadow-lg hover:shadow-xl transition-all duration-300 border-0 cursor-pointer transform hover:scale-105"
                onClick={() => setSelectedSolution(solution.id)}
              >
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: lightColor }}>
                  {solution.icon}
                </div>
                <h3 className="text-xl font-bold mb-4" style={{ color: blackColor }}>
                  {solution.title}
                </h3>
                <p style={{ color: blackColor }}>{solution.description}</p>
                <div className="mt-4">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-white hover:bg-orange-600"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Ver Detalhes
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
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

      {/* Modal para detalhes das soluções */}
      {selectedSolution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header do Modal */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: lightColor }}>
                    {solutions.find(s => s.id === selectedSolution)?.icon}
                  </div>
                  <h2 className="text-3xl font-bold" style={{ color: blackColor }}>
                    {solutions.find(s => s.id === selectedSolution)?.title}
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSolution(null)}
                  className="hover:bg-gray-100"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>

              {/* Conteúdo do Modal */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Lado esquerdo - Imagem ilustrativa */}
                <div className="space-y-6">
                  <div className="aspect-video bg-gradient-to-br rounded-lg p-8 flex items-center justify-center" style={{ backgroundColor: grayColor }}>
                    {/* Renderização da imagem baseada no tipo de solução */}
                    {selectedSolution === 'catalogo' && (
                      <div className="text-center">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-white rounded-lg p-4 shadow-lg">
                            <div className="w-full h-24 bg-gray-200 rounded mb-2"></div>
                            <div className="h-3 bg-gray-300 rounded mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                          </div>
                          <div className="bg-white rounded-lg p-4 shadow-lg">
                            <div className="w-full h-24 bg-gray-200 rounded mb-2"></div>
                            <div className="h-3 bg-gray-300 rounded mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                          </div>
                        </div>
                        <Store className="h-16 w-16 mx-auto" style={{ color: primaryColor }} />
                        <p className="text-lg font-semibold mt-2" style={{ color: blackColor }}>Catálogo Digital Organizado</p>
                      </div>
                    )}

                    {selectedSolution === 'promocoes' && (
                      <div className="text-center">
                        <div className="relative bg-white rounded-lg p-6 shadow-lg mb-4">
                          <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full px-3 py-1 text-sm font-bold">
                            50% OFF
                          </div>
                          <div className="w-full h-32 bg-gray-200 rounded mb-4"></div>
                          <div className="h-4 bg-gray-300 rounded mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                        </div>
                        <Target className="h-16 w-16 mx-auto" style={{ color: primaryColor }} />
                        <p className="text-lg font-semibold mt-2" style={{ color: blackColor }}>Promoções Inteligentes</p>
                      </div>
                    )}

                    {selectedSolution === 'mapa' && (
                      <div className="text-center">
                        <div className="bg-white rounded-lg p-4 shadow-lg mb-4 relative">
                          <div className="w-full h-32 bg-gradient-to-br from-green-200 to-blue-200 rounded mb-2 relative">
                            <div className="absolute top-4 left-4 w-3 h-3 bg-red-500 rounded-full"></div>
                            <div className="absolute bottom-4 right-4 w-3 h-3 bg-blue-500 rounded-full"></div>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                              <div className="w-1 h-8 bg-blue-500 transform rotate-45"></div>
                            </div>
                          </div>
                          <div className="text-sm font-medium" style={{ color: blackColor }}>15 min de caminhada</div>
                        </div>
                        <MapPin className="h-16 w-16 mx-auto" style={{ color: primaryColor }} />
                        <p className="text-lg font-semibold mt-2" style={{ color: blackColor }}>Navegação Inteligente</p>
                      </div>
                    )}

                    {selectedSolution === 'whatsapp' && (
                      <div className="text-center">
                        <div className="bg-white rounded-lg p-4 shadow-lg mb-4">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-green-500"></div>
                            <div className="flex-1">
                              <div className="h-3 bg-gray-300 rounded mb-1"></div>
                              <div className="h-2 bg-gray-200 rounded w-2/3"></div>
                            </div>
                          </div>
                          <div className="bg-green-100 rounded-lg p-3 text-left">
                            <div className="h-2 bg-green-300 rounded mb-1"></div>
                            <div className="h-2 bg-green-200 rounded w-3/4"></div>
                          </div>
                        </div>
                        <MessageCircle className="h-16 w-16 mx-auto" style={{ color: primaryColor }} />
                        <p className="text-lg font-semibold mt-2" style={{ color: blackColor }}>WhatsApp Integrado</p>
                      </div>
                    )}

                    {selectedSolution === 'gestao' && (
                      <div className="text-center">
                        <div className="bg-white rounded-lg p-4 shadow-lg mb-4">
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            <div className="h-8 bg-blue-200 rounded"></div>
                            <div className="h-12 bg-blue-300 rounded"></div>
                            <div className="h-6 bg-blue-200 rounded"></div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="h-3 bg-gray-300 rounded"></div>
                            <div className="h-3 bg-gray-200 rounded"></div>
                          </div>
                        </div>
                        <BarChart3 className="h-16 w-16 mx-auto" style={{ color: primaryColor }} />
                        <p className="text-lg font-semibold mt-2" style={{ color: blackColor }}>Dashboard Intuitivo</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lado direito - Informações detalhadas */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold mb-3" style={{ color: blackColor }}>Descrição Detalhada</h3>
                    <p className="text-lg leading-relaxed" style={{ color: blackColor }}>
                      {solutions.find(s => s.id === selectedSolution)?.detailedDescription}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold mb-3" style={{ color: blackColor }}>Principais Funcionalidades</h3>
                    <ul className="space-y-3">
                      {solutions.find(s => s.id === selectedSolution)?.features.map((feature, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <CheckCircle className="h-5 w-5 mt-1 flex-shrink-0" style={{ color: primaryColor }} />
                          <span style={{ color: blackColor }}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4">
                    <Button
                      onClick={() => setSelectedSolution(null)}
                      className="w-full text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Entendi, Fechar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}