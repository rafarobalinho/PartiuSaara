import { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Esquema de validação para o formulário
const productSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  price: z.coerce.number().min(0.01, 'Preço deve ser maior que zero'),
  discountedPrice: z.coerce.number().min(0).optional().nullable(),
  category: z.string().min(1, 'Selecione uma categoria'),
  stock: z.coerce.number().min(0).optional().nullable(),
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

  // Verificar autenticação
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (!isSeller) {
      navigate('/account');
    }
  }, [isAuthenticated, isSeller, navigate]);

  // Configurar formulário PRIMEIRO
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      discountedPrice: null,
      category: '',
      stock: 0,
      storeId: 0,
    },
  });

  // Buscar categorias disponíveis
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/categories');
        if (!response.ok) throw new Error('Erro ao carregar categorias');
        return await response.json();
      } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        return [];
      }
    }
  });

  // Query para buscar dados do produto
  const { data: productData, isLoading: productLoading, error: productError } = useQuery({
    queryKey: [`/api/products/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/products/${id}`);
      if (!response.ok) {
        throw new Error('Produto não encontrado');
      }
      return response.json();
    },
    enabled: !!id && !!isAuthenticated && !!isSeller,
  });

  // Atualizar formulário quando dados carregarem
  useEffect(() => {
    if (productData) {
      // Popular formulário com dados existentes
      form.reset({
        name: productData.name || '',
        description: productData.description || '',
        price: productData.price || 0,
        discountedPrice: productData.discountedPrice || null,
        category: productData.category || '',
        stock: productData.stock || 0,
        storeId: productData.storeId || productData.store_id || 0,
      });

      // Carregar imagens existentes
      if (productData.images && productData.images.length > 0) {
        setProductImages(productData.images);
      }

      console.log('✅ Dados do produto carregados:', productData);
    }
  }, [productData, form]);

  // Mutation para atualizar produto
  const updateProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          images: productImages,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar produto');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Produto atualizado',
        description: 'As alterações foram salvas com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      navigate('/seller/products');
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar produto',
        description: error instanceof Error ? error.message : 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    },
  });

  // Manipular envio do formulário
  const onSubmit = (data: ProductFormValues) => {
    updateProductMutation.mutate(data);
  };

  if (!isAuthenticated || !isSeller) {
    return null;
  }

  if (productLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando produto...</p>
          </div>
        </div>
      </div>
    );
  }

  if (productError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erro</h1>
          <p className="text-gray-600 mb-4">
            {productError instanceof Error ? productError.message : 'Erro ao carregar produto'}
          </p>
          <Button onClick={() => navigate('/seller/products')}>
            Voltar para Produtos
          </Button>
        </div>
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Produto não encontrado</h1>
          <Button onClick={() => navigate('/seller/products')}>
            Voltar para Produtos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Link href="/seller/products">
          <span className="text-gray-500 hover:text-primary mr-2 cursor-pointer">
            <i className="fas fa-arrow-left"></i>
          </span>
        </Link>
        <h1 className="text-2xl font-bold">Editar Produto</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Editar Produto</CardTitle>
          <CardDescription>Atualize os detalhes do seu produto.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Produto</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do produto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrição detalhada do produto"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
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
                      <FormLabel>Preço com Desconto (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00 (opcional)"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Deixe em branco se não houver desconto
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category: any) => (
                            <SelectItem key={category.slug} value={category.slug}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
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
                          type="number"
                          placeholder="0"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        Quantidade disponível em estoque
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormLabel>Imagens do Produto</FormLabel>
                <div className="mt-2 border rounded-lg p-4">
                  {productData && productData.id ? (
                    <ImageUpload
                      entityType="product"
                      entityId={productData.id}
                      storeId={productData.storeId || productData.store_id}
                      multiple={true}
                      maxImages={5}
                      value={productImages}
                      onChange={(urls) => {
                        setProductImages(urls);
                      }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Carregando informações para upload...
                    </p>
                  )}
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
  );
}