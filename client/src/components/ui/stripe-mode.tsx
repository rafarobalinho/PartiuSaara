import { useState, useEffect } from 'react';
import { Badge } from './badge';
import { AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

interface StripeModeProps {
  showIcon?: boolean;
  variant?: 'badge' | 'text' | 'minimal';
  className?: string;
}

export function StripeMode({ 
  showIcon = true, 
  variant = 'badge',
  className = '' 
}: StripeModeProps) {
  const [mode, setMode] = useState<'test' | 'live' | null>(null);

  useEffect(() => {
    // Tentar detectar o modo do Stripe
    const detectStripeMode = async () => {
      try {
        const response = await fetch('/api/stripe/config');
        if (response.ok) {
          const data = await response.json();
          setMode(data.mode);
        }
      } catch (error) {
        console.error('Erro ao detectar modo do Stripe:', error);
      }
    };

    detectStripeMode();
  }, []);

  if (!mode) return null;

  if (variant === 'minimal') {
    return (
      <span className={`inline-flex items-center ${className}`}>
        <span 
          className={`h-2 w-2 rounded-full mr-1 ${
            mode === 'test' ? 'bg-yellow-500' : 'bg-green-500'
          }`} 
        />
      </span>
    );
  }

  if (variant === 'text') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center text-sm ${className}`}>
              {showIcon && mode === 'test' && (
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mr-1" />
              )}
              {mode === 'test' ? 'Teste' : 'Produção'}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {mode === 'test' 
              ? 'Modo de teste - Nenhum pagamento real será processado' 
              : 'Modo de produção - Pagamentos reais serão processados'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Badge 
      variant={mode === 'test' ? 'warning' : 'success'}
      className={className}
    >
      {showIcon && mode === 'test' && (
        <AlertTriangle className="h-3.5 w-3.5 mr-1" />
      )}
      {mode === 'test' ? 'Modo Teste' : 'Produção'}
    </Badge>
  );
}