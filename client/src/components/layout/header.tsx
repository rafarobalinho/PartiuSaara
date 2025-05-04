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
              <i className="fas fa-bars text-primary"></i>
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
                <span className="text-sm">{user?.username}</span>
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
              <i className="fas fa-search"></i>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
