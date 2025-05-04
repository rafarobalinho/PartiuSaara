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
});

type PromotionFormValues = z.infer<typeof promotionSchema>;

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  images: string[];
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

  // Fetch seller's products
  const { data: products = [] } = useQuery({
    queryKey: ['/api/seller/products'],
    queryFn: async () => {
      try {
        // Mock data for demonstration
        return [
          {
            id: 1,
            name: 'Smartphone XYZ',
            price: 1299.90,
            category: 'Eletrônicos',
            images: ['https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=200']
          },
          {
            id: 2,
            name: 'Tênis Runner Pro',
            price: 299.90,
            category: 'Calçados',
            images: ['https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?q=80&w=200']
          },
          {
            id: 3,
            name: 'Bolsa Elite Fashion',
            price: 189.90,
            category: 'Acessórios',
            images: ['https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?q=80&w=200']
          }
        ] as Product[];
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
  const selectedProduct = products.find(p => p.id.toString() === productId);

  // Create promotion mutation
  const createPromotionMutation = useMutation({
    mutationFn: async (data: PromotionFormValues) => {
      // Transform the data for API
      const apiData = {
        type: data.type,
        ...(data.discountType === 'percentage' 
          ? { discountPercentage: Number(data.discountValue) } 
          : { discountAmount: Number(data.discountValue) }),
        productId: Number(data.productId),
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
      };
      
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
        toast({
          title: 'Erro',
          description: 'Ocorreu um erro ao criar a promoção. Tente novamente.',
          variant: "destructive",
        });
      }
      console.error('Error creating promotion:', error);
    }
  });

  // Submit handler
  function onSubmit(data: PromotionFormValues) {
    // Check if trying to create flash promotion with freemium plan
    if (data.type === 'flash' && subscriptionPlan === 'freemium') {
      toast({
        title: 'Plano necessário',
        description: 'É necessário um plano superior para criar promoções relâmpago.',
        variant: "destructive",
      });
      return;
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