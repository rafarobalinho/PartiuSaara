import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
}

export default function CategoryNav() {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const defaultCategories: Category[] = [
        { id: 1, name: 'Moda', slug: 'moda', icon: 'fas fa-tshirt' },
        { id: 2, name: 'Eletrônicos', slug: 'eletronicos', icon: 'fas fa-mobile-alt' },
        { id: 3, name: 'Acessórios', slug: 'acessorios', icon: 'fas fa-gem' },
        { id: 4, name: 'Casa', slug: 'casa', icon: 'fas fa-home' },
        { id: 5, name: 'Calçados', slug: 'calcados', icon: 'fas fa-shoe-prints' },
        { id: 6, name: 'Infantil', slug: 'infantil', icon: 'fas fa-child' },
        { id: 7, name: 'Lojas', slug: 'lojas', icon: 'fas fa-map-marker-alt' },
        { id: 8, name: 'Cupons', slug: 'cupons', icon: 'fas fa-percent' }
      ];

      try {
        const response = await fetch('/api/categories');
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching categories:', error);
        return defaultCategories;
      }
    }
  });

  if (isLoading) {
    return (
      <div className="bg-white py-4 border-b border-gray-200 overflow-x-auto no-scrollbar">
        <div className="container mx-auto px-4">
          <div className="flex justify-between space-x-6 min-w-max">
            {Array(8).fill(0).map((_, index) => (
              <div key={index} className="flex flex-col items-center space-y-1 w-16">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center animate-pulse"></div>
                <div className="h-3 w-12 bg-gray-100 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white py-4 border-b border-gray-200 overflow-x-auto no-scrollbar">
      <div className="container mx-auto px-4">
        <div className="flex justify-between space-x-6 min-w-max">
          {(categories || []).map((category) => (
            <Link key={category.id} href={`/categories/${category.slug}`}>
              <a className="flex flex-col items-center space-y-1 w-16">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <i className={`${category.icon} text-primary`}></i>
                </div>
                <span className="text-xs text-center">{category.name}</span>
              </a>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
