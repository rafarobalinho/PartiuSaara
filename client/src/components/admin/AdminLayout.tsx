import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/context/auth-context';
import { 
  Settings, 
  Users, 
  Package, 
  Store, 
  Map, 
  LogOut, 
  BarChart4, 
  ChevronRight,
  Shield,
  Loader2
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [location] = useLocation();
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500 mb-4" />
        <p className="text-lg">Carregando...</p>
      </div>
    );
  }

  // Se o usuário não é admin, redirecionar para a página inicial
  if (!user || user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Shield className="h-16 w-16 text-red-500 mb-6" />
        <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
        <p className="text-gray-600 mb-6 text-center max-w-md">
          Esta área é restrita aos administradores do sistema. Você não tem permissão para acessar.
        </p>
        <Link href="/">
          <a className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-orange-500 text-white hover:bg-orange-600 transition-colors">
            Voltar para a página inicial
          </a>
        </Link>
      </div>
    );
  }

  // Se o usuário é admin, mostrar o layout de administração
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-white border-r">
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 mb-5">
            <span className="font-bold text-xl text-orange-600">Partiu Saara</span>
            <span className="ml-2 px-2 py-1 text-xs rounded-md bg-orange-100 text-orange-800">Admin</span>
          </div>
          
          <nav className="flex-1 px-2 pb-4 space-y-1">
            <Link href="/admin">
              <a className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                location === '/admin' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-100'
              }`}>
                <BarChart4 className="mr-3 h-5 w-5" />
                Dashboard
              </a>
            </Link>
            
            <Link href="/admin/stores">
              <a className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                location === '/admin/stores' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-100'
              }`}>
                <Store className="mr-3 h-5 w-5" />
                Lojas
              </a>
            </Link>
            
            <Link href="/admin/products">
              <a className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                location === '/admin/products' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-100'
              }`}>
                <Package className="mr-3 h-5 w-5" />
                Produtos
              </a>
            </Link>
            
            <Link href="/admin/users">
              <a className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                location === '/admin/users' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-100'
              }`}>
                <Users className="mr-3 h-5 w-5" />
                Usuários
              </a>
            </Link>
            
            <Link href="/admin/geocoding">
              <a className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                location === '/admin/geocoding' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-100'
              }`}>
                <Map className="mr-3 h-5 w-5" />
                Geocodificação
              </a>
            </Link>
            
            <Link href="/admin/settings">
              <a className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                location === '/admin/settings' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-100'
              }`}>
                <Settings className="mr-3 h-5 w-5" />
                Configurações
              </a>
            </Link>
            
            <div className="pt-4 mt-6 border-t">
              <button
                onClick={() => logout()}
                className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-100 w-full"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Sair
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* Mobile header */}
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center">
        <div className="flex items-center">
          <span className="font-bold text-xl text-orange-600">Partiu Saara</span>
          <span className="ml-2 px-2 py-1 text-xs rounded-md bg-orange-100 text-orange-800">Admin</span>
        </div>
        
        {/* Mobile menu button (você pode implementar um menu dropdown móvel se necessário) */}
      </div>
      
      {/* Main content */}
      <div className="md:ml-64 flex-1">
        <div className="pt-4 md:pt-0">
          {/* Breadcrumbs */}
          <div className="hidden md:flex items-center text-sm px-4 py-2 border-b text-gray-500">
            <Link href="/">
              <a className="hover:text-orange-600">Marketplace</a>
            </Link>
            <ChevronRight className="h-4 w-4 mx-1" />
            <Link href="/admin">
              <a className="hover:text-orange-600">Admin</a>
            </Link>
            
            {location.startsWith('/admin/geocoding') && (
              <>
                <ChevronRight className="h-4 w-4 mx-1" />
                <span className="text-gray-700">Geocodificação</span>
              </>
            )}
            
            {/* Adicionar outros breadcrumbs baseados na localização */}
          </div>
          
          <main className="pb-12">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;