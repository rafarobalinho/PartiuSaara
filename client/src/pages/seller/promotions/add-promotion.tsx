
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLocation, Link } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const promotionSchema = z.object({
  storeId: z.string().min(1, {
    message: 'Selecione uma loja',
  }),
  type: z.enum(['normal', 'flash']),
  discountType: z.enum(['percentage', 'amount']),
  discountValue: z.string().min(1, {
    message: 'Valor do desconto é obrigatório',
  }).refine(val => !isNaN(Number(val)), {
    message: 'O valor do desconto deve ser um número válido',
  }),
  productId: z.string().min(1, {
    message: 'Selecione um produto',
  }),
  startTime: z.string().min(1, {
    message: 'Data de início é obrigatória',
  }),
  endTime: z.string().min(1, {
    message: 'Data de término é obrigatória',
  }),
}).refine(data => {
  // Valida datas
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start;
}, {
  message: 'A data de término deve ser posterior à data de início',
  path: ['endTime'], // Mostra o erro no campo endTime
});

type PromotionFormValues = z.infer<typeof promotionSchema>;

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  images: string[];
  store_id: number;
  store?: {
    id: number;
    name: string;
  };
}

interface Store {
  id: number;
  name: string;
  subscriptionPlan: string;
}

export default function AddPromotion() {
  const { isAuthenticated, isSeller } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [subscriptionPlan, setSubscriptionPlan] = useState('freemium');

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

  // Query para buscar lojas do vendedor
  const { data: stores = [], isLoading: isStoresLoading } = useQuery({
    queryKey: ['/api/stores/my-stores'],
    queryFn: async () => {
      console.log('[AddPromotionPage] 🏪 Buscando lojas do vendedor...');
      const response = await fetch('/api/stores/my-stores');
      
      if (!response.ok) {
        console.error('[AddPromotionPage] ❌ Erro ao buscar lojas:', response.status);
        throw new Error('Failed to fetch stores');
      }
      
      const data = await response.json();
      console.log('[AddPromotionPage] 🏪 Lojas encontradas:', data);
      return data as Store[];
    }
  });

  // Set up initial dates (start today, end in a week)
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const formatDateForInput = (date: Date) => {
    return date.toISOString().slice(0, 16);
  };

  // Create form with default values
  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      storeId: '',
      type: 'normal',
      discountType: 'percentage',
      discountValue: '',
      productId: '',
      startTime: formatDateForInput(today),
      endTime: formatDateForInput(nextWeek),
    },
  });

  // Watch form values for conditional rendering
  const promotionType = form.watch('type');
  const productId = form.watch('productId');
  const selectedStoreId = form.watch('storeId');
  
  console.log('[AddPromotionPage] 🎯 Estado atual do form:');
  console.log('[AddPromotionPage] 🎯 - promotionType:', promotionType);
  console.log('[AddPromotionPage] 🎯 - productId:', productId);
  console.log('[AddPromotionPage] 🎯 - selectedStoreId:', selectedStoreId);

  // Query para buscar produtos da loja selecionada APENAS
  const { data: productsData = [], isLoading: isProductsLoading } = useQuery({
    queryKey: ['/api/stores', selectedStoreId, 'products'],
    queryFn: async () => {
      if (!selectedStoreId) {
        console.log('[AddPromotionPage] 📦 Nenhuma loja selecionada, retornando array vazio');
        return [];
      }

      console.log('[AddPromotionPage] 📦 Buscando produtos da loja:', selectedStoreId);
      const response = await fetch(`/api/stores/${selectedStoreId}/products`);
      
      if (!response.ok) {
        console.error('[AddPromotionPage] ❌ Erro ao buscar produtos da loja:', response.status);
        throw new Error('Failed to fetch store products');
      }
      
      const data = await response.json();
      console.log('[AddPromotionPage] 📦 Produtos da loja encontrados:', data);
      
      // O backend retorna um array diretamente, não um objeto com propriedade products
      return Array.isArray(data) ? data : (data.products || []);
    },
    enabled: !!selectedStoreId, // Só executa se uma loja estiver selecionada
  });

  const selectedProduct = productsData.find((p: Product) => p.id.toString() === productId);
  console.log('[AddPromotionPage] 🎯 - selectedProduct:', selectedProduct);

  // Update subscription plan based on selected store
  useEffect(() => {
    if (selectedStoreId && stores.length > 0) {
      const selectedStore = stores.find(store => store.id.toString() === selectedStoreId);
      if (selectedStore) {
        setSubscriptionPlan(selectedStore.subscriptionPlan || 'freemium');
        console.log('[AddPromotionPage] 📋 Plano da loja selecionada:', selectedStore.subscriptionPlan);
      }
    }
  }, [selectedStoreId, stores]);

  // Reset product selection when store changes
  useEffect(() => {
    if (selectedStoreId) {
      form.setValue('productId', '');
      console.log('[AddPromotionPage] 🔄 Loja alterada, resetando seleção de produto');
    }
  }, [selectedStoreId, form]);

  // Create promotion mutation
  const createPromotionMutation = useMutation({
    mutationFn: async (data: PromotionFormValues) => {
      // Transform the data for API - garantir que corresponda exatamente ao schema esperado
      let discountPercentage = 0;

      if (data.discountType === 'percentage') {
        discountPercentage = Number(data.discountValue);
      } else {
        // Se for do tipo 'amount', precisamos converter para percentagem
        // Primeiro encontramos o produto selecionado
        const selectedProd = productsData.find((p: Product) => p.id.toString() === data.productId);
        if (selectedProd) {
          // Calculamos a percentagem com base no valor de desconto e no preço do produto
          discountPercentage = Math.round((Number(data.discountValue) / selectedProd.price) * 100);
        }
      }

      // O backend espera "regular" em vez de "normal"
      const promotionType = data.type === 'normal' ? 'regular' : data.type;

      // Vamos preservar os campos originais do formulário conforme solicitado
      const apiData = {
        // Campo type precisa ser "regular" ou "flash", não "normal"
        type: data.type === 'normal' ? 'regular' : data.type,

        // Campos de desconto conforme originais no formulário
        discountType: data.discountType,
        discountValue: Number(data.discountValue),

        // ID do produto
        productId: Number(data.productId),

        // Datas no formato original
        startTime: data.startTime,
        endTime: data.endTime
      };

      console.log("======= DADOS ENVIADOS PARA API =======");
      console.log(JSON.stringify(apiData, null, 2));
      console.log("=======================================");

      return apiRequest('POST', '/api/promotions', apiData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/seller/promotions'] });
      toast({
        title: 'Promoção criada',
        description: 'A promoção foi criada com sucesso.',
        variant: "default",
      });
      navigate('/seller/promotions');
    },
    onError: (error: any) => {
      if (error?.subscriptionRequired) {
        toast({
          title: 'Plano necessário',
          description: 'É necessário um plano superior para criar promoções relâmpago.',
          variant: "destructive",
        });
      } else {
        // Tentar extrair detalhes do erro de validação
        let errorMessage = 'Ocorreu um erro ao criar a promoção. Tente novamente.';

        if (error.response && error.response.data) {
          if (error.response.data.message === 'Validation error' && error.response.data.errors) {
            errorMessage = `Erro de validação: ${error.response.data.errors.map((e: any) => e.message).join(', ')}`;
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          }
        }

        toast({
          title: 'Erro',
          description: errorMessage,
          variant: "destructive",
        });
      }
      console.error("======= ERRO COMPLETO =======");
      console.error(error);

      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Dados:", JSON.stringify(error.response.data, null, 2));
        console.error("Headers:", JSON.stringify(error.response.headers, null, 2));
      }

      console.error("=============================");
    }
  });

  // Submit handler
  function onSubmit(data: PromotionFormValues) {
    // Adicionar log detalhado ANTES de qualquer validação ou transformação
    console.log("======= DADOS DO FORMULÁRIO =======");
    console.log(JSON.stringify(data, null, 2));
    console.log("===================================");

    // Check if trying to create flash promotion with freemium plan
    if (data.type === 'flash' && subscriptionPlan === 'freemium') {
      toast({
        title: 'Plano necessário',
        description: 'É necessário um plano superior para criar promoções relâmpago.',
        variant: "destructive",
      });
      return;
    }

    // Verificar se o valor de desconto em reais não é maior que o preço do produto
    if (data.discountType === 'amount' && selectedProduct) {
      const discountValue = Number(data.discountValue);
      if (discountValue >= selectedProduct.price) {
        toast({
          title: 'Erro de validação',
          description: 'O valor do desconto não pode ser maior ou igual ao preço do produto.',
          variant: "destructive",
        });
        return;
      }
    }

    // Verificar se a percentagem de desconto não é 100% ou maior
    if (data.discountType === 'percentage') {
      const discountValue = Number(data.discountValue);
      if (discountValue >= 100) {
        toast({
          title: 'Erro de validação',
          description: 'A percentagem de desconto não pode ser 100% ou maior.',
          variant: "destructive",
        });
        return;
      }
    }

    createPromotionMutation.mutate(data);
  }

  // Calculate discounted price preview
  const calculateDiscountedPrice = () => {
    if (!selectedProduct || !form.getValues('discountValue')) return null;

    const discountType = form.getValues('discountType');
    const discountValue = parseFloat(form.getValues('discountValue'));
    const originalPrice = selectedProduct.price;

    if (discountType === 'percentage') {
      return originalPrice - (originalPrice * (discountValue / 100));
    } else {
      return originalPrice - discountValue;
    }
  };

  const discountedPrice = calculateDiscountedPrice();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <Link href="/seller/promotions">
            <a className="text-gray-500 hover:text-primary mr-2">
              <i className="fas fa-arrow-left"></i>
            </a>
          </Link>
          <h1 className="text-2xl font-bold">Criar Nova Promoção</h1>
        </div>
        <p className="text-gray-600">Configure os detalhes da promoção para seu produto</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Promoção</CardTitle>
              <CardDescription>Preencha todos os detalhes para criar uma promoção atrativa para seus produtos</CardDescription>
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
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger disabled={isStoresLoading}>
                                <SelectValue placeholder={isStoresLoading ? "Carregando lojas..." : "Selecione uma loja"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isStoresLoading ? (
                                <div className="p-2 text-center text-sm text-gray-500">Carregando lojas...</div>
                              ) : stores.length === 0 ? (
                                <div className="p-2 text-center text-sm text-gray-500">Nenhuma loja encontrada</div>
                              ) : (
                                stores.map((store: Store) => (
                                  <SelectItem key={store.id} value={store.id.toString()}>
                                    {store.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Escolha a loja onde esta promoção será aplicada
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Seção: Detalhes da Promoção */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Detalhes da Promoção</h3>

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Tipo de Promoção*</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-1"
                              disabled={!selectedStoreId}
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="normal" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Promoção Regular
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem 
                                    value="flash" 
                                    disabled={subscriptionPlan === 'freemium' || !selectedStoreId}
                                  />
                                </FormControl>
                                <div>
                                  <FormLabel className="font-normal flex items-center">
                                    Promoção Relâmpago
                                    {subscriptionPlan === 'freemium' && (
                                      <Badge className="ml-2 bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                                        Plano Superior Necessário
                                      </Badge>
                                    )}
                                  </FormLabel>
                                  <FormDescription>
                                    Promove seu produto na seção de destaque "Promoções Relâmpago"
                                  </FormDescription>
                                </div>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                          {!selectedStoreId && (
                            <p className="text-sm text-gray-500">Selecione uma loja primeiro</p>
                          )}
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Seção: Produto e Desconto */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Produto e Desconto</h3>

                  <FormField
                      control={form.control}
                      name="productId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Produto*</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            disabled={!selectedStoreId}
                          >
                            <FormControl>
                              <SelectTrigger disabled={isProductsLoading || !selectedStoreId}>
                                <SelectValue placeholder={
                                  !selectedStoreId ? "Selecione uma loja primeiro" :
                                  isProductsLoading ? "Carregando produtos..." : 
                                  "Selecione um produto"
                                } />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {!selectedStoreId ? (
                                <div className="p-2 text-center text-sm text-gray-500">Selecione uma loja primeiro</div>
                              ) : isProductsLoading ? (
                                <div className="p-2 text-center text-sm text-gray-500">Carregando produtos...</div>
                              ) : productsData.length === 0 ? (
                                <div className="p-2 text-center text-sm text-gray-500">Nenhum produto encontrado nesta loja</div>
                              ) : (
                                productsData.map((product: Product) => (
                                  <SelectItem key={product.id} value={product.id.toString()}>
                                    {product.name} - R$ {product.price.toFixed(2)}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Escolha o produto que terá a promoção aplicada
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="discountType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Desconto*</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              disabled={!selectedStoreId}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                                <SelectItem value="amount">Valor (R$)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="discountValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor do Desconto*</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder={form.watch('discountType') === 'percentage' ? "20" : "50.00"}
                                disabled={!selectedStoreId}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Seção: Período da Promoção */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Período da Promoção</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data e Hora de Início*</FormLabel>
                            <FormControl>
                              <Input 
                                type="datetime-local" 
                                disabled={!selectedStoreId}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data e Hora de Término*</FormLabel>
                            <FormControl>
                              <Input 
                                type="datetime-local" 
                                disabled={!selectedStoreId}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/seller/promotions')}
                      disabled={createPromotionMutation.isPending}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createPromotionMutation.isPending || !selectedStoreId || stores.length === 0}
                      className="flex items-center gap-2"
                    >
                      {createPromotionMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Criando Promoção...
                        </>
                      ) : (
                        'Criar Promoção'
                      )}
                    </Button>
                  </div>

                  {stores.length === 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                      <p className="text-sm text-yellow-800">
                        <strong>Atenção:</strong> Você precisa ter pelo menos uma loja cadastrada para criar promoções.{' '}
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

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Pré-visualização</CardTitle>
              <CardDescription>Como ficará após a aplicação</CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedStoreId ? (
                <div className="text-center py-6 text-gray-500">
                  <i className="fas fa-store text-gray-300 text-4xl mb-2"></i>
                  <p>Selecione uma loja para começar</p>
                </div>
              ) : selectedProduct ? (
                <div>
                  <div className="rounded-md overflow-hidden mb-4">
                    <img 
                      src={`/api/products/${selectedProduct.id}/primary-image`} 
                      alt={selectedProduct.name}
                      className="w-full h-40 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder-image.jpg';
                      }}
                    />
                  </div>

                  <h3 className="font-medium mb-1">{selectedProduct.name}</h3>
                  <p className="text-sm text-gray-500 mb-3">{selectedProduct.category}</p>

                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm text-gray-500">Preço Original:</span>
                    <span className="font-medium">R$ {selectedProduct.price.toFixed(2)}</span>
                  </div>

                  {discountedPrice !== null && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Preço Promocional:</span>
                      <span className="font-bold text-primary">R$ {discountedPrice.toFixed(2)}</span>
                    </div>
                  )}

                  {form.watch('type') === 'flash' && (
                    <div className="mt-4 p-2 bg-yellow-50 rounded-md border border-yellow-100">
                      <i className="fas fa-bolt text-yellow-600 mr-1"></i>
                      <span className="text-sm text-yellow-800">Aparecerá na seção de Promoções Relâmpago</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <i className="fas fa-tag text-gray-300 text-4xl mb-2"></i>
                  <p>Selecione um produto para visualizar como ficará a promoção</p>
                </div>
              )}

              <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center mb-2">
                  <i className="fas fa-info-circle text-blue-500 mr-2"></i>
                  <span className="font-medium">Dicas</span>
                </div>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Descontos entre 10% e 30% são os mais efetivos</li>
                  <li>• Promoções relâmpago funcionam melhor por 24-48h</li>
                  <li>• Cada promoção é específica de uma loja</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
