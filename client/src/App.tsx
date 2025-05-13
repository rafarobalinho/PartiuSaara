import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/auth-context";
import { UiProvider } from "@/context/ui-context";

import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import MobileNavigation from "@/components/layout/mobile-navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth/index";
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
import LocationSettingsPage from "@/pages/seller/settings/location";
import ForStoreOwners from "@/pages/for-store-owners";

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex-grow">
        <Switch>
          {/* Rotas públicas */}
          <Route path="/auth" component={AuthPage} />
          <Route path="/for-store-owners" component={ForStoreOwners} />
          <Route path="/admin/login" component={AdminLogin} />
          
          {/* Página inicial com conteúdo público, mas com acesso personalizado quando autenticado */}
          <Route path="/">
            <Home />
          </Route>
          
          {/* Rotas protegidas (requerem autenticação) */}
          <Route path="/categories">
            <ProtectedRoute>
              <Categories />
            </ProtectedRoute>
          </Route>
          
          <Route path="/categories/:category">
            <ProtectedRoute>
              <Category />
            </ProtectedRoute>
          </Route>
          
          <Route path="/products">
            <ProtectedRoute>
              <Products />
            </ProtectedRoute>
          </Route>
          
          <Route path="/products/:id">
            <ProtectedRoute>
              <ProductDetail />
            </ProtectedRoute>
          </Route>
          
          <Route path="/promotions">
            <ProtectedRoute>
              <Promotions />
            </ProtectedRoute>
          </Route>
          
          <Route path="/stores">
            <ProtectedRoute>
              <Stores />
            </ProtectedRoute>
          </Route>
          
          <Route path="/stores/map">
            <ProtectedRoute>
              <StoresMapPage />
            </ProtectedRoute>
          </Route>
          
          <Route path="/stores/:id">
            <ProtectedRoute>
              <ClientStoreDetail />
            </ProtectedRoute>
          </Route>
          
          <Route path="/account">
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          </Route>
          
          <Route path="/account/wishlist">
            <ProtectedRoute>
              <Wishlist />
            </ProtectedRoute>
          </Route>
          
          <Route path="/account/reservations">
            <ProtectedRoute>
              <Reservations />
            </ProtectedRoute>
          </Route>
          
          <Route path="/seller/dashboard">
            <ProtectedRoute>
              <SellerDashboard />
            </ProtectedRoute>
          </Route>
          
          <Route path="/seller/products">
            <ProtectedRoute>
              <SellerProducts />
            </ProtectedRoute>
          </Route>
          
          <Route path="/seller/products/add">
            <ProtectedRoute>
              <AddProduct />
            </ProtectedRoute>
          </Route>
          
          <Route path="/seller/products/:id/edit">
            <ProtectedRoute>
              <EditProduct />
            </ProtectedRoute>
          </Route>
          
          <Route path="/seller/promotions">
            <ProtectedRoute>
              <SellerPromotions />
            </ProtectedRoute>
          </Route>
          
          <Route path="/seller/promotions/add">
            <ProtectedRoute>
              <AddPromotion />
            </ProtectedRoute>
          </Route>
          
          <Route path="/seller/promotions/:id/edit">
            <ProtectedRoute>
              <EditPromotion />
            </ProtectedRoute>
          </Route>
          
          {/* Redirect from the old path structure to the new one */}
          <Route path="/seller/promotions/edit/:id">
            <ProtectedRoute>
              <RedirectEditPromotion />
            </ProtectedRoute>
          </Route>
          
          {/* Alternative simple edit page that doesn't use dynamic routing */}
          <Route path="/seller/edit-promotion">
            <ProtectedRoute>
              <SimpleEditPromotion />
            </ProtectedRoute>
          </Route>
          
          <Route path="/seller/stores">
            <ProtectedRoute>
              <SellerStores />
            </ProtectedRoute>
          </Route>
          
          <Route path="/seller/stores/add-store">
            <ProtectedRoute>
              <AddStore />
            </ProtectedRoute>
          </Route>
          
          <Route path="/seller/stores/:id">
            <ProtectedRoute>
              <StoreDetail />
            </ProtectedRoute>
          </Route>
          
          <Route path="/seller/stores/:id/products">
            <ProtectedRoute>
              <StoreProducts />
            </ProtectedRoute>
          </Route>
          
          <Route path="/seller/analytics">
            <ProtectedRoute>
              <SellerAnalytics />
            </ProtectedRoute>
          </Route>
          
          <Route path="/seller/subscription">
            <ProtectedRoute>
              <SellerSubscription />
            </ProtectedRoute>
          </Route>
          
          <Route path="/seller/settings/location">
            <ProtectedRoute>
              <LocationSettingsPage />
            </ProtectedRoute>
          </Route>
          
          <Route path="/admin/setup">
            <ProtectedRoute>
              <AdminSetup />
            </ProtectedRoute>
          </Route>
          
          <Route path="/admin/geocoding">
            <ProtectedRoute>
              <div className="flex-grow">
                <AdminLayout>
                  <GeocodingPanel />
                </AdminLayout>
              </div>
            </ProtectedRoute>
          </Route>
          
          <Route path="/admin/place-details/:id">
            <ProtectedRoute>
              <div className="flex-grow">
                <AdminLayout>
                  <PlaceDetailsPage />
                </AdminLayout>
              </div>
            </ProtectedRoute>
          </Route>
          
          <Route component={NotFound} />
        </Switch>
      </div>
      <Footer />
      <MobileNavigation />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UiProvider>
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
