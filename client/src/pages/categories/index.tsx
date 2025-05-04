import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  parentId?: number;
}

export default function Categories() {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/categories');
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
      }
    }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Categorias</h1>
        <p className="text-gray-600">Explore produtos por categoria</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, index) => (
            <Card key={index} className="bg-white animate-pulse">
              <CardContent className="p-6 flex flex-col items-center justify-center min-h-[160px]">
                <div className="w-12 h-12 rounded-full bg-gray-200 mb-3"></div>
                <div className="h-5 bg-gray-200 w-20 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : categories && categories.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((category: Category) => (
            <Link key={category.id} href={`/categories/${category.slug}`}>
              <a className="block">
                <Card className="bg-white hover:shadow-md transition-shadow">
                  <CardContent className="p-6 flex flex-col items-center justify-center min-h-[160px]">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <i className={`${category.icon} text-2xl text-primary`}></i>
                    </div>
                    <h3 className="font-medium text-center">{category.name}</h3>
                  </CardContent>
                </Card>
              </a>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-4"><i className="fas fa-box-open text-gray-300"></i></div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma categoria encontrada</h3>
          <p className="text-gray-500">Volte mais tarde para ver novas categorias</p>
        </div>
      )}
    </div>
  );
}
