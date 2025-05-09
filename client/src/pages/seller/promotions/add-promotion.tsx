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

  // Fetch subscription plan
  useEffect(() => {
    // This would be an actual API call in a real app
    setSubscriptionPlan('freemium');
  }, []);

  // Fetch products from store with ID 1
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products?store_id=1'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/products?store_id=1');
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        
        // Map the products to the format we need
        return data.products.map((product: any) => ({
          id: product.id,
          name: product.name,
          price: product.price,
          category: product.category,
          images: product.images || [],
          store_id: product.store_id,
          store: product.store
        }));
      } catch (error) {
        console.error('Error fetching products:', error);
        return [];
      }
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
  const selectedProduct = products.find((p: Product) => p.id.toString() === productId);

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
        const selectedProd = products.find((p: Product) => p.id.toString() === data.productId);
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
              <CardTitle>Detalhes da Promoção</CardTitle>
              <CardDescription>Defina o tipo, duração e desconto da promoção</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                                  disabled={subscriptionPlan === 'freemium'}
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
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="productId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Produto*</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger disabled={productsLoading}>
                              <SelectValue placeholder={productsLoading ? "Carregando produtos..." : "Selecione um produto"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {productsLoading ? (
                              <div className="p-2 text-center text-sm text-gray-500">Carregando produtos...</div>
                            ) : products.length === 0 ? (
                              <div className="p-2 text-center text-sm text-gray-500">Nenhum produto encontrado</div>
                            ) : (
                              products
                                .filter((product: Product) => product.store_id === 1) // Filtrar apenas produtos da loja 1
                                .map((product: Product) => (
                                  <SelectItem key={product.id} value={product.id.toString()}>
                                    {product.name} - R$ {product.price.toFixed(2)}
                                  </SelectItem>
                                ))
                            )}
                          </SelectContent>
                        </Select>
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
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => navigate('/seller/promotions')}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-primary text-white hover:bg-primary/90"
                      disabled={createPromotionMutation.isPending}
                    >
                      {createPromotionMutation.isPending ? 'Criando...' : 'Criar Promoção'}
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
              <CardTitle>Pré-visualização</CardTitle>
              <CardDescription>Como ficará após a aplicação</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedProduct ? (
                <div>
                  <div className="rounded-md overflow-hidden mb-4">
                    <img 
                      src={selectedProduct.images[0]} 
                      alt={selectedProduct.name}
                      className="w-full h-40 object-cover"
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
                  <li>• Adicione um item promocional de alto valor</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}