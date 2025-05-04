import { Link, useLocation } from 'wouter';

export default function MobileNavigation() {
  const [location] = useLocation();

  const isActive = (path: string) => location === path;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around py-2">
        <Link href="/">
          <a className={`flex flex-col items-center px-3 py-1 ${isActive('/') ? 'text-primary' : 'text-gray-500'}`}>
            <i className="fas fa-home text-lg"></i>
            <span className="text-xs mt-1">Início</span>
          </a>
        </Link>
        <Link href="/categories">
          <a className={`flex flex-col items-center px-3 py-1 ${isActive('/categories') ? 'text-primary' : 'text-gray-500'}`}>
            <i className="fas fa-search text-lg"></i>
            <span className="text-xs mt-1">Buscar</span>
          </a>
        </Link>
        <Link href="/stores">
          <a className={`flex flex-col items-center px-3 py-1 ${isActive('/stores') ? 'text-primary' : 'text-gray-500'}`}>
            <i className="fas fa-map-marker-alt text-lg"></i>
            <span className="text-xs mt-1">Mapa</span>
          </a>
        </Link>
        <Link href="/products">
          <a className={`flex flex-col items-center px-3 py-1 ${isActive('/products') ? 'text-primary' : 'text-gray-500'}`}>
            <i className="fas fa-ticket-alt text-lg"></i>
            <span className="text-xs mt-1">Cupons</span>
          </a>
        </Link>
        <Link href="/account">
          <a className={`flex flex-col items-center px-3 py-1 ${location.startsWith('/account') ? 'text-primary' : 'text-gray-500'}`}>
            <i className="fas fa-user text-lg"></i>
            <span className="text-xs mt-1">Perfil</span>
          </a>
        </Link>
      </div>
    </div>
  );
}
