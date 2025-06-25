
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Coupon {
  id: number;
  code: string;
  description: string;
  store: { name: string };
  discountPercentage?: number;
  discountAmount?: number;
}

interface Props {
  coupon: Coupon;
  isOpen: boolean;
  onClose: () => void;
}

export function CouponRedeemModal({ coupon, isOpen, onClose }: Props) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [validationCode, setValidationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const handleRedeem = async () => {
    if (!customerName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe seu nome",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/coupons/${coupon.id}/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, customerPhone })
      });

      const data = await response.json();

      if (response.ok) {
        setValidationCode(data.validationCode);
        setIsSuccess(true);
        toast({
          title: "Cupom resgatado! 🎉",
          description: "Apresente o código na loja para usar o desconto",
          variant: "default"
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao resgatar cupom",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCustomerName('');
    setCustomerPhone('');
    setValidationCode('');
    setIsSuccess(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isSuccess ? 'Cupom Resgatado!' : 'Resgatar Cupom'}
          </DialogTitle>
        </DialogHeader>

        {!isSuccess ? (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium">{coupon.store.name}</h3>
              <p className="text-sm text-gray-600">{coupon.description}</p>
              <p className="font-bold text-primary">
                {coupon.discountPercentage 
                  ? `${coupon.discountPercentage}% OFF` 
                  : `R$ ${coupon.discountAmount} OFF`}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Nome *</label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Telefone (opcional)</label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleRedeem} 
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Resgatando...' : 'Resgatar Cupom'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="bg-green-50 p-6 rounded-lg">
              <div className="text-2xl mb-2">🎉</div>
              <h3 className="font-bold text-lg">Código de Validação</h3>
              <div className="text-3xl font-mono font-bold text-green-600 bg-white p-3 rounded border-2 border-green-200 mt-3">
                {validationCode}
              </div>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Importante:</strong></p>
              <p>• Apresente este código na loja {coupon.store.name}</p>
              <p>• O desconto será aplicado pelo lojista</p>
              <p>• Este código só pode ser usado uma vez</p>
            </div>

            <Button onClick={handleClose} className="w-full">
              Entendi
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
