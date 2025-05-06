import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, KeyRound, ShieldAlert, User } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function AdminSetup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  // Verificar se já existem administradores
  const { 
    data: adminCheck,
    isLoading: isCheckingAdmins,
    error: checkError
  } = useQuery({
    queryKey: ['/api/admin/check-admins'],
    queryFn: async () => {
      const res = await fetch('/api/admin/check-admins');
      if (!res.ok) {
        throw new Error('Falha ao verificar administradores');
      }
      return res.json();
    }
  });

  // Mutation para criar o primeiro administrador
  const initAdminMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/admin/init-admin', data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso!',
        description: 'Administrador criado com sucesso. Agora você pode fazer login.',
        variant: 'default',
      });
      navigate('/admin/login');
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao criar administrador',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação dos campos
    if (!email || !password || !firstName || !lastName || !secretCode) {
      setValidationError('Todos os campos são obrigatórios');
      return;
    }
    
    if (password !== confirmPassword) {
      setValidationError('As senhas não coincidem');
      return;
    }
    
    setValidationError(null);
    
    // Enviar dados para criar o admin
    initAdminMutation.mutate({
      email,
      password,
      firstName,
      lastName,
      secretCode
    });
  };

  // Se já existirem administradores, mostrar mensagem informativa
  if (adminCheck?.hasAdmins) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Sistema já inicializado</CardTitle>
            <CardDescription className="text-center">
              O sistema já possui administradores configurados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4 border-blue-600 text-blue-600 bg-blue-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta página só pode ser utilizada quando não existem administradores no sistema.
                Use a tela de login administrativo para acessar o painel.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-center gap-2">
            <Button 
              variant="default"
              onClick={() => navigate('/admin/login')}
            >
              Ir para o login administrativo
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Se ocorrer erro na verificação
  if (checkError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Erro na verificação</CardTitle>
            <CardDescription className="text-center">
              Ocorreu um erro ao verificar o estado do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4 border-red-600 text-red-600 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {(checkError as Error).message || 'Não foi possível se comunicar com o servidor'}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Tela de carregamento
  if (isCheckingAdmins) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando configuração do sistema...</p>
        </div>
      </div>
    );
  }

  // Tela principal para configuração do primeiro administrador
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Configuração Inicial</CardTitle>
          <CardDescription className="text-center">
            Configure o primeiro administrador do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {validationError && (
            <Alert className="mb-4 border-red-600 text-red-600 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nome</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Nome do administrador"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Sobrenome</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Sobrenome do administrador"
                required
              />
            </div>

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
                placeholder="Senha forte"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secretCode" className="flex items-center gap-1">
                <KeyRound className="h-4 w-4" />
                Código Secreto
              </Label>
              <Input
                id="secretCode"
                type="password"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                placeholder="Código de inicialização"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-6"
              disabled={initAdminMutation.isPending}
            >
              {initAdminMutation.isPending ? (
                <span className="flex items-center gap-1">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Configurando...
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Criar Administrador
                </span>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-xs text-gray-500">
            Código de acesso: PartSaara2023!
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}