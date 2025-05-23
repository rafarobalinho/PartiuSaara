
import { useEffect, useState } from "react";

export default function StripeMode() {
  const [config, setConfig] = useState<{
    mode: string;
    environment: string;
    hasTestKeys: boolean;
    hasLiveKeys: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/stripe/config')
      .then(res => {
        if (!res.ok) throw new Error('Falha ao obter configuração');
        return res.json();
      })
      .then(data => {
        setConfig(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao carregar configuração do Stripe:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Não mostrar nada durante carregamento, erro ou em modo produção
  if (loading || error || !config || config.mode === 'live') return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-center py-2 z-50 text-sm font-medium">
      🧪 MODO DE TESTE ATIVO - Nenhum pagamento real será processado
    </div>
  );
}
