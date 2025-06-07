
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

export default function PaymentCallback() {
  const [status, setStatus] = useState('processing');
  const [, navigate] = useLocation();
  
  useEffect(() => {
    const processCallback = async () => {
      console.log('💳 [PAYMENT-CALLBACK] Processando callback do Stripe');
      
      const urlParams = new URLSearchParams(window.location.search);
      const storeId = urlParams.get('storeId');
      const sessionId = urlParams.get('session_id');
      const success = urlParams.get('success');
      
      console.log('💳 [PAYMENT-CALLBACK] Parâmetros:', { storeId, sessionId, success });
      
      if (!storeId || !sessionId) {
        console.error('❌ [PAYMENT-CALLBACK] Parâmetros inválidos');
        setStatus('error');
        return;
      }
      
      if (success === 'true') {
        // Aguardar webhook processar (dar tempo para webhook do Stripe)
        console.log('⏳ [PAYMENT-CALLBACK] Aguardando webhook processar...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        setStatus('success');
        
        // Redirecionar para página da loja
        console.log('🎯 [PAYMENT-CALLBACK] Redirecionando para loja:', storeId);
        navigate(`/seller/stores/${storeId}/subscription?updated=true`);
      } else {
        setStatus('cancelled');
        setTimeout(() => {
          navigate(`/seller/stores/${storeId}/subscription?cancelled=true`);
        }, 2000);
      }
    };
    
    processCallback();
  }, [navigate]);
  
  const getStatusMessage = () => {
    switch (status) {
      case 'processing':
        return {
          title: '⏳ Processando Pagamento',
          message: 'Aguarde enquanto confirmamos sua assinatura...',
          color: 'text-blue-600'
        };
      case 'success':
        return {
          title: '✅ Pagamento Confirmado',
          message: 'Sua assinatura foi ativada com sucesso!',
          color: 'text-green-600'
        };
      case 'cancelled':
        return {
          title: '❌ Pagamento Cancelado',
          message: 'O pagamento foi cancelado.',
          color: 'text-red-600'
        };
      case 'error':
        return {
          title: '🚨 Erro no Processamento',
          message: 'Ocorreu um erro. Tente novamente.',
          color: 'text-red-600'
        };
      default:
        return { title: '', message: '', color: '' };
    }
  };
  
  const statusInfo = getStatusMessage();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className={`text-2xl font-bold mb-4 ${statusInfo.color}`}>
          {statusInfo.title}
        </h1>
        <p className="text-gray-600 mb-6">{statusInfo.message}</p>
        
        {status === 'processing' && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    </div>
  );
}
