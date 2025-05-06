import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authMiddleware, adminMiddleware } from "./middleware/auth";
import * as AuthController from "./controllers/auth.controller";
import * as ProductController from "./controllers/product.controller";
import * as StoreController from "./controllers/store.controller";
import * as PromotionController from "./controllers/promotion.controller";
import * as ReservationController from "./controllers/reservation.controller";
import * as WishlistController from "./controllers/wishlist.controller";
import * as SubscriptionController from "./controllers/subscription.controller";
import * as MapController from "./controllers/map.controller";
import * as AdminController from "./controllers/admin.controller";
import * as AdminUserController from "./controllers/admin-user.controller";
import * as PlaceDetailsController from "./controllers/place_details.controller";
import { uploadImages, deleteImage } from "./controllers/upload.controller.js";
import { db, pool } from "./db";
import { and, eq } from "drizzle-orm";
import { storeImages, productImages, products, stores, users } from "@shared/schema";
import { verifyStoreOwnership, verifyProductOwnership } from "./middlewares/storeOwnership";
import { comparePasswords } from './utils/auth';
import { geocodingMiddleware } from "./middlewares/geocoding.middleware";

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
  
  // Rota específica para o mapa - deve vir antes das rotas parametrizadas
  app.get('/api/stores/map', MapController.getStoresForMap);
  
  // Rota para listar apenas as lojas do usuário logado
  // IMPORTANTE: Esta rota específica deve vir antes das rotas parametrizadas (:id)
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
  
  // Rotas para lojas específicas (parametrizadas)
  app.get('/api/stores/:id', StoreController.getStore);
  app.get('/api/stores/:id/products', StoreController.getStoreProducts);
  app.get('/api/stores/:id/coupons', StoreController.getStoreCoupons);
  
  // Rotas que requerem geocodificação

  // Rotas que requerem autenticação e verificação de propriedade
  app.post('/api/stores', authMiddleware, geocodingMiddleware, StoreController.createStore);
  app.put('/api/stores/:id', authMiddleware, verifyStoreOwnership, geocodingMiddleware, StoreController.updateStore);

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


  // Rota específica para login administrativo
  app.post('/api/admin/login', async (req: Request, res: Response) => {
    // Definir explicitamente o tipo de conteúdo como JSON para evitar respostas HTML
    res.setHeader('Content-Type', 'application/json');
    
    try {
      console.log('Requisição de login administrativo recebida');
      console.log('Headers:', req.headers);
      console.log('Body:', { email: req.body?.email ? '[PRESENTE]' : '[AUSENTE]', password: req.body?.password ? '[PRESENTE]' : '[AUSENTE]' });
      
      const { email, password } = req.body;

      if (!email || !password) {
        console.log('Falha na autenticação: Email ou senha faltando');
        return res.status(400).json({ 
          success: false, 
          message: 'Email e senha são obrigatórios' 
        });
      }

      // Buscar o usuário pelo email
      const user = await db.query.users.findFirst({
        where: eq(users.email, email)
      });

      console.log('Usuário encontrado:', user ? 'Sim' : 'Não');
      
      if (!user) {
        console.log('Falha na autenticação: Usuário não encontrado');
        return res.status(401).json({ 
          success: false, 
          message: 'Credenciais inválidas' 
        });
      }

      // Verificar se o usuário é um administrador
      if (user.role !== 'admin') {
        console.log('Falha na autenticação: Usuário não é administrador');
        return res.status(403).json({ 
          success: false, 
          message: 'Acesso negado. Apenas administradores podem acessar este recurso.' 
        });
      }

      // Verificar a senha
      const isPasswordValid = await comparePasswords(password, user.password);
      console.log('Senha válida:', isPasswordValid ? 'Sim' : 'Não');
      
      if (!isPasswordValid) {
        console.log('Falha na autenticação: Senha incorreta');
        return res.status(401).json({ 
          success: false, 
          message: 'Credenciais inválidas' 
        });
      }

      try {
        // Autenticar o usuário e salvar na sessão
        req.session.userId = user.id;
        console.log('ID do usuário salvo na sessão:', user.id);
        
        // Salvando a sessão explicitamente
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error('Erro ao salvar sessão:', err);
              reject(err);
            } else {
              console.log('Sessão salva com sucesso');
              resolve();
            }
          });
        });
      } catch (sessionError) {
        console.error('Erro na manipulação da sessão:', sessionError);
        return res.status(500).json({ 
          success: false, 
          message: 'Erro ao criar sessão de autenticação' 
        });
      }
      
      // Remover a senha da resposta
      const { password: _, ...userWithoutPassword } = user;
      
      const responseData = {
        user: userWithoutPassword,
        success: true,
        message: 'Login administrativo realizado com sucesso'
      };
      
      console.log('Enviando resposta de sucesso para login administrativo');
      return res.status(200).json(responseData);
    } catch (error) {
      console.error('Erro no login administrativo:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Erro ao processar o login administrativo',
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
    }
  });

  // Rotas para gerenciamento de usuários administrativos
  app.post('/api/admin/init-admin', AdminUserController.initializeAdminUser);
  app.get('/api/admin/check-admins', AdminUserController.checkForAdminUsers);
  app.get('/api/admin/users', authMiddleware, adminMiddleware, AdminUserController.listAdminUsers);
  app.post('/api/admin/users', authMiddleware, adminMiddleware, AdminUserController.createAdminUser);
  app.post('/api/admin/users/:userId/promote', authMiddleware, adminMiddleware, AdminUserController.promoteUserToAdmin);

  // Rotas administrativas para geocodificação
  app.get('/api/admin/stores-geocoding', authMiddleware, adminMiddleware, AdminController.getAllStoresGeocodingStatus);
  app.post('/api/admin/geocode-store/:id', authMiddleware, adminMiddleware, AdminController.geocodeStoreById);
  app.post('/api/admin/update-store-coordinates/:id', authMiddleware, adminMiddleware, AdminController.updateStoreCoordinates);
  app.post('/api/admin/geocode-all-stores', authMiddleware, adminMiddleware, MapController.batchGeocodeAllStores);
  
  // Rotas para detalhes de lugares do Google Places
  app.get('/api/admin/stores/:storeId/place-details', authMiddleware, adminMiddleware, PlaceDetailsController.getStoreGooglePlaceDetails);
  app.post('/api/admin/stores/:storeId/refresh-place-details', authMiddleware, adminMiddleware, PlaceDetailsController.refreshStoreGooglePlaceDetails);
  app.post('/api/admin/update-all-store-details', authMiddleware, adminMiddleware, PlaceDetailsController.updateAllStoresPlaceDetails);

  const httpServer = createServer(app);
  return httpServer;
}
