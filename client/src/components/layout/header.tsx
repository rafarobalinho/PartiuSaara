import { useState, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/context/auth-context';
import { useUi } from '@/context/ui-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const { wishlistCount, reservationsCount } = useUi();
  
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
              <div className="hidden lg:flex items-center space-x-3">
                {/* Menu de Minha Conta com Dropdown */}
                <div className="relative group">
                  <button className="flex items-center text-sm space-x-1 py-3">
                    <span className="flex items-center">
                      <i className="fas fa-user-circle mr-2 text-primary"></i>
                      <span>{user?.firstName}</span>
                    </span>
                    <i className="fas fa-chevron-down text-xs ml-1"></i>
                  </button>
                  
                  {/* Dropdown para Minha Conta */}
                  <div className="absolute right-0 top-full w-56 bg-white shadow-lg rounded-md py-2 z-50 hidden group-hover:block border border-gray-200">
                    <Link href="/account" className="flex items-center p-2 text-sm hover:bg-gray-100">
                      <i className="fas fa-user-circle w-8 text-primary"></i>
                      <span>Minha Conta</span>
                    </Link>
                    <Link href="/account/wishlist" className="flex items-center p-2 text-sm hover:bg-gray-100">
                      <i className="fas fa-heart w-8 text-primary"></i>
                      <span>Lista de Desejos</span>
                    </Link>
                    <Link href="/account/reservations" className="flex items-center p-2 text-sm hover:bg-gray-100">
                      <i className="fas fa-bookmark w-8 text-primary"></i>
                      <span>Minhas Reservas</span>
                    </Link>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button 
                      onClick={logout}
                      className="flex items-center w-full p-2 hover:bg-red-50 rounded text-red-500 text-sm"
                    >
                      <i className="fas fa-sign-out-alt w-8"></i>
                      <span>Sair</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link href="/login" className="hidden lg:block text-sm hover:text-primary">
                Entre ou cadastre-se
              </Link>
            )}
            
            {/* Links rápidos para favoritos e reservas com ícones */}
            <Link href="/account/wishlist" className="relative">
              <i className="fas fa-heart text-xl"></i>
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </Link>
            
            <Link href="/account/reservations" className="relative">
              <i className="fas fa-bookmark text-xl"></i>
              {reservationsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {reservationsCount > 99 ? '99+' : reservationsCount}
                </span>
              )}
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
          <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50">
            <div className="absolute right-0 top-0 h-full w-4/5 max-w-sm bg-white overflow-y-auto">
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <div className="text-xl font-bold text-primary">Menu</div>
                <button 
                  onClick={closeMenu} 
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {isAuthenticated ? (
                <div className="p-4">
                  <div className="flex items-center space-x-2 p-2 mb-4 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center">
                      <span className="font-bold">{user?.firstName?.[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="font-medium">Olá, {user?.firstName}</div>
                      <div className="text-xs text-gray-500">{user?.email}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <Link href="/account" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                        <i className="fas fa-user-circle w-8 text-primary"></i>
                        <span>Minha Conta</span>
                      </Link>
                      <Link href="/account/wishlist" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                        <i className="fas fa-heart w-8 text-primary"></i>
                        <span>Lista de Desejos</span>
                      </Link>
                      <Link href="/account/reservations" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                        <i className="fas fa-bookmark w-8 text-primary"></i>
                        <span>Minhas Reservas</span>
                      </Link>
                    </div>
                    
                    {user?.role === 'seller' && (
                      <div>
                        <h3 className="font-medium text-sm px-2 py-1 bg-gray-100 rounded mb-1">Área do Lojista</h3>
                        <Link href="/seller/dashboard" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                          <i className="fas fa-tachometer-alt w-8 text-primary"></i>
                          <span>Dashboard</span>
                        </Link>
                        <Link href="/seller/stores" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                          <i className="fas fa-store w-8 text-primary"></i>
                          <span>Minhas Lojas</span>
                        </Link>
                        <Link href="/seller/stores/add-store" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                          <i className="fas fa-plus-circle w-8 text-primary"></i>
                          <span>Adicionar Loja</span>
                        </Link>
                        <Link href="/seller/products" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                          <i className="fas fa-box w-8 text-primary"></i>
                          <span>Meus Produtos</span>
                        </Link>
                        <Link href="/seller/products/add" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                          <i className="fas fa-plus-square w-8 text-primary"></i>
                          <span>Adicionar Produto</span>
                        </Link>
                        <Link href="/seller/promotions" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                          <i className="fas fa-bolt w-8 text-primary"></i>
                          <span>Minhas Promoções</span>
                        </Link>
                        <Link href="/seller/promotions/add" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                          <i className="fas fa-percent w-8 text-primary"></i>
                          <span>Criar Promoção</span>
                        </Link>
                        <Link href="/seller/coupons" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                          <i className="fas fa-ticket-alt w-8 text-primary"></i>
                          <span>Meus Cupons</span>
                        </Link>
                        <Link href="/seller/coupons/add" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                          <i className="fas fa-plus-circle w-8 text-primary"></i>
                          <span>Criar Cupom</span>
                        </Link>
                        <Link href="/seller/analytics" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                          <i className="fas fa-chart-line w-8 text-primary"></i>
                          <span>Analytics</span>
                        </Link>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="font-medium text-sm px-2 py-1 bg-gray-100 rounded mb-1">Navegação</h3>
                      <Link href="/" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                        <i className="fas fa-home w-8 text-primary"></i>
                        <span>Início</span>
                      </Link>
                      <Link href="/categories" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                        <i className="fas fa-th-large w-8 text-primary"></i>
                        <span>Categorias</span>
                      </Link>
                      <Link href="/stores" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                        <i className="fas fa-store-alt w-8 text-primary"></i>
                        <span>Lojas</span>
                      </Link>
                      <Link href="/products" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                        <i className="fas fa-shopping-bag w-8 text-primary"></i>
                        <span>Produtos</span>
                      </Link>
                      <Link href="/promotions" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                        <i className="fas fa-tags w-8 text-primary"></i>
                        <span>Promoções</span>
                      </Link>
                    </div>
                    
                    <button 
                      onClick={() => {
                        logout();
                        closeMenu();
                      }}
                      className="flex items-center w-full p-2 hover:bg-red-50 rounded text-red-500"
                    >
                      <i className="fas fa-sign-out-alt w-8"></i>
                      <span>Sair</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-6">
                  <div>
                    <h3 className="font-medium text-sm px-2 py-1 bg-gray-100 rounded mb-1">Conta</h3>
                    <Link href="/login" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                      <i className="fas fa-sign-in-alt w-8 text-primary"></i>
                      <span>Entrar</span>
                    </Link>
                    <Link href="/register" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                      <i className="fas fa-user-plus w-8 text-primary"></i>
                      <span>Cadastrar</span>
                    </Link>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-sm px-2 py-1 bg-gray-100 rounded mb-1">Navegação</h3>
                    <Link href="/" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                      <i className="fas fa-home w-8 text-primary"></i>
                      <span>Início</span>
                    </Link>
                    <Link href="/categories" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                      <i className="fas fa-th-large w-8 text-primary"></i>
                      <span>Categorias</span>
                    </Link>
                    <Link href="/stores" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                      <i className="fas fa-store-alt w-8 text-primary"></i>
                      <span>Lojas</span>
                    </Link>
                    <Link href="/products" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                      <i className="fas fa-shopping-bag w-8 text-primary"></i>
                      <span>Produtos</span>
                    </Link>
                    <Link href="/promotions" onClick={closeMenu} className="flex items-center p-2 hover:bg-gray-100 rounded">
                      <i className="fas fa-tags w-8 text-primary"></i>
                      <span>Promoções</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Menu desktop */}
      <div className="hidden lg:block border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            {/* Menu de navegação principal */}
            <div className="flex space-x-6 py-3">
              <Link href="/" className={`text-sm font-medium ${location === '/' ? 'text-primary' : 'text-gray-700 hover:text-primary'}`}>
                <span className="flex items-center">
                  <i className="fas fa-home mr-2"></i>
                  Início
                </span>
              </Link>
              <Link href="/categories" className={`text-sm font-medium ${location === '/categories' || location.startsWith('/categories/') ? 'text-primary' : 'text-gray-700 hover:text-primary'}`}>
                <span className="flex items-center">
                  <i className="fas fa-th-large mr-2"></i>
                  Categorias
                </span>
              </Link>
              <Link href="/stores" className={`text-sm font-medium ${location === '/stores' || location.startsWith('/stores/') ? 'text-primary' : 'text-gray-700 hover:text-primary'}`}>
                <span className="flex items-center">
                  <i className="fas fa-store mr-2"></i>
                  Lojas
                </span>
              </Link>
              <Link href="/products" className={`text-sm font-medium ${location === '/products' || location.startsWith('/products/') ? 'text-primary' : 'text-gray-700 hover:text-primary'}`}>
                <span className="flex items-center">
                  <i className="fas fa-shopping-bag mr-2"></i>
                  Produtos
                </span>
              </Link>
              <Link href="/promotions" className={`text-sm font-medium ${location === '/promotions' ? 'text-primary' : 'text-gray-700 hover:text-primary'}`}>
                <span className="flex items-center">
                  <i className="fas fa-bolt mr-2"></i>
                  Promoções
                </span>
              </Link>
              
              {/* Removido os links redundantes de usuário do menu principal, pois agora estão no dropdown do header */}
            </div>
            
            {/* Menu de lojista */}
            {isAuthenticated && user?.role === 'seller' && (
              <div className="relative group">
                <button className={`flex items-center text-sm font-medium py-3 space-x-1 ${location.startsWith('/seller') ? 'text-primary' : 'text-gray-700 hover:text-primary'}`}>
                  <i className="fas fa-store-alt mr-1"></i>
                  <span>Área do Lojista</span>
                  <i className="fas fa-chevron-down text-xs ml-1"></i>
                </button>
                
                {/* Dropdown do menu lojista */}
                <div className="absolute right-0 top-full w-64 bg-white shadow-lg rounded-md py-2 z-50 hidden group-hover:block border border-gray-200">
                  <Link href="/seller/dashboard" className={`flex items-center p-2 text-sm hover:bg-gray-100 ${location === '/seller/dashboard' ? 'text-primary' : 'text-gray-700'}`}>
                    <i className="fas fa-tachometer-alt w-8 text-primary"></i>
                    <span>Dashboard</span>
                  </Link>
                  <Link href="/seller/stores" className={`flex items-center p-2 text-sm hover:bg-gray-100 ${location === '/seller/stores' ? 'text-primary' : 'text-gray-700'}`}>
                    <i className="fas fa-store w-8 text-primary"></i>
                    <span>Minhas Lojas</span>
                  </Link>
                  <Link href="/seller/stores/add-store" className={`flex items-center p-2 text-sm hover:bg-gray-100 ${location === '/seller/stores/add-store' ? 'text-primary' : 'text-gray-700'}`}>
                    <i className="fas fa-plus-circle w-8 text-primary"></i>
                    <span>Adicionar Loja</span>
                  </Link>
                  <Link href="/seller/products" className={`flex items-center p-2 text-sm hover:bg-gray-100 ${location === '/seller/products' ? 'text-primary' : 'text-gray-700'}`}>
                    <i className="fas fa-box w-8 text-primary"></i>
                    <span>Meus Produtos</span>
                  </Link>
                  <Link href="/seller/products/add" className={`flex items-center p-2 text-sm hover:bg-gray-100 ${location === '/seller/products/add' ? 'text-primary' : 'text-gray-700'}`}>
                    <i className="fas fa-plus-square w-8 text-primary"></i>
                    <span>Adicionar Produto</span>
                  </Link>
                  <Link href="/seller/promotions" className={`flex items-center p-2 text-sm hover:bg-gray-100 ${location === '/seller/promotions' ? 'text-primary' : 'text-gray-700'}`}>
                    <i className="fas fa-bolt w-8 text-primary"></i>
                    <span>Minhas Promoções</span>
                  </Link>
                  <Link href="/seller/promotions/add" className={`flex items-center p-2 text-sm hover:bg-gray-100 ${location === '/seller/promotions/add' ? 'text-primary' : 'text-gray-700'}`}>
                    <i className="fas fa-percent w-8 text-primary"></i>
                    <span>Criar Promoção</span>
                  </Link>
                  <Link href="/seller/coupons" className={`flex items-center p-2 text-sm hover:bg-gray-100 ${location === '/seller/coupons' || location.startsWith('/seller/coupons/') ? 'text-primary' : 'text-gray-700'}`}>
                    <i className="fas fa-ticket-alt w-8 text-primary"></i>
                    <span>Meus Cupons</span>
                  </Link>
                  <Link href="/seller/coupons/add" className={`flex items-center p-2 text-sm hover:bg-gray-100 ${location === '/seller/coupons/add' ? 'text-primary' : 'text-gray-700'}`}>
                    <i className="fas fa-plus-circle w-8 text-primary"></i>
                    <span>Criar Cupom</span>
                  </Link>
                  <Link href="/seller/analytics" className={`flex items-center p-2 text-sm hover:bg-gray-100 ${location === '/seller/analytics' ? 'text-primary' : 'text-gray-700'}`}>
                    <i className="fas fa-chart-line w-8 text-primary"></i>
                    <span>Analytics</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
