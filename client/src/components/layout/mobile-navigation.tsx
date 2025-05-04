import { Link, useLocation } from 'wouter';

export default function MobileNavigation() {
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around py-2">
        <Link href="/">
          <div className={`flex flex-col items-center px-3 py-1 cursor-pointer ${isActive('/') ? 'text-primary' : 'text-gray-500'}`}>
            <i className="fas fa-home text-lg"></i>
            <span className="text-xs mt-1">Início</span>
          </div>
        </Link>
        <Link href="/categories">
          <div className={`flex flex-col items-center px-3 py-1 cursor-pointer ${isActive('/categories') ? 'text-primary' : 'text-gray-500'}`}>
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
        <Link href="/products">
          <div className={`flex flex-col items-center px-3 py-1 cursor-pointer ${isActive('/products') ? 'text-primary' : 'text-gray-500'}`}>
            <i className="fas fa-ticket-alt text-lg"></i>
            <span className="text-xs mt-1">Cupons</span>
          </div>
        </Link>
        <Link href="/account">
          <div className={`flex flex-col items-center px-3 py-1 cursor-pointer ${location.startsWith('/account') ? 'text-primary' : 'text-gray-500'}`}>
            <i className="fas fa-user text-lg"></i>
            <span className="text-xs mt-1">Perfil</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
