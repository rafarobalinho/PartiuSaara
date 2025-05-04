import { useState, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  
  // Função para fechar o menu mobile após a navegação
  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

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
            <Link href="/" className="text-primary font-bold text-2xl">
              Partiu Saara
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
              <Link href="/login" className="hidden lg:block text-sm hover:text-primary">
                Entre ou cadastre-se
              </Link>
            )}
            
            <Link href="/account/wishlist" className="relative">
              <i className="fas fa-heart text-xl"></i>
              <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                0
              </span>
            </Link>
            
            <Link href="/account/reservations" className="relative">
              <i className="fas fa-bookmark text-xl"></i>
              <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                0
              </span>
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
                      <Link href="/seller/dashboard" onClick={closeMenu} className="block p-2 hover:bg-gray-100 rounded">Dashboard</Link>
                      <Link href="/seller/products" onClick={closeMenu} className="block p-2 hover:bg-gray-100 rounded">Meus Produtos</Link>
                      <Link href="/seller/products/add" onClick={closeMenu} className="block p-2 hover:bg-gray-100 rounded">Adicionar Produto</Link>
                      <Link href="/seller/promotions" onClick={closeMenu} className="block p-2 hover:bg-gray-100 rounded">Minhas Promoções</Link>
                      <Link href="/seller/promotions/add" onClick={closeMenu} className="block p-2 hover:bg-gray-100 rounded">Criar Promoção</Link>
                      <Link href="/seller/analytics" onClick={closeMenu} className="block p-2 hover:bg-gray-100 rounded">Analytics</Link>
                    </div>
                  )}
                  <Link href="/account" onClick={closeMenu} className="block p-2 hover:bg-gray-100 rounded">Minha Conta</Link>
                  <Link href="/account/wishlist" onClick={closeMenu} className="block p-2 hover:bg-gray-100 rounded">Lista de Desejos</Link>
                  <Link href="/account/reservations" onClick={closeMenu} className="block p-2 hover:bg-gray-100 rounded">Minhas Reservas</Link>
                  <button 
                    onClick={logout}
                    className="block w-full text-left p-2 hover:bg-gray-100 rounded text-red-500"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={closeMenu} className="block p-2 hover:bg-gray-100 rounded">Entrar</Link>
                  <Link href="/register" onClick={closeMenu} className="block p-2 hover:bg-gray-100 rounded">Cadastrar</Link>
                </>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2">
                <Link href="/categories" onClick={closeMenu} className="block p-2 hover:bg-gray-100 rounded">Categorias</Link>
                <Link href="/stores" onClick={closeMenu} className="block p-2 hover:bg-gray-100 rounded">Lojas</Link>
                <Link href="/promotions" onClick={closeMenu} className="block p-2 hover:bg-gray-100 rounded">Promoções</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
