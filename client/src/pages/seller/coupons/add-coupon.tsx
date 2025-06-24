// client/src/pages/seller/coupons/add-coupon.tsx
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

interface CouponLimits {
  maxCouponsPerMonth: number;
  currentCouponsThisMonth: number;
  canCreateCoupons: boolean;
  remaining: number | string;
  currentPlan: string;
}

export default function AddCoupon() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountPercentage: '',
    discountAmount: '',
    minimumPurchase: '',
    maxUsage: '',
    startTime: '',
    endTime: '',
    isActive: true
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [limits, setLimits] = useState<CouponLimits | null>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load user stores and limits on mount
  useEffect(() => {
    loadUserStores();
    loadCouponLimits();
  }, []);

  const loadUserStores = async () => {
    try {
      const response = await fetch('/api/seller/stores', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setStores(data);
        if (data.length > 0) {
          setSelectedStore(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  };

  const loadCouponLimits = async () => {
    try {
      const response = await fetch('/api/seller/coupons/limits', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setLimits(data);
      }
    } catch (error) {
      console.error('Error loading coupon limits:', error);
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, code: result }));
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

    if (!selectedStore) {
      newErrors.store = 'Selecione uma loja';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!limits?.canCreateCoupons) {
      toast({
        title: "Limite atingido",
        description: "Você atingiu o limite de cupons do seu plano. Faça upgrade para criar mais cupons.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const couponData = {
        storeId: selectedStore,
        code: formData.code.toUpperCase(),
        description: formData.description,
        discountPercentage: discountType === 'percentage' ? parseFloat(formData.discountPercentage) : null,
        discountAmount: discountType === 'amount' ? parseFloat(formData.discountAmount) : null,
        minimumPurchase: formData.minimumPurchase ? parseFloat(formData.minimumPurchase) : null,
        maxUsage: formData.maxUsage ? parseInt(formData.maxUsage) : null,
        startTime: formData.startTime,
        endTime: formData.endTime,
        isActive: formData.isActive
      };

      const response = await fetch('/api/seller/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(couponData)
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Cupom criado!",
          description: "Seu cupom foi criado com sucesso.",
        });
        navigate('/seller/coupons');
      } else {
        toast({
          title: "Erro ao criar cupom",
          description: result.message || 'Erro desconhecido',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating coupon:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar cupom. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/seller/coupons')}
          className="mb-4"
        >
          <i className="fas fa-arrow-left mr-2"></i>
          Voltar para Cupons
        </Button>

        <h1 className="text-2xl font-bold">Criar Novo Cupom</h1>
        <p className="text-gray-600 mt-2">
          Crie cupons de desconto para seus clientes
        </p>
      </div>

      {/* Plan Limits Info */}
      {limits && (
        <Alert className="mb-6">
          <i className="fas fa-info-circle"></i>
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                Plano {limits.currentPlan}: {limits.currentCouponsThisMonth} de{' '}
                {limits.maxCouponsPerMonth === -1 ? 'ilimitados' : limits.maxCouponsPerMonth} cupons usados este mês
              </span>
              {limits.remaining !== 'Ilimitado' && (
                <Badge variant={limits.remaining === 0 ? 'destructive' : 'secondary'}>
                  {limits.remaining} restantes
                </Badge>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Cupom</CardTitle>
          <CardDescription>
            Configure as informações do seu cupom de desconto
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Store Selection */}
            {stores.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="store">Loja</Label>
                <select
                  id="store"
                  value={selectedStore || ''}
                  onChange={(e) => setSelectedStore(parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
                {errors.store && <p className="text-sm text-red-500">{errors.store}</p>}
              </div>
            )}

            {/* Coupon Code */}
            <div className="space-y-2">
              <Label htmlFor="code">Código do Cupom</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value)}
                  placeholder="Ex: DESCONTO10"
                  className="uppercase"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateRandomCode}
                >
                  Gerar
                </Button>
              </div>
              {errors.code && <p className="text-sm text-red-500">{errors.code}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Ex: 10% de desconto em toda a loja"
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
                    placeholder="10"
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
                    placeholder="25.00"
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
                <Label htmlFor="maxUsage">Limite de Uso</Label>
                <Input
                  id="maxUsage"
                  type="number"
                  min="1"
                  value={formData.maxUsage}
                  onChange={(e) => handleInputChange('maxUsage', e.target.value)}
                  placeholder="Ilimitado"
                />
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

            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Cupom Ativo</Label>
                <p className="text-sm text-gray-500">
                  Cupons inativos não aparecerão para os clientes
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
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
                        {discountType === 'percentage' ? `${formData.discountPercentage}%` : `R$ ${formData.discountAmount}`}
                      </div>
                      <div className="text-xs text-gray-500">OFF</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-6">
              <Button 
                type="submit" 
                disabled={loading || !limits?.canCreateCoupons}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Criando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-plus mr-2"></i>
                    Criar Cupom
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
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}