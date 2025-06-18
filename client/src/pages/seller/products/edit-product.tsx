import { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/ui/image-upload';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { SafeImage } from "@/components/ui/safe-image";
import { ArrowLeft, Save, X } from "lucide-react";

// Esquema de validação para o formulário
const productSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  price: z.coerce.number().min(0.01, 'Preço deve ser maior que zero'),
  discountedPrice: z.coerce.number().min(0).optional(),
  category: z.string().min(1, 'Selecione uma categoria'),
  stock: z.coerce.number().min(0).optional(),
  images: z.array(z.string()).optional(),
  storeId: z.coerce.number(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function EditProduct() {
  const { id } = useParams();
  const { isAuthenticated, isSeller } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [productImages, setProductImages] = useState<string[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [imagesChanged, setImagesChanged] = useState(false);

  // Estados separados para imagens existentes e previews
  const [existingImages, setExistingImages] = useState<Array<{
    id: number;
    url: string;
    thumbnail_url: string;
    is_primary: boolean;
  }>>([]);
  const [previewImages, setPreviewImages] = useState<Array<{
    file: File;
    preview: string;
  }>>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Estados para controle do produto
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar dados do produto via useEffect para melhor controle de erros
  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const productId = id;
        console.log('Tentando carregar produto para edição, ID:', productId);

        if (!productId) {
          console.error('ID do produto não fornecido na URL');
          setError('ID do produto não encontrado');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/products/${productId}`);
        const data = await response.json();
        console.log('Dados do produto recebidos:', data);

        // Verifique se os dados do produto existem
        if (!data.product || !data.product.id) {
          console.error('Produto não encontrado ou dados inválidos');
          setError('Produto não encontrado');
          setLoading(false);
          return;
        }

        // Crie um objeto produto com valores padrão seguros para evitar undefined
        const safeProduct = {
          id: data.product.id,
          name: data.product.name || '',
          description: data.product.description || '',
          category: data.product.category || '',
          price: data.product.price || 0,
          discountedPrice: data.product.discountedPrice || null,
          stock: data.product.stock || 0,
          images: Array.isArray(data.product.images) ? data.product.images : [],
          storeId: data.product.storeId || null,
          // Adicione outras propriedades conforme necessário
        };

        console.log('Produto normalizado:', safeProduct);

        // Atualize o estado principal
        setProduct(safeProduct);

        // Atualize os estados individuais dos campos do formulário
        if (Array.isArray(safeProduct.images)) {
          setProductImages(safeProduct.images);
        } else {
          setProductImages([]);
        }

        // Segurança para store_id
        if (safeProduct.storeId) {
          setSelectedStore(safeProduct.storeId.toString());
        }

        // Se não houver imagens no objeto do produto, tente buscá-las separadamente
        if (!safeProduct.images || safeProduct.images.length === 0) {
          try {
            const imagesResponse = await fetch(`/api/products/${productId}/images`);
            const imagesData = await imagesResponse.json();
            console.log('Imagens do produto:', imagesData);

            if (imagesData && Array.isArray(imagesData)) {
              setProductImages(imagesData);
            }
          } catch (imageError) {
            console.error('Erro ao buscar imagens do produto:', imageError);
            // Não definir erro aqui, apenas log, para não bloquear a edição
          }
        }
      } catch (error) {
        console.error('Erro ao carregar produto para edição:', error);
        setError('Erro ao carregar dados do produto. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [id]);

  // If not authenticated or not a seller, redirect
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (!isSeller) {
      navigate('/account');
    }
  }, [isAuthenticated, isSeller, navigate]);

  if (!isAuthenticated || !isSeller) {
    return null;
  }

  // Fetch stores
  const { data: stores = [] } = useQuery({
    queryKey: ['/api/stores/my-stores'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/stores/my-stores', {
          credentials: 'include',
        });
        if (!res.ok) {
          throw new Error('Falha ao carregar lojas');
        }
        return await res.json();
      } catch (error) {
        console.error('Error fetching stores:', error);
        return [];
      }
    }
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/categories');
        if (!res.ok) {
          throw new Error('Falha ao carregar categorias');
        }
        return await res.json();
      } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
      }
    }
  });

  // Create form with default values
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      price: product?.price || 0,
      discountedPrice: product?.discountedPrice || 0,
      category: product?.category || '',
      stock: product?.stock || 0,
      images: product?.images || [],
      storeId: product?.storeId || '',
    },
  });

  // Atualiza o formulário quando os dados do produto são carregados
  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        description: product.description,
        price: product.price,
        discountedPrice: product.discountedPrice || undefined,
        category: product.category,
        stock: product.stock || undefined,
        images: product.images,
        storeId: product.storeId,
      });
      setProductImages(product.images || []);
      setSelectedStore(product.storeId.toString());
    }
  }, [product, form]);

  // Mutation para atualizar produto
  const updateProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      return apiRequest('PUT', `/api/products/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/stores/${selectedStore}/products`] });
      toast({
        title: 'Produto atualizado',
        description: 'O produto foi atualizado com sucesso.',
      });
      navigate('/seller/products');
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar produto',
        description: error.message || 'Ocorreu um erro ao atualizar o produto.',
        variant: 'destructive',
      });
    },
  });

  // Handler para envio do formulário
  const onSubmit = (data: ProductFormValues) => {
    // Se as imagens foram alteradas, atualize os dados
    if (imagesChanged) {
      data.images = productImages;
    }
    updateProductMutation.mutate(data);
  };

    const handleImageUpload = (files: File[]) => {
    setImageFiles(prev => [...prev, ...files]);

    // Criar previews para as novas imagens
    const newPreviews = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setPreviewImages(prev => [...prev, ...newPreviews]);

    // Adicionar URLs de preview ao selectedImages para compatibilidade
    const previewUrls = newPreviews.map(p => p.preview);
    setSelectedImages(prev => [...prev, ...previewUrls]);
  };

  const removeExistingImage = (imageIndex: number) => {
    setExistingImages(prev => prev.filter((_, index) => index !== imageIndex));
    // Atualizar selectedImages removendo a imagem correspondente
    const imageUrl = existingImages[imageIndex]?.url;
    if (imageUrl) {
      setSelectedImages(prev => prev.filter(url => url !== imageUrl));
    }
  };

  const removePreviewImage = (previewIndex: number) => {
    const imageToRemove = previewImages[previewIndex];
    if (imageToRemove) {
      // Revogar URL de preview para evitar vazamentos de memória
      URL.revokeObjectURL(imageToRemove.preview);

      setPreviewImages(prev => prev.filter((_, index) => index !== previewIndex));
      setImageFiles(prev => prev.filter((_, index) => index !== previewIndex));
      setSelectedImages(prev => prev.filter(url => url !== imageToRemove.preview));
    }
  };

  // O upload de imagens agora é gerenciado pelo componente ImageUpload
  // Removemos os manipuladores manuais já que o componente ImageUpload cuida disso

  // No componente de renderização
  return (
    <div className="container mx-auto p-4">
      {loading ? (
        <div className="flex justify-center p-8">
          <div className="w-12 h-12 border-t-4 border-orange-500 rounded-full animate-spin"></div>
          <p className="ml-4">Carregando produto...</p>
        </div>
      ) : error ? (
        <div className="text-center p-8 bg-white rounded-lg shadow-sm">
          <div className="text-orange-500 text-5xl mb-3">⚠️</div>
          <h3 className="text-lg font-medium mb-2">Não foi possível carregar o produto</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            className="px-4 py-2 bg-orange-500 text-white rounded"
            onClick={() => navigate('/seller/products')}
          >
            Voltar para lista de produtos
          </button>
        </div>
      ) : (
        // Renderização do formulário quando o produto estiver carregado
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <div className="flex items-center mb-2">
              <Link href="/seller/products">
                <span className="text-gray-500 hover:text-primary mr-2 cursor-pointer">
                  <i className="fas fa-arrow-left"></i>
                </span>
              </Link>
              <h1 className="text-2xl font-bold">Editar Produto</h1>
            </div>
            <p className="text-gray-600">Atualize os detalhes do produto para refletir as alterações no marketplace</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Produto</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Produto*</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ex: Camiseta de Algodão" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoria*</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map((category) => (
                                  <SelectItem key={category.id} value={category.name}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição*</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Descreva o produto em detalhes"
                              rows={4}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preço (R$)*</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="discountedPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preço Promocional (R$)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                              />
                            </FormControl>
                            <FormMessage />
                            <FormDescription>
                              Deixe em branco se não houver desconto
                            </FormDescription>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="stock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estoque</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                placeholder="Quantidade em estoque"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="storeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Loja*</FormLabel>
                          <Select
                            value={field.value.toString()}
                            onValueChange={(value) => {
                              field.onChange(parseInt(value));
                              setSelectedStore(value);
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma loja" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {stores.map((store) => (
                                <SelectItem key={store.id} value={store.id.toString()}>
                                  {store.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Imagens */}
            <div className="space-y-4">
              <Label>Imagens do Produto</Label>

              {/* Imagens Existentes */}
              {existingImages.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Imagens Atuais</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {existingImages.map((image, index) => (
                      <div key={`existing-${index}`} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          <SafeImage
                            src={image.url}
                            alt={`${form.name || 'Produto'} - Imagem ${index + 1}`}
                            className="w-full h-full object-cover"
                            productId={parseInt(id)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExistingImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        {image.is_primary && (
                          <Badge className="absolute bottom-2 left-2 bg-blue-600 text-white">
                            Principal
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Previews de Novas Imagens */}
              {previewImages.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Novas Imagens</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {previewImages.map((image, index) => (
                      <div key={`preview-${index}`} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          <SafeImage
                            src={image.preview}
                            alt={`Nova imagem ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removePreviewImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <Badge className="absolute bottom-2 left-2 bg-green-600 text-white">
                          Nova
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload de Novas Imagens */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Adicionar Novas Imagens</h4>
                <ImageUpload
                  name={`product-${id}`}
                  onImageUpload={handleImageUpload}
                  selectedImages={[]} // Sempre vazio para não duplicar exibição
                  onRemoveImage={() => {}} // Não usado neste contexto
                  maxImages={Math.max(0, 5 - existingImages.length - previewImages.length)}
                />
                <p className="text-xs text-gray-500">
                  Máximo de 5 imagens por produto. 
                  Atual: {existingImages.length + previewImages.length}/5
                </p>
              </div>
            </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => navigate('/seller/products')}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-primary text-white hover:bg-primary/90"
                        disabled={updateProductMutation.isPending}
                      >
                        {updateProductMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}