import React from 'react';
import { useQuery } from '@tanstack/react-query';
import CategoryNav from '@/components/layout/category-nav';
import MainBanner from '@/components/home/main-banner';
import PromoSection from '@/components/home/promo-section';
import CouponsBanner from '@/components/home/coupons-banner';
import NearbyStores from '@/components/home/nearby-stores';
import ProductGrid from '@/components/home/product-grid';
import { Skeleton } from '@/components/ui/skeleton';
import { Product } from '@/shared/schema';
// import AppDownload from '@/components/home/app-download';

// ✅ Interface para o tipo de retorno da API de destaques
interface HighlightProductData {
  productId: number;
  productName: string;
  productPrice: number;
  productCategory: string;
  images: { url: string; isPrimary: boolean }[];
  storeId: number;
  storeName: string;
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

  // ✅ Mapeamento de dados aprimorado
  const allHighlightedProducts: Product[] = data
    ? Object.values(data.highlights || {})
        .flat()
        .map(p => ({
          id: p.productId,
          name: p.productName,
          price: p.productPrice,
          category: p.productCategory,
          images: p.images,
          store: { id: p.storeId, name: p.storeName },
          discountedPrice: p.discountedPrice,
          promotionType: p.promotionType,
          discountPercentage: p.discountPercentage,
          endTime: p.promotionEndTime,
        }))
    : [];

  if (error) {
    return <div className="text-center text-red-500 py-10">Erro ao carregar os produtos. Tente novamente mais tarde.</div>;
  }

  return (
    <>
      <CategoryNav />
      <main className="container mx-auto px-4 py-4">
        <MainBanner />
        <PromoSection />
        <CouponsBanner />
        <NearbyStores />

        {/* Seção de produtos em destaque */}
        <div className="mb-8">
          {isLoading ? (
            <section>
              <h2 className="text-2xl font-bold mb-6">Nossos Destaques</h2>
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
            <ProductGrid products={allHighlightedProducts} title="Nossos Destaques" />
          )}
        </div>

        {/* Banner de mapa temporariamente removido */}
        {/* <AppDownload /> */}
      </main>
    </>
  );
}