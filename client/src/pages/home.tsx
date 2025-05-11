import CategoryNav from '@/components/layout/category-nav';
import MainBanner from '@/components/home/main-banner';
import PromoSection from '@/components/home/promo-section';
import CouponsBanner from '@/components/home/coupons-banner';
import NearbyStores from '@/components/home/nearby-stores';
import ProductGrid from '@/components/home/product-grid';
import AppDownload from '@/components/home/app-download';

export default function Home() {
  return (
    <>
      <CategoryNav />
      <main className="container mx-auto px-4 py-4">
        <MainBanner />
        <PromoSection />
        <CouponsBanner />
        <NearbyStores />
        <ProductGrid />
        {/* Banner de mapa temporariamente removido */}
        <AppDownload />
      </main>
    </>
  );
}
