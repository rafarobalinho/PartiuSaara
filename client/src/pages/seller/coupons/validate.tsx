// Arquivo: client/src/pages/seller/coupons/validate.tsx

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  AlertCircle, 
  QrCode, 
  Clock, 
  RefreshCw,
  User,
  Phone
} from 'lucide-react'; // Removidos: Percent, DollarSign (não utilizados)

interface ValidatedCoupon {
  id: number;
  code: string;
  description: string;
  discountPercentage?: number;
  discountAmount?: number;
  store: {
    name: string;
  };
}

interface PendingRedemption {
  id: number;
  validationCode: string;
  customerName?: string;
  customerPhone?: string;
  redeemedAt: string;
  coupon: {
    code: string;
    description: string;
    discountPercentage?: number;
    discountAmount?: number;
  };
}

export default function ValidateCoupons() {
  const [validationCode, setValidationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastValidated, setLastValidated] = useState<ValidatedCoupon | null>(null);
  const [pendingRedemptions, setPendingRedemptions] = useState<PendingRedemption[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const { toast } = useToast();

  const handleValidate = async () => {
    if (!validationCode.trim()) {
      toast({
        title: "Código obrigatório",
        description: "Digite o código de validação do cliente",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/seller/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ validationCode: validationCode.trim().toUpperCase() })
      });

      const data = await response.json();

      if (data.success) {
        setLastValidated(data.coupon);
        setValidationCode('');
        toast({
          title: "Cupom validado! ✅",
          description: data.message,
          variant: "default"
        });
        // Recarregar lista de pendentes
        loadPendingRedemptions();
      } else {
        toast({
          title: "Erro na validação",
          description: data.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao validar cupom. Verifique sua conexão.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPendingRedemptions = async () => {
    setIsLoadingPending(true);
    try {
      const response = await fetch('/api/seller/coupons/pending', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setPendingRedemptions(data.pending || []);
      }
    } catch (error) {
      console.error('Erro ao carregar cupons pendentes:', error);
    } finally {
      setIsLoadingPending(false);
    }
  };

  useEffect(() => {
    loadPendingRedemptions();
  }, []);

  const formatDiscount = (discountPercentage?: number, discountAmount?: number) => {
    if (discountPercentage) {
      return `${discountPercentage}% OFF`;
    }
    if (discountAmount) {
      return `R$ ${discountAmount.toFixed(2)} OFF`;
    }
    return 'Desconto especial';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleQuickValidate = async (code: string) => {
    setValidationCode(code);
    setTimeout(() => handleValidate(), 100);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Validar Cupons</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={loadPendingRedemptions}
          disabled={isLoadingPending}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingPending ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Seção de Validação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Validar Código
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Código de Validação
              </label>
              <Input
                value={validationCode}
                onChange={(e) => setValidationCode(e.target.value.toUpperCase())}
                placeholder="VAL-XXXXXXXX"
                className="text-center font-mono text-lg"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && validationCode.trim()) {
                    handleValidate();
                  }
                }}
              />
            </div>

            <Button 
              onClick={handleValidate}
              disabled={isLoading || !validationCode.trim()}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Validar Cupom
                </>
              )}
            </Button>

            {lastValidated && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-green-800 mb-1">
                      Cupom validado com sucesso!
                    </h3>
                    <p className="text-sm text-green-700 mb-2">
                      {lastValidated.description}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono text-green-800">
                        {lastValidated.code}
                      </span>
                      <span className="font-semibold text-green-600">
                        {formatDiscount(lastValidated.discountPercentage, lastValidated.discountAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seção de Cupons Pendentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Cupons Resgatados
              <Badge variant="secondary" className="ml-auto">
                {pendingRedemptions.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPending ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Carregando...</span>
              </div>
            ) : pendingRedemptions.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Nenhum cupom pendente</p>
                <p className="text-sm text-gray-400">
                  Cupons resgatados aparecerão aqui
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {pendingRedemptions.map((redemption) => (
                  <div
                    key={redemption.id}
                    className="bg-blue-50 p-3 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                    onClick={() => handleQuickValidate(redemption.validationCode)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-blue-900 text-sm">
                          {redemption.coupon.description}
                        </h4>
                        <p className="text-xs text-blue-700 mt-1">
                          {formatDiscount(redemption.coupon.discountPercentage, redemption.coupon.discountAmount)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Pendente
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-blue-600">
                      {redemption.customerName && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{redemption.customerName}</span>
                        </div>
                      )}
                      {redemption.customerPhone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{redemption.customerPhone}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-200">
                      <span className="font-mono text-xs font-semibold text-blue-800">
                        {redemption.validationCode}
                      </span>
                      <span className="text-xs text-blue-600">
                        {formatDateTime(redemption.redeemedAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instruções */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Como validar:</h4>
              <ul className="space-y-1">
                <li>• Digite o código fornecido pelo cliente</li>
                <li>• Ou clique em um cupom pendente ao lado</li>
                <li>• Pressione Enter ou clique em "Validar"</li>
                <li>• O desconto será aplicado automaticamente</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Códigos de validação:</h4>
              <ul className="space-y-1">
                <li>• Formato: VAL-XXXXXXXX</li>
                <li>• Cada código só pode ser usado uma vez</li>
                <li>• Códigos expiram conforme o cupom</li>
                <li>• Cliente deve apresentar o código na loja</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}