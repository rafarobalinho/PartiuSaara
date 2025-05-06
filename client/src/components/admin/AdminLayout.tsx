import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  MapPin, 
  ShoppingBag, 
  Store, 
  Users, 
  BarChart3, 
  Settings,
  ChevronRight,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    {
      title: 'Visão Geral',
      href: '/admin',
      icon: <BarChart3 className="h-5 w-5" />,
      exact: true
    },
    {
      title: 'Lojas',
      href: '/admin/stores',
      icon: <Store className="h-5 w-5" />
    },
    {
      title: 'Produtos',
      href: '/admin/products',
      icon: <ShoppingBag className="h-5 w-5" />
    },
    {
      title: 'Usuários',
      href: '/admin/users',
      icon: <Users className="h-5 w-5" />
    },
    {
      title: 'Geocodificação',
      href: '/admin/geocoding',
      icon: <MapPin className="h-5 w-5" />
    },
    {
      title: 'Configurações',
      href: '/admin/settings',
      icon: <Settings className="h-5 w-5" />
    }
  ];

  const isActive = (path: string, exact = false) => {
    if (exact) return location === path;
    return location.startsWith(path);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:flex md:flex-col md:w-64 md:bg-white md:border-r">
        <div className="flex items-center h-16 px-6 border-b">
          <Link href="/admin" className="flex items-center space-x-2">
            <MapPin className="h-6 w-6 text-orange-500" />
            <span className="font-bold text-lg">Admin Panel</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors",
                isActive(item.href, item.exact) 
                  ? "bg-orange-50 text-orange-600" 
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              {React.cloneElement(item.icon, {
                className: cn(
                  item.icon.props.className,
                  isActive(item.href, item.exact) ? "text-orange-500" : "text-gray-500"
                )
              })}
              <span>{item.title}</span>
              {isActive(item.href, item.exact) && (
                <ChevronRight className="h-4 w-4 ml-auto text-orange-500" />
              )}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-start px-3 py-2">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarFallback>
                    {user ? getInitials(`${user.firstName} ${user.lastName}`) : 'AD'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">
                    {user ? `${user.firstName} ${user.lastName}` : 'Admin'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {user?.email}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/account" className="cursor-pointer">
                  <User className="h-4 w-4 mr-2" />
                  Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/account/settings" className="cursor-pointer">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => logout()}
                className="text-red-600 cursor-pointer"
              >
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between h-16 px-4 border-b bg-white w-full fixed top-0 z-10">
        <Link href="/admin" className="flex items-center space-x-2">
          <MapPin className="h-6 w-6 text-orange-500" />
          <span className="font-bold text-lg">Admin</span>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {user ? getInitials(`${user.firstName} ${user.lastName}`) : 'AD'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Navegação</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {navItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link 
                  href={item.href}
                  className={cn(
                    "flex items-center w-full",
                    isActive(item.href, item.exact) ? "text-orange-600" : ""
                  )}
                >
                  {React.cloneElement(item.icon, {
                    className: cn(
                      "h-4 w-4 mr-2",
                      isActive(item.href, item.exact) ? "text-orange-500" : "text-gray-500"
                    )
                  })}
                  {item.title}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-red-600 cursor-pointer">
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-50 pt-16 md:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;