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

const storeSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres"),
  images: z.array(z.string()).optional(),
  // Outros campos...
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
    defaultValues: { name: '', description: '' },
  });

  const createStoreMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/stores', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
      toast({ title: 'Loja adicionada com sucesso!' });
      navigate('/seller/stores');
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar loja', description: error.message, variant: "destructive" });
    }
  });

  async function onSubmit(data: StoreFormValues) {
    // A lógica para lidar com blobs e upload em duas etapas seria adicionada aqui.
    // O componente ImageUpload agora armazena blobs internamente.
    // A mutação enviaria os dados da loja, e no onSuccess, dispararia o upload real da imagem.
    createStoreMutation.mutate(data);
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Cadastrar Nova Loja</h1>
        <p className="text-gray-600">Preencha os detalhes da loja.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Informações da Loja</CardTitle>
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
                      <Input placeholder="Digite o nome da sua loja" {...field} />
                    </FormControl>
                    <FormDescription>
                      O nome da sua loja como aparecerá para os clientes.
                    </FormDescription>
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
                        placeholder="Descreva sua loja, produtos e serviços"
                        className="min-h-[100px]"
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

              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imagem da Loja*</FormLabel>
                    <FormControl>
                      {/* ===== MUDANÇA PRINCIPAL AQUI ===== */}
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
                      Selecione uma imagem para sua loja.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/seller/stores')}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createStoreMutation.isPending}>
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