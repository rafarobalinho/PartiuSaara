import { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';

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

  // Carregar dados do produto
  const {
    data: product,
    isLoading: isLoadingProduct,
    error: productError
  } = useQuery({
    queryKey: [`/api/products/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/products/${id}`);
      if (!res.ok) {
        throw new Error('Falha ao carregar produto');
      }
      return await res.json();
    }
  });

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
    queryKey: ['/api/stores'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/stores');
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
      return apiRequest(`/api/products/${id}`, 'PUT', data);
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

  // Handler para upload de imagens
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;

    const files = Array.from(event.target.files);
    const formData = new FormData();
    
    // Adiciona os arquivos ao FormData
    files.forEach((file) => {
      formData.append('images', file);
    });

    try {
      // Faz a chamada para o endpoint de upload com os query params requeridos
      const response = await apiRequest(
        'POST',
        `/api/upload/images?type=product&entityId=${id}`, 
        formData
      );

      const result = await response.json();
      
      if (result.success && result.images) {
        // Extrai as URLs das imagens retornadas pelo servidor
        const newImageUrls = result.images.map((img: any) => img.imageUrl);
        
        // Atualiza o estado com as novas imagens
        setProductImages((prev) => [...prev, ...newImageUrls]);
        setImagesChanged(true);
        
        toast({
          title: 'Upload concluído',
          description: `${result.images.length} imagem(ns) enviada(s) com sucesso.`,
        });
      } else {
        throw new Error('Formato de resposta inválido');
      }
    } catch (error: any) {
      console.error('Error uploading images:', error);
      toast({
        title: 'Erro no upload',
        description: error.message || 'Ocorreu um erro ao enviar as imagens.',
        variant: 'destructive',
      });
    }
  };

  // Handler para remoção de imagens
  const handleRemoveImage = (index: number) => {
    setProductImages((prev) => prev.filter((_, i) => i !== index));
    setImagesChanged(true);
  };

  if (isLoadingProduct) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (productError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 text-red-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold">Erro ao carregar produto</h2>
          <p>Não foi possível carregar os dados do produto. Por favor, tente novamente mais tarde.</p>
          <Button 
            onClick={() => navigate('/seller/products')}
            className="mt-4"
          >
            Voltar para Produtos
          </Button>
        </div>
      </div>
    );
  }

  return (
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

                <div>
                  <FormLabel>Imagens do Produto</FormLabel>
                  <div className="mt-2 border rounded-lg p-4">
                    <div className="flex flex-wrap gap-4 mb-4">
                      {productImages.map((image, index) => (
                        <div key={index} className="relative w-24 h-24 border rounded-md overflow-hidden group">
                          <img
                            src={image}
                            alt={`Produto imagem ${index + 1}`}
                            className="w-full h-full object-fit"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {productImages.length === 0 && (
                        <div className="w-full text-center py-8 text-gray-500">
                          Nenhuma imagem adicionada
                        </div>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        id="product-images"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      <label
                        htmlFor="product-images"
                        className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md cursor-pointer transition-colors"
                      >
                        <i className="fas fa-upload mr-2"></i>
                        Adicionar Imagens
                      </label>
                    </div>
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
  );
}