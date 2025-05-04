import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-3">
            <button 
              className="p-2 lg:hidden"
              onClick={() => setIsOpen(!isOpen)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <Link href="/">
              <a className="text-primary font-bold text-2xl">Partiu Saara</a>
            </Link>
          </div>
          
          <div className="flex-1 mx-4 hidden md:block">
            <div className="relative">
              <Input 
                type="text" 
                placeholder="Buscar no Saara" 
                className="w-full py-2 px-4 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <button className="absolute right-0 top-0 h-full px-4 text-primary">
                <i className="fas fa-search"></i>
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="hidden lg:flex items-center space-x-2">
                <span className="text-sm">{user?.firstName}</span>
                <Button 
                  variant="ghost" 
                  onClick={logout} 
                  className="text-sm hover:text-primary"
                >
                  Sair
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <a className="hidden lg:block text-sm hover:text-primary">Entre ou cadastre-se</a>
              </Link>
            )}
            
            <Link href="/account/wishlist">
              <a className="relative">
                <i className="fas fa-heart text-xl"></i>
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  0
                </span>
              </a>
            </Link>
            
            <Link href="/account/reservations">
              <a className="relative">
                <i className="fas fa-bookmark text-xl"></i>
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  0
                </span>
              </a>
            </Link>
          </div>
        </div>
        
        <div className="md:hidden py-2">
          <div className="relative">
            <Input 
              type="text" 
              placeholder="Busque no Saara" 
              className="w-full py-2 px-4 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <button className="absolute right-0 top-0 h-full px-4 text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          </div>
        </div>
        
        {/* Menu mobile */}
        {isOpen && (
          <div className="lg:hidden absolute top-full left-0 w-full bg-white z-50 shadow-md">
            <div className="p-4 space-y-3">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center space-x-2 p-2 border-b border-gray-200">
                    <span className="font-medium">Olá, {user?.firstName}</span>
                  </div>
                  {user?.role === 'seller' && (
                    <div className="py-2 space-y-2">
                      <h3 className="font-medium text-sm">Área do Lojista</h3>
                      <Link href="/seller/dashboard">
                        <a className="block p-2 hover:bg-gray-100 rounded">Dashboard</a>
                      </Link>
                      <Link href="/seller/products">
                        <a className="block p-2 hover:bg-gray-100 rounded">Meus Produtos</a>
                      </Link>
                      <Link href="/seller/products/add">
                        <a className="block p-2 hover:bg-gray-100 rounded">Adicionar Produto</a>
                      </Link>
                      <Link href="/seller/promotions">
                        <a className="block p-2 hover:bg-gray-100 rounded">Minhas Promoções</a>
                      </Link>
                      <Link href="/seller/promotions/add">
                        <a className="block p-2 hover:bg-gray-100 rounded">Criar Promoção</a>
                      </Link>
                      <Link href="/seller/analytics">
                        <a className="block p-2 hover:bg-gray-100 rounded">Analytics</a>
                      </Link>
                    </div>
                  )}
                  <Link href="/account">
                    <a className="block p-2 hover:bg-gray-100 rounded">Minha Conta</a>
                  </Link>
                  <Link href="/account/wishlist">
                    <a className="block p-2 hover:bg-gray-100 rounded">Lista de Desejos</a>
                  </Link>
                  <Link href="/account/reservations">
                    <a className="block p-2 hover:bg-gray-100 rounded">Minhas Reservas</a>
                  </Link>
                  <button 
                    onClick={logout}
                    className="block w-full text-left p-2 hover:bg-gray-100 rounded text-red-500"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <a className="block p-2 hover:bg-gray-100 rounded">Entrar</a>
                  </Link>
                  <Link href="/register">
                    <a className="block p-2 hover:bg-gray-100 rounded">Cadastrar</a>
                  </Link>
                </>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2">
                <Link href="/categories">
                  <a className="block p-2 hover:bg-gray-100 rounded">Categorias</a>
                </Link>
                <Link href="/stores">
                  <a className="block p-2 hover:bg-gray-100 rounded">Lojas</a>
                </Link>
                <Link href="/promotions">
                  <a className="block p-2 hover:bg-gray-100 rounded">Promoções</a>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
