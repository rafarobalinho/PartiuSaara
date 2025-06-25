
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, Link } from 'wouter';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { ImageUpload } from '@/components/ui/image-upload';

// Schema expandido de validação do formulário
const storeSchema = z.object({
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
  images: z.array(z.string()).optional(),
  isOpen: z.boolean().default(true),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

type StoreFormValues = z.infer<typeof storeSchema>;

export default function AddStore() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, user, navigate]);

  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
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
    },
  });

  const createStoreMutation = useMutation({
    mutationFn: (data: any) => {
      // Transformar os dados para o formato esperado pelo backend
      const formattedData = {
        ...data,
        address: {
          street: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode
        },
        location: {
          latitude: data.latitude || 0,
          longitude: data.longitude || 0
        }
      };
      return apiRequest('POST', '/api/stores', formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
      toast({ 
        title: 'Loja criada com sucesso!',
        description: 'Sua loja foi cadastrada e está disponível no marketplace.'
      });
      navigate('/seller/stores');
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro ao criar loja', 
        description: error.message || 'Ocorreu um erro ao criar a loja.',
        variant: "destructive" 
      });
    }
  });

  async function onSubmit(data: StoreFormValues) {
    console.log("Dados do formulário antes do processamento:", data);
    createStoreMutation.mutate(data);
  }

  if (!user) return null;

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
        <p className="text-gray-600">
          Preencha todos os detalhes da sua loja para começar a vender no marketplace.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Loja</CardTitle>
          <CardDescription>
            Complete todas as informações para que sua loja tenha uma presença profissional no marketplace.
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
                      <FormDescription>
                        O nome da sua loja como aparecerá para os clientes.
                      </FormDescription>
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
                        <Input placeholder="Ex: Moda, Eletrônicos, Casa e Jardim" {...field} />
                      </FormControl>
                      <FormDescription>
                        A categoria principal dos produtos que você vende.
                      </FormDescription>
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
                          placeholder="Descreva sua loja, produtos e serviços em detalhes"
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Uma descrição detalhada da sua loja para atrair clientes.
                      </FormDescription>
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
                      <FormDescription>
                        Endereço completo da sua loja física.
                      </FormDescription>
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
                      <FormDescription>
                        Telefone para contato dos clientes.
                      </FormDescription>
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
                      <FormDescription>
                        Informe os horários de funcionamento da sua loja.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Coordenadas - Latitude */}
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude (Opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="any"
                          placeholder="Ex: -5.7945"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Coordenada para localização no mapa.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Coordenadas - Longitude */}
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude (Opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="any"
                          placeholder="Ex: -35.2110"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Coordenada para localização no mapa.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status de Funcionamento */}
                <FormField
                  control={form.control}
                  name="isOpen"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 md:col-span-2">
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

              {/* Imagem da Loja */}
              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo da Loja</FormLabel>
                    <FormControl>
                      <ImageUpload
                        entityType="store"
                        entityId="new"
                        multiple={false}
                        maxImages={1}
                        value={field.value || []}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      Selecione uma imagem para representar sua loja (formato JPG, PNG ou WebP, máximo 10MB)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/seller/stores')}>
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
  );
}
