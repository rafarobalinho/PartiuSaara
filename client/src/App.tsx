import { Switch, Route } from "wouter";
import EditCoupon from '@/pages/seller/coupons/edit-coupon';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/auth-context";
import { UiProvider } from "@/context/ui-context";
import StripeMode from "@/components/ui/stripe-mode";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNavigation from "@/components/layout/mobile-navigation";
import AdminLayout from "@/components/admin/AdminLayout";

import Home from "@/pages/home";
import Landing from "@/pages/landing";
import Presentation from "@/pages/presentation";
import NotFound from "@/pages/not-found";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import ForgotPassword from "@/pages/auth/forgot-password";
import ResetPassword from "@/pages/auth/reset-password";
import Categories from "@/pages/categories/index";
import Category from "@/pages/categories/category";
import Products from "@/pages/products/index";
import ProductDetail from "@/pages/products/product-detail";
import Promotions from "@/pages/promotions/index";
import Stores from "@/pages/stores/index";
import ClientStoreDetail from "@/pages/stores/store-detail";
import StoresMapPage from "@/pages/stores/map-page";
import Account from "@/pages/account/index";
import Wishlist from "@/pages/account/wishlist";
import Reservations from "@/pages/account/reservations";
import PaymentCallback from "@/pages/payment/callback";
import SellerDashboard from "@/pages/seller/dashboard";
import GeocodingPanel from "@/pages/admin/GeocodingPanel";
import PlaceDetailsPage from "@/pages/admin/PlaceDetailsPage";
import AdminLogin from "@/pages/admin/login";
import AdminSetup from "@/pages/admin/admin-setup";
import SellerProducts from "@/pages/seller/products/index";
import AddProduct from "@/pages/seller/products/add-product";
import EditProduct from "@/pages/seller/products/edit-product";
import SellerPromotions from "@/pages/seller/promotions/index";
import AddPromotion from "@/pages/seller/promotions/add-promotion";
import EditPromotion from "@/pages/seller/promotions/[id]/edit";
import RedirectEditPromotion from "@/pages/seller/promotions/edit/[id]";
import SimpleEditPromotion from "@/pages/seller/edit-promotion";
import SellerAnalytics from "@/pages/seller/analytics";
import SellerSubscription from "@/pages/seller/subscription";
import SellerStores from "@/pages/seller/stores/index";
import AddStore from "@/pages/seller/stores/add-store";
import StoreDetail from "@/pages/seller/stores/store-detail";
import StoreProducts from "@/pages/seller/stores/store-products";
import StoreAnalyticsPage from "@/pages/seller/stores/store-analytics";
import LocationSettingsPage from "@/pages/seller/settings/location";
import SellerLanding from "@/pages/seller-landing";
import SellerCoupons from "@/pages/seller/coupons/index";
import AddCoupon from "@/pages/seller/coupons/add-coupon";

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex-grow">
        <Switch>
          <Route path="/landing" component={Landing} />
          <Route path="/presentation" component={Presentation} />
          <Route path="/" component={Home} />
          <Route path="/payment/callback" component={PaymentCallback} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/categories" component={Categories} />
          <Route path="/categories/:category" component={Category} />
          <Route path="/products" component={Products} />
          <Route path="/products/:id" component={ProductDetail} />
          <Route path="/promotions" component={Promotions} />
          <Route path="/stores" component={Stores} />
          <Route path="/stores/map" component={StoresMapPage} />
          <Route path="/stores/:id" component={ClientStoreDetail} />
          <Route path="/account" component={Account} />
          <Route path="/account/wishlist" component={Wishlist} />
          <Route path="/account/reservations" component={Reservations} />
          <Route path="/seller/dashboard" component={SellerDashboard} />
          <Route path="/seller/products" component={SellerProducts} />
          <Route path="/seller/products/add" component={AddProduct} />
          <Route path="/seller/products/:id/edit" component={EditProduct} />
          <Route path="/seller/promotions" component={SellerPromotions} />
          <Route path="/seller/promotions/add" component={AddPromotion} />
          <Route path="/seller/promotions/:id/edit" component={EditPromotion} />
          {/* Redirect from the old path structure to the new one */}
          <Route path="/seller/promotions/edit/:id" component={RedirectEditPromotion} />
          {/* Alternative simple edit page that doesn't use dynamic routing */}
          <Route path="/seller/edit-promotion" component={SimpleEditPromotion} />
          {/* Coupon routes */}
          <Route path="/seller/coupons" component={SellerCoupons} />
          <Route path="/seller/coupons/add" component={AddCoupon} />
          <Route path="/seller/coupons/:id/edit" component={EditCoupon} />
          <Route path="/seller/stores" component={SellerStores} />
          <Route path="/seller/stores/add-store" component={AddStore} />
          <Route path="/seller/stores/:id" component={StoreDetail} />
          <Route path="/seller/stores/:id/edit" component={StoreDetail} />
          <Route path="/seller/stores/:id/products" component={StoreProducts} />
          <Route path="/seller/stores/:storeId/analytics" component={StoreAnalyticsPage} />
          <Route path="/seller/analytics" component={SellerAnalytics} />
          <Route path="/seller/subscription" component={SellerSubscription} />
          <Route path="/seller/stores/:storeId/subscription" component={SellerSubscription} />
          <Route path="/seller/settings/location" component={LocationSettingsPage} />
          <Route path="/admin/login" component={AdminLogin} />
          <Route path="/admin/setup" component={AdminSetup} />
          <Route path="/admin/geocoding">
            {() => (
              <div className="flex-grow">
                <AdminLayout>
                  <GeocodingPanel />
                </AdminLayout>
              </div>
            )}
          </Route>
          <Route path="/admin/place-details/:id">
            {() => (
              <div className="flex-grow">
                <AdminLayout>
                  <PlaceDetailsPage />
                </AdminLayout>
              </div>
            )}
          </Route>
          <Route path="/seller-landing" component={SellerLanding} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route component={NotFound} />
        </Switch>
      </div>
      <Footer />
      <MobileNavigation />
    </div>
  );
}

function App() {
  console.log('🚀 [APP] Inicializando aplicação');

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UiProvider>
          <StripeMode />
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </UiProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;