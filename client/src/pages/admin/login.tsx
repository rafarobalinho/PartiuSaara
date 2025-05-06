import { useState } from 'react';
import { Redirect, useLocation } from 'wouter';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, KeyRound, Lock, LogIn } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAdmin, login } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  // Se já estiver logado como admin, redireciona para o painel
  if (user && isAdmin) {
    return <Redirect to="/admin/geocoding" />;
  }

  // Secret code específico para admin (este valor deveria estar em uma variável de ambiente)
  const ADMIN_SECRET_CODE = 'PartSaara2023!';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verifica o código secreto
    if (secretCode !== ADMIN_SECRET_CODE) {
      setError('Código secreto inválido. Este ambiente é restrito.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Tenta fazer login
      await login(email, password);
      
      // Após login bem-sucedido, verifica se é admin
      // O redirecionamento será tratado no próximo carregamento da página
      toast({
        title: 'Login administrativo realizado',
        description: 'Você será redirecionado para o painel administrativo.',
      });
    } catch (err) {
      setError('Email, senha ou código secreto incorretos. Acesso negado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
              <Lock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center font-bold">Acesso Administrativo</CardTitle>
          <CardDescription className="text-center text-gray-500">
            Esta área é restrita aos administradores do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-red-600 text-red-600 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email administrativo</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@partiusaara.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="secretCode" className="flex items-center gap-1">
                <KeyRound className="h-4 w-4" />
                Código secreto
              </Label>
              <Input
                id="secretCode"
                type="password"
                placeholder="Informe o código de autorização"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                required
              />
            </div>
          
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-1">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verificando...
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <LogIn className="h-4 w-4" />
                  Entrar como administrador
                </span>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-xs text-gray-500">
            Acesso exclusivo para administradores autorizados.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}