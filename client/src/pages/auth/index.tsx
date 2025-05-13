import { useState } from 'react';
import { useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/auth-context';
import Login from './login';
import Register from './register';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>('login');
  const { isAuthenticated } = useAuth();
  const [_, setLocation] = useLocation();
  
  // Extrair parâmetros da URL
  const params = new URLSearchParams(window.location.search);
  const initialTab = params.get('tab') || 'login';
  const role = params.get('role') || 'customer';
  
  // Se já estiver autenticado, redirecionar para a página inicial
  if (isAuthenticated) {
    setLocation('/');
    return null;
  }
  
  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/2 bg-white p-6 rounded-lg shadow-sm">
          <Tabs defaultValue={initialTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Cadastrar</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <Login />
            </TabsContent>
            <TabsContent value="register">
              <Register initialRole={role as 'customer' | 'seller'} />
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="w-full md:w-1/2 bg-gradient-to-r from-primary/10 to-secondary/10 p-8 rounded-lg flex flex-col justify-center">
          <h2 className="text-2xl font-bold mb-4">
            {activeTab === 'login' 
              ? 'Bem-vindo de volta ao Partiu Saara!'
              : 'Junte-se ao Partiu Saara!'}
          </h2>
          <p className="text-gray-600 mb-6">
            {activeTab === 'login'
              ? 'Acesse sua conta para gerenciar seus pedidos, favoritos e muito mais.'
              : 'Crie sua conta para uma experiência personalizada de compras no Saara.'}
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-primary/20 rounded-full p-2 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Promoções exclusivas</h3>
                <p className="text-sm text-gray-600">Acesso a ofertas relâmpago e cupons de desconto.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-primary/20 rounded-full p-2 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Reserva de produtos</h3>
                <p className="text-sm text-gray-600">Reserve produtos e retire na loja, economizando tempo.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-primary/20 rounded-full p-2 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Experiência personalizada</h3>
                <p className="text-sm text-gray-600">Recomendações baseadas em suas preferências e compras anteriores.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}