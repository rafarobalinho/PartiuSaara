import { Link, useLocation } from 'wouter';
import { useAuth } from '@/context/auth-context';

export default function MobileNavigation() {
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return location === path;
    return location.startsWith(path);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
      <div className="flex justify-around items-center py-2">
        <Link href="/">
          <div className={`flex flex-col items-center px-3 py-1 cursor-pointer ${isActive('/') ? 'text-primary' : 'text-gray-500'}`}>
            <i className="fas fa-home text-lg"></i>
            <span className="text-xs mt-1">Início</span>
          </div>
        </Link>
        
        <Link href="/search">
          <div className={`flex flex-col items-center px-3 py-1 cursor-pointer ${isActive('/search') ? 'text-primary' : 'text-gray-500'}`}>
            <i className="fas fa-search text-lg"></i>
            <span className="text-xs mt-1">Buscar</span>
          </div>
        </Link>
        
        <Link href="/stores">
          <div className={`flex flex-col items-center px-3 py-1 cursor-pointer ${isActive('/stores') ? 'text-primary' : 'text-gray-500'}`}>
            <i className="fas fa-map-marker-alt text-lg"></i>
            <span className="text-xs mt-1">Mapa</span>
          </div>
        </Link>
        
        <Link href="/promotions">
          <div className={`flex flex-col items-center px-3 py-1 cursor-pointer ${isActive('/promotions') ? 'text-primary' : 'text-gray-500'}`}>
            <i className="fas fa-tags text-lg"></i>
            <span className="text-xs mt-1">Promoções</span>
          </div>
        </Link>
        
        <Link href={isAuthenticated ? '/account' : '/login'}>
          <div className={`flex flex-col items-center px-3 py-1 cursor-pointer ${(isActive('/account') || isActive('/login')) ? 'text-primary' : 'text-gray-500'}`}>
            {isAuthenticated ? (
              <>
                <div className="relative">
                  <i className="fas fa-user text-lg"></i>
                  {user?.role === 'seller' && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></div>
                  )}
                </div>
                <span className="text-xs mt-1">Perfil</span>
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt text-lg"></i>
                <span className="text-xs mt-1">Entrar</span>
              </>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}
