import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, Link } from 'wouter';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';

// Esquema para validação do formulário da loja
const storeSchema = z.object({
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres' }),
  description: z.string().min(10, { message: 'A descrição deve ter pelo menos 10 caracteres' }),
  category: z.string().min(1, { message: 'Selecione uma categoria' }),
  tags: z.string().optional(),
  images: z.string().min(1, { message: 'Adicione pelo menos uma imagem' }),
  address: z.object({
    street: z.string().min(1, { message: 'Preencha o endereço' }),
    city: z.string().min(1, { message: 'Preencha a cidade' }),
    state: z.string().min(1, { message: 'Preencha o estado' }),
    zipCode: z.string().min(1, { message: 'Preencha o CEP' }),
  }),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

// Tipo para os valores do formulário
type StoreFormValues = z.infer<typeof storeSchema>;

export default function AddStore() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Redirecionar se não estiver autenticado ou não for vendedor
  const isAuthenticated = !!user;
  const isSeller = user?.role === 'seller';

  // Fetch categories - movido para antes da condição de retorno
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
    },
    enabled: !!isAuthenticated && !!isSeller
  });

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isSeller)) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, isSeller, navigate]);

  if (!isAuthenticated || !isSeller) {
    return null;
  }

  // Os hooks foram movidos para antes da condição de retorno

  // Create form with default values
  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      tags: '',
      images: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
      },
      location: {
        latitude: 0,
        longitude: 0,
      },
    },
  });

  // Mutation para criar loja
  const createStoreMutation = useMutation({
    mutationFn: async (data: any) => {
      // Formatação dos dados antes de enviar
      const formattedData = {
        ...data,
        // Parse tags string to array
        tags: data.tags ? data.tags.split(',').map((tag: string) => tag.trim()) : [],
        // Parse images string to array
        images: data.images.split(',').map((img: string) => img.trim()),
        // Add userId
        userId: user?.id,
      };
      
      return apiRequest('POST', '/api/stores', formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
      toast({
        title: 'Loja adicionada',
        description: 'Sua loja foi adicionada com sucesso.',
        variant: "default",
      });
      navigate('/seller/stores');
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao adicionar a loja. Tente novamente.',
        variant: "destructive",
      });
      console.error('Error creating store:', error);
    }
  });

  // Função para obter localização atual
  const getCurrentLocation = () => {
    setLocationLoading(true);
    setLocationError(null);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          form.setValue('location.latitude', latitude);
          form.setValue('location.longitude', longitude);
          setLocationLoading(false);
        },
        (error) => {
          setLocationError('Não foi possível obter sua localização. Por favor, tente novamente ou insira manualmente.');
          setLocationLoading(false);
          console.error('Geolocation error:', error);
        }
      );
    } else {
      setLocationError('Seu navegador não suporta geolocalização. Por favor, insira a localização manualmente.');
      setLocationLoading(false);
    }
  };

  // Submit handler
  function onSubmit(data: StoreFormValues) {
    createStoreMutation.mutate(data);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <Link href="/seller/stores">
            <span className="text-gray-500 hover:text-primary mr-2 cursor-pointer">
              <i className="fas fa-arrow-left"></i>
            </span>
          </Link>
          <h1 className="text-2xl font-bold">Cadastrar Nova Loja</h1>
        </div>
        <p className="text-gray-600">Preencha os detalhes da loja para começar a vender no marketplace</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Loja</CardTitle>
              <CardDescription>Dados básicos sobre sua loja</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Loja*</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Moda Express" {...field} />
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
                            placeholder="Descreva sua loja e o que você vende..." 
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
                              {categories.map((category: any) => (
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
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tags</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Moda, Roupas, Promoção" {...field} />
                          </FormControl>
                          <FormDescription>
                            Separe as tags por vírgulas
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="images"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Imagens*</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          URLs de imagens separadas por vírgula
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mt-4">
                    <h3 className="font-medium text-sm mb-3">Endereço e Localização</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <FormField
                        control={form.control}
                        name="address.street"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Endereço*</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Rua do Saara, 123" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="address.city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cidade*</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Rio de Janeiro" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <FormField
                        control={form.control}
                        name="address.state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado*</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: RJ" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="address.zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CEP*</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: 20000-000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="location.latitude"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Latitude*</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="any"
                                placeholder="Ex: -22.903539" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="location.longitude"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Longitude*</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="any"
                                placeholder="Ex: -43.175003" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="mt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={getCurrentLocation}
                        disabled={locationLoading}
                        className="w-full"
                      >
                        {locationLoading ? 'Obtendo localização...' : 'Usar Minha Localização Atual'}
                        <i className="fas fa-map-marker-alt ml-2"></i>
                      </Button>
                      {locationError && (
                        <p className="text-sm text-red-500 mt-2">{locationError}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => navigate('/seller/stores')}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-primary text-white hover:bg-primary/90"
                      disabled={createStoreMutation.isPending}
                    >
                      {createStoreMutation.isPending ? 'Cadastrando...' : 'Cadastrar Loja'}
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
              <CardDescription>Para lojas de sucesso</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex">
                  <i className="fas fa-check-circle text-primary mt-0.5 mr-2"></i>
                  <span>Escolha um nome memorável e fácil de pronunciar</span>
                </li>
                <li className="flex">
                  <i className="fas fa-check-circle text-primary mt-0.5 mr-2"></i>
                  <span>Adicione uma descrição detalhada sobre seus produtos e diferenciais</span>
                </li>
                <li className="flex">
                  <i className="fas fa-check-circle text-primary mt-0.5 mr-2"></i>
                  <span>Utilize imagens de alta qualidade para sua loja</span>
                </li>
                <li className="flex">
                  <i className="fas fa-check-circle text-primary mt-0.5 mr-2"></i>
                  <span>Mantenha seu endereço e localização precisos para que os clientes possam encontrá-lo</span>
                </li>
                <li className="flex">
                  <i className="fas fa-check-circle text-primary mt-0.5 mr-2"></i>
                  <span>Use tags relevantes para ajudar nas buscas</span>
                </li>
              </ul>

              <div className="mt-6 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center mb-2">
                  <i className="fas fa-lightbulb text-amber-500 mr-2"></i>
                  <span className="font-medium">Atenção</span>
                </div>
                <p className="text-sm text-amber-800">
                  Depois de cadastrar sua loja, você poderá adicionar produtos e criar promoções para atrair mais clientes.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}