
import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function ValidateCoupons() {
  const [validationCode, setValidationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastValidated, setLastValidated] = useState<any>(null);
  const { toast } = useToast();

  const handleValidate = async () => {
    if (!validationCode.trim()) {
      toast({
        title: "Código obrigatório",
        description: "Digite o código de validação",
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
        body: JSON.stringify({ validationCode })
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
        description: "Erro ao validar cupom",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Validar Cupons</h1>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Código de Validação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={validationCode}
            onChange={(e) => setValidationCode(e.target.value.toUpperCase())}
            placeholder="VAL-XXXXXXXX"
            className="text-center font-mono"
          />
          
          <Button 
            onClick={handleValidate}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Validando...' : 'Validar Cupom'}
          </Button>

          {lastValidated && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-medium text-green-800">Último cupom validado:</h3>
              <p className="text-sm text-green-600">
                {lastValidated.description}
              </p>
              <p className="text-sm font-mono text-green-800">
                Código: {lastValidated.code}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
