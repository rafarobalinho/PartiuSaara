import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageUpload } from '@/components/ui/image-upload';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Spinner } from '@/components/ui/spinner';

// Schema de validação do formulário
const storeFormSchema = z.object({
  name: z.string().min(3, {
    message: 'O nome da loja precisa ter pelo menos 3 caracteres'
  }),
  description: z.string().min(10, {
    message: 'A descrição precisa ter pelo menos 10 caracteres'
  }),
  address: z.string().min(5, {
    message: 'O endereço é obrigatório'
  }),
  city: z.string().min(2, {
    message: 'A cidade é obrigatória'
  }),
  state: z.string().min(2, {
    message: 'O estado é obrigatório'
  }),
  zipCode: z.string().min(5, {
    message: 'O CEP é obrigatório'
  }),
  phoneNumber: z.string().min(10, {
    message: 'O telefone é obrigatório'
  }),
  businessHours: z.string().optional(),
  category: z.string().min(1, {
    message: 'A categoria é obrigatória'
  }),
  images: z.array(z.string()).min(1, {
    message: 'Pelo menos uma imagem é obrigatória'
  }),
  isOpen: z.boolean().default(true),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// Tipo para o formulário
type StoreFormValues = z.infer<typeof storeFormSchema>;

export default function StoreDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  
  // Verificar autenticação
  const isAuthenticated = !!user;
  const isSeller = user?.role === 'seller';

  // Buscar detalhes da loja
  const { data: store, isLoading } = useQuery({
    queryKey: [`/api/stores/${id}`],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/stores/${id}`);
        if (!res.ok) {
          throw new Error('Falha ao carregar dados da loja');
        }
        return await res.json();
      } catch (error) {
        console.error('Error fetching store:', error);
        return null;
      }
    },
    enabled: !!id && isAuthenticated && isSeller
  });

  // Configurar o formulário
  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: {
      name: '',
      description: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      phoneNumber: '',
      businessHours: '',
      category: '',
      images: [],
      isOpen: true,
      latitude: 0,
      longitude: 0,
    }
  });

  // Atualizar valores do formulário quando os dados da loja forem carregados
  useEffect(() => {
    if (store) {
      form.reset({
        name: store.name,
        description: store.description,
        address: store.address,
        city: store.city,
        state: store.state,
        zipCode: store.zipCode,
        phoneNumber: store.phoneNumber,
        businessHours: store.businessHours || '',
        category: store.category,
        images: Array.isArray(store.images) ? store.images : 
               (store.images ? [store.images] : []),
        isOpen: store.isOpen,
        latitude: store.latitude || 0,
        longitude: store.longitude || 0,
      });
    }
  }, [store, form]);

  // Mutations para atualizar a loja
  const updateStoreMutation = useMutation({
    mutationFn: async (data: StoreFormValues) => {
      return await apiRequest('PATCH', `/api/stores/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: 'Loja atualizada',
        description: 'As informações da loja foram atualizadas com sucesso.',
      });
      // Invalidar a query para recarregar os dados
      queryClient.invalidateQueries({ queryKey: [`/api/stores/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar loja',
        description: error.message || 'Ocorreu um erro ao atualizar a loja.',
        variant: 'destructive',
      });
    }
  });

  // Verificar permissões
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isSeller)) {
      navigate('/login');
      return;
    }

    // Verificar se a loja pertence ao usuário
    if (store && store.userId !== user?.id) {
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para editar esta loja.',
        variant: 'destructive',
      });
      navigate('/seller/stores');
    }
  }, [authLoading, isAuthenticated, isSeller, navigate, store, user?.id, toast]);

  // Função para lidar com o envio do formulário
  const onSubmit = async (data: StoreFormValues) => {
    updateStoreMutation.mutate(data);
  };

  if (!isAuthenticated || !isSeller) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <div className="text-center">
          <Spinner className="w-10 h-10 text-primary mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados da loja...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4"><i className="fas fa-exclamation-circle text-gray-300"></i></div>
        <h2 className="text-xl font-bold mb-2">Loja não encontrada</h2>
        <p className="text-gray-600 mb-6">A loja que você está procurando não existe ou foi removida.</p>
        <Button asChild className="bg-primary text-white hover:bg-primary/90">
          <Link href="/seller/stores">
            <a>Voltar para minhas lojas</a>
          </Link>
        </Button>
      </div>
    );
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
          <h1 className="text-2xl font-bold">Gerenciar Loja</h1>
        </div>
        <p className="text-gray-600">Edite as informações da sua loja e gerencie sua presença no marketplace</p>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Detalhes da Loja</TabsTrigger>
          <TabsTrigger value="products">
            <Link href={`/seller/stores/${id}/products`}>
              <a className="flex items-center">
                Produtos
              </a>
            </Link>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Loja</CardTitle>
              <CardDescription>
                Mantenha os dados da sua loja atualizados para melhorar a experiência dos seus clientes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Nome da Loja */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Loja</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome da sua loja" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Categoria */}
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria Principal</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Moda, Eletrônicos, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Descrição */}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Descreva sua loja e produtos em detalhes" 
                              {...field} 
                              className="min-h-[120px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Endereço */}
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <Input placeholder="Rua, número e complemento" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Cidade */}
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input placeholder="Cidade" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Estado */}
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <FormControl>
                            <Input placeholder="Estado" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* CEP */}
                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <Input placeholder="00000-000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Telefone */}
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input placeholder="(00) 00000-0000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Horário de Funcionamento */}
                    <FormField
                      control={form.control}
                      name="businessHours"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Horário de Funcionamento</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Segunda a Sexta, 9h às 18h" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Status de Funcionamento */}
                    <FormField
                      control={form.control}
                      name="isOpen"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Loja Aberta</FormLabel>
                            <FormDescription>
                              Ative para indicar que sua loja está aberta para negócios
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

                  {/* Imagem da Loja (Logo) */}
                  <FormField
                    control={form.control}
                    name="images"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo da Loja</FormLabel>
                        <FormControl>
                          <ImageUpload
                            name="store-logo"
                            multiple={false}
                            value={field.value}
                            onChange={field.onChange}
                            maxImages={1}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                      disabled={updateStoreMutation.isPending}
                    >
                      {updateStoreMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}