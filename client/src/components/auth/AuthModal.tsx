import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Login from '@/pages/auth/login';
import Register from '@/pages/auth/register';
import { useAuth } from '@/context/auth-context';

interface AuthModalProps {
  triggerText?: string;
  defaultTab?: 'login' | 'register';
  defaultRole?: 'customer' | 'seller';
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive' | 'primary';
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function AuthModal({
  triggerText = 'Entrar',
  defaultTab = 'login',
  defaultRole = 'customer',
  buttonVariant = 'default',
  buttonSize = 'default',
  className = '',
}: AuthModalProps) {
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  // Se estiver autenticado, não mostra o modal
  if (isAuthenticated) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant as any} size={buttonSize as any} className={className}>
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="text-center mb-4">
            {defaultTab === 'login' ? 'Acessar sua conta' : 'Criar uma conta'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="register">Cadastrar</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <Login onSuccess={() => setOpen(false)} />
          </TabsContent>
          <TabsContent value="register">
            <Register initialRole={defaultRole} onSuccess={() => setOpen(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}