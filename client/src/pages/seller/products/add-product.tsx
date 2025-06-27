// ARQUIVO: client/src/pages/seller/products/add-product.tsx
// ✅ ARQUIVO COMPLETO CORRIGIDO - COM UPLOAD EM DUAS ETAPAS

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLocation, Link } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ImageUpload } from '@/components/ui/image-upload';
import { Package, DollarSign, Image as ImageIcon, Settings } from 'lucide-react';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// ✅ INTERFACE PARA REF DO IMAGEUPLOAD
interface ImageUploadRef {
  uploadPendingFiles: (newEntityId: string | number) => Promise<{success: boolean, error?: string}>;
}

// ✅ SCHEMA CORRIGIDO COM TIPOS CORRETOS
const productSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres"),
  price: z.number().min(0.01, "Preço deve ser maior que zero"),
  discountedPrice: z.number().optional(),
  storeId: z.number().min(1, "Selecione uma loja"),
  category: z.string().min(1, "Selecione uma categoria"),
  stock: z.number().min(0, "Estoque deve ser maior ou igual a zero"),
  brand: z.string().optional(),
  isActive: z.boolean().default(true),
  images: z.array(z.string()).optional().transform((arr) => {
    // ✅ FILTRAR PLACEHOLDERS ANTES DE ENVIAR AO BACKEND
    return arr?.filter(img => img !== "__files_selected__") || [];
  }),
});



type ProductFormValues = z.infer<typeof productSchema>;

export default function AddProduct() {
  const { isAuthenticated, isSeller } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ REF PARA CONTROLAR O IMAGEUPLOAD
  const imageUploadRef = useRef<ImageUploadRef>(null);

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
    else if (!isSeller) navigate('/account');
  }, [isAuthenticated, isSeller, navigate]);

  // ✅ BUSCAR LOJAS DO USUÁRIO
  const { data: stores = [] } = useQuery({
    queryKey: ['/api/stores/my-stores'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/stores/my-stores', {
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch stores');
        return await response.json();
      } catch (error) {
        console.error('Error fetching stores:', error);
        return [];
      }
    },
    enabled: isAuthenticated && isSeller
  });

  // ✅ BUSCAR CATEGORIAS DO BANCO DE DADOS
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/categories');
        if (!response.ok) throw new Error('Failed to fetch categories');
        return await response.json();
      } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
      }
    }
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      discountedPrice: undefined,
      storeId: 0,
      category: '',
      stock: 0,
      brand: '',
      isActive: true,
      images: [],
    },
  });

  // ✅ MUTAÇÃO PARA CRIAR PRODUTO (PRIMEIRA ETAPA)
  const createProductMutation = useMutation({
    mutationFn: async (data: Omit<ProductFormValues, 'images'>) => {
      console.log('📦 ETAPA 1: Criando produto sem imagens...', data);
      const response = await apiRequest('POST', '/api/products', data);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao criar produto');
      }

      return result;
    },
    onSuccess: async (result) => {
      // ✅ CORREÇÃO: Baseado no seu product.controller.ts que retorna { product: result.rows[0] }
      const productId = result.product?.id;

      console.log('✅ ETAPA 1 CONCLUÍDA: Produto criado com ID', productId);

      // ✅ VALIDAÇÃO: Certificar que recebemos o ID
      if (!productId) {
        console.error('❌ ERRO: ID do produto não retornado', result);
        toast({ 
          title: 'Erro inesperado', 
          description: 'Produto criado mas ID não foi retornado pelo servidor.',
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // ✅ ETAPA 2: VERIFICAR SE EXISTEM ARQUIVOS PENDENTES PARA UPLOAD
      if (imageUploadRef.current?.uploadPendingFiles) {
        try {
          console.log('📸 ETAPA 2: Verificando se há imagens pendentes...');

          // Manter isSubmitting=true durante o upload das imagens
          const uploadResult = await imageUploadRef.current.uploadPendingFiles(productId);

          if (uploadResult.success) {
            console.log('✅ ETAPA 2 CONCLUÍDA: Imagens enviadas com sucesso');
            toast({ 
              title: 'Produto criado com sucesso!', 
              description: 'Produto e imagens adicionados com sucesso.' 
            });
          } else {
            console.warn('⚠️ ETAPA 2 FALHOU:', uploadResult.error);
            toast({ 
              title: 'Produto criado!', 
              description: 'Produto criado, mas houve um problema com as imagens: ' + (uploadResult.error || 'Erro desconhecido'),
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('❌ ETAPA 2 ERRO:', error);
          toast({ 
            title: 'Produto criado!', 
            description: 'Produto criado, mas houve erro no upload das imagens.',
            variant: "destructive"
          });
        }
      } else {
        console.log('ℹ️ ETAPA 2 PULADA: Nenhuma imagem selecionada ou ref não disponível');
        toast({ 
          title: 'Produto criado com sucesso!',
          description: 'Produto adicionado sem imagens.'
        });
      }

      // ✅ FINALIZAR: INVALIDAR CACHE E NAVEGAR
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stores/my-stores'] });
      navigate('/seller/products');
    },
    onError: (error: any) => {
      console.error('❌ ETAPA 1 FALHOU:', error);
      toast({ 
        title: 'Erro ao criar produto', 
        description: error.message || 'Ocorreu um erro ao criar o produto.',
        variant: 'destructive' 
      });
    },
    onSettled: () => {
      // ✅ IMPORTANTE: Sempre resetar o estado de loading no final
      setIsSubmitting(false);
    }
  });

  // ✅ FUNÇÃO DE SUBMIT CORRIGIDA
  async function onSubmit(data: ProductFormValues) {
    try {
      setIsSubmitting(true);

      // ✅ PREPARAR DADOS PARA O BACKEND (SEM IMAGENS)
      const productData = {
        name: data.name,
        description: data.description,
        price: data.price,
        discountedPrice: data.discountedPrice,
        storeId: data.storeId,
        category: data.category,
        stock: data.stock,
        brand: data.brand,
        isActive: data.isActive,
        // ✅ IMPORTANTE: Não enviar imagens na primeira etapa
        // As imagens serão enviadas via uploadPendingFiles() após criação
      };

      console.log('🚀 INICIANDO CRIAÇÃO DE PRODUTO EM DUAS ETAPAS...');
      createProductMutation.mutate(productData);
    } catch (error) {
      console.error('❌ Erro no onSubmit:', error);
      setIsSubmitting(false);
    }
  }

  if (!isAuthenticated || !isSeller) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-6 w-6" />
          Adicionar Novo Produto
        </h1>
        <p className="text-gray-600">Preencha todos os detalhes do seu produto para começar a vender.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Produto</CardTitle>
          <CardDescription>
            Todas as informações são importantes para atrair clientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Seção: Loja */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Loja</h3>

                <FormField
                  control={form.control}
                  name="storeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Loja *</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(Number(value))} 
                        value={field.value ? field.value.toString() : ''}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma loja" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stores.map((store: any) => (
                            <SelectItem key={store.id} value={store.id.toString()}>
                              {store.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Escolha a loja onde este produto será vendido
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category: any) => (
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
                              field.onChange(value ? Number(value) : undefined);
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

                <FormField
                  control={form.control}
                  name="images"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fotos do Produto</FormLabel>
                      <FormControl>
                        {form.watch('storeId') ? (
                          <ImageUpload
                            ref={imageUploadRef}
                            entityType="product"
                            entityId="new"
                            storeId={Number(form.watch('storeId'))}
                            multiple={true}
                            selectedImages={field.value || []}
                            onChange={field.onChange}
                          />
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                            <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-sm text-muted-foreground">
                              Selecione uma loja primeiro para adicionar imagens
                            </p>
                          </div>
                        )}
                      </FormControl>
                      <FormDescription>
                        Adicione até 5 imagens do seu produto (JPG, PNG ou WebP, máximo 10MB cada)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                  disabled={isSubmitting || stores.length === 0}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Criando Produto...
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4" />
                      Adicionar Produto
                    </>
                  )}
                </Button>
              </div>

              {stores.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Atenção:</strong> Você precisa ter pelo menos uma loja cadastrada para adicionar produtos.{' '}
                    <Link href="/seller/stores/add-store">
                      <Button variant="link" className="p-0 h-auto">
                        Criar loja agora
                      </Button>
                    </Link>
                  </p>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}