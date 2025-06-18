import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, calculateDiscountPercentage, getTimeRemaining } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import ProductCard from '@/components/ui/product-card';
import CountdownTimer from '@/components/ui/countdown-timer';
import { Loader2 } from 'lucide-react';
import { ImageComponent } from '@/components/ui/image-component';

// Função que verifica se uma imagem deve ser usada
function getValidImage(imageUrl: string | undefined, fallbackUrl: string): string {
  // Se não tiver URL, usa a imagem padrão
  if (!imageUrl) return fallbackUrl;

  // Verifica se a imagem é uma URL válida
  try {
    new URL(imageUrl);
    return imageUrl;
  } catch (e) {
    // Se não for uma URL válida, retorna a imagem padrão
    return fallbackUrl;
  }
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  discountedPrice?: number;
  category: string;
  stock: number;
  storeId: number; // ID da loja adicionado para uso com ImageComponent
  images: any[]; // Alterado para aceitar strings ou objetos
  store?: {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productData, setProductData] = useState<Product | null>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: [`/api/products/${id}`]
  });

  const { data: relatedProducts = [], isLoading: isRelatedLoading } = useQuery({
    queryKey: [`/api/products/${id}/related`],
    enabled: !!product
  });

  // Implementar useEffect para inicialização segura do produto
  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const productId = id;
        console.log('Buscando detalhes do produto ID:', productId);

        if (!productId) {
          console.error('ID do produto não fornecido na URL');
          setError('Produto não encontrado');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/products/${productId}`);
        const data = await response.json();
        console.log('Resposta da API de produto:', data);

        if (!data || !data.product || !data.product.id) {
          setError('Produto não encontrado');
          setLoading(false);
          return;
        }

        // Garantir valores padrão seguros para todos os campos
        const safeProduct = {
          id: data.product.id,
          name: data.product.name || 'Produto sem nome',
          description: data.product.description || 'Sem descrição disponível',
          price: typeof data.product.price === 'number' ? data.product.price : 0,
          discountedPrice: typeof data.product.discountedPrice === 'number' ? data.product.discountedPrice : null,
          stock: typeof data.product.stock === 'number' ? data.product.stock : 0,
          category: data.product.category || 'Sem categoria',
          storeId: data.product.storeId || data.product.store_id || 0, // Garantir que temos o ID da loja
          images: []
        };

        // Processar imagens
        if (data.product.images && Array.isArray(data.product.images)) {
          safeProduct.images = data.product.images;
        } else if (data.product.primary_image) {
          safeProduct.images = [data.product.primary_image];
        }

        // Se ainda não tiver imagens, buscar da API separadamente
        if (safeProduct.images.length === 0) {
          try {
            const imagesResponse = await fetch(`/api/products/${productId}/images`);
            const imagesData = await imagesResponse.json();
            console.log('Imagens do produto:', imagesData);

            if (imagesData && Array.isArray(imagesData)) {
              safeProduct.images = imagesData;
            }
          } catch (imageError) {
            console.error('Erro ao buscar imagens do produto:', imageError);
            // Continuamos mesmo sem imagens
          }
        }

        // Buscar informações da loja
        try {
          if (safeProduct.storeId) {
            const storeResponse = await fetch(`/api/stores/${safeProduct.storeId}`);
            const storeData = await storeResponse.json();
            console.log('Informações da loja:', storeData);

            if (storeData) {
              safeProduct.store = {
                id: storeData.id || safeProduct.storeId,
                name: storeData.name || 'Loja',
                rating: storeData.rating || 5.0,
                reviewCount: storeData.reviewCount || 0
              };
            }
          }
        } catch (storeError) {
          console.error('Erro ao buscar informações da loja:', storeError);
          // Continuamos mesmo sem informações da loja
        }

        console.log('Produto normalizado:', safeProduct);
        setProductData(safeProduct as Product);
      } catch (error) {
        console.error('Erro ao carregar detalhes do produto:', error);
        setError('Erro ao carregar detalhes do produto');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [id]);

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
          `${productData?.name || 'Produto'} foi removido da sua lista de desejos.` : 
          `${productData?.name || 'Produto'} foi adicionado à sua lista de desejos.`,
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
        description: `${productData?.name || 'Produto'} foi reservado com sucesso. Você tem 72 horas para retirar.`,
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

  if (loading || isLoading) {
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

  if (error || !productData) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4"><i className="fas fa-exclamation-circle text-gray-300"></i></div>
        <h2 className="text-xl font-bold mb-2">Produto não encontrado</h2>
        <p className="text-gray-600 mb-6">{error || 'O produto que você está procurando não existe ou foi removido.'}</p>
        <Link href="/products">
          <Button className="bg-primary text-white hover:bg-primary/90">
            Ver todos os produtos
          </Button>
        </Link>
      </div>
    );
  }

  const discount = productData.discountedPrice 
    ? calculateDiscountPercentage(productData.price, productData.discountedPrice)
    : 0;

  const isFlashPromotion = productData.promotion?.type === 'flash';
  const endTime = isFlashPromotion ? new Date(productData.promotion.endTime) : null;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center mb-6 text-sm">
        <Link href="/products" className="text-gray-500 hover:text-primary">
          Produtos
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <Link href={`/categories/${productData.category}`} className="text-gray-500 hover:text-primary">
          {productData.category}
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="font-medium text-gray-900 truncate max-w-[200px]">{productData.name}</span>
      </div>

      <div className="flex flex-col md:flex-row gap-8 mb-12">
        {/* Product Images */}
        <div className="md:w-1/2">
          {/* Imagem principal do produto */}
          <div className="relative pt-[56.25%] bg-gray-100">
            {productData && productData.images && productData.images.length > 0 ? (
              <ImageComponent 
                src={(() => {
                  const currentImage = productData.images?.[activeImage];
                  if (!currentImage) return '/placeholder-image.jpg';
                  
                  if (typeof currentImage === 'string') {
                    return currentImage;
                  }
                  
                  return currentImage?.image_url || '/placeholder-image.jpg';
                })()} 
                alt={productData.name} 
                className="absolute top-0 left-0 w-full h-full object-contain p-4"
                productId={productData.id}
                storeId={productData.storeId}
              />
            ) : (
              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                <span className="text-gray-400">Sem imagem disponível</span>
              </div>
            )}
            {discount > 0 && (
              <div className="absolute top-4 left-0 bg-primary text-white z-10 py-1 px-3 rounded-r-lg font-semibold">
                -{discount}%
              </div>
            )}
          </div>

          {/* Galeria de imagens */}
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Mais imagens</h3>
            <div className="flex overflow-x-auto space-x-2 pb-2">
              {productData && productData.images && productData.images.length > 0 ? (
                productData.images.map((image, index) => (
                  <div 
                    key={index} 
                    className={`w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border-2 cursor-pointer ${activeImage === index ? 'border-primary' : 'border-gray-200'}`}
                    onClick={() => setActiveImage(index)}
                  >
                    <ImageComponent 
                      src={(() => {
                        if (!image) return '/placeholder-image.jpg';
                        
                        if (typeof image === 'string') {
                          return image;
                        }
                        
                        return image?.thumbnail_url || image?.image_url || '/placeholder-image.jpg';
                      })()} 
                      alt={`${productData.name} - imagem ${index + 1}`} 
                      className="w-full h-full object-cover"
                      productId={productData.id}
                      storeId={productData.storeId}
                    />
                  </div>
                ))
              ) : (
                <div className="w-20 h-20 bg-gray-100 rounded-md flex items-center justify-center">
                  <span className="text-gray-400 text-sm">Sem imagens</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div className="md:w-1/2">
          <h1 className="text-2xl font-bold mb-2">{productData.name}</h1>

          {productData.store && (
            <Link href={`/stores/${productData.store.id}`} className="text-primary hover:underline inline-flex items-center mb-4">
              <i className="fas fa-store mr-1"></i>
              <span>{productData.store.name}</span>
              <div className="flex items-center ml-3 text-sm text-gray-700">
                <i className="fas fa-star text-yellow-400 mr-1"></i>
                <span>{productData.store.rating.toFixed(1)}</span>
                <span className="mx-1">•</span>
                <span>{productData.store.reviewCount} avaliações</span>
              </div>
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

            {/* Preço do produto */}
            <div className="flex items-center mb-1">
              {productData && productData.discountedPrice ? (
                <>
                  <span className="line-through text-gray-400 text-lg mr-2">
                    R$ {productData.price ? productData.price.toFixed(2).replace('.', ',') : '0,00'}
                  </span>
                  <span className="text-primary font-bold text-3xl">
                    R$ {productData.discountedPrice.toFixed(2).replace('.', ',')}
                  </span>
                </>
              ) : (
                <span className="text-primary font-bold text-3xl">
                  R$ {productData && productData.price ? productData.price.toFixed(2).replace('.', ',') : '0,00'}
                </span>
              )}
            </div>

            <div className="flex items-center mb-4">
              <Badge variant={productData.stock > 0 ? "outline" : "secondary"} className="text-xs">
                {productData.stock > 0 ? `${productData.stock} em estoque` : 'Fora de estoque'}
              </Badge>
            </div>
          </div>

          <div className="prose max-w-none mb-6">
            <p className="text-gray-700">{productData.description}</p>
          </div>

          <div className="flex flex-col space-y-3">
            <Button
              onClick={handleReserve}
              className="bg-primary text-white hover:bg-primary/90 h-12 text-base"
              disabled={productData.stock <= 0}
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
              <p className="text-gray-700 whitespace-pre-line">{productData.description}</p>

              <h3 className="text-lg font-medium mt-6 mb-3">Especificações</h3>
              <ul className="list-disc pl-5">
                <li className="text-gray-700">Categoria: {productData.category}</li>
                {productData.store && (
                  <li className="text-gray-700">Vendido por: {productData.store.name}</li>
                )}
                <li className="text-gray-700">Disponibilidade: {productData.stock > 0 ? `${productData.stock} unidades em estoque` : 'Fora de estoque'}</li>
              </ul>
            </div>
          </TabsContent>
          <TabsContent value="store">
            {productData.store ? (
              <>
                <div className="flex items-center mb-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full mr-4 flex items-center justify-center">
                    <i className="fas fa-store text-primary text-2xl"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">{productData.store.name}</h3>
                    <div className="flex items-center text-sm text-gray-700">
                      <i className="fas fa-star text-yellow-400 mr-1"></i>
                      <span>{productData.store.rating.toFixed(1)}</span>
                      <span className="mx-1">•</span>
                      <span>{productData.store.reviewCount} avaliações</span>
                    </div>
                  </div>
                </div>

                <Link href={`/stores/${productData.store.id}`}>
                  <Button className="bg-primary text-white hover:bg-primary/90">
                    Ver Loja
                  </Button>
                </Link>
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
      {Array.isArray(relatedProducts) && relatedProducts.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Produtos Relacionados</h2>
            <Link href={`/categories/${productData.category}`} className="text-primary text-sm font-medium">
              Ver mais <i className="fas fa-chevron-right text-xs ml-1"></i>
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
              relatedProducts.slice(0, 4).map((relatedProduct: any) => (
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