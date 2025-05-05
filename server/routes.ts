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
import * as WishlistController from "./controllers/wishlist.controller";
import * as SubscriptionController from "./controllers/subscription.controller";
import { uploadImages, deleteImage } from "./controllers/upload.controller.js";
import { db, pool } from "./db";
import { and, eq } from "drizzle-orm";
import { storeImages, productImages, products } from "@shared/schema";
import { verifyStoreOwnership, verifyProductOwnership } from "./middlewares/storeOwnership";

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
  
  // Endpoint específico para produtos por categoria
  app.get('/api/categories/:slug/products', async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      console.log(`Buscando produtos para categoria com slug: ${slug}`);
      
      // 1. Primeiro, encontre a categoria pelo slug
      const categoryQuery = 'SELECT * FROM categories WHERE slug = $1';
      const categoryResult = await pool.query(categoryQuery, [slug]);
      
      if (categoryResult.rows.length === 0) {
        console.log(`Categoria não encontrada com slug: ${slug}`);
        return res.json({
          products: [],
          message: 'Categoria não encontrada'
        });
      }
      
      // 2. Obter o nome exato da categoria
      const categoryName = categoryResult.rows[0].name;
      console.log(`Categoria encontrada: ${categoryName}`);
      
      // 3. Buscar produtos que correspondam a essa categoria (comparação case-insensitive)
      const productsQuery = `
        SELECT p.* 
        FROM products p
        WHERE LOWER(p.category) = LOWER($1)
          AND p.is_active = true
        ORDER BY p.created_at DESC
      `;
      
      const productsResult = await pool.query(productsQuery, [categoryName]);
      const products = productsResult.rows;
      console.log(`Encontrados ${products.length} produtos na categoria "${categoryName}"`);
      
      // 4. Para cada produto, buscar sua imagem primária
      const productsWithImages = await Promise.all(
        products.map(async (product) => {
          try {
            const imagesQuery = `
              SELECT * FROM product_images 
              WHERE product_id = $1
              ORDER BY is_primary DESC, display_order ASC
              LIMIT 1
            `;
            const imagesResult = await pool.query(imagesQuery, [product.id]);
            
            if (imagesResult.rows.length > 0) {
              return {
                ...product,
                primary_image: imagesResult.rows[0]
              };
            }
            return product;
          } catch (err) {
            console.error(`Erro ao buscar imagem do produto ${product.id}:`, err);
            return product;
          }
        })
      );
      
      // 5. Retornar JSON com todos os dados
      return res.json({
        success: true,
        category: {
          id: categoryResult.rows[0].id,
          name: categoryName,
          slug: slug
        },
        products: productsWithImages,
        count: productsWithImages.length
      });
      
    } catch (error) {
      console.error('Erro ao buscar produtos por categoria:', error);
      return res.status(500).json({
        success: false,
        products: [],
        error: 'Erro ao buscar produtos por categoria',
        message: error instanceof Error ? error.message : 'Erro inesperado'
      });
    }
  });

  // Banner routes
  app.get('/api/banners', async (req: Request, res: Response) => {
    const banners = await storage.getBanners(true);
    res.json(banners);
  });

  // Product routes
  // Rotas públicas de produtos
  app.get('/api/products', ProductController.getProducts);
  app.get('/api/products/featured', ProductController.getFeaturedProducts);
  app.get('/api/products/:id', ProductController.getProduct);
  app.get('/api/products/:id/related', ProductController.getRelatedProducts);
  
  // Rotas de produtos que requerem autenticação e verificação de propriedade
  app.post('/api/products', authMiddleware, ProductController.createProduct);
  app.put('/api/products/:id', authMiddleware, verifyProductOwnership, ProductController.updateProduct);
  
  // Rota para ativar/desativar um produto
  app.put('/api/products/:id/toggle-status', authMiddleware, verifyProductOwnership, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const productId = parseInt(id);
      
      // Obter o produto atual
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: 'Produto não encontrado' });
      }
      
      // Inverter o status atual
      const isActive = !product.isActive;
      
      // Atualizar o produto com o novo status
      await db.update(products)
        .set({ isActive })
        .where(eq(products.id, productId));
      
      // Buscar o produto atualizado
      const updatedProduct = await storage.getProduct(productId);
      
      return res.json(updatedProduct);
    } catch (error) {
      console.error('Erro ao alternar status do produto:', error);
      return res.status(500).json({ message: 'Erro ao alternar status do produto' });
    }
  });

  // Store routes
  // Rotas públicas de lojas
  app.get('/api/stores', StoreController.getStores);
  app.get('/api/stores/nearby', StoreController.getNearbyStores);
  app.get('/api/stores/:id', StoreController.getStore);
  app.get('/api/stores/:id/products', StoreController.getStoreProducts);
  app.get('/api/stores/:id/coupons', StoreController.getStoreCoupons);
  
  // Rota para listar apenas as lojas do usuário logado
  app.get('/api/stores/my-stores', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });
      
      const stores = await storage.getStoresByUserId(user.id);
      res.json(stores);
    } catch (error) {
      console.error('Error fetching user stores:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Rotas que requerem autenticação e verificação de propriedade
  app.post('/api/stores', authMiddleware, StoreController.createStore);
  app.put('/api/stores/:id', authMiddleware, verifyStoreOwnership, StoreController.updateStore);

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
  app.post('/api/promotions', authMiddleware, verifyProductOwnership, PromotionController.createPromotion);
  app.put('/api/promotions/:id', authMiddleware, verifyProductOwnership, PromotionController.updatePromotion);

  // Coupon routes
  app.get('/api/coupons', async (req: Request, res: Response) => {
    const { search } = req.query;
    const coupons = await storage.getCoupons(search as string);
    res.json(coupons);
  });

  // Wishlist routes
  app.get('/api/wishlist', authMiddleware, WishlistController.getWishlistItems);
  app.post('/api/wishlist/:productId', authMiddleware, WishlistController.addToWishlist);
  app.delete('/api/wishlist/:productId', authMiddleware, WishlistController.removeFromWishlist);

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
  app.get('/api/stores/:id/analytics', authMiddleware, verifyStoreOwnership, async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    
    const impressions = await storage.getStoreImpressions(
      Number(id),
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    
    res.json(impressions);
  });

  // Rotas de upload de imagens
  app.post('/api/upload/images', authMiddleware, uploadImages);
  app.delete('/api/upload/images/:id', authMiddleware, deleteImage);

  // Rota para obter a imagem principal de uma loja
  app.get('/api/stores/:id/primary-image', async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.id);
      const [image] = await db.select()
        .from(storeImages)
        .where(and(
          eq(storeImages.storeId, storeId),
          eq(storeImages.isPrimary, true)
        ))
        .limit(1);
      
      if (image) {
        // Redirecionar para a URL da imagem
        return res.redirect(image.imageUrl);
      }
      
      // Fallback para uma imagem padrão se nenhuma imagem foi encontrada
      return res.redirect('/uploads/default-store.jpg');
    } catch (error) {
      console.error('Erro ao buscar imagem principal da loja:', error);
      return res.status(500).json({ message: 'Erro ao buscar imagem' });
    }
  });
  
  // Rota para obter a imagem principal de um produto
  app.get('/api/products/:id/primary-image', async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.id);
      const [image] = await db.select()
        .from(productImages)
        .where(and(
          eq(productImages.productId, productId),
          eq(productImages.isPrimary, true)
        ))
        .limit(1);
      
      if (image) {
        // Redirecionar para a URL da imagem
        return res.redirect(image.imageUrl);
      }
      
      // Fallback para uma imagem padrão se nenhuma imagem foi encontrada
      return res.redirect('/uploads/default-product.jpg');
    } catch (error) {
      console.error('Erro ao buscar imagem principal do produto:', error);
      return res.status(500).json({ message: 'Erro ao buscar imagem' });
    }
  });

  // Servir arquivos estáticos da pasta pública
  app.use('/uploads', express.static('public/uploads'));
  app.use('/uploads/thumbnails', express.static('public/uploads/thumbnails'));

  const httpServer = createServer(app);
  return httpServer;
}
