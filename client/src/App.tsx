import { Route, Switch, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/auth-context";
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

// Component de redirecionamento para rotas não encontradas
function NotFoundRedirect() {
  return <Redirect to="/not-found" />;
}

// Componente para rotas protegidas que requerem autenticação
function ProtectedRoute({ component: Component, ...props }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Route {...props} component={Component} />;
}

function Router() {
  const { user, isLoading } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex-grow">
        <Switch>
          {/* Public routes - sempre acessíveis */}
          <Route path="/" component={Home} />
          <Route path="/presentation" component={Presentation} />
          <Route path="/landing" component={Landing} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password/:token" component={ResetPassword} />

          {/* Categories */}
          <Route path="/categories" component={Categories} />
          <Route path="/categories/:category" component={Category} />

          {/* Products */}
          <Route path="/products" component={Products} />
          <Route path="/products/:id" component={ProductDetail} />

          {/* Stores */}
          <Route path="/stores" component={Stores} />
          <Route path="/stores/:id" component={ClientStoreDetail} />
          <Route path="/stores/map" component={StoresMapPage} />

          {/* Promotions */}
          <Route path="/promotions" component={Promotions} />

          {/* Protected routes - requerem autenticação */}
          <ProtectedRoute path="/account" component={Account} />
          <ProtectedRoute path="/account/wishlist" component={Wishlist} />
          <ProtectedRoute path="/account/reservations" component={Reservations} />
          <ProtectedRoute path="/payment/callback" component={PaymentCallback} />

          {/* Seller routes */}
          <ProtectedRoute path="/seller/dashboard" component={SellerDashboard} />
          <ProtectedRoute path="/seller/products" component={SellerProducts} />
          <ProtectedRoute path="/seller/products/add" component={AddProduct} />
          <ProtectedRoute path="/seller/products/:id/edit" component={EditProduct} />
          <ProtectedRoute path="/seller/promotions" component={SellerPromotions} />
          <ProtectedRoute path="/seller/promotions/add" component={AddPromotion} />
          <ProtectedRoute path="/seller/promotions/:id/edit" component={EditPromotion} />
          {/* Redirect from the old path structure to the new one */}
          <ProtectedRoute path="/seller/promotions/edit/:id" component={RedirectEditPromotion} />
          {/* Alternative simple edit page that doesn't use dynamic routing */}
          <ProtectedRoute path="/seller/edit-promotion" component={SimpleEditPromotion} />
          {/* Coupon routes */}
          <ProtectedRoute path="/seller/coupons" component={SellerCoupons} />
          <ProtectedRoute path="/seller/coupons/add" component={AddCoupon} />
          <ProtectedRoute path="/seller/coupons/:id/edit" component={EditCoupon} />
          <ProtectedRoute path="/seller/stores" component={SellerStores} />
          <ProtectedRoute path="/seller/stores/add-store" component={AddStore} />
          <ProtectedRoute path="/seller/stores/:id" component={StoreDetail} />
          <ProtectedRoute path="/seller/stores/:id/edit" component={StoreDetail} />
          <ProtectedRoute path="/seller/stores/:id/products" component={StoreProducts} />
          <ProtectedRoute path="/seller/stores/:storeId/analytics" component={StoreAnalyticsPage} />
          <ProtectedRoute path="/seller/analytics" component={SellerAnalytics} />
          <ProtectedRoute path="/seller/subscription" component={SellerSubscription} />
          <ProtectedRoute path="/seller/stores/:storeId/subscription" component={SellerSubscription} />
          <ProtectedRoute path="/seller/settings/location" component={LocationSettingsPage} />
          {/* Admin routes */}
          <Route path="/admin/login" component={AdminLogin} />
          <Route path="/admin/setup" component={AdminSetup} />
          <ProtectedRoute path="/admin/geocoding">
            {() => (
              <div className="flex-grow">
                <AdminLayout>
                  <GeocodingPanel />
                </AdminLayout>
              </div>
            )}
          </ProtectedRoute>
          <ProtectedRoute path="/admin/place-details/:id">
            {() => (
              <div className="flex-grow">
                <AdminLayout>
                  <PlaceDetailsPage />
                </AdminLayout>
              </div>
            )}
          </ProtectedRoute>
          <ProtectedRoute path="/seller-landing" component={SellerLanding} />
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