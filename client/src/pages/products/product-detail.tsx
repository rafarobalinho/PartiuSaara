import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, calculateDiscountPercentage, getTimeRemaining } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import ProductCard from '@/components/ui/product-card';
import CountdownTimer from '@/components/ui/countdown-timer';

// Função que verifica se uma imagem deve ser usada
function getValidImage(imageUrl: string | undefined, fallbackUrl: string): string {
  // Se não tiver URL, usa a imagem padrão
  if (!imageUrl) return fallbackUrl;
  
  // Retorna a URL original passada pelo banco de dados
  return imageUrl;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  discountedPrice?: number;
  category: string;
  stock: number;
  images: string[];
  store: {
    id: number;
    name: string;
    rating: number;
    reviewCount: number;
  };
  promotion?: {
    id: number;
    type: 'flash' | 'regular';
    discountPercentage: number;
    startTime: string;
    endTime: string;
  };
}

export default function ProductDetail() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeImage, setActiveImage] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: [`/api/products/${id}`]
    // Removendo o queryFn personalizado para usar o padrão do queryClient
    // que já está configurado para todas as consultas
  });

  const { data: relatedProducts = [], isLoading: isRelatedLoading } = useQuery({
    queryKey: [`/api/products/${id}/related`],
    enabled: !!product
  });

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para adicionar produtos aos favoritos.',
        variant: "default",
      });
      return;
    }

    try {
      await apiRequest(
        isWishlisted ? 'DELETE' : 'POST',
        `/api/wishlist/${id}`,
        {}
      );
      
      setIsWishlisted(!isWishlisted);
      toast({
        title: isWishlisted ? 'Removido dos favoritos' : 'Adicionado aos favoritos',
        description: isWishlisted ? 
          `${product.name} foi removido da sua lista de desejos.` : 
          `${product.name} foi adicionado à sua lista de desejos.`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao atualizar os favoritos.',
        variant: "destructive",
      });
      console.error('Error toggling wishlist:', error);
    }
  };

  const handleReserve = async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para reservar produtos.',
        variant: "default",
      });
      return;
    }

    try {
      await apiRequest(
        'POST',
        `/api/reservations`,
        { productId: id }
      );
      
      toast({
        title: 'Reserva criada',
        description: `${product.name} foi reservado com sucesso. Você tem 72 horas para retirar.`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao reservar o produto.',
        variant: "destructive",
      });
      console.error('Error reserving product:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-1/2">
            <div className="aspect-square bg-gray-200 animate-pulse rounded-lg mb-4"></div>
            <div className="flex space-x-2">
              {[0, 1, 2].map((_, index) => (
                <div key={index} className="w-20 h-20 bg-gray-200 animate-pulse rounded"></div>
              ))}
            </div>
          </div>
          <div className="md:w-1/2">
            <div className="h-8 bg-gray-200 animate-pulse rounded w-3/4 mb-2"></div>
            <div className="h-6 bg-gray-200 animate-pulse rounded w-1/4 mb-4"></div>
            <div className="h-24 bg-gray-200 animate-pulse rounded mb-4"></div>
            <div className="h-10 bg-gray-200 animate-pulse rounded mb-4"></div>
            <div className="h-12 bg-gray-200 animate-pulse rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4"><i className="fas fa-exclamation-circle text-gray-300"></i></div>
        <h2 className="text-xl font-bold mb-2">Produto não encontrado</h2>
        <p className="text-gray-600 mb-6">O produto que você está procurando não existe ou foi removido.</p>
        <Button asChild className="bg-primary text-white hover:bg-primary/90">
          <Link href="/products">
            <a>Ver todos os produtos</a>
          </Link>
        </Button>
      </div>
    );
  }

  const discount = product.discountedPrice 
    ? calculateDiscountPercentage(product.price, product.discountedPrice)
    : 0;

  const isFlashPromotion = product.promotion?.type === 'flash';
  const endTime = isFlashPromotion ? new Date(product.promotion.endTime) : null;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center mb-6 text-sm">
        <Link href="/products">
          <a className="text-gray-500 hover:text-primary">Produtos</a>
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <Link href={`/categories/${product.category}`}>
          <a className="text-gray-500 hover:text-primary">{product.category}</a>
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="font-medium text-gray-900 truncate max-w-[200px]">{product.name}</span>
      </div>

      <div className="flex flex-col md:flex-row gap-8 mb-12">
        {/* Product Images */}
        <div className="md:w-1/2">
          <div className="bg-white rounded-lg overflow-hidden mb-4">
            <div className="aspect-square relative">
              {discount > 0 && (
                <div className="absolute top-4 left-0 bg-primary text-white z-10 py-1 px-3 rounded-r-lg font-semibold">
                  -{discount}%
                </div>
              )}
              <img 
                src={getValidImage(product.images[activeImage], 'https://static.wixstatic.com/media/1f3c2d_25683f6b139a4861869b40e5a7a70af2~mv2.jpg/v1/fill/w_640,h_560,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/1f3c2d_25683f6b139a4861869b40e5a7a70af2~mv2.jpg')} 
                alt={product.name} 
                className="w-full h-full object-contain p-4"
              />
            </div>
          </div>
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {product.images.map((image, index) => (
              <button
                key={index}
                className={`w-20 h-20 rounded-md border-2 ${activeImage === index ? 'border-primary' : 'border-transparent'}`}
                onClick={() => setActiveImage(index)}
              >
                <img 
                  src={getValidImage(image, 'https://static.wixstatic.com/media/1f3c2d_25683f6b139a4861869b40e5a7a70af2~mv2.jpg/v1/fill/w_640,h_560,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/1f3c2d_25683f6b139a4861869b40e5a7a70af2~mv2.jpg')} 
                  alt={`${product.name} - imagem ${index + 1}`} 
                  className="w-full h-full object-fit"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="md:w-1/2">
          <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
          
          {product.store && (
            <Link href={`/stores/${product.store.id}`}>
              <a className="text-primary hover:underline inline-flex items-center mb-4">
                <i className="fas fa-store mr-1"></i>
                <span>{product.store.name}</span>
                <div className="flex items-center ml-3 text-sm text-gray-700">
                  <i className="fas fa-star text-yellow-400 mr-1"></i>
                  <span>{product.store.rating.toFixed(1)}</span>
                  <span className="mx-1">•</span>
                  <span>{product.store.reviewCount} avaliações</span>
                </div>
              </a>
            </Link>
          )}

          <div className="mb-4">
            {isFlashPromotion && endTime && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4 flex items-center">
                <i className="fas fa-bolt text-primary mr-2"></i>
                <div>
                  <div className="text-sm font-medium">Promoção Relâmpago</div>
                  <CountdownTimer 
                    endTime={endTime} 
                    onComplete={() => {
                      toast({
                        title: 'Promoção finalizada',
                        description: 'Esta promoção relâmpago já foi encerrada.',
                        variant: "default",
                      });
                    }} 
                  />
                </div>
              </div>
            )}

            <div className="flex items-center mb-1">
              {product.discountedPrice ? (
                <>
                  <span className="text-gray-400 line-through text-lg mr-2">{formatCurrency(product.price)}</span>
                  <span className="text-primary font-bold text-3xl">{formatCurrency(product.discountedPrice)}</span>
                </>
              ) : (
                <span className="text-primary font-bold text-3xl">{formatCurrency(product.price)}</span>
              )}
            </div>

            <div className="flex items-center mb-4">
              <Badge variant={product.stock > 0 ? "outline" : "secondary"} className="text-xs">
                {product.stock > 0 ? `${product.stock} em estoque` : 'Fora de estoque'}
              </Badge>
            </div>
          </div>

          <div className="prose max-w-none mb-6">
            <p className="text-gray-700">{product.description}</p>
          </div>

          <div className="flex flex-col space-y-3">
            <Button
              onClick={handleReserve}
              className="bg-primary text-white hover:bg-primary/90 h-12 text-base"
              disabled={product.stock <= 0}
            >
              <i className="fas fa-bookmark mr-2"></i> Reservar Produto
            </Button>

            <Button
              onClick={handleWishlistToggle}
              variant="outline"
              className={`border-primary ${isWishlisted ? 'bg-primary/10 text-primary' : 'text-primary hover:bg-primary/5'}`}
            >
              <i className={`${isWishlisted ? 'fas' : 'far'} fa-heart mr-2`}></i>
              {isWishlisted ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
            </Button>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <div className="text-sm text-gray-500">
              <div className="flex items-center mb-2">
                <i className="fas fa-info-circle mr-2"></i>
                <span>Retirada diretamente na loja. Reserve agora e garanta seu produto por até 72 horas.</span>
              </div>
              <div className="flex items-center">
                <i className="fas fa-shield-alt mr-2"></i>
                <span>Política de troca diretamente com o lojista. Consulte condições na loja física.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <Tabs defaultValue="details">
          <TabsList className="mb-4">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="store">Sobre a Loja</TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium mb-3">Descrição do Produto</h3>
              <p className="text-gray-700 whitespace-pre-line">{product.description}</p>
              
              <h3 className="text-lg font-medium mt-6 mb-3">Especificações</h3>
              <ul className="list-disc pl-5">
                <li className="text-gray-700">Categoria: {product.category}</li>
                {product.store && (
                  <li className="text-gray-700">Vendido por: {product.store.name}</li>
                )}
                <li className="text-gray-700">Disponibilidade: {product.stock > 0 ? `${product.stock} unidades em estoque` : 'Fora de estoque'}</li>
              </ul>
            </div>
          </TabsContent>
          <TabsContent value="store">
            {product.store ? (
              <>
                <div className="flex items-center mb-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full mr-4 flex items-center justify-center">
                    <i className="fas fa-store text-primary text-2xl"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">{product.store.name}</h3>
                    <div className="flex items-center text-sm text-gray-700">
                      <i className="fas fa-star text-yellow-400 mr-1"></i>
                      <span>{product.store.rating.toFixed(1)}</span>
                      <span className="mx-1">•</span>
                      <span>{product.store.reviewCount} avaliações</span>
                    </div>
                  </div>
                </div>
                
                <Button asChild className="bg-primary text-white hover:bg-primary/90">
                  <Link href={`/stores/${product.store.id}`}>
                    <a>Ver Loja</a>
                  </Link>
                </Button>
              </>
            ) : (
              <div className="text-gray-500 italic">
                Informações da loja não disponíveis
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Produtos Relacionados</h2>
            <Link href={`/categories/${product.category}`}>
              <a className="text-primary text-sm font-medium">
                Ver mais <i className="fas fa-chevron-right text-xs ml-1"></i>
              </a>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {isRelatedLoading ? (
              Array(4).fill(0).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-gray-200 animate-pulse"></div>
                  <div className="p-3">
                    <div className="h-4 bg-gray-200 animate-pulse mb-1 w-1/3"></div>
                    <div className="h-10 bg-gray-200 animate-pulse mb-2"></div>
                    <div className="h-5 bg-gray-200 animate-pulse mb-3 w-1/2"></div>
                    <div className="h-8 bg-gray-200 animate-pulse w-full rounded-lg"></div>
                  </div>
                </div>
              ))
            ) : (
              relatedProducts.slice(0, 4).map((relatedProduct: Product) => (
                <ProductCard
                  key={relatedProduct.id}
                  product={relatedProduct}
                  showCategory={false}
                  showFullWidthButton={true}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
