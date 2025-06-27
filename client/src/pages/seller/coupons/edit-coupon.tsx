// client/src/pages/seller/coupons/edit-coupon.tsx
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Trash2, Eye, EyeOff } from 'lucide-react';

interface Coupon {
  id: number;
  code: string;
  description: string;
  discountPercentage?: number;
  discountAmount?: number;
  minimumPurchase?: number;
  maxUsageCount?: number;
  usageCount: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  store: {
    id: number;
    name: string;
  };
}

export default function EditCoupon() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();

  // Extrair ID do cupom da URL
  const couponId = location.split('/')[3]; // /seller/coupons/{id}/edit

  // State
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountPercentage: '',
    discountAmount: '',
    minimumPurchase: '',
    maxUsageCount: '',
    startTime: '',
    endTime: '',
    isActive: true
  });

  // Load coupon data
  useEffect(() => {
    if (couponId) {
      loadCoupon();
    }
  }, [couponId]);

  const loadCoupon = async () => {
    try {
      const response = await fetch(`/api/seller/coupons/${couponId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setCoupon(data);

        // Populate form
        setFormData({
          code: data.code,
          description: data.description,
          discountPercentage: data.discountPercentage?.toString() || '',
          discountAmount: data.discountAmount?.toString() || '',
          minimumPurchase: data.minimumPurchase?.toString() || '',
          maxUsageCount: data.maxUsageCount?.toString() || '',
          startTime: formatDateTimeLocal(data.startTime),
          endTime: formatDateTimeLocal(data.endTime),
          isActive: data.isActive
        });

        // Set discount type
        setDiscountType(data.discountPercentage ? 'percentage' : 'amount');
      } else {
        toast({
          title: "Erro",
          description: "Cupom não encontrado",
          variant: "destructive"
        });
        navigate('/seller/coupons');
      }
    } catch (error) {
      console.error('Error loading coupon:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar cupom",
        variant: "destructive"
      });
      navigate('/seller/coupons');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTimeLocal = (dateString: string) => {
    // Criar data interpretando como UTC e converter para horário local de Brasília
    const date = new Date(dateString);
    
    // Ajustar para fuso horário de Brasília (UTC-3)
    const brasiliaOffset = -3 * 60; // -3 horas em minutos
    const localOffset = date.getTimezoneOffset(); // offset local em minutos
    const adjustedDate = new Date(date.getTime() + (brasiliaOffset - localOffset) * 60000);
    
    const year = adjustedDate.getFullYear();
    const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
    const day = String(adjustedDate.getDate()).padStart(2, '0');
    const hours = String(adjustedDate.getHours()).padStart(2, '0');
    const minutes = String(adjustedDate.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Código é obrigatório';
    } else if (formData.code.length < 4) {
      newErrors.code = 'Código deve ter pelo menos 4 caracteres';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }

    if (discountType === 'percentage') {
      if (!formData.discountPercentage || parseFloat(formData.discountPercentage) <= 0) {
        newErrors.discountPercentage = 'Porcentagem de desconto deve ser maior que 0';
      } else if (parseFloat(formData.discountPercentage) > 100) {
        newErrors.discountPercentage = 'Porcentagem não pode ser maior que 100%';
      }
    } else {
      if (!formData.discountAmount || parseFloat(formData.discountAmount) <= 0) {
        newErrors.discountAmount = 'Valor do desconto deve ser maior que 0';
      }
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Data de início é obrigatória';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'Data de fim é obrigatória';
    } else if (formData.startTime && new Date(formData.endTime) <= new Date(formData.startTime)) {
      newErrors.endTime = 'Data de fim deve ser posterior à data de início';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const updateData = {
        code: formData.code.toUpperCase(),
        description: formData.description,
        discountPercentage: discountType === 'percentage' ? parseFloat(formData.discountPercentage) : null,
        discountAmount: discountType === 'amount' ? parseFloat(formData.discountAmount) : null,
        minimumPurchase: formData.minimumPurchase ? parseFloat(formData.minimumPurchase) : null,
        maxUsageCount: formData.maxUsageCount ? parseInt(formData.maxUsageCount) : null,
        startTime: formData.startTime, // Backend irá tratar o fuso horário
        endTime: formData.endTime,     // Backend irá tratar o fuso horário
        isActive: formData.isActive
      };

      const response = await fetch(`/api/seller/coupons/${couponId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const updatedCoupon = await response.json();
        setCoupon(updatedCoupon);

        // Recarregar os dados para garantir que estão atualizados
        await loadCoupon();

        toast({
          title: "Sucesso",
          description: "Cupom atualizado com sucesso!",
        });

        // Redirecionar para a lista de cupons após salvar
        navigate('/seller/coupons');
      } else {
        const result = await response.json();
        toast({
          title: "Erro ao atualizar cupom",
          description: result.message || 'Erro desconhecido',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating coupon:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar cupom. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir o cupom "${coupon?.code}"?`)) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/seller/coupons/${couponId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "Cupom excluído",
          description: "O cupom foi excluído com sucesso.",
        });
        navigate('/seller/coupons');
      } else {
        const result = await response.json();
        toast({
          title: "Erro ao excluir cupom",
          description: result.message || 'Erro desconhecido',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir cupom. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  const toggleStatus = async () => {
    try {
      const response = await fetch(`/api/seller/coupons/${couponId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ isActive: !formData.isActive })
      });

      if (response.ok) {
        setFormData(prev => ({ ...prev, isActive: !prev.isActive }));
        toast({
          title: `Cupom ${!formData.isActive ? 'ativado' : 'desativado'}`,
          description: `O cupom foi ${!formData.isActive ? 'ativado' : 'desativado'} com sucesso.`,
        });
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status do cupom",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatDiscount = () => {
    if (discountType === 'percentage' && formData.discountPercentage) {
      return `${formData.discountPercentage}%`;
    } else if (discountType === 'amount' && formData.discountAmount) {
      return `R$ ${formData.discountAmount}`;
    }
    return '-';
  };

  const getCouponStatus = () => {
    if (!coupon) return { label: '', variant: 'secondary' as const };

    const now = new Date();
    const endDate = new Date(coupon.endTime);

    if (!coupon.isActive) {
      return { label: 'Inativo', variant: 'secondary' as const };
    } else if (endDate < now) {
      return { label: 'Expirado', variant: 'destructive' as const };
    } else {
      return { label: 'Ativo', variant: 'default' as const };
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!coupon) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Alert variant="destructive">
          <AlertDescription>
            Cupom não encontrado.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Verificação adicional para dados da loja
  if (!coupon.store) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const status = getCouponStatus();

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/seller/coupons')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Cupons
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Editar Cupom</h1>
            <p className="text-gray-600 mt-1">
              Código: <span className="font-mono font-bold">{coupon.code}</span>
            </p>
          </div>
          <Badge variant={status.variant}>
            {status.label}
          </Badge>
        </div>
      </div>

      {/* Usage Stats */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{coupon.usageCount}</p>
              <p className="text-sm text-gray-600">Usos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {coupon.maxUsageCount || '∞'}
              </p>
              <p className="text-sm text-gray-600">Limite</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {coupon.maxUsageCount 
                  ? Math.max(0, coupon.maxUsageCount - coupon.usageCount)
                  : '∞'
                }
              </p>
              <p className="text-sm text-gray-600">Restantes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {coupon.maxUsageCount 
                  ? Math.round((coupon.usageCount / coupon.maxUsageCount) * 100)
                  : 0
                }%
              </p>
              <p className="text-sm text-gray-600">Utilização</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Cupom</CardTitle>
          <CardDescription>
            Edite as informações do seu cupom de desconto
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Store Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{coupon.store?.name || 'Loja não encontrada'}</p>
                  <p className="text-sm text-gray-600">Loja</p>
                </div>
                <Button
                  type="button"
                  variant={formData.isActive ? "outline" : "default"}
                  size="sm"
                  onClick={toggleStatus}
                  className="flex items-center gap-2"
                >
                  {formData.isActive ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      Desativar
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Ativar
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Coupon Code */}
            <div className="space-y-2">
              <Label htmlFor="code">Código do Cupom</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                className="uppercase font-mono"
              />
              {errors.code && <p className="text-sm text-red-500">{errors.code}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
              {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
            </div>

            {/* Discount Type */}
            <div className="space-y-4">
              <Label>Tipo de Desconto</Label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="discountType"
                    value="percentage"
                    checked={discountType === 'percentage'}
                    onChange={(e) => setDiscountType(e.target.value as 'percentage')}
                    className="mr-2"
                  />
                  Porcentagem
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="discountType"
                    value="amount"
                    checked={discountType === 'amount'}
                    onChange={(e) => setDiscountType(e.target.value as 'amount')}
                    className="mr-2"
                  />
                  Valor Fixo (R$)
                </label>
              </div>

              {discountType === 'percentage' ? (
                <div className="space-y-2">
                  <Label htmlFor="discountPercentage">Porcentagem de Desconto (%)</Label>
                  <Input
                    id="discountPercentage"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.discountPercentage}
                    onChange={(e) => handleInputChange('discountPercentage', e.target.value)}
                  />
                  {errors.discountPercentage && <p className="text-sm text-red-500">{errors.discountPercentage}</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="discountAmount">Valor do Desconto (R$)</Label>
                  <Input
                    id="discountAmount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.discountAmount}
                    onChange={(e) => handleInputChange('discountAmount', e.target.value)}
                  />
                  {errors.discountAmount && <p className="text-sm text-red-500">{errors.discountAmount}</p>}
                </div>
              )}
            </div>

            {/* Optional Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minimumPurchase">Valor Mínimo (R$)</Label>
                <Input
                  id="minimumPurchase"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.minimumPurchase}
                  onChange={(e) => handleInputChange('minimumPurchase', e.target.value)}
                  placeholder="Opcional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxUsageCount">Limite de Uso</Label>
                <Input
                  id="maxUsageCount"
                  type="number"
                  min="1"
                  value={formData.maxUsageCount}
                  onChange={(e) => handleInputChange('maxUsageCount', e.target.value)}
                  placeholder="Ilimitado"
                />
                <p className="text-xs text-gray-500">
                  Atual: {coupon.usageCount} usos
                </p>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Data de Início</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                />
                {errors.startTime && <p className="text-sm text-red-500">{errors.startTime}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">Data de Fim</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                />
                {errors.endTime && <p className="text-sm text-red-500">{errors.endTime}</p>}
              </div>
            </div>

            {/* Preview */}
            {formData.code && formData.description && (
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-sm">Preview do Cupom</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg">{formData.code}</h3>
                      <p className="text-sm text-gray-600">{formData.description}</p>
                      {formData.minimumPurchase && (
                        <p className="text-xs text-gray-500 mt-1">
                          Mínimo: R$ {parseFloat(formData.minimumPurchase).toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {formatDiscount()}
                      </div>
                      <div className="text-xs text-gray-500">OFF</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6">
              <Button 
                type="submit" 
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>

              <Button 
                type="button" 
                variant="outline"
                onClick={() => navigate('/seller/coupons')}
              >
                Cancelar
              </Button>

              <Button 
                type="button" 
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}