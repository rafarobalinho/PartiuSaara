import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { queryClient } from '@/lib/queryClient';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { isAdmin, isLoading } = useAuth();
  
  // Definimos o mutation fora de qualquer renderização condicional
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      // Não use este método diretamente, estamos fazendo a chamada manual no handleSubmit
      // para depuração e solução de problemas
      return { success: true };
    },
    onSuccess: (data) => {
      toast({
        title: 'Login bem-sucedido',
        description: 'Você foi autenticado como administrador',
        variant: 'default',
      });
      navigate('/admin/geocoding');
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || 'Credenciais inválidas. Tente novamente.');
      toast({
        title: 'Erro de autenticação',
        description: error.message || 'Falha ao fazer login como administrador',
        variant: 'destructive',
      });
    },
  });
  
  // Usando useEffect para controlar o redirecionamento após verificar o estado de autenticação
  useEffect(() => {
    // Apenas redireciona quando a verificação de autenticação está completa e o usuário é admin
    if (!isLoading && isAdmin) {
      navigate('/admin/geocoding');
    }
  }, [isAdmin, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setErrorMessage('Preencha todos os campos');
      return;
    }
    
    // Logs detalhados para depuração
    console.log('Tentando fazer login com:', { email });
    
    try {
      // Fazer chamada API diretamente para depuração
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      
      console.log('Status da resposta:', response.status);
      
      // Verificar headers da resposta
      const contentType = response.headers.get('content-type');
      console.log('Content-Type da resposta:', contentType);
      
      // Tente obter o texto da resposta para depuração
      const responseText = await response.text();
      console.log('Texto da resposta:', responseText);
      
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
        console.error('Recebida resposta HTML em vez de JSON');
        throw new Error('Erro de servidor: resposta HTML em vez de JSON');
      }
      
      // Se for uma string JSON válida, parse e use
      try {
        const data = JSON.parse(responseText);
        console.log('Dados JSON:', data);
        
        if (data.success) {
          // Redirecionar após sucesso
          toast({
            title: 'Login bem-sucedido',
            description: 'Você foi autenticado como administrador',
            variant: 'default',
          });
          
          // Atualizar o estado do usuário após login bem-sucedido
          queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
          
          navigate('/admin/geocoding');
        } else {
          setErrorMessage(data.message || 'Falha na autenticação');
        }
      } catch (parseError) {
        console.error('Erro ao fazer parse da resposta JSON:', parseError);
        throw new Error('Resposta inválida do servidor');
      }
    } catch (error) {
      console.error('Erro detalhado:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erro desconhecido');
      toast({
        title: 'Erro de autenticação',
        description: error instanceof Error ? error.message : 'Falha ao fazer login como administrador',
        variant: 'destructive',
      });
    }
  };

  // Renderiza o loading spinner se necessário
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-orange-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  // Renderiza o formulário de login
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
              <Shield className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Acesso Administrativo</CardTitle>
          <CardDescription className="text-center">
            Entre com suas credenciais de administrador
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <Alert className="mb-4 border-red-600 text-red-600 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@partiusaara.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-6"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-1">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Autenticando...
                </span>
              ) : (
                'Entrar como Administrador'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-xs text-gray-500">
            Não tem acesso administrativo?{' '}
            <a 
              onClick={() => navigate('/admin/setup')}
              className="text-orange-600 hover:underline cursor-pointer"
            >
              Inicializar sistema
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}