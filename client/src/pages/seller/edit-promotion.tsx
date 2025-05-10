import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLocation, useParams } from 'wouter';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';

export default function EditPromotion() {
  const { isAuthenticated, isSeller } = useAuth();
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [promotion, setPromotion] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    type: 'regular',
    discountType: 'percentage',
    discountValue: '',
    startTime: '',
    endTime: ''
  });
  
  // Get promotion ID from query params
  const [id, setId] = useState<string | null>(null);
  
  useEffect(() => {
    // Extract ID from URL query parameters
    const params = new URLSearchParams(window.location.search);
    const promotionId = params.get('id');
    
    if (promotionId) {
      setId(promotionId);
      console.log(`Edição de promoção com ID: ${promotionId}`);
    } else {
      console.error('ID da promoção não encontrado na URL');
      toast({
        title: 'Erro',
        description: 'ID da promoção não especificado',
        variant: 'destructive',
      });
      navigate('/seller/promotions');
    }
  }, [navigate]);
  
  // Fetch promotion data when ID is available
  useEffect(() => {
    if (id && isAuthenticated) {
      fetchPromotionData();
    }
  }, [id, isAuthenticated]);
  
  // Fetch promotion details
  async function fetchPromotionData() {
    try {
      console.log(`Tentando carregar promoção ID: "${id}"`);
      setLoading(true);
      
      const response = await fetch(`/api/promotions/${id}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log(`Resposta da API de promoção: status ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch promotion: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Dados da promoção recebidos:", data);
      setPromotion(data);
      
      // Now fetch the associated product
      if (data.productId) {
        await fetchProductData(data.productId);
      }
      
      // Format dates for datetime-local input
      const startDate = data.startTime ? new Date(data.startTime) : new Date();
      const endDate = data.endTime ? new Date(data.endTime) : new Date();
      
      const formatDate = (date: Date) => {
        return date.toISOString().slice(0, 16); // Format as YYYY-MM-DDTHH:MM
      };
      
      // Set form data
      setFormData({
        type: data.type === 'regular' ? 'regular' : 'flash',
        discountType: 'percentage', // Default to percentage
        discountValue: data.discountPercentage ? data.discountPercentage.toString() : '0',
        startTime: formatDate(startDate),
        endTime: formatDate(endDate)
      });
      
    } catch (error) {
      console.error('Error fetching promotion details:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados da promoção.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }
  
  // Fetch product data
  async function fetchProductData(productId: number) {
    try {
      console.log(`Tentando carregar produto ID: "${productId}"`);
      
      const response = await fetch(`/api/products/${productId}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch product: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Dados do produto recebidos:", data);
      setProduct(data.product || data);
      
    } catch (error) {
      console.error('Error fetching product details:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados do produto.',
        variant: 'destructive',
      });
    }
  }
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  // Handle radio button changes
  const handleRadioChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log(`Atualizando promoção ${id} com dados:`, formData);
      setIsSubmitting(true);
      
      // Validate data
      const discountValue = Number(formData.discountValue);
      if (isNaN(discountValue) || discountValue <= 0) {
        toast({
          title: 'Valor inválido',
          description: 'O valor do desconto deve ser um número positivo.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      
      // Validate dates
      const startTime = new Date(formData.startTime);
      const endTime = new Date(formData.endTime);
      
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        toast({
          title: 'Datas inválidas',
          description: 'Por favor, verifique as datas de início e término.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      
      if (endTime <= startTime) {
        toast({
          title: 'Datas inválidas',
          description: 'A data de término deve ser posterior à data de início.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      
      // Convert to backend format
      const apiData = {
        type: formData.type,
        discountPercentage: formData.discountType === 'percentage' ? Number(formData.discountValue) : undefined,
        discountAmount: formData.discountType === 'amount' ? Number(formData.discountValue) : undefined,
        productId: promotion.productId,
        // Using ISO strings for dates to avoid serialization issues
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      };
      
      console.log('Dados formatados para API:', apiData);
      
      // Using the new simplified endpoint instead of the standard PUT endpoint
      const response = await fetch(`/api/promotions/${id}/simple-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(apiData),
      });
      
      console.log(`Resposta do servidor: status ${response.status}`);
      
      if (!response.ok) {
        let errorMessage = 'Erro ao atualizar promoção';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Não foi possível analisar o erro:', parseError);
          const textError = await response.text();
          console.error('Resposta de erro bruta:', textError);
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('Promoção atualizada com sucesso:', result);
      
      toast({
        title: 'Sucesso',
        description: 'Promoção atualizada com sucesso!',
        variant: 'default',
      });
      
      // Redirect back to promotions list
      navigate('/seller/promotions');
      
    } catch (error) {
      console.error('Error updating promotion:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível atualizar a promoção.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Redirect if not authenticated or not a seller
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (!isSeller) {
      navigate('/account');
    }
  }, [isAuthenticated, isSeller, navigate]);
  
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  if (!isAuthenticated || !isSeller || loading) {
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
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tipo de Promoção */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Tipo de Promoção</label>
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="type-regular"
                        name="type"
                        value="regular"
                        checked={formData.type === 'regular'}
                        onChange={() => handleRadioChange('type', 'regular')}
                        className="rounded-full"
                      />
                      <label htmlFor="type-regular" className="cursor-pointer">
                        Promoção Regular
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="type-flash"
                        name="type"
                        value="flash"
                        checked={formData.type === 'flash'}
                        onChange={() => handleRadioChange('type', 'flash')}
                        className="rounded-full"
                      />
                      <label htmlFor="type-flash" className="cursor-pointer flex items-center">
                        <span>Promoção Relâmpago</span>
                        <Badge className="ml-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                          <i className="fas fa-bolt mr-1"></i> Destaque
                        </Badge>
                      </label>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    Promoções relâmpago recebem destaque na página inicial
                  </p>
                </div>
                
                {/* Produto */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Produto</label>
                  <div className="p-3 bg-gray-50 rounded border border-gray-200">
                    {product ? (
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gray-200 rounded-md mr-3 overflow-hidden">
                          {product.images && product.images[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                              <i className="fas fa-image"></i>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-500">
                            Preço: {formatCurrency(product.price)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500">Carregando informações do produto...</div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    Não é possível alterar o produto ao editar uma promoção existente
                  </p>
                </div>
                
                {/* Tipo de Desconto */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Tipo de Desconto</label>
                  <div className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="discount-percentage"
                        name="discountType"
                        value="percentage"
                        checked={formData.discountType === 'percentage'}
                        onChange={() => handleRadioChange('discountType', 'percentage')}
                        className="rounded-full"
                      />
                      <label htmlFor="discount-percentage" className="cursor-pointer">
                        Percentual (%)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="discount-amount"
                        name="discountType"
                        value="amount"
                        checked={formData.discountType === 'amount'}
                        onChange={() => handleRadioChange('discountType', 'amount')}
                        className="rounded-full"
                      />
                      <label htmlFor="discount-amount" className="cursor-pointer">
                        Valor Fixo (R$)
                      </label>
                    </div>
                  </div>
                </div>
                
                {/* Valor do Desconto */}
                <div className="space-y-3">
                  <label htmlFor="discountValue" className="text-sm font-medium">
                    Valor do Desconto
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      {formData.discountType === 'percentage' ? '%' : 'R$'}
                    </div>
                    <Input
                      id="discountValue"
                      name="discountValue"
                      type="number"
                      placeholder={formData.discountType === 'percentage' ? "20" : "50.00"}
                      value={formData.discountValue}
                      onChange={handleChange}
                      className="pl-8"
                      required
                      min="0"
                      step={formData.discountType === 'percentage' ? "1" : "0.01"}
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    {formData.discountType === 'percentage'
                      ? 'Informe o percentual de desconto (ex: 20 para 20%)'
                      : 'Informe o valor fixo de desconto (ex: 50.00)'}
                  </p>
                </div>
                
                {/* Data de Início */}
                <div className="space-y-3">
                  <label htmlFor="startTime" className="text-sm font-medium">
                    Data e Hora de Início
                  </label>
                  <Input
                    id="startTime"
                    name="startTime"
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={handleChange}
                    required
                  />
                  <p className="text-sm text-gray-500">
                    Data e hora em que a promoção começará
                  </p>
                </div>
                
                {/* Data de Término */}
                <div className="space-y-3">
                  <label htmlFor="endTime" className="text-sm font-medium">
                    Data e Hora de Término
                  </label>
                  <Input
                    id="endTime"
                    name="endTime"
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={handleChange}
                    required
                  />
                  <p className="text-sm text-gray-500">
                    Data e hora em que a promoção terminará
                  </p>
                </div>
                
                {/* Botões de Ação */}
                <div className="flex items-center justify-end space-x-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/seller/promotions')}
                  >
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