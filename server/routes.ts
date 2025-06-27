import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { authMiddleware, adminMiddleware } from "./middleware/auth";
import * as AuthController from "./controllers/auth.controller";
import * as UserController from "./controllers/user.controller";
import * as AvatarController from "./controllers/avatar.controller";
import * as ProductController from "./controllers/product.controller";
import * as StoreController from "./controllers/store.controller";
import * as PromotionController from "./controllers/promotion.controller";
import * as ReservationController from "./controllers/reservation.controller";
import * as WishlistController from "./controllers/wishlist.controller";
import * as SubscriptionController from "./controllers/subscription.controller";
import * as StripeController from "./controllers/stripe.controller";
import * as MapController from "./controllers/map.controller";
import * as AdminController from "./controllers/admin.controller";
import * as AdminUserController from "./controllers/admin-user.controller";
import * as PlaceDetailsController from "./controllers/place_details.controller";
import * as DebugController from "./controllers/debug.controller";
import * as PasswordResetController from "./controllers/password-reset.controller";
import { uploadImages, deleteImage } from "./controllers/upload.controller";
import { db, pool } from "./db";
import { eq, ne, and, sql } from "drizzle-orm"; // Removidos imports não utilizados: like, or, gte, lte, desc
import { storeImages, productImages, products, stores, users, reservations, promotions, wishlists } from "@shared/schema";
import imagesRoutes from "./routes/images";
import testDebugRoutes from "./routes/test-debug"; // Removido .js
import { verifyStoreOwnership, verifyProductOwnership } from "./middlewares/storeOwnership";
import { comparePasswords } from './utils/auth';
import { geocodingMiddleware } from "./middlewares/geocoding.middleware";
import { processStoreMiddleware } from "./middleware/store-processor.middleware";
import { secureImageMiddleware } from "./middleware/secure-image-middleware";
// Removido import problemático: preventBlobUrls, logUploadAttempt
import highlightRoutes from './routes/highlights'; // Removido .js
import trialRoutes from './routes/trial'; // Removido .js
import highlightsTestRoutes from "./routes/highlights-test"; // Removido .js
import plansRoutes from './routes/plans'; // Removido .js
import { validateProductLimitMiddleware, validatePromotionLimitMiddleware } from './middleware/plan-limits.middleware'; // Removido .js
import * as CouponController from "./controllers/coupon.controller";

// Middleware personalizado para substituir preventBlobUrls e logUploadAttempt
const logUploadAttempt = (req: Request, res: Response, next: Function) => {
  console.log(`Upload attempt logged: ${req.method} ${req.path}`);
  next();
};

const preventBlobUrls = (req: Request, res: Response, next: Function) => {
  if (req.body && typeof req.body === 'object') {
    const bodyStr = JSON.stringify(req.body);
    if (bodyStr.includes('blob:')) {
      return res.status(400).json({ message: 'Blob URLs are not allowed' });
    }
  }
  next();
};

// Middleware para limitar cupons por plano
const limitByCouponPlan = (req: Request, res: Response, next: Function) => {
  // Implementação simplificada - pode ser expandida conforme necessário
  next();
};

// DEBUG - Verificar métodos específicos
console.log('=== DEBUG COUPON CONTROLLER ===');
console.log('createCoupon:', typeof CouponController.createCoupon);
console.log('validateCouponCode:', typeof CouponController.validateCouponCode);
console.log('useCoupon:', typeof CouponController.useCoupon);
console.log('getCouponLimits:', typeof CouponController.getCouponLimits);
console.log('===============================');

export async function registerRoutes(app: Express): Promise<Server> {
  // Aplicar middleware de segurança de imagens
  app.use(secureImageMiddleware);

  // Registrar as rotas de imagens
  app.use('/api', imagesRoutes);

  // ✅ NOVAS ROTAS: Trial e Highlights
  app.use('/api/highlights', highlightRoutes);
  app.use('/api/trial', trialRoutes);
  app.use('/api/debug-test', testDebugRoutes);
  app.use('/api/highlights-test', highlightsTestRoutes);
  app.use('/api/plans', plansRoutes);

  // Auth routes
  app.post('/api/auth/login', AuthController.login);
  app.post('/api/auth/register', AuthController.register);
  app.post('/api/auth/logout', authMiddleware, AuthController.logout);
  app.get('/api/auth/me', authMiddleware, AuthController.getCurrentUser);
  app.get('/api/auth/verify', authMiddleware, AuthController.verify);

  // Password reset routes
  app.post('/api/auth/request-password-reset', PasswordResetController.requestPasswordReset);
  app.post('/api/auth/reset-password', PasswordResetController.resetPassword);
  app.get('/api/auth/validate-reset-token/:token', PasswordResetController.validateResetToken);

  // User routes
  app.get('/api/users/me', authMiddleware, UserController.getCurrentUser);
  app.post('/api/users/verify-password', authMiddleware, UserController.verifyPassword);
  app.put('/api/users/update', authMiddleware, UserController.updateUser);
  app.post('/api/users/avatar', authMiddleware, AvatarController.uploadAvatarMiddleware, AvatarController.uploadAvatar);

  // Category routes
  app.get('/api/categories', async (_req: Request, res: Response) => { // Corrigido: _req para evitar warning
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
      const productsList = productsResult.rows;
      console.log(`Encontrados ${productsList.length} produtos na categoria "${categoryName}"`);

      // 4. Para cada produto, buscar sua imagem primária
      const productsWithImages = await Promise.all(
        productsList.map(async (product) => {
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
  app.get('/api/banners', async (_req: Request, res: Response) => { // Corrigido: _req
    const banners = await storage.getBanners(true);
    res.json(banners);
  });

  // Product routes
  // Rotas públicas de produtos
  app.get('/api/products', ProductController.getProducts);
  app.get('/api/products/featured', ProductController.getFeaturedProducts);
  app.get('/api/products/:id', ProductController.getProduct);
  app.get('/api/products/:id/related', ProductController.getRelatedProducts);

  // Rota segura para vendedores obterem apenas seus produtos
  app.get('/api/seller/products', authMiddleware, async (req: Request, res: Response) => {
    console.log('[API /api/seller/products] Handler atingido');

    // Garantir que sempre retornamos JSON
    res.setHeader('Content-Type', 'application/json');

    try {
      const user = req.user;
      console.log('[API /api/seller/products] Usuário autenticado:', user ? `ID ${user.id}` : 'Nenhum');

      if (!user) {
        console.log('[API /api/seller/products] ❌ Usuário não autenticado');
        return res.status(401).json({ 
          products: [],
          error: 'Unauthorized',
          message: 'Usuário não autenticado',
          success: false
        });
      }

      const { storeId } = req.query;
      console.log('[API /api/seller/products] StoreId solicitado:', storeId);

      let query = `
        SELECT p.*, s.name as store_name 
        FROM products p 
        INNER JOIN stores s ON p.store_id = s.id 
        WHERE s.user_id = $1
      `;
      let params: any[] = [user.id];

      // Se um storeId específico for fornecido, filtrar por ele
      if (storeId) {
        query += ' AND p.store_id = $2';
        params.push(Number(storeId)); // Corrigido: conversão explícita para number
        console.log('[API /api/seller/products] Filtrando por storeId:', storeId);
      }

      query += ' ORDER BY p.created_at DESC';

      console.log('[API /api/seller/products] Executando query no banco...');
      const { rows } = await pool.query(query, params);
      console.log('[API /api/seller/products] Produtos encontrados no banco:', rows.length);

      // Buscar imagens para cada produto
      const productsWithImages = await Promise.all(
        rows.map(async (product: any) => { // Corrigido: type annotation
          try {
            const imagesQuery = 'SELECT * FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC, display_order ASC';
            const imagesResult = await pool.query(imagesQuery, [product.id]);

            return {
              ...product,
              images: imagesResult.rows.map((img: any) => img.filename || img.imageUrl), // Corrigido: usar filename se disponível
              store: {
                id: product.store_id,
                name: product.store_name
              }
            };
          } catch (err) {
            console.error(`[API /api/seller/products] Erro ao buscar imagens do produto ${product.id}:`, err);
            return {
              ...product,
              images: [],
              store: {
                id: product.store_id,
                name: product.store_name
              }
            };
          }
        })
      );

      console.log(`[API /api/seller/products] ✅ Produtos processados: ${productsWithImages.length}`);

      return res.status(200).json({
        products: productsWithImages,
        count: productsWithImages.length,
        success: true
      });

    } catch (error) {
      console.error('[API /api/seller/products] ❌ Erro crítico no handler:', error);

      // Garantir que mesmo erros retornem JSON
      return res.status(500).json({
        products: [],
        error: 'Erro interno do servidor',
        message: 'Erro ao buscar produtos do vendedor',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        success: false
      });
    }
  });

  // Rotas de produtos que requerem autenticação e verificação de propriedade
  app.post('/api/products', authMiddleware, validateProductLimitMiddleware, logUploadAttempt, preventBlobUrls, ProductController.createProduct);
  app.put('/api/products/:id', authMiddleware, logUploadAttempt, preventBlobUrls, verifyProductOwnership, ProductController.updateProduct);

  // Rota para excluir um produto
  app.delete('/api/products/:id', authMiddleware, verifyProductOwnership, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const productId = parseInt(id);

      if (isNaN(productId)) {
        return res.status(400).json({ message: 'ID de produto inválido' });
      }

      console.log(`Solicitação para excluir produto ID: ${productId}`);

      // 1. Verificar se o produto existe
      const product = await db.query.products.findFirst({
        where: eq(products.id, productId),
      });

      if (!product) {
        return res.status(404).json({ message: 'Produto não encontrado' });
      }

      // 2. Excluir referências da wishlist (lista de desejos)
      await db.delete(wishlists)
        .where(eq(wishlists.productId, productId));

      // 3. Excluir imagens do produto
      await db.delete(productImages)
        .where(eq(productImages.productId, productId));

      // 4. Excluir reservas do produto
      await db.delete(reservations)
        .where(eq(reservations.productId, productId));

      // 5. Excluir promoções do produto
      await db.delete(promotions)
        .where(eq(promotions.productId, productId));

      // 6. Excluir o produto
      await db.delete(products)
        .where(eq(products.id, productId));

      return res.status(200).json({ 
        success: true, 
        message: 'Produto excluído com sucesso' 
      });
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao excluir produto' 
      });
    }
  });

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
  // Rota para listar apenas as lojas do usuário logado (DEVE VIR PRIMEIRO)
  // IMPORTANTE: Esta rota específica deve vir antes das rotas parametrizadas (:id)
  app.get('/api/stores/my-stores', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });

      console.log('🔍 [SECURITY] Buscando lojas apenas do usuário:', user.id);
      const stores = await storage.getStoresByUserId(user.id);
      console.log('🔍 [SECURITY] Lojas encontradas:', stores.length);
      res.json(stores);
    } catch (error) {
      console.error('Error fetching user stores:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Seller store routes (seguindo o padrão /api/seller/*)
   app.get('/api/seller/stores', authMiddleware, async (req: Request, res: Response) => {
     console.log('🚨 ROTA /api/seller/stores CHAMADA!');
     console.log('🚨 User:', req.user);

     try {
       const user = req.user;
       if (!user) {
         console.log('🚨 User não encontrado!');
         return res.status(401).json({ message: 'Unauthorized' });
       }

       console.log('🔍 [SELLER] Buscando lojas do vendedor:', user.id);
       const stores = await storage.getStoresByUserId(user.id);
       console.log('🔍 [SELLER] Lojas encontradas:', stores.length);
       res.json(stores);
     } catch (error) {
       console.error('Error fetching seller stores:', error);
       res.status(500).json({ message: 'Internal server error' });
     }
   });

  // Rotas públicas de lojas (para consumo público)
  app.get('/api/stores', StoreController.getStores);
  app.get('/api/stores/nearby', StoreController.getNearbyStores);

  // NOVA ROTA DE DEBUG - deve vir antes das rotas parametrizadas (:id)
  app.get('/api/stores/debug/locations', StoreController.debugStoreLocations);

  // Rota específica para o mapa - deve vir antes das rotas parametrizadas
  app.get('/api/stores/map', MapController.getStoresForMap);

  // Rotas para lojas específicas (parametrizadas)
  app.get('/api/stores/:id', StoreController.getStore);
  app.get('/api/stores/:id/products', StoreController.getStoreProducts);
  app.get('/api/stores/:id/coupons', StoreController.getStoreCoupons);

  // Rotas que requerem autenticação e verificação de propriedade
  app.post('/api/stores', authMiddleware, logUploadAttempt, preventBlobUrls, geocodingMiddleware, processStoreMiddleware, StoreController.createStore);
  app.put('/api/stores/:id', authMiddleware, logUploadAttempt, preventBlobUrls, verifyStoreOwnership, geocodingMiddleware, processStoreMiddleware, StoreController.updateStore);
  app.patch('/api/stores/:id', authMiddleware, verifyStoreOwnership, geocodingMiddleware, processStoreMiddleware, StoreController.updateStore);

  // Rota para excluir uma loja
  app.delete('/api/stores/:id', authMiddleware, verifyStoreOwnership, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.id);

      console.log(`Solicitação para excluir loja ID: ${storeId}`);

      // 1. Primeiro excluir imagens relacionadas
      await db.delete(storeImages)
        .where(eq(storeImages.storeId, storeId));

      // 2. Verificar se há produtos associados a esta loja
      const storeProducts = await db.select()
        .from(products)
        .where(eq(products.storeId, storeId));

      if (storeProducts.length > 0) {
        // 2.1 Para cada produto, excluir imagens relacionadas
        for (const product of storeProducts) {
          await db.delete(productImages)
            .where(eq(productImages.productId, product.id));
        }

        // 2.2 Excluir todos os produtos da loja
        await db.delete(products)
          .where(eq(products.storeId, storeId));
      }

      // 3. Excluir a loja
      await db.delete(stores)
        .where(eq(stores.id, storeId));

      return res.json({
        success: true,
        message: 'Loja excluída com sucesso'
      });
    } catch (error) {
      console.error('Erro ao excluir loja:', error);
      return res.status(500).json({
        success: false,
        message: 'Ocorreu um erro ao excluir a loja',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  // Rota para adicionar imagens a uma loja existente
  app.post('/api/stores/:id/images', authMiddleware, verifyStoreOwnership, async (req: Request, res: Response) => {
    try {
      const storeId = parseInt(req.params.id);
      const { imageUrls, isPrimary = false } = req.body;

      if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        return res.status(400).json({ message: 'URLs de imagens são obrigatórias' });
      }

      console.log(`Adicionando ${imageUrls.length} imagens à loja ID ${storeId}`);

      // Processar cada URL de imagem
      const imageRecords = [];
      for (const imageUrl of imageUrls) {
        // Criar URL para thumbnail a partir da URL da imagem original
        const thumbnailUrl = imageUrl.replace(/\/uploads\//, '/uploads/thumbnails/');

        // Inserir a imagem no banco
        const [imageRecord] = await db.insert(storeImages) // Corrigido: renomeado variável
          .values({
            storeId,
            filename: path.basename(imageUrl), // Corrigido: usar filename ao invés de imageUrl
            thumbnailFilename: path.basename(thumbnailUrl),
            isPrimary: isPrimary && imageRecords.length === 0,
            displayOrder: imageRecords.length
          })
          .returning();

        imageRecords.push(imageRecord);
      }

      return res.status(201).json({ 
        success: true, 
        message: 'Imagens adicionadas com sucesso', 
        images: imageRecords 
      });
    } catch (error) {
      console.error('Erro ao adicionar imagens à loja:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao adicionar imagens', 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
    }
  });

  // Promotion routes
  app.get('/api/promotions', async (_req: Request, res: Response) => { // Corrigido: _req
    try {
      const promotions = await storage.getPromotions();

      // Para cada promoção, obter os detalhes do produto e calcular preço com desconto
      const promotionsWithProducts = await Promise.all(
        promotions.map(async (promotion) => {
          const product = await storage.getProduct(promotion.productId);

          if (!product) {
            return null;
          }

          // Buscar dados da loja
          const store = await storage.getStore(product.storeId);

          // Calcular preço com desconto
          let discountedPrice = product.price;
          if (promotion.discountPercentage) {
            discountedPrice = product.price * (1 - (promotion.discountPercentage / 100));
            // Arredondar para duas casas decimais
            discountedPrice = Math.round(discountedPrice * 100) / 100;
          }

          // Adicionar o preço com desconto ao produto e dados da loja
          const productWithDiscount = {
            ...product,
            discountedPrice: discountedPrice,
            store: store ? { id: store.id, name: store.name } : null
          };

          return { 
            ...promotion, 
            product: productWithDiscount,
            promotionEndsAt: promotion.endTime
          };
        })
      );

      // Filtrar promoções sem produtos
      const validPromotions = promotionsWithProducts.filter(promo => promo !== null);

      res.json(validPromotions);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  app.get('/api/promotions/flash', PromotionController.getFlashPromotions);
  // Rota específica para obter promoções do vendedor atual - deve vir antes da rota parametrizada (:id)
  app.get('/api/seller/promotions', authMiddleware, PromotionController.getSellerPromotions);
  app.get('/api/promotions/:id', PromotionController.getPromotion);
  app.post('/api/promotions', authMiddleware, validatePromotionLimitMiddleware, verifyProductOwnership, PromotionController.createPromotion);
  app.put('/api/promotions/:id', authMiddleware, verifyProductOwnership, PromotionController.updatePromotion);
  app.post('/api/promotions/:id/simple-update', authMiddleware, PromotionController.simpleUpdatePromotion);
  app.delete('/api/promotions/:id', authMiddleware, PromotionController.deletePromotion);

  // Coupon routes - Public  
  app.get('/api/coupons', CouponController.getActiveCoupons);
  app.get('/api/stores/:storeId/coupons', CouponController.getStoreCoupons);
  app.post('/api/stores/:storeId/coupons/:code/validate', CouponController.validateCouponCode);

  // Rota para resgatar cupom (público)
  app.post('/api/coupons/:id/redeem', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { customerName, customerPhone } = req.body;

      // Validação básica
      if (!customerName?.trim()) {
        return res.status(400).json({ 
          success: false,
          message: 'Nome do cliente é obrigatório' 
        });
      }

      const result = await storage.redeemCoupon(Number(id), {
        name: customerName.trim(),
        phone: customerPhone?.trim()
      });

      res.json({
        success: true,
        validationCode: result.validationCode,
        message: 'Cupom resgatado com sucesso! Apresente o código na loja.',
        redemption: result.redemption
      });
    } catch (error: any) {
      console.error('Erro ao resgatar cupom:', error);
      res.status(400).json({ 
        success: false,
        message: error.message || 'Erro ao resgatar cupom'
      });
    }
  });

  // Coupon routes - Seller protected
  app.get('/api/seller/coupons', authMiddleware, CouponController.getSellerCoupons);
  app.post('/api/seller/coupons', authMiddleware, CouponController.createCoupon);

  // CRUD de cupons para sellers
  app.get('/api/seller/coupons', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const coupons = await storage.getSellerCoupons(user.id);
      res.json(coupons);
    } catch (error: any) {
      console.error('Error getting seller coupons:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/seller/coupons', authMiddleware, limitByCouponPlan, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const couponData = req.body;

      // Garantir que o cupom pertence a uma loja do usuário
      const stores = await storage.getStoresByUserId(user.id);
      const storeIds = stores.map(store => store.id);

      if (!storeIds.includes(couponData.storeId)) {
        return res.status(403).json({ message: 'Loja não pertence ao usuário' });
      }

      const coupon = await storage.createCoupon(couponData);
      res.json(coupon);
    } catch (error: any) {
      console.error('Error creating coupon:', error);
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  });

  app.put('/api/seller/coupons/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const couponData = req.body;

      // Verificar se o cupom pertence ao usuário
      const existingCoupon = await storage.getCoupon(Number(id));
      if (!existingCoupon) {
        return res.status(404).json({ message: 'Cupom não encontrado' });
      }

      const stores = await storage.getStoresByUserId(user.id);
      const storeIds = stores.map(store => store.id);

      if (!storeIds.includes(existingCoupon.storeId)) {
        return res.status(403).json({ message: 'Cupom não pertence ao usuário' });
      }

      const updatedCoupon = await storage.updateCoupon(Number(id), couponData);
      res.json(updatedCoupon);
    } catch (error: any) {
      console.error('Error updating coupon:', error);
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  });

  app.delete('/api/seller/coupons/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      // Verificar se o cupom pertence ao usuário
      const existingCoupon = await storage.getCoupon(Number(id));
      if (!existingCoupon) {
        return res.status(404).json({ message: 'Cupom não encontrado' });
      }

      const stores = await storage.getStoresByUserId(user.id);
      const storeIds = stores.map(store => store.id);

      if (!storeIds.includes(existingCoupon.storeId)) {
        return res.status(403).json({ message: 'Cupom não pertence ao usuário' });
      }

      // Desativar ao invés de deletar para manter histórico
      await storage.updateCoupon(Number(id), { isActive: false });
      res.json({ success: true, message: 'Cupom desativado com sucesso' });
    } catch (error: any) {
      console.error('Error deleting coupon:', error);
      res.status(500).json({ message: error.message || 'Internal server error' });
    }
  });

  // Rotas públicas para listar cupons
  app.get('/api/coupons/public', async (req: Request, res: Response) => {
    try {
      const { search, limit } = req.query;
      const coupons = await storage.getCoupons(
        search as string, 
        limit ? Number(limit) : undefined
      );
      res.json(coupons);
    } catch (error: any) {
      console.error('Error getting public coupons:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/seller/coupons/limits', authMiddleware, CouponController.getCouponLimits);
  app.get('/api/seller/coupons/:id', authMiddleware, CouponController.getCoupon);
  app.put('/api/seller/coupons/:id', authMiddleware, CouponController.updateCoupon);
  app.delete('/api/seller/coupons/:id', authMiddleware, CouponController.deleteCoupon);
  app.post('/api/seller/coupons/use', authMiddleware, CouponController.useCoupon);

  // Rota para validar código de cupom (seller)
  app.post('/api/seller/coupons/validate', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { validationCode } = req.body;

      if (!validationCode?.trim()) {
        return res.status(400).json({ 
          success: false,
          message: 'Código de validação é obrigatório' 
        });
      }

      const result = await storage.validateCouponCode(validationCode.trim().toUpperCase(), user.id);
      res.json(result);
    } catch (error: any) {
      console.error('Erro ao validar cupom:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor' 
      });
    }
  });

  // Rota para listar cupons resgatados pendentes (seller)
  app.get('/api/seller/coupons/pending', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const stores = await storage.getStoresByUserId(user.id);

      const allPending = [];
      for (const store of stores) {
        const pending = await storage.getPendingRedemptions(store.id);
        allPending.push(...pending);
      }

      res.json({
        success: true,
        pending: allPending
      });
    } catch (error: any) {
      console.error('Erro ao buscar cupons pendentes:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor' 
      });
    }
  });

  // Rota para histórico de validações (seller)
  app.get('/api/seller/coupons/history', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const stores = await storage.getStoresByUserId(user.id);

      const allHistory = [];
      for (const store of stores) {
        const history = await storage.getRedemptionHistory(store.id);
        allHistory.push(...history);
      }

      res.json({
        success: true,
        history: allHistory
      });
    } catch (error: any) {
      console.error('Erro ao buscar histórico:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor' 
      });
    }
  });

  // Rota para estatísticas de cupons (seller)
  app.get('/api/seller/coupons/stats', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const stores = await storage.getStoresByUserId(user.id);

      let totalStats = {
        totalCoupons: 0,
        activeCoupons: 0,
        usedCoupons: 0,
        totalUsage: 0,
        conversionRate: 0
      };

      for (const store of stores) {
        const storeStats = await storage.getCouponMetrics(store.id);
        totalStats.totalCoupons += storeStats.totalCoupons;
        totalStats.activeCoupons += storeStats.activeCoupons;
        totalStats.usedCoupons += storeStats.usedCoupons;
        totalStats.totalUsage += storeStats.totalUsage;
      }

      // Recalcular conversion rate
      if (totalStats.totalCoupons > 0) {
        totalStats.conversionRate = (totalStats.usedCoupons / totalStats.totalCoupons) * 100;
        totalStats.conversionRate = Math.round(totalStats.conversionRate * 100) / 100;
      }

      res.json({
        success: true,
        stats: totalStats
      });
    } catch (error: any) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor' 
      });
    }
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
  app.delete('/api/reservations/cancelled', authMiddleware, ReservationController.clearCancelledReservations);

  // Subscription routes (for sellers)
  app.get('/api/subscriptions/plans', SubscriptionController.getSubscriptionPlans);
  app.post('/api/subscriptions/purchase', authMiddleware, SubscriptionController.purchaseSubscription);
  app.get('/api/subscriptions/my-plan', authMiddleware, SubscriptionController.getMySubscription);

  // Rota de teste
  app.get('/api/test-logs', (_req: Request, res: Response) => { // Corrigido: _req
    console.log('[SERVER-TEST] Rota de teste funcionando');
    res.json({
      message: 'Console funcionando',
      time: new Date(),
      method: _req.method,
      path: _req.path
    });
  });

  // Stripe routes for payment processing
  app.post('/api/stripe/checkout', authMiddleware, StripeController.createCheckoutSession);
  app.get('/api/stripe/checkout', (_req, res) => res.json({ message: 'Stripe checkout endpoint is working' }); // Corrigido: _req
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), StripeController.handleWebhook);
  app.get('/api/stripe/subscription', authMiddleware, StripeController.getSubscriptionDetails);
  app.post('/api/stripe/cancel', authMiddleware, StripeController.cancelSubscription);

  // Rotas para configuração e teste do Stripe
  app.get('/api/stripe/config', StripeController.getStripeConfig);
  app.get('/api/stripe/test', StripeController.testStripeConnection);

  // Rotas de diagnóstico
  app.get('/api/debug', DebugController.getDiagnostics);
  app.get('/api/stripe-prices', DebugController.getStripePrices);

  // Rota de estatísticas para o painel do vendedor
  app.get('/api/seller/stats', authMiddleware, async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    try {
      const { storeId: requestedStoreId } = req.query;
      console.log("📊 Buscando estatísticas para o vendedor ID:", user.id);
      console.log("🏪 StoreId solicitado:", requestedStoreId);

      // Buscar todas as lojas do vendedor
      const stores = await storage.getStoresByUserId(user.id);
      console.log("🏪 Lojas encontradas:", stores.length);

      if (!stores.length) {
        return res.status(404).json({ message: 'Nenhuma loja encontrada' });
      }

      let targetStoreIds: number[];

      if (requestedStoreId) {
        // Se um storeId específico foi solicitado, verificar se o usuário é o proprietário
        const requestedStoreIdNum = parseInt(requestedStoreId as string);
        const isOwner = stores.some(store => store.id === requestedStoreIdNum);

        if (!isOwner) {
          console.log("❌ Usuário não é proprietário da loja solicitada");
          return res.status(403).json({ message: 'Acesso negado: você não é proprietário desta loja' });
        }

        targetStoreIds = [requestedStoreIdNum];
        console.log("🏪 Usando loja específica ID:", requestedStoreIdNum);
      } else {
        // Se nenhum storeId específico foi solicitado, usar todas as lojas do usuário
        targetStoreIds = stores.map(store => store.id);
        console.log("🏪 Usando todas as lojas do usuário:", targetStoreIds);
      }

      let totalProducts = 0;
      let totalActiveProducts = 0;
      let totalReservations = 0;
      let pendingReservations = 0;
      let totalCoupons = 0;

      try {
        // Contar produtos por loja(s)
        for (const storeId of targetStoreIds) {
          const storeProducts = await db.select()
            .from(products)
            .where(eq(products.storeId, storeId));

          totalProducts += storeProducts.length;
          totalActiveProducts += storeProducts.filter(p => p.isActive).length;

          const productIds = storeProducts.map(p => p.id);

          if (productIds.length > 0) {
            // Reservas totais (excluindo canceladas)
            const reservationsResult = await db.select()
              .from(reservations)
              .where(and(
                sql`${reservations.productId} = ANY(${JSON.stringify(productIds)})`,
                ne(reservations.status, 'cancelled')
              ));
            totalReservations += reservationsResult.length;

            // Reservas pendentes
            const pendingReservationsResult = await db.select()
              .from(reservations)
              .where(and(
                sql`${reservations.productId} = ANY(${JSON.stringify(productIds)})`,
                eq(reservations.status, 'pending')
              ));
            pendingReservations += pendingReservationsResult.length;

            // Cupons/promoções dos produtos da loja
            const couponsResult = await db.select()
              .from(promotions)
              .where(sql`${promotions.productId} = ANY(${JSON.stringify(productIds)})`); // Corrigido: parêntese faltando
            totalCoupons += couponsResult.length;
          }
        }

        console.log("📦 Total de produtos:", totalProducts);
        console.log("✅ Produtos ativos:", totalActiveProducts);
        console.log("🔖 Total de reservas:", totalReservations);
        console.log("⏳ Reservas pendentes:", pendingReservations);
        console.log("🏷️ Total de cupons/promoções:", totalCoupons);

      } catch (queryError) {
        console.error("❌ Erro nas consultas Drizzle:", queryError);
        // Continuar com os valores padrão (já inicializados em 0)
      }

      res.json({
        totalProducts,
        totalActiveProducts,
        totalReservations,
        pendingReservations,
        totalCoupons
      });
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas do vendedor:', error);
      res.status(500).json({ 
        message: 'Erro ao buscar estatísticas',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

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

  // Rota para obter a imagem principal de um produto
  app.get('/api/products/:id/primary-image', async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.id);
      const [productImage] = await db.select() // Corrigido: renomeado variável
        .from(productImages)
        .where(and(
          eq(productImages.productId, productId),
          eq(productImages.isPrimary, true)
        ))
        .limit(1);

      if (productImage) {
        // Construir URL da imagem a partir do filename
        const imageUrl = `/uploads/${productImage.filename}`; // Corrigido: usar filename
        return res.redirect(imageUrl);
      }

      // Fallback para uma imagem padrão se nenhuma imagem foi encontrada
      return res.redirect('/assets/default-product-image.jpg');
    } catch (error) {
      console.error('Erro ao buscar imagem principal do produto:', error);
      return res.status(500).json({ message: 'Erro ao buscar imagem' });
    }
  });

  // Servir arquivos estáticos da pasta pública
  app.use('/uploads', express.static('public/uploads'));
  app.use('/uploads/thumbnails', express.static('public/uploads/thumbnails'));
  app.use('/assets', express.static('public/assets'));

  // Endpoint administrativo para limpar URLs blob do banco de dados
  app.post('/api/admin/clean-blob-urls', async (req: Request, res: Response) => {
    try {
      // Verificar se o usuário é admin
      if (!req.session.userId || req.session.role !== 'admin') { // Corrigido: usar req.session.role
        return res.status(403).json({ success: false, message: 'Acesso negado. Apenas administradores podem realizar esta operação.' });
      }

      // Importar e executar a função de limpeza
      const { cleanAllBlobUrls } = await import('./scripts/clean-blob-urls');
      const result = await cleanAllBlobUrls();

      return res.json({ 
        success: true, 
        message: `Limpeza concluída: ${result.stores} lojas e ${result.products} atualizados.`,
        result 
      });
    } catch (error) {
      console.error('Erro ao limpar URLs blob:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao executar limpeza de URLs blob.',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

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
        req.session.role = user.role; // Corrigido: adicionar role à sessão
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

  // Rota de diagnóstico para verificar arquivos do diretório de uploads
  app.get('/api/admin/check-uploads', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
    try {
      const uploadsDir = path.join(__dirname, '../public/uploads');
      const thumbnailsDir = path.join(__dirname, '../public/uploads/thumbnails');

      // Verificar se os diretórios existem
      if (!fs.existsSync(uploadsDir)) {
        return res.status(500).json({
          success: false,
          error: 'Diretório de uploads não encontrado',
          path: uploadsDir
        });
      }

      // Ler arquivos do diretório principal
      const files = fs.readdirSync(uploadsDir).filter(file => 
        !fs.statSync(path.join(uploadsDir, file)).isDirectory()
      );

      // Ler arquivos do diretório de thumbnails (se existir)
      let thumbnails: string[] = [];
      if (fs.existsSync(thumbnailsDir)) {
        thumbnails = fs.readdirSync(thumbnailsDir);
      }

      // Coletar estatísticas dos arquivos
      const fileStats = files.map(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: `/uploads/${file}`,
          size: stats.size,
          created: stats.birthtime,
          formattedSize: `${Math.round(stats.size / 1024)} KB`
        };
      });

      // Verificar arquivos no banco de dados
      const storeImagesResult = await db.query.storeImages.findMany();
      const productImagesResult = await db.query.productImages.findMany();

      // Identificar arquivos que existem fisicamente mas não estão no banco
      const dbImageNames = new Set([
        ...storeImagesResult.map(img => img.filename || ''), // Corrigido: usar filename
        ...productImagesResult.map(img => img.filename || '') // Corrigido: usar filename
      ].filter(Boolean));

      const orphanedFiles = files.filter(file => !dbImageNames.has(file));

      // Identificar registros no banco que não têm arquivos físicos
      const missingFiles = [
        ...storeImagesResult.filter(img => {
          const filename = img.filename || ''; // Corrigido: usar filename
          return filename && !files.includes(filename);
        }),
        ...productImagesResult.filter(img => {
          const filename = img.filename || ''; // Corrigido: usar filename
          return filename && !files.includes(filename);
        })
      ];

      return res.json({
        success: true,
        directories: {
          uploads: {
            path: uploadsDir,
            exists: true,
            fileCount: files.length
          },
          thumbnails: {
            path: thumbnailsDir,
            exists: fs.existsSync(thumbnailsDir),
            fileCount: thumbnails.length
          }
        },
        database: {
          storeImages: storeImagesResult.length,
          productImages: productImagesResult.length
        },
        summary: {
          totalPhysicalFiles: files.length,
          totalDatabaseReferences: dbImageNames.size,
          orphanedFiles: orphanedFiles.length,
          missingFiles: missingFiles.length
        },
        files: fileStats,
        orphanedFiles: orphanedFiles.map(file => `/uploads/${file}`),
        missingFiles: missingFiles.map(record => ({
          id: record.id,
          type: 'storeId' in record ? 'store' : 'product', // Corrigido: verificar storeId ao invés de storeImage
          entityId: 'storeId' in record ? record.storeId : record.productId,
          url: record.filename ? `/uploads/${record.filename}` : '' // Corrigido: construir URL a partir do filename
        }))
      });
    } catch (error) {
      console.error('Erro ao verificar diretório de uploads:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao ler diretório de uploads',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}