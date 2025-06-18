import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLocation, Link } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ImageUpload } from '@/components/ui/image-upload';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const productSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres"),
  price: z.string().transform(val => Number(val.replace(',', '.'))),
  storeId: z.string().min(1, "Selecione uma loja").transform(val => Number(val)),
  category: z.string().min(1, "Selecione uma categoria"),
  images: z.array(z.string()).optional(), // Opcional, será tratado pelo ImageUpload
  // Outros campos...
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function AddProduct() {
  const { isAuthenticated, isSeller, user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [productImages, setProductImages] = useState<string[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
    else if (!isSeller) navigate('/account');
  }, [isAuthenticated, isSeller, navigate]);

  const { data: stores = [] } = useQuery({
    queryKey: ['/api/stores/my-stores'],
    queryFn: async () => { /* ... (código para buscar lojas) ... */ return []; }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => { /* ... (código para buscar categorias) ... */ return []; }
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', description: '', price: '', storeId: '', category: '' },
  });

  const createProductMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/products', data),
    onSuccess: () => {
      toast({ title: 'Produto adicionado com sucesso!' });
      navigate('/seller/products');
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar produto', description: error.message, variant: 'destructive' });
    }
  });

  function onSubmit(data: ProductFormValues) {
    // A lógica para lidar com blobs e upload em duas etapas seria adicionada aqui.
    // Por enquanto, a correção principal é no componente.
    const finalData = { ...data, images: productImages };
    createProductMutation.mutate(finalData);
  }

  if (!isAuthenticated || !isSeller) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Adicionar Novo Produto</h1>
        <p className="text-gray-600">Preencha os detalhes do produto.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Informações do Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* ... (todos os seus FormFields para nome, preço, etc. ficam aqui) ... */}

              <FormField
                control={form.control}
                name="storeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loja*</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedStore(value);
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma loja" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stores.map((store: any) => (
                          <SelectItem key={store.id} value={store.id.toString()}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Imagens do Produto</FormLabel>
                <div className="mt-2 border rounded-lg p-4">
                  {/* ===== MUDANÇA PRINCIPAL AQUI ===== */}
                  {selectedStore ? (
                    <ImageUpload
                      entityType="product"
                      entityId="new"
                      storeId={Number(selectedStore)}
                      multiple={true}
                      maxImages={5}
                      value={productImages}
                      onChange={(urls) => {
                        setProductImages(urls);
                      }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Selecione uma loja para adicionar imagens.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/seller/products')}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createProductMutation.isPending}>
                  {createProductMutation.isPending ? 'Adicionando...' : 'Adicionar Produto'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}