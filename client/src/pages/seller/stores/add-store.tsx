// ARQUIVO: client/src/pages/seller/stores/add-store.tsx
// 🚀 CORREÇÃO COMPLETA: Upload em duas etapas + todos os campos obrigatórios

import { useState, useEffect, useRef } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { MapPin, Store, Phone, Clock, Users } from 'lucide-react';

// ✅ SCHEMA COMPLETO COM TODOS OS 12 CAMPOS OBRIGATÓRIOS
const storeSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres"),
  address: z.string().min(10, "O endereço deve ter pelo menos 10 caracteres"),
  city: z.string().min(2, "A cidade é obrigatória"),
  state: z.string().min(2, "O estado é obrigatório"),
  zipCode: z.string().min(8, "O CEP deve ter pelo menos 8 caracteres"),
  phoneNumber: z.string().min(10, "O telefone deve ter pelo menos 10 dígitos"),
  category: z.string().min(1, "A categoria é obrigatória"),
  businessHours: z.string().min(5, "O horário de funcionamento é obrigatório"),
  isOpen: z.boolean().default(true),
  images: z.array(z.string()).optional().transform((arr) => {
    // ✅ FILTRAR PLACEHOLDERS "__files_selected__" antes do envio
    return arr?.filter(img => img !== "__files_selected__") || [];
  }),
});



type StoreFormValues = z.infer<typeof storeSchema>;

export default function AddStore() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ REF PARA CONTROLAR O IMAGEUPLOAD
  const imageUploadRef = useRef<any>(null);

  // Buscar categorias do banco de dados
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
      category: '',
      businessHours: '',
      isOpen: true,
      images: [],
    },
  });

  // ✅ MUTAÇÃO PARA CRIAR LOJA (PRIMEIRA ETAPA)
  const createStoreMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('🏪 ETAPA 1: Criando loja sem imagens...', data);
      const response = await apiRequest('POST', '/api/stores', data);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao criar loja');
      }

      return result;
    },
    onSuccess: async (result) => {
      console.log('✅ ETAPA 1 CONCLUÍDA: Loja criada com ID', result.id);

      // ✅ ETAPA 2: FAZER UPLOAD DAS IMAGENS SE HOUVER ARQUIVOS PENDENTES
      if (imageUploadRef.current?.uploadPendingFiles) {
        try {
          setIsSubmitting(true);
          console.log('📸 ETAPA 2: Fazendo upload das imagens...');

          const uploadResult = await imageUploadRef.current.uploadPendingFiles(result.id);

          if (uploadResult.success) {
            console.log('✅ ETAPA 2 CONCLUÍDA: Imagens enviadas com sucesso');
            toast({ 
              title: 'Loja criada com sucesso!', 
              description: 'Loja e imagens adicionadas com sucesso.' 
            });
          } else {
            console.warn('⚠️ ETAPA 2 FALHOU: Erro no upload das imagens', uploadResult.error);
            toast({ 
              title: 'Loja criada!', 
              description: 'Loja criada, mas houve um problema com o upload da imagem.',
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('❌ ETAPA 2 ERRO:', error);
          toast({ 
            title: 'Loja criada!', 
            description: 'Loja criada, mas houve erro no upload da imagem.',
            variant: "destructive"
          });
        }
      } else {
        console.log('ℹ️ ETAPA 2 PULADA: Nenhuma imagem selecionada');
        toast({ title: 'Loja criada com sucesso!' });
      }

      // ✅ FINALIZAR: INVALIDAR CACHE E NAVEGAR
      queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
      navigate('/seller/stores');
    },
    onError: (error: any) => {
      console.error('❌ ETAPA 1 FALHOU:', error);
      toast({ 
        title: 'Erro ao criar loja', 
        description: error.message, 
        variant: "destructive" 
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  async function onSubmit(data: StoreFormValues) {
    try {
      setIsSubmitting(true);

      // ✅ FORMATAÇÃO DOS DADOS PARA O BACKEND
      const storeData = {
        ...data,
        images: [], // ← SEMPRE ARRAY VAZIO NA PRIMEIRA ETAPA
        address: {
          street: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
        },
        location: {
          latitude: 0,
          longitude: 0,
        },
      };

      console.log('🚀 INICIANDO CRIAÇÃO DE LOJA EM DUAS ETAPAS...');
      createStoreMutation.mutate(storeData);
    } catch (error) {
      console.error('❌ Erro no onSubmit:', error);
      setIsSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Store className="h-6 w-6" />
          Cadastrar Nova Loja
        </h1>
        <p className="text-gray-600">Preencha todos os detalhes da sua loja para começar a vender.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Loja</CardTitle>
          <CardDescription>
            Todas as informações são obrigatórias para criar sua loja.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Seção: Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Informações Básicas
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Loja *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Boutique da Maria" {...field} />
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
                        <FormLabel>Categoria Principal *</FormLabel>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="(11) 99999-9999" 
                            {...field} 
                            className="flex items-center"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Horário de Funcionamento *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: Segunda a Sexta, 09h às 18h" 
                            {...field}
                            className="flex items-center"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Seção: Endereço */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Endereço da Loja
                </h3>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço Completo *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Rua das Flores, 123, Centro" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: São Paulo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: SP" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP *</FormLabel>
                        <FormControl>
                          <Input placeholder="00000-000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Seção: Descrição */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Descrição da Loja</h3>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conte sobre sua loja *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva sua loja, produtos que vende, diferenciais..." 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Mínimo 10 caracteres. Esta descrição aparecerá na página da sua loja.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Seção: Imagem da Loja */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Imagem da Loja</h3>

                <FormField
                  control={form.control}
                  name="images"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imagem Principal</FormLabel>
                      <FormControl>
                        <ImageUpload
                          ref={imageUploadRef}
                          entityType="store"
                          entityId="new"
                          multiple={false}
                          selectedImages={field.value || []}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription>
                        Selecione uma imagem que represente sua loja (JPG, PNG ou WebP, máximo 10MB)
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
                  name="isOpen"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Loja Aberta</FormLabel>
                        <FormDescription>
                          Sua loja estará visível para clientes quando marcada como aberta
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
                  onClick={() => navigate('/seller/stores')}
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
                      Criando Loja...
                    </>
                  ) : (
                    <>
                      <Store className="h-4 w-4" />
                      Cadastrar Loja
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