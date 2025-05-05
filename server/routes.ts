import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authMiddleware } from "./middleware/auth";
import * as AuthController from "./controllers/auth.controller";
import * as ProductController from "./controllers/product.controller";
import * as StoreController from "./controllers/store.controller";
import * as PromotionController from "./controllers/promotion.controller";
import * as ReservationController from "./controllers/reservation.controller";
import * as SubscriptionController from "./controllers/subscription.controller";
import UploadController from "./controllers/upload.controller.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post('/api/auth/register', AuthController.register);
  app.post('/api/auth/login', AuthController.login);
  app.post('/api/auth/logout', AuthController.logout);
  app.get('/api/auth/me', authMiddleware, AuthController.getCurrentUser);

  // User routes
  app.get('/api/users/me', authMiddleware, async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    
    const userData = await storage.getUser(user.id);
    if (!userData) return res.status(404).json({ message: 'User not found' });
    
    // Get user stats
    const stats = await storage.getUserStats(user.id);
    
    // Remove password from response
    const { password, ...userWithoutPassword } = userData;
    
    res.json({ ...userWithoutPassword, stats });
  });

  // Category routes
  app.get('/api/categories', async (req: Request, res: Response) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });
  
  app.get('/api/categories/:slug', async (req: Request, res: Response) => {
    const { slug } = req.params;
    const category = await storage.getCategoryBySlug(slug);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json(category);
  });

  // Banner routes
  app.get('/api/banners', async (req: Request, res: Response) => {
    const banners = await storage.getBanners(true);
    res.json(banners);
  });

  // Product routes
  app.get('/api/products', ProductController.getProducts);
  app.get('/api/products/featured', ProductController.getFeaturedProducts);
  app.get('/api/products/:id', ProductController.getProduct);
  app.get('/api/products/:id/related', ProductController.getRelatedProducts);
  app.post('/api/products', authMiddleware, ProductController.createProduct);
  app.put('/api/products/:id', authMiddleware, ProductController.updateProduct);

  // Store routes
  app.get('/api/stores', StoreController.getStores);
  app.get('/api/stores/nearby', StoreController.getNearbyStores);
  app.get('/api/stores/:id', StoreController.getStore);
  app.get('/api/stores/:id/products', StoreController.getStoreProducts);
  app.get('/api/stores/:id/coupons', StoreController.getStoreCoupons);
  app.post('/api/stores', authMiddleware, StoreController.createStore);
  app.put('/api/stores/:id', authMiddleware, StoreController.updateStore);

  // Promotion routes
  app.get('/api/promotions', async (req: Request, res: Response) => {
    try {
      const promotions = await storage.getPromotions();
      
      // Para cada promoção, obter os detalhes do produto
      const promotionsWithProducts = await Promise.all(
        promotions.map(async (promotion) => {
          const product = await storage.getProduct(promotion.productId);
          return { ...promotion, product };
        })
      );
      
      res.json(promotionsWithProducts);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  app.get('/api/promotions/flash', PromotionController.getFlashPromotions);
  app.get('/api/promotions/:id', PromotionController.getPromotion);
  app.post('/api/promotions', authMiddleware, PromotionController.createPromotion);
  app.put('/api/promotions/:id', authMiddleware, PromotionController.updatePromotion);

  // Coupon routes
  app.get('/api/coupons', async (req: Request, res: Response) => {
    const { search } = req.query;
    const coupons = await storage.getCoupons(search as string);
    res.json(coupons);
  });

  // Wishlist routes
  app.get('/api/wishlist', authMiddleware, async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    
    const wishlistItems = await storage.getWishlistItems(user.id);
    res.json(wishlistItems);
  });
  
  app.post('/api/wishlist/:productId', authMiddleware, async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    
    const { productId } = req.params;
    
    const product = await storage.getProduct(Number(productId));
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const wishlistItem = await storage.addToWishlist(user.id, Number(productId));
    res.json(wishlistItem);
  });
  
  app.delete('/api/wishlist/:productId', authMiddleware, async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    
    const { productId } = req.params;
    
    const success = await storage.removeFromWishlist(user.id, Number(productId));
    
    if (!success) {
      return res.status(404).json({ message: 'Wishlist item not found' });
    }
    
    res.json({ success });
  });

  // Favorite stores routes
  app.get('/api/favorite-stores', authMiddleware, async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    
    const favoriteStores = await storage.getFavoriteStores(user.id);
    res.json(favoriteStores);
  });
  
  app.post('/api/favorite-stores/:storeId', authMiddleware, async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    
    const { storeId } = req.params;
    
    const store = await storage.getStore(Number(storeId));
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }
    
    const favoriteStore = await storage.addFavoriteStore(user.id, Number(storeId));
    res.json(favoriteStore);
  });
  
  app.delete('/api/favorite-stores/:storeId', authMiddleware, async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    
    const { storeId } = req.params;
    
    const success = await storage.removeFavoriteStore(user.id, Number(storeId));
    
    if (!success) {
      return res.status(404).json({ message: 'Favorite store not found' });
    }
    
    res.json({ success });
  });

  // Reservation routes
  app.get('/api/reservations', authMiddleware, ReservationController.getReservations);
  app.post('/api/reservations', authMiddleware, ReservationController.createReservation);
  app.put('/api/reservations/:id/status', authMiddleware, ReservationController.updateReservationStatus);

  // Subscription routes (for sellers)
  app.get('/api/subscriptions/plans', SubscriptionController.getSubscriptionPlans);
  app.post('/api/subscriptions/purchase', authMiddleware, SubscriptionController.purchaseSubscription);
  app.get('/api/subscriptions/my-plan', authMiddleware, SubscriptionController.getMySubscription);

  // Store analytics routes
  app.get('/api/stores/:id/analytics', authMiddleware, async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    
    const store = await storage.getStore(Number(id));
    
    if (!store || store.userId !== user.id) {
      return res.status(403).json({ message: 'Not authorized to access this store analytics' });
    }
    
    const impressions = await storage.getStoreImpressions(
      Number(id),
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    
    res.json(impressions);
  });

  // Rota de upload de imagens
  app.use('/api/upload', UploadController);

  // Servir arquivos estáticos da pasta pública
  app.use('/uploads', express.static('public/uploads'));
  app.use('/uploads/thumbnails', express.static('public/uploads/thumbnails'));

  const httpServer = createServer(app);
  return httpServer;
}
