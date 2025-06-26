// ARQUIVO: client/src/pages/seller/products/edit-product.tsx
// ✅ VERSÃO CORRIGIDA - COMPATÍVEL COM O IMAGE-UPLOAD CORRIGIDO

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
import { Package, DollarSign, Image as ImageIcon, Settings } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// ✅ SCHEMA CORRIGIDO PARA EDIÇÃO
const productSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  price: z.number().min(0.01, 'Preço deve ser maior que zero'),
  discountedPrice: z.number().optional().nullable(),
  category: z.string().min(1, 'Selecione uma categoria'),
  stock: z.number().min(0, 'Estoque deve ser maior ou igual a zero'),
  brand: z.string().optional(),
  isActive: z.boolean().default(true),
  images: z.array(z.string()).optional(),
  storeId: z.number(),
});

const CATEGORIES = [
  "Moda Feminina", "Moda Masculina", "Calçados", "Acessórios", 
  "Beleza e Cuidados", "Casa e Decoração", "Esportes e Lazer", 
  "Eletrônicos", "Livros e Papelaria", "Alimentação", "Outros"
];

type ProductFormValues = z.infer<typeof productSchema>;

export default function EditProduct() {
  const { id } = useParams();
  const { isAuthenticated, isSeller } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ✅ ESTADO PARA IMAGENS - INICIALIZADO COMO ARRAY VAZIO
  const [productImages, setProductImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ VERIFICAÇÃO DE AUTENTICAÇÃO
  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
    else if (!isSeller) navigate('/account');
  }, [isAuthenticated, isSeller, navigate]);

  // ✅ BUSCAR DADOS DO PRODUTO
  const { data: productData, isLoading: isLoadingProduct } = useQuery({
    queryKey: [`/api/products/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/products/${id}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch product');
      return await response.json();
    },
    enabled: !!id && isAuthenticated && isSeller
  });

  // ✅ CONFIGURAR FORMULÁRIO
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      discountedPrice: null,
      category: '',
      stock: 0,
      brand: '',
      isActive: true,
      images: [],
      storeId: 0,
    },
  });

  // ✅ PREENCHER FORMULÁRIO QUANDO DADOS CARREGAREM
  useEffect(() => {
    if (productData?.product) {
      const product = productData.product;

      form.reset({
        name: product.name || '',
        description: product.description || '',
        price: Number(product.price) || 0,
        discountedPrice: product.discounted_price ? Number(product.discounted_price) : null,
        category: product.category || '',
        stock: Number(product.stock) || 0,
        brand: product.brand || '',
        isActive: product.is_active !== false,
        storeId: Number(product.store_id) || 0,
        images: product.images || [],
      });

      // ✅ CONFIGURAR IMAGENS DO PRODUTO - SEMPRE ARRAY
      setProductImages(Array.isArray(product.images) ? product.images : []);
    }
  }, [productData, form]);

  // ✅ MUTAÇÃO PARA ATUALIZAR PRODUTO
  const updateProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      console.log('📝 Atualizando produto...', data);
      const response = await apiRequest('PUT', `/api/products/${id}`, {
        name: data.name,
        description: data.description,
        price: data.price,
        discountedPrice: data.discountedPrice,
        category: data.category,
        stock: data.stock,
        brand: data.brand,
        isActive: data.isActive,
        // Nota: As imagens são gerenciadas separadamente pelo ImageUpload
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao atualizar produto');
      }

      return result;
    },
    onSuccess: () => {
      toast({ 
        title: 'Produto atualizado com sucesso!',
        description: 'As alterações foram salvas.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${id}`] });
      navigate('/seller/products');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar produto:', error);
      toast({ 
        title: 'Erro ao atualizar produto', 
        description: error.message,
        variant: 'destructive' 
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  // ✅ FUNÇÃO DE SUBMIT
  async function onSubmit(data: ProductFormValues) {
    try {
      setIsSubmitting(true);
      updateProductMutation.mutate(data);
    } catch (error) {
      console.error('Erro no onSubmit:', error);
      setIsSubmitting(false);
    }
  }

  // ✅ STATES DE LOADING
  if (!isAuthenticated || !isSeller) return null;

  if (isLoadingProduct) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Carregando produto...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!productData?.product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Produto não encontrado</h1>
          <p className="text-gray-600 mt-2">O produto que você está tentando editar não existe.</p>
          <Link href="/seller/products">
            <Button className="mt-4">Voltar para produtos</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6" />
          Editar Produto
        </h1>
        <p className="text-gray-600">Atualize as informações do seu produto.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Produto</CardTitle>
          <CardDescription>
            Atualize os detalhes do produto conforme necessário.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Seção: Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Informações Básicas
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Produto *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Camisa Polo Azul" {...field} />
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
                        <FormLabel>Categoria *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
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
                      <FormLabel>Descrição do Produto *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva seu produto em detalhes..." 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Descreva características, materiais, tamanhos disponíveis, etc.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Seção: Preços e Estoque */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Preços e Estoque
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="0,00" 
                            type="number"
                            step="0.01"
                            min="0"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(Number(e.target.value))}
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
                        <FormLabel>Preço Promocional</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="0,00 (opcional)" 
                            type="number"
                            step="0.01"
                            min="0"
                            value={field.value || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value ? Number(value) : null);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estoque *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="0" 
                            type="number"
                            min="0"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Seção: Detalhes Adicionais */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Detalhes Adicionais
                </h3>

                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Nike, Apple, etc." {...field} />
                      </FormControl>
                      <FormDescription>
                        Informe a marca do produto (opcional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Seção: Imagens do Produto */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Imagens do Produto
                </h3>

                <div className="border rounded-lg p-4">
                  {productData?.product ? (
                    <ImageUpload
                      entityType="product"
                      entityId={productData.product.id}
                      storeId={productData.product.store_id}
                      multiple={true}
                      selectedImages={productImages} // ✅ USANDO ESTADO LOCAL PROTEGIDO
                      onChange={(urls) => {
                        console.log('📸 Imagens atualizadas:', urls);
                        setProductImages(urls || []); // ✅ PROTEÇÃO CONTRA UNDEFINED
                      }}
                    />
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Carregando informações para upload...
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Seção: Configurações */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Configurações</h3>

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Produto Ativo</FormLabel>
                        <FormDescription>
                          Produto ficará visível para clientes quando ativo
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/seller/products')}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}