import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLocation, Link, useParams } from 'wouter';
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

// Tipo para o formulário
type PromotionFormValues = z.infer<typeof promotionSchema>;

export default function EditPromotion() {
  const { isAuthenticated, isSeller } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams();
  const promotionId = params.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]);

  console.log("Página de edição de promoção carregada com ID:", promotionId);

  // Fetch promotion details
  const { data: promotionData, isLoading: isLoadingPromotion } = useQuery({
    queryKey: ['/api/promotions', promotionId],
    queryFn: async () => {
      try {
        console.log(`Tentando carregar promoção para edição, ID: "${promotionId}"`);
        const response = await fetch(`/api/promotions/${promotionId}`, {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch promotion: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Dados da promoção recebidos:", data);
        
        // Convert from backend format to form format
        return {
          ...data,
          type: data.type === 'regular' ? 'normal' : data.type,
          discountType: 'percentage', // Assume percentage as default
          discountValue: data.discountPercentage.toString(),
          productId: data.productId.toString(),
          startTime: new Date(data.startTime).toISOString().slice(0, 16), // Format for datetime-local
          endTime: new Date(data.endTime).toISOString().slice(0, 16), // Format for datetime-local
        };
      } catch (error) {
        console.error('Error fetching promotion:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os dados da promoção.',
          variant: 'destructive',
        });
        return null;
      }
    },
    enabled: !!promotionId && isAuthenticated,
  });

  // Fetch user's stores
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const response = await fetch('/api/stores/my-stores', {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch stores: ${response.status}`);
        }
        
        const data = await response.json();
        setStores(data || []);
        
        if (data.length > 0 && !selectedStore) {
          // If we have promotion data, find the store that has the product
          if (promotionData) {
            // Need to fetch the product first to get its storeId
            const productResponse = await fetch(`/api/products/${promotionData.productId}`, {
              credentials: 'include',
            });
            
            if (productResponse.ok) {
              const productData = await productResponse.json();
              console.log('Dados do produto recebidos:', productData);
              
              if (productData.product && productData.product.storeId) {
                setSelectedStore(productData.product.storeId.toString());
                
                // Fetch products for this store
                fetchProductsByStore(productData.product.storeId);
              }
            }
          } else {
            // If no promotion data yet, just select the first store
            setSelectedStore(data[0].id.toString());
          }
        }
      } catch (error) {
        console.error('Error fetching stores:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar suas lojas.',
          variant: 'destructive',
        });
      }
    };
    
    if (isAuthenticated) {
      fetchStores();
    }
  }, [isAuthenticated, promotionData]);

  // Fetch products when store changes
  const fetchProductsByStore = async (storeId: number | string) => {
    try {
      const response = await fetch(`/api/stores/${storeId}/products`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }
      
      const data = await response.json();
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os produtos da loja.',
        variant: 'destructive',
      });
    }
  };

  // Handle store change
  const handleStoreChange = (storeId: string) => {
    setSelectedStore(storeId);
    fetchProductsByStore(storeId);
  };

  // Form setup with default values
  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      type: 'normal',
      discountType: 'percentage',
      discountValue: '',
      productId: '',
      startTime: '',
      endTime: '',
    },
  });

  // Update form when promotion data is loaded
  useEffect(() => {
    if (promotionData) {
      form.reset({
        type: promotionData.type,
        discountType: 'percentage', // Default to percentage
        discountValue: promotionData.discountValue,
        productId: promotionData.productId,
        startTime: promotionData.startTime,
        endTime: promotionData.endTime,
      });
      
      console.log('Carregando dados da promoção no formulário:', promotionData);
    }
  }, [promotionData, form]);

  // Update promotion mutation
  const updateMutation = useMutation({
    mutationFn: async (data: PromotionFormValues) => {
      // Convert to backend format
      const apiData = {
        type: data.type === 'normal' ? 'regular' : data.type,
        discountPercentage: data.discountType === 'percentage' ? Number(data.discountValue) : undefined,
        discountAmount: data.discountType === 'amount' ? Number(data.discountValue) : undefined,
        productId: Number(data.productId),
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
      };
      
      console.log("Enviando dados para atualização:", apiData);
      const response = await apiRequest('PUT', `/api/promotions/${promotionId}`, apiData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Promoção atualizada com sucesso!',
        variant: 'default',
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/seller/promotions'] });
      navigate('/seller/promotions');
    },
    onError: (error) => {
      console.error('Error updating promotion:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a promoção. Tente novamente.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Form submission
  const onSubmit = (values: PromotionFormValues) => {
    setIsSubmitting(true);
    updateMutation.mutate(values);
  };

  // Redirect if not authenticated or not a seller
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (!isSeller) {
      navigate('/account');
    }
  }, [isAuthenticated, isSeller, navigate]);

  if (!isAuthenticated || !isSeller || isLoadingPromotion) {
    // Exibir um estado de carregamento
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-64 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Editar Promoção</h1>
          <p className="text-gray-600">Altere as informações da promoção</p>
        </div>
        
        <Button variant="outline" asChild>
          <Link href="/seller/promotions">
            <span className="flex items-center"><i className="fas fa-arrow-left mr-2"></i> Voltar</span>
          </Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Promoção</CardTitle>
              <CardDescription>
                Preencha os dados para editar sua promoção
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Tipo de Promoção */}
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Tipo de Promoção</FormLabel>
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
                              <FormLabel className="font-normal cursor-pointer">
                                Promoção Regular
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="flash" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer flex items-center">
                                <span>Promoção Relâmpago</span>
                                <Badge className="ml-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                                  <i className="fas fa-bolt mr-1"></i> Destaque
                                </Badge>
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormDescription>
                          Promoções relâmpago recebem destaque na página inicial
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Loja */}
                  <div className="space-y-3">
                    <FormLabel>Loja</FormLabel>
                    <Select
                      value={selectedStore}
                      onValueChange={handleStoreChange}
                      disabled={!!promotionData} // Disable changing store when editing
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione uma loja" />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((store) => (
                          <SelectItem key={store.id} value={store.id.toString()}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedStore && promotionData && (
                      <div className="text-sm text-gray-500">
                        Não é possível alterar a loja ao editar uma promoção existente
                      </div>
                    )}
                  </div>
                  
                  {/* Produto */}
                  <FormField
                    control={form.control}
                    name="productId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Produto</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={!!promotionData} // Disable changing product when editing
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um produto" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name} - R$ {product.price.toFixed(2)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {promotionData && (
                          <div className="text-sm text-gray-500 mt-1">
                            Não é possível alterar o produto ao editar uma promoção existente
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Tipo de Desconto */}
                  <FormField
                    control={form.control}
                    name="discountType"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Tipo de Desconto</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex space-x-4"
                          >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="percentage" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                Percentual (%)
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="amount" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                Valor Fixo (R$)
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Valor do Desconto */}
                  <FormField
                    control={form.control}
                    name="discountValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor do Desconto</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                              {form.watch('discountType') === 'percentage' ? '%' : 'R$'}
                            </div>
                            <Input
                              placeholder={form.watch('discountType') === 'percentage' ? "20" : "50.00"}
                              className="pl-8"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          {form.watch('discountType') === 'percentage' 
                            ? 'Informe o percentual de desconto (ex: 20 para 20%)' 
                            : 'Informe o valor fixo de desconto (ex: 50.00)'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Data de Início */}
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Início</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local" 
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Data e hora em que a promoção começará
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Data de Término */}
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Término</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local" 
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Data e hora em que a promoção terminará
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Botões de Ação */}
                  <div className="flex items-center justify-end space-x-4 pt-4">
                    <Button type="button" variant="outline" onClick={() => navigate('/seller/promotions')}>
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="bg-primary text-white hover:bg-primary/90"
                    >
                      {isSubmitting ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Salvando...
                        </>
                      ) : (
                        'Salvar Alterações'
                      )}
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
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">📅 Período da Promoção</h4>
                <p className="text-sm text-gray-600">
                  Defina um período estratégico. Promoções muito longas perdem impacto, muito curtas podem não alcançar todos os clientes.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-1">💰 Valor do Desconto</h4>
                <p className="text-sm text-gray-600">
                  O desconto deve ser atrativo mas sem comprometer sua margem de lucro. Entre 10% e 30% costuma ser ideal.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-1">⚡ Promoções Relâmpago</h4>
                <p className="text-sm text-gray-600">
                  Têm destaque especial na homepage e criam senso de urgência. Ideais para durações curtas (24-48h).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}