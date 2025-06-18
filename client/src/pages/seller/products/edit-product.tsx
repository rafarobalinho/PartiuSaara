import { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/ui/image-upload';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Esquema de validação para o formulário
const productSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  price: z.coerce.number().min(0.01, 'Preço deve ser maior que zero'),
  discountedPrice: z.coerce.number().min(0).optional().nullable(),
  category: z.string().min(1, 'Selecione uma categoria'),
  stock: z.coerce.number().min(0).optional().nullable(),
  images: z.array(z.string()).optional(),
  storeId: z.coerce.number(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function EditProduct() {
  const { id } = useParams();
  const { isAuthenticated, isSeller } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [productImages, setProductImages] = useState<string[]>([]);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar dados do produto
  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!id) {
        setError('ID do produto não fornecido.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await apiRequest('GET', `/api/products/${id}`);
        if (!response.ok) throw new Error('Produto não encontrado');

        const data = await response.json();

        // Normalizando os dados recebidos da API
        const safeProduct = {
          id: data.product.id,
          name: data.product.name || '',
          description: data.product.description || '',
          category: data.product.category || '',
          price: data.product.price || 0,
          discountedPrice: data.product.discounted_price || null,
          stock: data.product.stock || null,
          images: (data.images || []).map((img: any) => img.image_url), // Pega a URL correta
          storeId: data.product.store_id,
        };

        setProduct(safeProduct);
        setProductImages(safeProduct.images);

        // Populando o formulário com os dados carregados
        form.reset({
          name: safeProduct.name,
          description: safeProduct.description,
          price: safeProduct.price,
          discountedPrice: safeProduct.discountedPrice,
          category: safeProduct.category,
          stock: safeProduct.stock,
          images: safeProduct.images,
          storeId: safeProduct.storeId,
        });

      } catch (err) {
        setError('Falha ao carregar os dados do produto.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [id]);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
  });

  const updateProductMutation = useMutation({
    mutationFn: (data: ProductFormValues) => apiRequest('PUT', `/api/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${id}`] });
      toast({ title: 'Produto atualizado com sucesso!' });
      navigate('/seller/products');
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar produto',
        description: error.message || 'Ocorreu um erro.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ProductFormValues) => {
    const finalData = { ...data, images: productImages };
    updateProductMutation.mutate(finalData);
  };

  // Renderização condicional...
  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Editar Produto</CardTitle>
          <CardDescription>Atualize os detalhes do seu produto.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Seus outros FormFields (nome, descrição, preço, etc.) vão aqui */}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Produto</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do produto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ...adicione os outros campos do formulário aqui... */}

              <div>
                <FormLabel>Imagens do Produto</FormLabel>
                <div className="mt-2 border rounded-lg p-4">

                  {/* ===== CÓDIGO CORRIGIDO AQUI ===== */}
                  {product && product.id && product.storeId ? (
                    <ImageUpload
                      entityType="product"
                      entityId={product.id}
                      storeId={product.storeId}
                      multiple={true}
                      maxImages={5}
                      value={productImages}
                      onChange={(urls) => {
                        setProductImages(urls);
                      }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Carregando informações para upload...</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/seller/products')}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateProductMutation.isPending}>
                  {updateProductMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}