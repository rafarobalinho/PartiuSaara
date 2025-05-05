import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLocation, Link } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ImageUpload } from '@/components/ui/image-upload';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const productSchema = z.object({
  name: z.string().min(3, {
    message: 'O nome do produto deve ter pelo menos 3 caracteres',
  }),
  description: z.string().min(10, {
    message: 'A descrição deve ter pelo menos 10 caracteres',
  }),
  price: z.string().transform((val) => Number(val.replace(',', '.'))),
  discountedPrice: z.string().optional().transform((val) => {
    if (!val) return undefined;
    return Number(val.replace(',', '.'));
  }),
  category: z.string().min(1, {
    message: 'Selecione uma categoria',
  }),
  stock: z.string().optional().transform((val) => {
    if (!val) return undefined;
    return Number(val);
  }),
  imageFiles: z.instanceof(FileList).optional(),
  images: z.string().optional().transform(val => {
    if (!val) return [];
    return val.split(',').map(url => url.trim());
  }),
  storeId: z.string().min(1, {
    message: 'Selecione uma loja',
  }).transform(val => Number(val)),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function AddProduct() {
  const { isAuthenticated, isSeller } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [productImages, setProductImages] = useState<string[]>([]);

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
      name: '',
      description: '',
      price: '',
      discountedPrice: '',
      category: '',
      stock: '',
      images: '',
      storeId: '',
    },
  });
  
  // Atualiza o valor de storeId quando stores é carregado
  useEffect(() => {
    if (stores.length > 0 && !form.getValues('storeId')) {
      form.setValue('storeId', stores[0]?.id.toString() || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores]);

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      // Preparar os dados para envio
      const formattedData = {
        ...data,
        // Se houver imagens carregadas, use-as; caso contrário, use as URLs fornecidas
        images: productImages.length > 0 
          ? productImages 
          : (data.images || [])
      };
      
      return apiRequest('POST', '/api/products', formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seller/products'] });
      toast({
        title: 'Produto adicionado',
        description: 'O produto foi adicionado com sucesso ao seu catálogo.',
        variant: "default",
      });
      navigate('/seller/products');
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao adicionar o produto. Tente novamente.',
        variant: "destructive",
      });
      console.error('Error creating product:', error);
    }
  });

  // Submit handler
  function onSubmit(data: ProductFormValues) {
    createProductMutation.mutate(data);
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
          <h1 className="text-2xl font-bold">Adicionar Novo Produto</h1>
        </div>
        <p className="text-gray-600">Preencha os detalhes do produto para listá-lo no marketplace</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Produto</CardTitle>
              <CardDescription>Detalhes básicos sobre seu produto</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Produto*</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Smartphone Galaxy S22" {...field} />
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
                        <FormLabel>Descrição*</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descreva seu produto em detalhes..." 
                            className="min-h-[150px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço (R$)*</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="199,90" {...field} />
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
                            <Input type="text" placeholder="149,90" {...field} />
                          </FormControl>
                          <FormDescription>
                            Deixe em branco se não houver desconto
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria*</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma categoria" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.slug}>
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
                            <Input type="number" placeholder="10" {...field} />
                          </FormControl>
                          <FormDescription>
                            Opcional. Quantidade disponível.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Componente de upload de imagens */}
                  <ImageUpload
                    name={`product-images-${selectedStore}`}
                    multiple={true}
                    maxImages={5}
                    value={productImages}
                    onChange={(urls) => {
                      setProductImages(urls);
                      // Atualiza o campo de imagens do formulário também
                      form.setValue('images', urls.join(','));
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="storeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loja*</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
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
                      disabled={createProductMutation.isPending}
                    >
                      {createProductMutation.isPending ? 'Adicionando...' : 'Adicionar Produto'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Dicas</CardTitle>
              <CardDescription>Para criar produtos de sucesso</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex">
                  <i className="fas fa-check-circle text-primary mt-0.5 mr-2"></i>
                  <span>Use nomes claros e descritivos</span>
                </li>
                <li className="flex">
                  <i className="fas fa-check-circle text-primary mt-0.5 mr-2"></i>
                  <span>Inclua detalhes importantes na descrição (tamanho, material, uso)</span>
                </li>
                <li className="flex">
                  <i className="fas fa-check-circle text-primary mt-0.5 mr-2"></i>
                  <span>Adicione imagens de alta qualidade em diferentes ângulos</span>
                </li>
                <li className="flex">
                  <i className="fas fa-check-circle text-primary mt-0.5 mr-2"></i>
                  <span>Precifique seu produto competitivamente</span>
                </li>
                <li className="flex">
                  <i className="fas fa-check-circle text-primary mt-0.5 mr-2"></i>
                  <span>Mantenha o estoque atualizado</span>
                </li>
              </ul>

              <div className="mt-6 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center mb-2">
                  <i className="fas fa-lightbulb text-amber-500 mr-2"></i>
                  <span className="font-medium">Atenção</span>
                </div>
                <p className="text-sm text-amber-800">
                  Produtos com imagens atraentes têm 3x mais chances de serem reservados.
                  Invista em fotos de qualidade!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}