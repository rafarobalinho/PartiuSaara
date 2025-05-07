import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, Link } from 'wouter';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { CheckIcon } from 'lucide-react';

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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageUpload } from '@/components/ui/image-upload';

// Esquema para validação do formulário da loja
const storeSchema = z.object({
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres' }),
  description: z.string().min(10, { message: 'A descrição deve ter pelo menos 10 caracteres' }),
  categories: z.array(z.string()).min(1, { message: 'Selecione pelo menos uma categoria' }).max(3, { message: 'Selecione no máximo 3 categorias' }),
  tags: z.string().optional(),
  images: z.array(z.string()).default([]),
  address: z.object({
    street: z.string().min(1, { message: 'Preencha o endereço' }),
    city: z.string().min(1, { message: 'Preencha a cidade' }),
    state: z.string().min(1, { message: 'Preencha o estado' }),
    zipCode: z.string().min(1, { message: 'Preencha o CEP' }),
  }),
  acceptLocationTerms: z.boolean().optional(),
});

// Tipo para os valores do formulário
type StoreFormValues = z.infer<typeof storeSchema>;

export default function AddStore() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  
  // Referência para o componente de upload de imagens
  const imageUploadRef = useRef<any>(null);
  
  // Estado temporário para armazenar o ID da loja criada (para upload posterior)
  const [tempStoreId, setTempStoreId] = useState<number | null>(null);

  // Redirecionar se não estiver autenticado ou não for vendedor
  const isAuthenticated = !!user;
  const isSeller = user?.role === 'seller';

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
    },
    enabled: !!isAuthenticated && !!isSeller
  });

  // Initialize form
  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: '',
      description: '',
      categories: [],
      tags: '',
      images: [],
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
      },
      acceptLocationTerms: false,
    },
  });

  // Mutation para criar loja
  const createStoreMutation = useMutation({
    mutationFn: async (data: StoreFormValues) => {
      // Formatação dos dados antes de enviar
      const formattedData = {
        name: data.name,
        description: data.description,
        category: data.categories && data.categories.length > 0 ? data.categories[0] : '',
        tags: data.tags ? data.tags.split(',').map((tag: string) => tag.trim()) : [],
        address: data.address,
        // Posição padrão para o SAARA
        location: {
          latitude: -22.903539,
          longitude: -43.175003
        },
        // Add userId
        userId: user?.id,
      };
      
      // Não incluímos as imagens no objeto da loja - serão salvas posteriormente
      // na tabela store_images
      
      return apiRequest('POST', '/api/stores', formattedData);
    },
    onSuccess: (response: any) => {
      // Salvamos o ID da loja para associar às imagens
      if (response && response.id) {
        setTempStoreId(response.id);
        
        // Se houver imagens, só vamos redirecionar após o upload delas
        if (form.getValues('images').length === 0) {
          finishStoreCreation();
        }
      } else {
        finishStoreCreation();
      }
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
  
  // Função para finalizar o processo e redirecionar
  const finishStoreCreation = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
    toast({
      title: 'Loja adicionada',
      description: 'Sua loja foi adicionada com sucesso.',
      variant: "default",
    });
    navigate('/seller/stores');
  };
  
  // Submit handler
  async function onSubmit(data: StoreFormValues) {
    try {
      // Verificar se há blobs para processar
      if (imageUploadRef.current?.hasBlobs && imageUploadRef.current.hasBlobs()) {
        console.log('Processando blobs antes de enviar o formulário...');
        // Processar blobs antes de enviar o formulário
        await imageUploadRef.current.processBlobs();
        
        // Pequena pausa para garantir que o estado foi atualizado
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Obter os valores atualizados após o processamento
        const updatedImages = form.getValues('images');
        data = { ...data, images: updatedImages };
      }
      
      // Continuar com a submissão normal
      createStoreMutation.mutate(data);
    } catch (error) {
      console.error('Erro ao processar imagens:', error);
      toast({
        title: 'Erro no processamento de imagens',
        description: 'Ocorreu um erro ao processar as imagens. Tente novamente.',
        variant: "destructive",
      });
    }
  }

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isSeller)) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, isSeller, navigate]);

  // Efeito para lidar com upload de imagens quando a loja é criada
  useEffect(() => {
    const uploadStoreImages = async () => {
      const images = form.getValues('images');
      if (tempStoreId && images.length > 0) {
        try {
          // Atualizar a primeira imagem como primária
          const isPrimary = true;
          
          // Fazer o upload usando a API
          await apiRequest('POST', `/api/stores/${tempStoreId}/images`, {
            imageUrls: images,
            isPrimary
          });
          
          finishStoreCreation();
        } catch (error) {
          console.error('Erro ao fazer upload das imagens da loja:', error);
          toast({
            title: 'Atenção',
            description: 'Sua loja foi criada, mas houve um erro ao salvar as imagens.',
            variant: "destructive",
          });
          navigate('/seller/stores');
        }
      }
    };
    
    uploadStoreImages();
  }, [tempStoreId]);

  if (!isAuthenticated || !isSeller) {
    return null;
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
                      name="categories"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categorias*</FormLabel>
                          <div className="space-y-2">
                            {categories.map((category: any) => (
                              <div className="flex items-center space-x-2" key={category.id}>
                                <Checkbox 
                                  id={`category-${category.id}`}
                                  checked={field.value?.includes(category.slug)}
                                  onCheckedChange={(checked) => {
                                    const currentValues = field.value || [];
                                    if (checked) {
                                      // Limitar a 3 categorias
                                      if (currentValues.length < 3) {
                                        field.onChange([...currentValues, category.slug]);
                                      } else {
                                        // Alerta usando referência ao toast já declarado no início do componente
                                        toast({
                                          title: "Limite atingido",
                                          description: "Você pode selecionar apenas 3 categorias.",
                                          variant: "destructive"
                                        });
                                      }
                                    } else {
                                      field.onChange(
                                        currentValues.filter((value) => value !== category.slug)
                                      );
                                    }
                                  }}
                                />
                                <label 
                                  htmlFor={`category-${category.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {category.name}
                                </label>
                              </div>
                            ))}
                          </div>
                          <FormDescription>
                            Selecione até 3 categorias para sua loja
                          </FormDescription>
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

                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="images"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Imagem da Loja*</FormLabel>
                          <FormControl>
                            <ImageUpload
                              ref={imageUploadRef}
                              name="store-upload-new"
                              multiple={false}
                              maxImages={1}
                              value={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormDescription>
                            Selecione uma imagem para sua loja
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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

                    <FormField
                      control={form.control}
                      name="acceptLocationTerms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 my-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Permissão de Localização
                            </FormLabel>
                            <FormDescription>
                              Permitir que o aplicativo acesse minha localização para mostrar promoções exclusivas quando eu estiver próximo ao SAARA.
                              As informações de localização são utilizadas apenas para melhorar sua experiência com promoções personalizadas.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
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