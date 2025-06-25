import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Definindo interfaces para estruturas complexas
export interface StoreAddress {
  street: string;
  city: string;
  state: string;
  zipCode?: string;
  neighborhood?: string;
  number?: string;
  complement?: string;
}

export interface StoreLocation {
  latitude: number;
  longitude: number;
  place_id?: string;
}

// Interface para notificações de trial
export interface TrialNotifications {
  day7?: boolean;
  day12?: boolean;
  day14?: boolean;
  day15?: boolean;
}

// Users schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender").$type<"male" | "female" | "not_specified">(),
  role: text("role").$type<"customer" | "seller" | "admin">().notNull().default("customer"),
  avatarUrl: text("avatar_url"),
  avatarThumbnailUrl: text("avatar_thumbnail_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  avatarUrl: true,
  avatarThumbnailUrl: true
});

// Stores schema - ATUALIZADO COM CAMPOS DE TRIAL E DESTAQUES
export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  tags: text("tags", { mode: 'array' }),
  rating: doublePrecision("rating").default(0),
  reviewCount: integer("review_count").default(0),
  isOpen: boolean("is_open").default(true),
  address: jsonb("address").$type<StoreAddress | null>(),
  location: jsonb("location").$type<StoreLocation | null>(),
  place_id: text("place_id"),
  subscriptionPlan: text("subscription_plan").$type<"freemium" | "start" | "pro" | "premium">().default("freemium").notNull(),
  subscriptionEndDate: timestamp("subscription_end_date", { mode: 'string' }),
  subscriptionStatus: text("subscription_status").default("active").notNull(),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  subscriptionStartDate: timestamp("subscription_start_date", { mode: 'string' }),

  // ✅ NOVOS CAMPOS DE TRIAL
  trialStartDate: timestamp("trial_start_date", { mode: 'string' }),
  trialEndDate: timestamp("trial_end_date", { mode: 'string' }),
  isInTrial: boolean("is_in_trial").default(false),
  trialNotificationsSent: jsonb("trial_notifications_sent").$type<TrialNotifications>().default({}),

  // ✅ NOVOS CAMPOS DE SISTEMA DE DESTAQUES
  highlightWeight: integer("highlight_weight").default(0), // Peso para algoritmo de destaques
  lastHighlightedAt: timestamp("last_highlighted_at", { mode: 'string' }),
  totalHighlightImpressions: integer("total_highlight_impressions").default(0),

  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull()
});

export const insertStoreSchema = createInsertSchema(stores, {
  // Validações customizadas se necessário
}).extend({
  // Override tags field to accept array of strings
  tags: z.array(z.string()).default([]),
  // Allow categories as array for frontend compatibility
  categories: z.array(z.string()).optional(),
  // Allow acceptLocationTerms for terms acceptance
  acceptLocationTerms: z.boolean().optional()
});

// Log para diagnóstico do schema
console.log('🔍 [SCHEMA] insertStoreSchema fields:', Object.keys(insertStoreSchema.shape || {}));
console.log('🔍 [SCHEMA] insertStoreSchema structure:', insertStoreSchema.shape);
console.log('🔍 [SCHEMA] Tags field updated to support array:', insertStoreSchema.shape.tags);

// Products schema
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  price: doublePrecision("price").notNull(),
  discountedPrice: doublePrecision("discounted_price"),
  stock: integer("stock").default(0),
  images: text("images").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Promotions schema
export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  type: text("type").$type<"flash" | "regular">().notNull(),
  discountPercentage: integer("discount_percentage").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const insertPromotionSchema = createInsertSchema(promotions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Log do schema para debug
console.log("Schema de validação de promoção:", insertPromotionSchema);

// Coupons schema
export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  code: text("code").notNull(),
  description: text("description"),
  discountAmount: doublePrecision("discount_amount"),
  discountPercentage: integer("discount_percentage"),
  maxUsageCount: integer("max_usage_count"),
  usageCount: integer("usage_count").default(0),
  isActive: boolean("is_active").default(true),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const insertCouponSchema = createInsertSchema(coupons).omit({
  id: true,
  usageCount: true,
  createdAt: true,
  updatedAt: true
});

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;

// Coupon Redemptions table
export const couponRedemptions = pgTable("coupon_redemptions", {
  id: serial("id").primaryKey(),
  couponId: integer("coupon_id").notNull().references(() => coupons.id),
  validationCode: text("validation_code").notNull().unique(),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }).defaultNow().notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  usedByStoreUserId: integer("used_by_store_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const insertCouponRedemptionSchema = createInsertSchema(couponRedemptions).omit({
  id: true,
  createdAt: true
});

export type CouponRedemption = typeof couponRedemptions.$inferSelect;
export type InsertCouponRedemption = z.infer<typeof insertCouponRedemptionSchema>;

// Wishlists schema
export const wishlists = pgTable("wishlists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  productId: integer("product_id").notNull().references(() => products.id),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertWishlistSchema = createInsertSchema(wishlists).omit({
  id: true,
  createdAt: true
});

// FavoriteStores schema
export const favoriteStores = pgTable("favorite_stores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  storeId: integer("store_id").notNull().references(() => stores.id),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertFavoriteStoreSchema = createInsertSchema(favoriteStores).omit({
  id: true,
  createdAt: true
});

// Reservations schema
export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").default(1),
  status: text("status").$type<"pending" | "completed" | "expired" | "cancelled">().default("pending"),
  expiresAt: timestamp("expires_at").notNull(), // +72 hours from creation
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const insertReservationSchema = createInsertSchema(reservations).omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true
});

// Categories schema
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon").notNull(),
  parentId: integer("parent_id").references(() => categories.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Banners schema
export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  buttonText: text("button_text"),
  buttonLink: text("button_link"),
  couponCode: text("coupon_code"),
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const insertBannerSchema = createInsertSchema(banners).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// StoreImpressions schema - for analytics
export const storeImpressions = pgTable("store_impressions", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  date: timestamp("date").defaultNow().notNull(),
  count: integer("count").default(1)
});

export const insertStoreImpressionSchema = createInsertSchema(storeImpressions).omit({
  id: true
});

// ✅ NOVA TABELA: Impressões de Destaques  
export const highlightImpressions = pgTable("highlight_impressions", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  productId: integer("product_id").references(() => products.id), // Opcional - pode ser destaque da loja
  section: text("section").notNull(), // "home_premium", "category_discover", etc.
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  userId: integer("user_id"), // Para analytics futuras  
  ipAddress: text("ip_address") // Para prevenção de spam
}, (table) => {
  return {
    storeIdIdx: index("highlight_impressions_store_id_idx").on(table.storeId),
    timestampIdx: index("highlight_impressions_timestamp_idx").on(table.timestamp),
    sectionIdx: index("highlight_impressions_section_idx").on(table.section)
  };
});

export const insertHighlightImpressionSchema = createInsertSchema(highlightImpressions).omit({
  id: true,
  timestamp: true
});

// ✅ NOVA TABELA: Configurações de Destaque por Plano
export const highlightConfigurations = pgTable("highlight_configurations", {
  id: serial("id").primaryKey(),
  planType: text("plan_type").notNull().unique(), // "freemium", "start", "pro", "premium", "trial"
  weight: integer("weight").default(0), // Peso no algoritmo
  impressionPercentage: integer("impression_percentage").default(0), // % das impressões totais
  sections: text("sections", { mode: 'array' }).default([]), // Seções onde pode aparecer
  rotationIntervalHours: integer("rotation_interval_hours").default(6), // Intervalo de rotação
  maxDailyImpressions: integer("max_daily_impressions").default(-1), // -1 = ilimitado
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const insertHighlightConfigurationSchema = createInsertSchema(highlightConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// ✅ CORRIGIDO: Product Images schema - ESTRUTURA REAL DO BANCO
export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  filename: text("filename").notNull(),                    // ✅ Campo real do banco
  thumbnailFilename: text("thumbnail_filename").notNull(), // ✅ Campo real do banco
  isPrimary: boolean("is_primary").default(false),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    productIdIdx: index("product_id_idx").on(table.productId),
    isPrimaryIdx: index("product_images_is_primary_idx").on(table.isPrimary)
  };
});

export const insertProductImageSchema = createInsertSchema(productImages).omit({
  id: true,
  createdAt: true
});

// ✅ CORRIGIDO: Store Images schema - ESTRUTURA REAL DO BANCO
export const storeImages = pgTable("store_images", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").notNull().references(() => stores.id),
  filename: text("filename").notNull(),                    // ✅ Campo real do banco
  thumbnailFilename: text("thumbnail_filename").notNull(), // ✅ Campo real do banco
  isPrimary: boolean("is_primary").default(false),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    storeIdIdx: index("store_id_idx").on(table.storeId),
    isPrimaryIdx: index("store_images_is_primary_idx").on(table.isPrimary)
  };
});

export const insertStoreImageSchema = createInsertSchema(storeImages).omit({
  id: true,
  createdAt: true
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

// Type exports - ATUALIZADOS COM NOVOS SCHEMAS
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type ProductImage = typeof productImages.$inferSelect;
export type InsertProductImage = z.infer<typeof insertProductImageSchema>;

export type StoreImage = typeof storeImages.$inferSelect;
export type InsertStoreImage = z.infer<typeof insertStoreImageSchema>;

export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;

export type Wishlist = typeof wishlists.$inferSelect;
export type InsertWishlist = z.infer<typeof insertWishlistSchema>;

export type FavoriteStore = typeof favoriteStores.$inferSelect;
export type InsertFavoriteStore = z.infer<typeof insertFavoriteStoreSchema>;

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = z.infer<typeof insertReservationSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Banner = typeof banners.$inferSelect;
export type InsertBanner = z.infer<typeof insertBannerSchema>;

export type StoreImpression = typeof storeImpressions.$inferSelect;
export type InsertStoreImpression = z.infer<typeof insertStoreImpressionSchema>;

// ✅ NOVOS TYPES PARA SISTEMA DE DESTAQUES E TRIAL
export type HighlightImpression = typeof highlightImpressions.$inferSelect;
export type InsertHighlightImpression = z.infer<typeof insertHighlightImpressionSchema>;

export type HighlightConfiguration = typeof highlightConfigurations.$inferSelect;
export type InsertHighlightConfiguration = z.infer<typeof insertHighlightConfigurationSchema>;

export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;