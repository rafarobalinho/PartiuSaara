import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';

interface Banner {
  id: number;
  imageUrl: string;
  title: string;
  description: string;
  couponCode?: string;
  buttonText: string;
  buttonLink: string;
}

export default function MainBanner() {
  const [currentBanner, setCurrentBanner] = useState(0);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['/api/banners'],
    queryFn: async () => {
      const defaultBanners: Banner[] = [
        {
          id: 1,
          imageUrl: '/uploads/banner-ofertas.jpg',
          title: 'Semana de Ofertas',
          description: 'Economize até 50% em produtos selecionados nas melhores lojas do Saara!',
          couponCode: 'PROMO50',
          buttonText: 'Ver Ofertas',
          buttonLink: '/products'
        },
        {
          id: 2,
          imageUrl: '/uploads/banner-eletronicos.jpg',
          title: 'Desconto em Eletrônicos',
          description: 'Gadgets, acessórios e smartphones com descontos imperdíveis!',
          couponCode: 'TECH30',
          buttonText: 'Conferir Agora',
          buttonLink: '/categories/eletronicos'
        },
        {
          id: 3,
          imageUrl: '/uploads/banner-moda.jpg',
          title: 'Moda Feminina',
          description: 'As melhores tendências da estação em promoção especial',
          couponCode: 'MODA25',
          buttonText: 'Comprar',
          buttonLink: '/categories/moda-feminina'
        }
      ];

      try {
        const response = await fetch('/api/banners');
        if (!response.ok) {
          throw new Error('Failed to fetch banners');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching banners:', error);
        return defaultBanners;
      }
    }
  });

  useEffect(() => {
    if (banners.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [banners.length]);

  if (isLoading) {
    return (
      <div className="relative mb-6 overflow-hidden rounded-lg bg-gray-200 animate-pulse aspect-[21/9] md:aspect-[21/7]"></div>
    );
  }

  if (banners.length === 0) {
    return null;
  }

  const banner = banners[currentBanner];

  return (
    <div className="relative mb-6 overflow-hidden rounded-lg">
      <div className="flex">
        <div className="w-full flex-shrink-0">
          <div className="relative aspect-[21/9] md:aspect-[21/7] overflow-hidden rounded-lg">
            <img 
              src={banner.imageUrl} 
              alt={banner.title} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
              <div className="px-6 py-4 text-white max-w-md">
                <h2 className="text-2xl md:text-3xl font-bold mb-2">{banner.title}</h2>
                <p className="text-sm md:text-base mb-4">{banner.description}</p>
                <div className="flex items-center space-x-3">
                  {banner.couponCode && (
                    <div className="bg-primary rounded-full px-4 py-1 text-sm md:text-base font-semibold text-white">
                      <i className="fas fa-tag mr-1"></i> {banner.couponCode}
                    </div>
                  )}
                  <Button
                    asChild
                    className="bg-white text-primary rounded-full px-4 py-1 text-sm md:text-base font-semibold hover:bg-gray-100"
                  >
                    <a href={banner.buttonLink}>{banner.buttonText}</a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-1">
        {banners.map((_, index) => (
          <button 
            key={index}
            className={`h-1.5 w-6 rounded-full bg-white ${currentBanner === index ? 'opacity-100' : 'opacity-60'}`}
            onClick={() => setCurrentBanner(index)}
          ></button>
        ))}
      </div>
    </div>
  );
}
