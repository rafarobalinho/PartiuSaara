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

import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import Categories from "@/pages/categories/index";
import Category from "@/pages/categories/category";
import Products from "@/pages/products/index";
import ProductDetail from "@/pages/products/product-detail";
import Promotions from "@/pages/promotions/index";
import Stores from "@/pages/stores/index";
import ClientStoreDetail from "@/pages/stores/store-detail";
import Account from "@/pages/account/index";
import Wishlist from "@/pages/account/wishlist";
import Reservations from "@/pages/account/reservations";
import SellerDashboard from "@/pages/seller/dashboard";
import SellerProducts from "@/pages/seller/products/index";
import AddProduct from "@/pages/seller/products/add-product";
import EditProduct from "@/pages/seller/products/edit-product";
import SellerPromotions from "@/pages/seller/promotions/index";
import AddPromotion from "@/pages/seller/promotions/add-promotion";
import SellerAnalytics from "@/pages/seller/analytics";
import SellerSubscription from "@/pages/seller/subscription";
import SellerStores from "@/pages/seller/stores/index";
import AddStore from "@/pages/seller/stores/add-store";
import StoreDetail from "@/pages/seller/stores/store-detail";
import StoreProducts from "@/pages/seller/stores/store-products";

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex-grow">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/categories" component={Categories} />
          <Route path="/categories/:category" component={Category} />
          <Route path="/products" component={Products} />
          <Route path="/products/:id" component={ProductDetail} />
          <Route path="/promotions" component={Promotions} />
          <Route path="/stores" component={Stores} />
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
          <Route path="/seller/stores" component={SellerStores} />
          <Route path="/seller/stores/add-store" component={AddStore} />
          <Route path="/seller/stores/:id" component={StoreDetail} />
          <Route path="/seller/stores/:id/products" component={StoreProducts} />
          <Route path="/seller/analytics" component={SellerAnalytics} />
          <Route path="/seller/subscription" component={SellerSubscription} />
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
