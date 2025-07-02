import { 
  users, type User, type InsertUser,
  stores, type Store, type InsertStore,
  products, type Product, type InsertProduct,
  promotions, type Promotion, type InsertPromotion,
  coupons, type Coupon, type InsertCoupon,
  couponRedemptions, type CouponRedemption, type InsertCouponRedemption,
  wishlists, type Wishlist, type InsertWishlist,
  favoriteStores, type FavoriteStore, type InsertFavoriteStore,
  reservations, type Reservation, type InsertReservation,
  categories, type Category, type InsertCategory,
  banners, type Banner, type InsertBanner,
  storeImpressions, type StoreImpression, type InsertStoreImpression,
  passwordResetTokens
} from "@shared/schema";
import bcrypt from 'bcryptjs';
import { eq, and, or, sql, like, desc, gte, lte, inArray, isNull } from "drizzle-orm";

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  updateUserAvatar(userId: number, avatarUrl: string, avatarThumbnailUrl: string): Promise<User>;
  verifyUserPassword(id: number, password: string): Promise<boolean>;

  // Store operations
  getStore(id: number): Promise<Store | undefined>;
  getStores(options?: { category?: string, search?: string, limit?: number }): Promise<Store[]>;
  getStoresByUserId(userId: number): Promise<Store[]>;
  getUserStores(userId: number): Promise<Store[]>;
  getNearbyStores(lat: number, lng: number, radius?: number): Promise<Store[]>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: number, store: Partial<Store>): Promise<Store | undefined>;

  // Product operations
  getProduct(id: number): Promise<Product | undefined>;
  getProducts(options?: { 
    category?: string, 
    search?: string, 
    minPrice?: number,
    maxPrice?: number,
    sortBy?: string,
    promotion?: boolean,
    limit?: number,
    type?: string
  }): Promise<Product[]>;
  getProductsByCategorySlug(slug: string, options?: {
    minPrice?: number,
    maxPrice?: number,
    sortBy?: string,
    promotion?: boolean,
    limit?: number
  }): Promise<Product[]>;
  getProductsByStore(storeId: number): Promise<Product[]>;
  getStoresProducts(storeIds: number[]): Promise<Product[]>;
  getRelatedProducts(productId: number, limit?: number): Promise<Product[]>;
  getFeaturedProducts(limit?: number): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined>;

  // Promotion operations
  getPromotion(id: number): Promise<Promotion | undefined>;
  getPromotions(type?: string, limit?: number): Promise<Promotion[]>;
  getPromotionsByStore(storeId: number): Promise<Promotion[]>;
  getProductsPromotions(productIds: number[]): Promise<Promotion[]>;
  createPromotion(promotion: InsertPromotion): Promise<Promotion>;
  updatePromotion(id: number, promotion: Partial<Promotion>): Promise<Promotion | undefined>;

  // Coupon operations
  getCoupon(id: number): Promise<Coupon | undefined>;
  getCoupons(search?: string, limit?: number): Promise<Coupon[]>;
  getCouponsByStore(storeId: number): Promise<Coupon[]>;
  createCoupon(coupon: InsertCoupon): Promise<Coupon>;
  updateCoupon(id: number, data: Partial<InsertCoupon>): Promise<Coupon | null>;
  validateCouponCode(storeId: number, code: string): Promise<Coupon | null>;
  getSellerCoupons(userId: number): Promise<Coupon[]>;
  getCouponMetrics(storeId: number, startDate?: Date, endDate?: Date): Promise<{
      totalCoupons: number;
      activeCoupons: number;
      usedCoupons: number;
      totalUsage: number;
      conversionRate: number;
  }>;

  // Coupon redemption operations
  redeemCoupon(couponId: number, customerData: { name?: string, phone?: string }): Promise<{ validationCode: string; redemption: CouponRedemption }>;
  validateRedemptionCode(validationCode: string, storeUserId: number): Promise<{ success: boolean; coupon?: any; message: string }>;
  getPendingRedemptions(storeId: number): Promise<CouponRedemption[]>;
  getRedemptionHistory(storeId: number): Promise<CouponRedemption[]>;

  // Wishlist operations
  getWishlistItems(userId: number): Promise<Wishlist[]>;
  addToWishlist(userId: number, productId: number): Promise<Wishlist>;
  removeFromWishlist(userId: number, productId: number): Promise<boolean>;

  // Favorite store operations
  getFavoriteStores(userId: number): Promise<FavoriteStore[]>;
  addFavoriteStore(userId: number, storeId: number): Promise<FavoriteStore>;
  removeFavoriteStore(userId: number, storeId: number): Promise<boolean>;

  // Reservation operations
  getReservation(id: number): Promise<Reservation | undefined>;
  getReservations(userId: number, limit?: number): Promise<Reservation[]>;
  createReservation(userId: number, productId: number, quantity?: number): Promise<Reservation>;
  updateReservationStatus(id: number, status: 'pending' | 'completed' | 'expired' | 'cancelled'): Promise<Reservation | undefined>;

  // Category operations
  getCategory(id: number): Promise<Category | undefined>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Banner operations
  getBanner(id: number): Promise<Banner | undefined>;
  getBanners(isActive?: boolean): Promise<Banner[]>;
  createBanner(banner: InsertBanner): Promise<Banner>;
  updateBanner(id: number, banner: Partial<Banner>): Promise<Banner | undefined>;

  // Store analytics operations
  recordStoreImpression(storeId: number): Promise<StoreImpression>;
  getStoreImpressions(storeId: number, startDate?: Date, endDate?: Date): Promise<StoreImpression[]>;

  // User statistics
  getUserStats(userId: number): Promise<{ 
    wishlistCount: number;
    reservationsCount: number;
    favoriteStoresCount: number;
  }>;

  // Password reset operations
  createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<void>;
  getPasswordResetToken(token: string): Promise<{ userId: number; expiresAt: Date; used: boolean } | undefined>;
  markTokenAsUsed(token: string): Promise<void>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<boolean>;
}

import connectPg from "connect-pg-simple";
import session from "express-session";
import { db, pool } from "./db";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    }) as any;
  }

  // ===== USER OPERATIONS =====
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData as any).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    try {
      if (userData.password === '') {
        delete userData.password;
      }

      if (userData.password) {
        const salt = await bcrypt.genSalt(10);
        userData.password = await bcrypt.hash(userData.password, salt);
      }

      userData.updatedAt = new Date();

      const [updatedUser] = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();

      return updatedUser;
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      return undefined;
    }
  }

  async updateUserAvatar(userId: number, avatarUrl: string, avatarThumbnailUrl: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        avatarUrl: avatarUrl,
        avatarThumbnailUrl: avatarThumbnailUrl,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async verifyUserPassword(id: number, password: string): Promise<boolean> {
    try {
      const user = await this.getUser(id);
      if (!user) return false;
      return await bcrypt.compare(password, user.password);
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      return false;
    }
  }

  // ===== STORE OPERATIONS =====
  async getStore(id: number): Promise<Store | undefined> {
    if (typeof id !== 'number' || isNaN(id)) {
      console.error(`getStore recebeu ID inválido: ${id}, tipo: ${typeof id}`);
      return undefined;
    }

    try {
      const [store] = await db.select().from(stores).where(eq(stores.id, id));
      return store;
    } catch (error) {
      console.error(`Erro ao buscar loja com ID ${id}:`, error);
      return undefined;
    }
  }

  async getStores(options: { category?: string, search?: string, limit?: number } = {}): Promise<Store[]> {
    let query = db.select().from(stores);
    const conditions = [];

    if (options.category) {
      conditions.push(like(stores.category, `%${options.category}%`));
    }

    if (options.search) {
      conditions.push(
        or(
          like(stores.name, `%${options.search}%`),
          like(stores.description, `%${options.search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = (query as any).where(and(...conditions));
    }

    if (options.limit) {
      query = (query as any).limit(options.limit);
    }

    return await query;
  }

  async getNearbyStores(lat: number, lng: number, radius: number = 5): Promise<Store[]> {
    return await db.select().from(stores);
  }

  async getStoresByUserId(userId: number): Promise<Store[]> {
    console.log('🔍 [SECURITY] getStoresByUserId chamado para usuário:', userId);
    const result = await db.select()
      .from(stores)
      .where(eq(stores.userId, userId))
      .orderBy(desc(stores.createdAt));
    console.log('🔍 [SECURITY] Retornando', result.length, 'lojas para o usuário:', userId);
    return result;
  }

  async getUserStores(userId: number): Promise<Store[]> {
    return this.getStoresByUserId(userId);
  }

  async createStore(storeData: InsertStore): Promise<Store> {
    const [store] = await db.insert(stores).values(storeData as any).returning();
    return store;
  }

  async updateStore(id: number, storeData: Partial<Store>): Promise<Store | undefined> {
    const [updatedStore] = await db
      .update(stores)
      .set(storeData)
      .where(eq(stores.id, id))
      .returning();
    return updatedStore;
  }

  // ===== PRODUCT OPERATIONS =====
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProducts(options: { 
    category?: string, 
    search?: string, 
    minPrice?: number,
    maxPrice?: number,
    sortBy?: string,
    promotion?: boolean,
    limit?: number
  } = {}): Promise<Product[]> {
    let query = db.select().from(products);

    if (options.category) {
      query = (query as any).where(eq(products.category, options.category));
    }

    if (options.search) {
      query = (query as any).where(
        or(
          like(products.name, `%${options.search}%`),
          like(products.description, `%${options.search}%`)
        )
      );
    }

    if (options.minPrice !== undefined && options.minPrice !== null) {
      const minPrice = Number(options.minPrice);
      query = (query as any).where(
        or(
          and(
            sql`${products.discountedPrice} IS NOT NULL`,
            gte(products.discountedPrice, minPrice)
          ),
          and(
            or(
              sql`${products.discountedPrice} IS NULL`,
              eq(products.discountedPrice, 0)
            ),
            gte(products.price, minPrice)
          )
        )
      );
    }

    if (options.maxPrice !== undefined && options.maxPrice !== null) {
      const maxPrice = Number(options.maxPrice);
      query = (query as any).where(
        or(
          and(
            sql`${products.discountedPrice} IS NOT NULL`,
            lte(products.discountedPrice, maxPrice)
          ),
          and(
            or(
              sql`${products.discountedPrice} IS NULL`,
              eq(products.discountedPrice, 0)
            ),
            lte(products.price, maxPrice)
          )
        )
      );
    }

    if (options.sortBy) {
      if (options.sortBy === 'price_asc') {
        query = (query as any).orderBy(products.price);
      } else if (options.sortBy === 'price_desc') {
        query = (query as any).orderBy(desc(products.price));
      } else if (options.sortBy === 'newest') {
        query = (query as any).orderBy(desc(products.createdAt));
      }
    }

    if (options.limit) {
      query = (query as any).limit(options.limit);
    }

    return await query;
  }

  async getProductsByCategorySlug(slug: string, options: {
    minPrice?: number,
    maxPrice?: number,
    sortBy?: string,
    promotion?: boolean,
    limit?: number
  } = {}): Promise<Product[]> {
    const [category] = await db.select().from(categories).where(eq(categories.slug, slug));

    if (!category) {
      return [];
    }

    let query = db.select()
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          eq(products.category, category.name)
        )
      );

    if (options.minPrice !== undefined && options.minPrice !== null) {
      const minPrice = Number(options.minPrice);
      query = (query as any).where(
        or(
          and(
            sql`${products.discountedPrice} IS NOT NULL`,
            gte(products.discountedPrice, minPrice)
          ),
          and(
            or(
              sql`${products.discountedPrice} IS NULL`,
              eq(products.discountedPrice, 0)
            ),
            gte(products.price, minPrice)
          )
        )
      );
    }

    if (options.maxPrice !== undefined && options.maxPrice !== null) {
      const maxPrice = Number(options.maxPrice);
      query = (query as any).where(
        or(
          and(
            sql`${products.discountedPrice} IS NOT NULL`,
            lte(products.discountedPrice, maxPrice)
          ),
          and(
            or(
              sql`${products.discountedPrice} IS NULL`,
              eq(products.discountedPrice, 0)
            ),
            lte(products.price, maxPrice)
          )
        )
      );
    }

    if (options.sortBy) {
      if (options.sortBy === 'price_asc') {
        query = (query as any).orderBy(products.price);
      } else if (options.sortBy === 'price_desc') {
        query = (query as any).orderBy(desc(products.price));
      } else if (options.sortBy === 'newest') {
        query = (query as any).orderBy(desc(products.createdAt));
      } else {
        query = (query as any).orderBy(desc(products.id));
      }
    } else {
      query = (query as any).orderBy(desc(products.createdAt));
    }

    if (options.limit) {
      query = (query as any).limit(options.limit);
    }

    return await query;
  }

  async getProductsByStore(storeId: number): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.storeId, storeId));
  }

  async getStoresProducts(storeIds: number[]): Promise<Product[]> {
    if (!storeIds || storeIds.length === 0) {
      return [];
    }

    try {
      const result = await db.select()
        .from(products)
        .where(inArray(products.storeId, storeIds));
      return result;
    } catch (error) {
      console.error('Erro ao buscar produtos das lojas:', error);
      return [];
    }
  }

  async getRelatedProducts(productId: number, limit: number = 4): Promise<Product[]> {
    const product = await this.getProduct(productId);
    if (!product) return [];

    return await db.select()
      .from(products)
      .where(
        and(
          eq(products.category, product.category),
          sql`${products.id} != ${productId}`
        )
      )
      .limit(limit);
  }

  async getFeaturedProducts(limit: number = 8): Promise<Product[]> {
    return await db.select()
      .from(products)
      .where(sql`discounted_price IS NOT NULL`)
      .orderBy(sql`created_at DESC`)
      .limit(limit);
  }

  async createProduct(productData: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(productData).returning();
    return product;
  }

  async updateProduct(id: number, productData: Partial<Product>): Promise<Product | undefined> {
    const [updatedProduct] = await db
      .update(products)
      .set(productData)
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  // ===== PROMOTION OPERATIONS =====
  async getPromotion(id: number): Promise<Promotion | undefined> {
    const [promotion] = await db.select().from(promotions).where(eq(promotions.id, id));
    return promotion;
  }

  async getPromotions(type?: string, limit?: number): Promise<Promotion[]> {
    let query = db.select().from(promotions);

    if (type) {
      query = (query as any).where(eq(promotions.type, type as any));
    }

    if (limit) {
      query = (query as any).limit(limit);
    }

    return await query;
  }

  async getPromotionsByStore(storeId: number): Promise<Promotion[]> {
    const allPromotions = await this.getPromotions();
    const storeProducts = await this.getProductsByStore(storeId);
    const storeProductIds = storeProducts.map(p => p.id);

    return allPromotions.filter(promo => 
      storeProductIds.includes(promo.productId)
    );
  }

  async getProductsPromotions(productIds: number[]): Promise<Promotion[]> {
    if (!productIds || productIds.length === 0) {
      return [];
    }

    try {
      const result = await db.select()
        .from(promotions)
        .where(inArray(promotions.productId, productIds));
      return result;
    } catch (error) {
      console.error('Erro ao buscar promoções dos produtos:', error);
      return [];
    }
  }

  async createPromotion(promotionData: InsertPromotion): Promise<Promotion> {
    const [promotion] = await db.insert(promotions).values(promotionData as any).returning();
    return promotion;
  }

  async updatePromotion(id: number, promotionData: Partial<Promotion>): Promise<Promotion | undefined> {
    try {
      const existingPromotion = await this.getPromotion(id);
      if (!existingPromotion) {
        throw new Error('Promotion not found');
      }

      let type = promotionData.type || existingPromotion.type;
      let discountPercentage = promotionData.discountPercentage !== undefined 
        ? promotionData.discountPercentage 
        : existingPromotion.discountPercentage;
      let discountAmount = (promotionData as any).discountAmount !== undefined
      ? (promotionData as any).discountAmount
      : (existingPromotion as any).discountAmount;

      let startTime = promotionData.startTime 
        ? typeof promotionData.startTime === 'string' 
          ? promotionData.startTime 
          : new Date(promotionData.startTime).toISOString()
        : existingPromotion.startTime;

      let endTime = promotionData.endTime 
        ? typeof promotionData.endTime === 'string' 
          ? promotionData.endTime 
          : new Date(promotionData.endTime).toISOString()
        : existingPromotion.endTime;

      const query = `
        UPDATE promotions 
        SET 
          type = $1,
          "discountPercentage" = $2,
          "discountAmount" = $3,
          "startTime" = $4::timestamp,
          "endTime" = $5::timestamp,
          "updatedAt" = NOW()
        WHERE id = $6
        RETURNING *;
      `;

      const values = [type, discountPercentage, discountAmount, startTime, endTime, id];
      const result = await pool.query(query, values);

      if (!result.rows || result.rows.length === 0) {
        return undefined;
      }

      return result.rows[0] as Promotion;
    } catch (error) {
      console.error('[Storage] Error updating promotion:', error);
      throw error;
    }
  }

  // ===== COUPON OPERATIONS =====
  async getCoupon(id: number): Promise<Coupon | undefined> {
    const [coupon] = await db.select().from(coupons).where(eq(coupons.id, id));
    return coupon;
  }

  async getCoupons(search?: string, limit?: number): Promise<Coupon[]> {
    try {
      let query = db.select()
        .from(coupons)
        .innerJoin(stores, eq(coupons.storeId, stores.id))
        .where(eq(coupons.isActive, true));

      if (search) {
        query = (query as any).where(
          and(
            eq(coupons.isActive, true),
            or(
              like(coupons.code, `%${search}%`),
              like(coupons.description, `%${search}%`)
            )
          )
        );
      }

      if (limit) {
        query = (query as any).limit(limit);
      }

      query = (query as any).orderBy(desc(coupons.createdAt));
      const results = await query;

      return results.map(result => ({
        ...result.coupons,
        store: {
          id: result.stores.id,
          name: result.stores.name,
          images: (result.stores as any).images || []
        }
      }));

    } catch (error) {
      console.error('[Storage] Error getting coupons:', error);
      return [];
    }
  }

  async getCouponsByStore(storeId: number): Promise<Coupon[]> {
    return await db.select().from(coupons).where(eq(coupons.storeId, storeId));
  }

  async createCoupon(couponData: InsertCoupon): Promise<Coupon> {
    const [coupon] = await db.insert(coupons).values(couponData as any).returning();
    return coupon;
  }

  async updateCoupon(id: number, data: Partial<InsertCoupon>): Promise<Coupon | null> {
    try {
      console.log(`[Storage] Updating coupon ${id} with data:`, data);

      // Filtrar dados undefined e garantir que datas sejam objetos Date válidos
      const updateData: any = {};

      Object.keys(data).forEach(key => {
        const value = (data as any)[key];
        if (value !== undefined) {
          // Se for um campo de data, garantir que é um objeto Date válido
          if ((key === 'startTime' || key === 'endTime') && value) {
            let dateValue: Date;

            if (value instanceof Date) {
              dateValue = value;
            } else {
              // Converter string para Date diretamente
              dateValue = new Date(value);
            }

            if (!isNaN(dateValue.getTime())) {
              updateData[key] = dateValue;
              console.log(`[Storage] Date ${key}: ${value} -> ${dateValue.toISOString()}`);
            } else {
              console.warn(`[Storage] Invalid date for ${key}: ${value}`);
            }
          } else {
            updateData[key] = value;
          }
        }
      });

      console.log(`[Storage] Processed update data:`, updateData);

      const [updatedCoupon] = await db.update(coupons)
        .set(updateData)
        .where(eq(coupons.id, id))
        .returning();

      if (!updatedCoupon) {
        console.log(`[Storage] Coupon ${id} not found for update`);
        return null;
      }

      console.log(`[Storage] Successfully updated coupon ${id}`);
      return updatedCoupon;
    } catch (error) {
      console.error(`[Storage] Error updating coupon ${id}:`, error);
      throw error;
    }
  }

  async validateCouponCode(storeId: number, code: string): Promise<Coupon | null> {
    try {
      const results = await db.select()
        .from(coupons)
        .innerJoin(stores, eq(coupons.storeId, stores.id))
        .where(
          and(
            eq(coupons.storeId, storeId),
            eq(coupons.code, code),
            eq(coupons.isActive, true)
          )
        );

      if (results.length === 0) return null;

      const result = results[0];
      const now = new Date();
      const startTime = new Date(result.coupons.startTime);
      const endTime = new Date(result.coupons.endTime);

      if (now < startTime || now > endTime) {
        return null;
      }

      if (result.coupons.maxUsageCount) {
        const currentUsage = Number(result.coupons.usageCount) || 0;
        const maxUsage = Number(result.coupons.maxUsageCount) || 0;
        if (currentUsage >= maxUsage) {
          return null;
        }
      }

      return {
        ...(result.coupons as any),
        store: {
          id: result.stores.id,
          name: result.stores.name,
          images: (result.stores as any).images
        }
      };

    } catch (error) {
      console.error('[Storage] Error validating coupon code:', error);
      return null;
    }
  }

  async getSellerCoupons(userId: number): Promise<Coupon[]> {
    try {
      const results = await db.select()
        .from(coupons)
        .innerJoin(stores, eq(coupons.storeId, stores.id))
        .where(eq(stores.userId, userId))
        .orderBy(desc(coupons.createdAt));

      return results.map(result => ({
        ...result.coupons,
        store: {
          id: result.stores.id,
          name: result.stores.name,
          images: (result.stores as any).images
        }
      }));

    } catch (error) {
      console.error(`[Storage] Error getting seller coupons for user ${userId}:`, error);
      return [];
    }
  }

  async getCouponMetrics(storeId: number, startDate?: Date, endDate?: Date): Promise<{
    totalCoupons: number;
    activeCoupons: number;
    usedCoupons: number;
    totalUsage: number;
    conversionRate: number;
  }> {
    try {
      let query = db.select({
        id: coupons.id,
        isActive: coupons.isActive,
        usageCount: coupons.usageCount,
        maxUsageCount: coupons.maxUsageCount,
        createdAt: coupons.createdAt
      })
      .from(coupons)
      .where(eq(coupons.storeId, storeId));

      if (startDate) {
        query = (query as any).where(
          and(
            eq(coupons.storeId, storeId),
            gte(coupons.createdAt, startDate)
          )
        );
      }

      if (endDate) {
        query = (query as any).where(
          and(
            eq(coupons.storeId, storeId),
            lte(coupons.createdAt, endDate)
          )
        );
      }

      const results = await query;
       let totalCoupons = results.length;
       let activeCoupons = 0;
       let usedCoupons = 0;
       let totalUsage = 0;
       results.forEach(coupon => {
         if (coupon.isActive) {
           activeCoupons++;
         }
         const usageCount = Number(coupon.usageCount) || 0;
         if (usageCount > 0) {
           usedCoupons++;
           totalUsage += usageCount;
         }
       });

      const conversionRate = totalCoupons > 0 ? (usedCoupons / totalCoupons) * 100 : 0;

      return {
        totalCoupons,
        activeCoupons,
        usedCoupons,
        totalUsage,
        conversionRate: Math.round(conversionRate * 100) / 100
      };

    } catch (error) {
      console.error(`[Storage] Error getting coupon metrics for store ${storeId}:`, error);
      return {
        totalCoupons: 0,
        activeCoupons: 0,
        usedCoupons: 0,
        totalUsage: 0,
        conversionRate: 0
      };
    }
  }

  // ===== COUPON REDEMPTION OPERATIONS =====
  async redeemCoupon(couponId: number, customerData: { name?: string, phone?: string }): Promise<{ validationCode: string; redemption: CouponRedemption }> {
    try {
      // Verificar se cupom existe e está ativo
      const coupon = await this.getCoupon(couponId);
      if (!coupon || !coupon.isActive) {
        throw new Error('Cupom não encontrado ou inativo');
      }

      // Verificar se está no período válido
      const now = new Date();
      const startTime = new Date(coupon.startTime);
      const endTime = new Date(coupon.endTime);

      if (now < startTime || now > endTime) {
        throw new Error('Cupom fora do período de validade');
      }

      // Verificar limites de uso
      if (coupon.maxUsageCount) {
        const currentUsage = Number(coupon.usageCount) || 0;
        const maxUsage = Number(coupon.maxUsageCount) || 0;
        if (currentUsage >= maxUsage) {
          throw new Error('Cupom esgotado');
        }
      }

      // Gerar código de validação único (com retry para evitar duplicatas)
      let validationCode: string;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        validationCode = 'VAL-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        attempts++;

        if (attempts > maxAttempts) {
          throw new Error('Erro ao gerar código único. Tente novamente.');
        }

        // Verificar se o código já existe
        const existingResult = await pool.query(
          'SELECT id FROM coupon_redemptions WHERE validation_code = $1',
          [validationCode]
        );

        if (existingResult.rows.length === 0) {
          break; // Código é único
        }
      } while (attempts <= maxAttempts);

      // Criar resgate usando ORM
      const [redemption] = await db.insert(couponRedemptions).values({
        couponId,
        validationCode,
        customerName: customerData.name,
        customerPhone: customerData.phone
      }).returning();

      console.log('Cupom resgatado com sucesso:', {
        couponId,
        validationCode,
        customer: customerData.name
      });

      return { validationCode, redemption };

    } catch (error: any) {
      console.error('Erro ao resgatar cupom:', error);
      throw error;
    }
  }

  async validateRedemptionCode(validationCode: string, storeUserId: number): Promise<{ success: boolean; coupon?: any; message: string }> {
    try {
      // Buscar resgate com JOIN para obter dados completos
      const result = await pool.query(`
        SELECT 
          cr.id as redemption_id,
          cr.validation_code,
          cr.customer_name,
          cr.customer_phone,
          cr.redeemed_at,
          cr.used_at,
          c.id as coupon_id,
          c.code as coupon_code,
          c.description as coupon_description,
          c.discount_percentage,
          c.discount_amount,
          c.usage_count,
          c.max_usage_count,
          c.end_time,
          s.id as store_id,
          s.name as store_name,
          s.user_id as store_user_id
        FROM coupon_redemptions cr
        INNER JOIN coupons c ON cr.coupon_id = c.id
        INNER JOIN stores s ON c.store_id = s.id
        WHERE cr.validation_code = $1 
          AND cr.used_at IS NULL 
          AND s.user_id = $2
          AND c.is_active = true
      `, [validationCode, storeUserId]);

      if (result.rows.length === 0) {
        return { 
          success: false, 
          message: 'Código de validação inválido.' 
        };
      }

      const redemption = result.rows[0];

      // Verificar se o cupom ainda está no período válido
      const now = new Date();
      const endTime = new Date(redemption.end_time);

      if (now > endTime) {
        return { 
          success: false, 
          message: 'Cupom expirado' 
        };
      }

      // Marcar como usado - Usar transação para garantir consistência
      await pool.query('BEGIN');

      try {
        // Marcar redemption como usado
        await pool.query(`
          UPDATE coupon_redemptions 
          SET used_at = NOW(), used_by_store_user_id = $1 
          WHERE id = $2
        `, [storeUserId, redemption.redemption_id]);

        // Incrementar contador do cupom
        await pool.query(`
          UPDATE coupons 
          SET usage_count = usage_count + 1 
          WHERE id = $1
        `, [redemption.coupon_id]);

        await pool.query('COMMIT');

        console.log('Cupom validado com sucesso:', {
          validationCode,
          couponId: redemption.coupon_id,
          storeUserId
        });

        return { 
          success: true, 
          coupon: {
            id: redemption.coupon_id,
            code: redemption.coupon_code,
            description: redemption.coupon_description,
            discountPercentage: redemption.discount_percentage,
            discountAmount: redemption.discount_amount,
            store: {
              id: redemption.store_id,
              name: redemption.store_name
            }
          },
          message: 'Cupom validado com sucesso!' 
        };

      } catch (transactionError) {
        await pool.query('ROLLBACK');
        throw transactionError;
      }

    } catch (error: any) {
      console.error('Erro ao validar cupom:', error);
      return { success: false, message: 'Erro interno ao validar cupom' };
    }
  }

  async getPendingRedemptions(storeId: number): Promise<CouponRedemption[]> {
    try {
      const result = await pool.query(`
        SELECT 
          cr.*,
          c.code,
          c.description,
          c.discount_percentage,
          c.discount_amount
        FROM coupon_redemptions cr
        INNER JOIN coupons c ON cr.coupon_id = c.id
        WHERE c.store_id = $1 AND cr.used_at IS NULL
        ORDER BY cr.redeemed_at DESC
      `, [storeId]);

      return result.rows.map((row: any) => ({
        ...row,
        coupon: {
          code: row.code,
          description: row.description,
          discountPercentage: row.discount_percentage,
          discountAmount: row.discount_amount
        }
      }));
    } catch (error) {
      console.error('[Storage] Error getting pending redemptions:', error);
      return [];
    }
  }



  async getRedemptionHistory(storeId: number): Promise<CouponRedemption[]> {
    try {
      const result = await pool.query(`
        SELECT 
          cr.*,
          c.code,
          c.description,
          c.discount_percentage,
          c.discount_amount
        FROM coupon_redemptions cr
        INNER JOIN coupons c ON cr.coupon_id = c.id
        WHERE c.store_id = $1
        ORDER BY cr.redeemed_at DESC
      `, [storeId]);

      return result.rows.map((row: any) => ({
        ...row,
        coupon: {
          code: row.code,
          description: row.description,
          discountPercentage: row.discount_percentage,
          discountAmount: row.discount_amount
        }
      }));
    } catch (error) {
      console.error('[Storage] Error getting redemption history:', error);
      return [];
    }
  }

  // ===== WISHLIST OPERATIONS =====
  async getWishlistItems(userId: number): Promise<Wishlist[]> {
    return await db.select().from(wishlists).where(eq(wishlists.userId, userId));
  }

  async addToWishlist(userId: number, productId: number): Promise<Wishlist> {
    const [existing] = await db.select()
      .from(wishlists)
      .where(
        and(
          eq(wishlists.userId, userId),
          eq(wishlists.productId, productId)
        )
      );

    if (existing) return existing;

    const [wishlistItem] = await db.insert(wishlists)
      .values({ userId, productId })
      .returning();
    return wishlistItem;
  }

  async removeFromWishlist(userId: number, productId: number): Promise<boolean> {
    await db.delete(wishlists)
      .where(
        and(
          eq(wishlists.userId, userId),
          eq(wishlists.productId, productId)
        )
      );
    return true;
  }

  // ===== FAVORITE STORE OPERATIONS =====
  async getFavoriteStores(userId: number): Promise<FavoriteStore[]> {
    return await db.select().from(favoriteStores).where(eq(favoriteStores.userId, userId));
  }

  async addFavoriteStore(userId: number, storeId: number): Promise<FavoriteStore> {
    const [existing] = await db.select()
      .from(favoriteStores)
      .where(
        and(
          eq(favoriteStores.userId, userId),
          eq(favoriteStores.storeId, storeId)
        )
      );

    if (existing) return existing;

    const [favoriteStore] = await db.insert(favoriteStores)
      .values({ userId, storeId })
      .returning();
    return favoriteStore;
  }

  async removeFavoriteStore(userId: number, storeId: number): Promise<boolean> {
    await db.delete(favoriteStores)
      .where(
        and(
          eq(favoriteStores.userId, userId),
          eq(favoriteStores.storeId, storeId)
        )
      );
    return true;
  }

  // ===== RESERVATION OPERATIONS =====
  async getReservation(id: number): Promise<Reservation | undefined> {
    const [reservation] = await db.select().from(reservations).where(eq(reservations.id, id));
    return reservation;
  }

  async getReservations(userId: number, limit?: number): Promise<Reservation[]> {
    let query = db.select().from(reservations).where(eq(reservations.userId, userId));

    if (limit) {
      query = (query as any).limit(limit);

    }

    return await query;
  }

  async createReservation(userId: number, productId: number, quantity: number = 1): Promise<Reservation> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const [reservation] = await db.insert(reservations)
      .values({
        userId,
        productId,
        quantity,
        status: 'pending',
        expiresAt
      })
      .returning();
    return reservation;
  }

  async updateReservationStatus(id: number, status: 'pending' | 'completed' | 'expired' | 'cancelled'): Promise<Reservation | undefined> {
    const [updatedReservation] = await db
      .update(reservations)
      .set({ status })
      .where(eq(reservations.id, id))
      .returning();
    return updatedReservation;
  }

  // ===== CATEGORY OPERATIONS =====
  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.slug, slug));
    return category;
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(categoryData: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(categoryData).returning();
    return category;
  }

  // ===== BANNER OPERATIONS =====
  async getBanner(id: number): Promise<Banner | undefined> {
    const [banner] = await db.select().from(banners).where(eq(banners.id, id));
    return banner;
  }

  async getBanners(isActive: boolean = true): Promise<Banner[]> {
    return await db.select().from(banners).where(eq(banners.isActive, isActive));
  }

  async createBanner(bannerData: InsertBanner): Promise<Banner> {
    const [banner] = await db.insert(banners).values(bannerData).returning();
    return banner;
  }

  async updateBanner(id: number, bannerData: Partial<Banner>): Promise<Banner | undefined> {
    const [updatedBanner] = await db
      .update(banners)
      .set(bannerData)
      .where(eq(banners.id, id))
      .returning();
    return updatedBanner;
  }

  // ===== STORE ANALYTICS OPERATIONS =====
  async recordStoreImpression(storeId: number): Promise<StoreImpression> {
    const [impression] = await db.insert(storeImpressions)
      .values({
        storeId,
        date: new Date()
      })
      .returning();
    return impression;
  }

  async getStoreImpressions(storeId: number, startDate?: Date, endDate?: Date): Promise<StoreImpression[]> {
    let query = db.select().from(storeImpressions).where(eq(storeImpressions.storeId, storeId));

    if (startDate) {
      query = (query as any).where(gte(storeImpressions.date, startDate));
    }

    if (endDate) {
      query = (query as any).where(lte(storeImpressions.date, endDate));
    }

    return await query;
  }

  // ===== USER STATISTICS =====
  async getUserStats(userId: number): Promise<{
    wishlistCount: number;
    reservationsCount: number;
    favoriteStoresCount: number;
  }> {
    const wishlistItems = await db.select().from(wishlists).where(eq(wishlists.userId, userId));
    const userReservations = await db.select().from(reservations).where(eq(reservations.userId, userId));
    const userFavoriteStores = await db.select().from(favoriteStores).where(eq(favoriteStores.userId, userId));

    return {
      wishlistCount: wishlistItems.length,
      reservationsCount: userReservations.length,
      favoriteStoresCount: userFavoriteStores.length
    };
  }

  // ===== PASSWORD RESET OPERATIONS =====
  async createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
      used: false
    });
  }

  async getPasswordResetToken(token: string): Promise<{ userId: number; expiresAt: Date; used: boolean } | undefined> {
    const [resetToken] = await db.select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          eq(passwordResetTokens.used, false),
          gte(passwordResetTokens.expiresAt, new Date())
        )
      );

    if (!resetToken) return undefined;

    return {
      userId: resetToken.userId,
      expiresAt: resetToken.expiresAt,
      used: resetToken.used || false
    };
  }

  async markTokenAsUsed(token: string): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<boolean> {
    try {
      await db.update(users)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      return true;
    } catch (error) {
      console.error('Error updating user password:', error);
      return false;
    }
  }
}

// ===== MEMSTORAGE CLASS (Para desenvolvimento/testes) =====
export class MemStorage implements IStorage {
  // Implementação simplificada para desenvolvimento
  async getUser(id: number): Promise<User | undefined> {
    throw new Error('MemStorage - use DatabaseStorage for production');
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    throw new Error('MemStorage - use DatabaseStorage for production');
  }

  async createUser(userData: InsertUser): Promise<User> {
    throw new Error('MemStorage - use DatabaseStorage for production');
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    throw new Error('MemStorage - use DatabaseStorage for production');
  }

  async updateUserAvatar(userId: number, avatarUrl: string, avatarThumbnailUrl: string): Promise<User> {
    throw new Error('MemStorage - use DatabaseStorage for production');
  }

  async verifyUserPassword(id: number, password: string): Promise<boolean> {
    throw new Error('MemStorage - use DatabaseStorage for production');
  }

  async getStore(id: number): Promise<Store | undefined> {
    throw new Error('MemStorage - use DatabaseStorage for production');
  }

  async getStores(options?: any): Promise<Store[]> {
    throw new Error('MemStorage - use DatabaseStorage for production');
  }

  async getStoresByUserId(userId: number): Promise<Store[]> {
    throw new Error('MemStorage - use DatabaseStorage for production');
  }

  async getUserStores(userId: number): Promise<Store[]> {
    return this.getStoresByUserId(userId);
  }

  async getNearbyStores(lat: number, lng: number, radius?: number): Promise<Store[]> {
    throw new Error('MemStorage - use DatabaseStorage for production');
  }

  async createStore(storeData: InsertStore): Promise<Store> {
    throw new Error('MemStorage - use DatabaseStorage for production');
  }

  async updateStore(id: number, storeData: Partial<Store>): Promise<Store | undefined> {
    throw new Error('MemStorage - use DatabaseStorage for production');
  }

  // Product operations stubs
  async getProduct(id: number): Promise<Product | undefined> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getProducts(options?: any): Promise<Product[]> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getProductsByCategorySlug(slug: string, options?: any): Promise<Product[]> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getProductsByStore(storeId: number): Promise<Product[]> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getStoresProducts(storeIds: number[]): Promise<Product[]> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getRelatedProducts(productId: number, limit?: number): Promise<Product[]> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getFeaturedProducts(limit?: number): Promise<Product[]> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async createProduct(product: InsertProduct): Promise<Product> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  // Promotion operations stubs
  async getPromotion(id: number): Promise<Promotion | undefined> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getPromotions(type?: string, limit?: number): Promise<Promotion[]> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getPromotionsByStore(storeId: number): Promise<Promotion[]> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getProductsPromotions(productIds: number[]): Promise<Promotion[]> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async createPromotion(promotion: InsertPromotion): Promise<Promotion> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async updatePromotion(id: number, promotion: Partial<Promotion>): Promise<Promotion | undefined> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  // Coupon operations stubs
  async getCoupon(id: number): Promise<Coupon | undefined> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getCoupons(search?: string, limit?: number): Promise<Coupon[]> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getCouponsByStore(storeId: number): Promise<Coupon[]> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async createCoupon(coupon: InsertCoupon): Promise<Coupon> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

    async updateCoupon(id: number, data: Partial<InsertCoupon>): Promise<Coupon | null> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async validateCouponCode(storeId: number, code: string): Promise<Coupon | null> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getSellerCoupons(userId: number): Promise<Coupon[]> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getCouponMetrics(storeId: number, startDate?: Date, endDate?: Date): Promise<any> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  // Coupon redemption operations (not implemented in MemStorage)
    async redeemCoupon(couponId: number, customerData: { name?: string, phone?: string }): Promise<{ validationCode: string; redemption: CouponRedemption }> {
    throw new Error('Coupon redemption not implemented in memory storage - use DatabaseStorage for production');
  }

  async validateRedemptionCode(validationCode: string, storeUserId: number): Promise<{ success: boolean; coupon?: any; message: string }> {
    throw new Error('Coupon validation not implemented in memory storage - use DatabaseStorage for production');
  }

  async getPendingRedemptions(storeId: number) {
    return [];
  }

  async getRedemptionHistory(storeId: number) {
    return [];
  }

  // Other operations stubs
  async getWishlistItems(userId: number): Promise<Wishlist[]> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async addToWishlist(userId: number, productId: number): Promise<Wishlist> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async removeFromWishlist(userId: number, productId: number): Promise<boolean> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getFavoriteStores(userId: number): Promise<FavoriteStore[]> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async addFavoriteStore(userId: number, storeId: number): Promise<FavoriteStore> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async removeFavoriteStore(userId: number, storeId: number): Promise<boolean> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getReservation(id: number): Promise<Reservation | undefined> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getReservations(userId: number, limit?: number): Promise<Reservation[]> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async createReservation(userId: number, productId: number, quantity?: number): Promise<Reservation> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async updateReservationStatus(id: number, status: any): Promise<Reservation | undefined> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getCategory(id: number): Promise<Category | undefined> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getCategories(): Promise<Category[]> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async createCategory(category: InsertCategory): Promise<Category> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getBanner(id: number): Promise<Banner | undefined> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getBanners(isActive?: boolean): Promise<Banner[]> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async createBanner(banner: InsertBanner): Promise<Banner> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async updateBanner(id: number, banner: Partial<Banner>): Promise<Banner | undefined> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async recordStoreImpression(storeId: number): Promise<StoreImpression> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getStoreImpressions(storeId: number, startDate?: Date, endDate?: Date): Promise<StoreImpression[]> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getUserStats(userId: number): Promise<any> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<void> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async getPasswordResetToken(token: string): Promise<any> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async markTokenAsUsed(token: string): Promise<void> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<boolean> { 
    throw new Error('MemStorage - use DatabaseStorage for production'); 
  }
}

// ===== EXPORT PRINCIPAL =====
export const storage = new DatabaseStorage();