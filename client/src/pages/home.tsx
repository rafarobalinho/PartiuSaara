// client/src/pages/home.tsx

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import ProductGrid from '@/components/home/product-grid';
import PromoSection from '@/components/home/promo-section';
import { Skeleton } from '@/components/ui/skeleton';
import { Product } from '@/shared/schema'; // Usando a fonte única da verdade para o tipo Product

// ✅ 1. Interface para o tipo de retorno da API de destaques
// Esta interface reflete a nova estrutura de dados enviada pelo backend
interface HighlightProductData {
  productId: number;
  productName: string;
  productPrice: number;
  productCategory: string;
  images: { url: string; isPrimary: boolean }[]; // Assumindo que images é um array de objetos
  storeId: number;
  storeName: string;
  // Campos de promoção que agora são fornecidos pelo backend
  discountedPrice?: number | null;
  promotionType?: 'flash' | 'regular' | null;
  discountPercentage?: number | null;
  promotionEndTime?: string | null;
}

export default function Home() {
  const { data, isLoading, error } = useQuery<{ highlights: { [key: string]: HighlightProductData[] } }>({
    queryKey: ['homeHighlights'],
    queryFn: async () => {
      const res = await fetch('/api/highlights/home');
      if (!res.ok) {
        throw new Error('Falha ao buscar os destaques da home.');
      }
      return res.json();
    },
  });

  // ✅ 2. Mapeamento de dados aprimorado
  // Transforma os dados brutos da API para o formato de 'Product' que o ProductGrid espera.
  // Isso garante que todas as props, incluindo as de promoção, sejam passadas corretamente.
  const allHighlightedProducts: Product[] = data
    ? Object.values(data.highlights || {})
        .flat()
        .map(p => ({
          id: p.productId,
          name: p.productName,
          price: p.productPrice,
          category: p.productCategory,
          images: p.images, // Passa o array de imagens diretamente
          store: { id: p.storeId, name: p.storeName },
          // Mapeia os dados de promoção
          discountedPrice: p.discountedPrice,
          promotionType: p.promotionType,
          discountPercentage: p.discountPercentage,
          endTime: p.promotionEndTime, // Mapeia para a prop que o ProductCard pode usar
        }))
    : [];

  if (error) {
    return <div className="text-center text-red-500 py-10">Erro ao carregar os produtos. Tente novamente mais tarde.</div>;
  }

  return (
    <main className="container mx-auto px-4 py-8 space-y-12">
      {/* A seção de promoções continua funcionando de forma independente e correta */}
      <PromoSection />

      {isLoading ? (
        // Skeleton aprimorado para uma melhor experiência de carregamento
        <section>
          <h2 className="text-2xl font-bold mb-6 text-center">Nossos Destaques</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/6" />
              </div>
            ))}
          </div>
        </section>
      ) : (
        // O ProductGrid agora recebe a lista completa de produtos com todos os dados corretos
        <ProductGrid products={allHighlightedProducts} title="Nossos Destaques" />
      )}
    </main>
  );
}