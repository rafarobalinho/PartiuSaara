import { 
  users, type User, type InsertUser,
  stores, type Store, type InsertStore,
  products, type Product, type InsertProduct,
  promotions, type Promotion, type InsertPromotion,
  coupons, type Coupon, type InsertCoupon,
  wishlists, type Wishlist, type InsertWishlist,
  favoriteStores, type FavoriteStore, type InsertFavoriteStore,
  reservations, type Reservation, type InsertReservation,
  categories, type Category, type InsertCategory,
  banners, type Banner, type InsertBanner,
  storeImpressions, type StoreImpression, type InsertStoreImpression
} from "@shared/schema";
import bcrypt from 'bcryptjs';
import { eq, and, or, sql, like, desc, gte, lte, inArray } from "drizzle-orm";

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
  getUserStores(userId: number): Promise<Store[]>; // Alias para getStoresByUserId
  getNearbyStores(lat: number, lng: number, radius?: number): Promise<Store[]>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: number, store: Partial<Store>): Promise<Store | undefined>;
  updateStoreStripeInfo(id: number, stripeInfo: {
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    subscriptionPlan?: 'freemium' | 'start' | 'pro' | 'premium';
    subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'unpaid';
    subscriptionStartDate?: Date | null;
    subscriptionEndDate?: Date | null;
  }): Promise<Store | undefined>;
  getStoreByStripeCustomerId(stripeCustomerId: string): Promise<Store | undefined>;
  
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
  getStoresProducts(storeIds: number[]): Promise<Product[]>; // Adicionado: Obter produtos de várias lojas
  getRelatedProducts(productId: number, limit?: number): Promise<Product[]>;
  getFeaturedProducts(limit?: number): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined>;
  
  // Promotion operations
  getPromotion(id: number): Promise<Promotion | undefined>;
  getPromotions(type?: string, limit?: number): Promise<Promotion[]>;
  getPromotionsByStore(storeId: number): Promise<Promotion[]>;
  getProductsPromotions(productIds: number[]): Promise<Promotion[]>; // Adicionado: Obter promoções de vários produtos
  createPromotion(promotion: InsertPromotion): Promise<Promotion>;
  updatePromotion(id: number, promotion: Partial<Promotion>): Promise<Promotion | undefined>;
  
  // Coupon operations
  getCoupon(id: number): Promise<Coupon | undefined>;
  getCoupons(search?: string): Promise<Coupon[]>;
  getCouponsByStore(storeId: number): Promise<Coupon[]>;
  createCoupon(coupon: InsertCoupon): Promise<Coupon>;
  updateCoupon(id: number, coupon: Partial<Coupon>): Promise<Coupon | undefined>;
  
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private stores: Map<number, Store>;
  private products: Map<number, Product>;
  private promotions: Map<number, Promotion>;
  private coupons: Map<number, Coupon>;
  private wishlists: Map<number, Wishlist>;
  private favoriteStores: Map<number, FavoriteStore>;
  private reservations: Map<number, Reservation>;
  private categories: Map<number, Category>;
  private banners: Map<number, Banner>;
  private storeImpressions: Map<number, StoreImpression>;

  private userIdCounter: number = 1;
  private storeIdCounter: number = 1;
  private productIdCounter: number = 1;
  private promotionIdCounter: number = 1;
  private couponIdCounter: number = 1;
  private wishlistIdCounter: number = 1;
  private favoriteStoreIdCounter: number = 1;
  private reservationIdCounter: number = 1;
  private categoryIdCounter: number = 1;
  private bannerIdCounter: number = 1;
  private storeImpressionIdCounter: number = 1;

  constructor() {
    this.users = new Map();
    this.stores = new Map();
    this.products = new Map();
    this.promotions = new Map();
    this.coupons = new Map();
    this.wishlists = new Map();
    this.favoriteStores = new Map();
    this.reservations = new Map();
    this.categories = new Map();
    this.banners = new Map();
    this.storeImpressions = new Map();
    
    // Initialize some default data
    this.initializeData();
  }

  private initializeData() {
    // Add some default categories
    const categoryData: InsertCategory[] = [
      { name: 'Moda', slug: 'moda', icon: 'fas fa-tshirt' },
      { name: 'Eletrônicos', slug: 'eletronicos', icon: 'fas fa-mobile-alt' },
      { name: 'Acessórios', slug: 'acessorios', icon: 'fas fa-gem' },
      { name: 'Casa', slug: 'casa', icon: 'fas fa-home' },
      { name: 'Calçados', slug: 'calcados', icon: 'fas fa-shoe-prints' },
      { name: 'Infantil', slug: 'infantil', icon: 'fas fa-child' },
      { name: 'Lojas', slug: 'lojas', icon: 'fas fa-map-marker-alt' },
      { name: 'Cupons', slug: 'cupons', icon: 'fas fa-percent' }
    ];
    
    categoryData.forEach(category => this.createCategory(category));
    
    // Add default banners
    const bannerData: InsertBanner[] = [
      {
        title: 'Semana de Ofertas',
        description: 'Economize até 50% em produtos selecionados nas melhores lojas do Saara!',
        imageUrl: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
        buttonText: 'Ver Ofertas',
        buttonLink: '/products',
        couponCode: 'PROMO50',
        isActive: true
      },
      {
        title: 'Desconto em Eletrônicos',
        description: 'Gadgets, acessórios e smartphones com descontos imperdíveis!',
        imageUrl: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
        buttonText: 'Conferir Agora',
        buttonLink: '/categories/eletronicos',
        couponCode: 'TECH30',
        isActive: true
      },
      {
        title: 'Moda Feminina',
        description: 'As melhores tendências da estação em promoção especial',
        imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
        buttonText: 'Comprar',
        buttonLink: '/categories/moda',
        couponCode: 'MODA25',
        isActive: true
      }
    ];
    
    bannerData.forEach(banner => this.createBanner(banner));

    // Add some default stores
    const storeData: InsertStore[] = [
      {
        name: 'Moda Express',
        description: 'Sua loja de roupas e acessórios com os melhores preços do Saara',
        category: 'Moda',
        location: JSON.stringify({ lat: -22.9035, lng: -43.1808 }),
        address: JSON.stringify({ 
          street: 'Rua Senhor dos Passos', 
          number: '123', 
          neighborhood: 'Centro', 
          city: 'Rio de Janeiro', 
          state: 'RJ', 
          zipCode: '20021-120' 
        }),
        images: ['https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80'],
        subscriptionPlan: 'premium'
      },
      {
        name: 'Tech House',
        description: 'Os melhores gadgets e produtos tecnológicos do mercado',
        category: 'Eletrônicos',
        location: JSON.stringify({ lat: -22.9042, lng: -43.1795 }),
        address: JSON.stringify({ 
          street: 'Rua da Alfândega', 
          number: '258', 
          neighborhood: 'Centro', 
          city: 'Rio de Janeiro', 
          state: 'RJ', 
          zipCode: '20070-000' 
        }),
        images: ['https://images.unsplash.com/photo-1440421841394-6a389f756be9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80'],
        subscriptionPlan: 'pro'
      },
      {
        name: 'CasaBella',
        description: 'Tudo para sua casa com estilo e qualidade',
        category: 'Casa',
        location: JSON.stringify({ lat: -22.9038, lng: -43.1810 }),
        address: JSON.stringify({ 
          street: 'Rua Buenos Aires', 
          number: '178', 
          neighborhood: 'Centro', 
          city: 'Rio de Janeiro', 
          state: 'RJ', 
          zipCode: '20070-020' 
        }),
        images: ['https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80'],
        subscriptionPlan: 'freemium'
      }
    ];

    const stores = storeData.map(store => this.createStore(store));

    // Add some default products
    const productData: InsertProduct[] = [
      {
        name: 'Smartphone X500',
        description: 'Smartphone de última geração com câmera de 108MP e tela AMOLED',
        price: 2499.90,
        discountedPrice: 2199.90,
        category: 'Eletrônicos',
        stock: 50,
        storeId: 2,
        images: [
          'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1598327105666-5b89351aff97?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
        ]
      },
      {
        name: 'Vestido Floral Verão',
        description: 'Vestido leve com estampa floral, perfeito para o verão',
        price: 159.90,
        discountedPrice: 119.90,
        category: 'Moda',
        stock: 30,
        storeId: 1,
        images: [
          'https://images.unsplash.com/photo-1623609163859-ca93c959b5b8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1583400767692-c484b9e6ef36?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
        ]
      },
      {
        name: 'Conjunto de Panelas Antiaderentes',
        description: 'Kit com 5 panelas antiaderentes de alta qualidade',
        price: 349.90,
        discountedPrice: 299.90,
        category: 'Casa',
        stock: 15,
        storeId: 3,
        images: [
          'https://images.unsplash.com/photo-1584649096748-11d6f5802574?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1590794056499-4435a7273a64?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
        ]
      },
      {
        name: 'Fones de Ouvido Bluetooth',
        description: 'Fones sem fio com cancelamento de ruído e bateria de longa duração',
        price: 299.90,
        discountedPrice: 249.90,
        category: 'Eletrônicos',
        stock: 40,
        storeId: 2,
        images: [
          'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
        ]
      },
      {
        name: 'Camisa Social Slim',
        description: 'Camisa social masculina de algodão com corte slim',
        price: 129.90,
        discountedPrice: 99.90,
        category: 'Moda',
        stock: 25,
        storeId: 1,
        images: [
          'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80'
        ]
      }
    ];

    const products = productData.map(product => this.createProduct(product));

    // Add flash promotions
    const now = new Date();
    const oneHourLater = new Date(now);
    oneHourLater.setHours(oneHourLater.getHours() + 1);
    
    const twoHoursLater = new Date(now);
    twoHoursLater.setHours(twoHoursLater.getHours() + 2);

    const promotionData: InsertPromotion[] = [
      {
        type: 'flash',
        productId: 1, // Smartphone
        discountPercentage: 15,
        startTime: now,
        endTime: oneHourLater
      },
      {
        type: 'flash',
        productId: 2, // Vestido
        discountPercentage: 20,
        startTime: now,
        endTime: twoHoursLater
      },
      {
        type: 'flash',
        productId: 4, // Fones
        discountPercentage: 10,
        startTime: now,
        endTime: oneHourLater
      }
    ];

    promotionData.forEach(promotion => this.createPromotion(promotion));
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email.toLowerCase() === email.toLowerCase());
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const now = new Date();
    const user: User = {
      ...userData,
      id,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now
    };
    
    this.users.set(id, user);
    
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  // Store operations
  async getStore(id: number): Promise<Store | undefined> {
    return this.stores.get(id);
  }

  async getStores(options: { category?: string, search?: string, limit?: number } = {}): Promise<Store[]> {
    let stores = Array.from(this.stores.values());
    
    if (options.category) {
      stores = stores.filter(store => store.category.toLowerCase() === options.category!.toLowerCase());
    }
    
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      stores = stores.filter(store => 
        store.name.toLowerCase().includes(searchLower) || 
        store.description?.toLowerCase().includes(searchLower) ||
        store.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    if (options.limit) {
      stores = stores.slice(0, options.limit);
    }
    
    return stores;
  }

  async getNearbyStores(lat: number, lng: number, radius: number = 5): Promise<Store[]> {
    // Simple distance calculation (not accurate for large distances)
    const stores = Array.from(this.stores.values());
    
    const storesWithDistance = stores.map(store => {
      // Calculate rough distance in km
      const latDiff = Math.abs(store.location.latitude - lat);
      const lngDiff = Math.abs(store.location.longitude - lng);
      // Simplified distance calculation (not accurate)
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // 111 km per degree
      
      return { store, distance };
    });
    
    // Filter stores within radius and sort by distance
    return storesWithDistance
      .filter(item => item.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .map(item => item.store);
  }
  
  async getStoresByUserId(userId: number): Promise<Store[]> {
    const stores = Array.from(this.stores.values())
      .filter(store => store.userId === userId);
    
    // Ordenar por data de criação (mais recentes primeiro)
    return stores.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  
  async getUserStores(userId: number): Promise<Store[]> {
    // Alias para getStoresByUserId
    return this.getStoresByUserId(userId);
  }

  async createStore(storeData: InsertStore): Promise<Store> {
    const id = this.storeIdCounter++;
    const now = new Date();
    
    const store: Store = {
      ...storeData,
      id,
      rating: 0,
      reviewCount: 0,
      acceptLocationTerms: storeData.acceptLocationTerms || false,
      subscriptionPlan: 'freemium',
      createdAt: now,
      updatedAt: now
    };
    
    this.stores.set(id, store);
    return store;
  }

  async updateStore(id: number, storeData: Partial<Store>): Promise<Store | undefined> {
    const store = this.stores.get(id);
    if (!store) return undefined;
    
    const updatedStore = {
      ...store,
      ...storeData,
      updatedAt: new Date()
    };
    
    this.stores.set(id, updatedStore);
    return updatedStore;
  }

  async updateStoreStripeInfo(id: number, stripeInfo: {
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    subscriptionPlan?: 'freemium' | 'start' | 'pro' | 'premium';
    subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'unpaid';
    subscriptionStartDate?: Date | null;
    subscriptionEndDate?: Date | null;
  }): Promise<Store | undefined> {
    const store = this.stores.get(id);
    if (!store) return undefined;
    
    const updatedStore = {
      ...store,
      ...stripeInfo,
      updatedAt: new Date()
    };
    
    this.stores.set(id, updatedStore);
    return updatedStore;
  }

  async getStoreByStripeCustomerId(stripeCustomerId: string): Promise<Store | undefined> {
    const stores = Array.from(this.stores.values());
    return stores.find(store => store.stripeCustomerId === stripeCustomerId);
  }

  // Product operations
  async getProduct(id: number): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;
    
    // Get the associated store data
    const store = this.stores.get(product.storeId);
    
    // Get any active promotion for this product
    const promotions = Array.from(this.promotions.values())
      .filter(promo => 
        promo.productId === id && 
        new Date(promo.startTime) <= new Date() &&
        new Date(promo.endTime) >= new Date()
      );
    
    return {
      ...product,
      store: store ? { 
        id: store.id, 
        name: store.name,
        rating: store.rating,
        reviewCount: store.reviewCount
      } : undefined,
      promotion: promotions.length > 0 ? promotions[0] : undefined
    };
  }

  async getProductsByCategorySlug(slug: string, options: {
    minPrice?: number,
    maxPrice?: number,
    sortBy?: string,
    promotion?: boolean,
    limit?: number
  } = {}): Promise<Product[]> {
    console.log('Getting products by category slug in MemStorage:', slug);
    
    // First, get the category by slug
    const category = Array.from(this.categories.values()).find(cat => cat.slug === slug);
    
    if (!category) {
      console.log('Category not found with slug:', slug);
      return [];
    }
    
    console.log('Found category:', category.name, 'with ID:', category.id);
    
    // Filter products by category and active status
    let products = Array.from(this.products.values())
      .filter(product => product.category === category.name && product.isActive === true);
    
    console.log(`Found ${products.length} products with category ${category.name}`);
    
    // Apply price filters
    if (options.minPrice !== undefined && options.minPrice !== null) {
      const minPrice = Number(options.minPrice);
      console.log('Applying min price filter to category products:', minPrice);
      products = products.filter(product => {
        const price = product.discountedPrice && product.discountedPrice > 0 
          ? product.discountedPrice 
          : product.price;
        return price >= minPrice;
      });
    }
    
    if (options.maxPrice !== undefined && options.maxPrice !== null) {
      const maxPrice = Number(options.maxPrice);
      console.log('Applying max price filter to category products:', maxPrice);
      products = products.filter(product => {
        const price = product.discountedPrice && product.discountedPrice > 0 
          ? product.discountedPrice 
          : product.price;
        return price <= maxPrice;
      });
    }
    
    // Apply promotion filter
    if (options.promotion) {
      const now = new Date();
      const activePromotions = Array.from(this.promotions.values())
        .filter(promo => 
          new Date(promo.startTime) <= now &&
          new Date(promo.endTime) >= now
        );
      
      const promotionProductIds = activePromotions.map(p => p.productId);
      products = products.filter(product => 
        promotionProductIds.includes(product.id) || product.discountedPrice !== undefined
      );
    }
    
    // Apply sort
    if (options.sortBy) {
      if (options.sortBy === 'price_asc') {
        products.sort((a, b) => {
          const priceA = a.discountedPrice && a.discountedPrice > 0 ? a.discountedPrice : a.price;
          const priceB = b.discountedPrice && b.discountedPrice > 0 ? b.discountedPrice : b.price;
          return priceA - priceB;
        });
      } else if (options.sortBy === 'price_desc') {
        products.sort((a, b) => {
          const priceA = a.discountedPrice && a.discountedPrice > 0 ? a.discountedPrice : a.price;
          const priceB = b.discountedPrice && b.discountedPrice > 0 ? b.discountedPrice : b.price;
          return priceB - priceA;
        });
      } else if (options.sortBy === 'newest') {
        products.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      }
    } else {
      // Default to newest first
      products.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    
    // Apply limit
    if (options.limit) {
      products = products.slice(0, options.limit);
    }
    
    // Add store information to each product
    return products.map(product => {
      const store = this.stores.get(product.storeId);
      return {
        ...product,
        store: store ? { id: store.id, name: store.name } : undefined
      };
    });
  }

  async getProducts(options: { 
    category?: string, 
    search?: string, 
    minPrice?: number,
    maxPrice?: number,
    sortBy?: string,
    promotion?: boolean,
    limit?: number,
    type?: string
  } = {}): Promise<Product[]> {
    console.log('Price filters received:', { 
      minPrice: options.minPrice, 
      maxPrice: options.maxPrice,
      category: options.category,
      sortBy: options.sortBy
    });
    
    let products = Array.from(this.products.values());
    console.log('Total products before filtering:', products.length);
    
    // Filter by category
    if (options.category) {
      products = products.filter(product => product.category.toLowerCase() === options.category!.toLowerCase());
      console.log('Products after category filter:', products.length);
    }
    
    // Filter by search term
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      products = products.filter(product => 
        product.name.toLowerCase().includes(searchLower) || 
        product.description?.toLowerCase().includes(searchLower)
      );
      console.log('Products after search filter:', products.length);
    }
    
    // Filter by price range
    if (options.minPrice !== undefined) {
      const minPrice = Number(options.minPrice);
      console.log('Applying min price filter:', minPrice);
      products = products.filter(product => {
        const price = product.discountedPrice !== null ? product.discountedPrice || product.price : product.price;
        return price >= minPrice;
      });
      console.log('Products after min price filter:', products.length);
    }
    
    if (options.maxPrice !== undefined) {
      const maxPrice = Number(options.maxPrice);
      console.log('Applying max price filter:', maxPrice);
      products = products.filter(product => {
        const price = product.discountedPrice !== null ? product.discountedPrice || product.price : product.price;
        return price <= maxPrice;
      });
      console.log('Products after max price filter:', products.length);
    }
    
    // Filter by promotion type
    if (options.type === 'flash') {
      const now = new Date();
      const activePromotions = Array.from(this.promotions.values())
        .filter(promo => 
          promo.type === 'flash' && 
          new Date(promo.startTime) <= now &&
          new Date(promo.endTime) >= now
        );
      
      const promotionProductIds = activePromotions.map(p => p.productId);
      products = products.filter(product => promotionProductIds.includes(product.id));
    }
    
    // Filter products with any promotion
    if (options.promotion) {
      const now = new Date();
      const activePromotions = Array.from(this.promotions.values())
        .filter(promo => 
          new Date(promo.startTime) <= now &&
          new Date(promo.endTime) >= now
        );
      
      const promotionProductIds = activePromotions.map(p => p.productId);
      products = products.filter(product => 
        promotionProductIds.includes(product.id) || product.discountedPrice !== undefined
      );
    }
    
    // Sort products
    if (options.sortBy) {
      switch (options.sortBy) {
        case 'price_asc':
          products.sort((a, b) => (a.discountedPrice || a.price) - (b.discountedPrice || b.price));
          break;
        case 'price_desc':
          products.sort((a, b) => (b.discountedPrice || b.price) - (a.discountedPrice || a.price));
          break;
        case 'newest':
          products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case 'popularity':
        default:
          // Default sorting, by popularity (could be based on views or other metrics)
          break;
      }
    }
    
    // Limit results
    if (options.limit) {
      products = products.slice(0, options.limit);
    }
    
    // Add store information to each product
    return products.map(product => {
      const store = this.stores.get(product.storeId);
      return {
        ...product,
        store: store ? { id: store.id, name: store.name } : undefined
      };
    });
  }

  async getProductsByStore(storeId: number): Promise<Product[]> {
    const products = Array.from(this.products.values())
      .filter(product => product.storeId === storeId);
    
    // Add store information to each product
    const store = this.stores.get(storeId);
    
    return products.map(product => ({
      ...product,
      store: store ? { id: store.id, name: store.name } : undefined
    }));
  }
  
  async getStoresProducts(storeIds: number[]): Promise<Product[]> {
    if (!storeIds || storeIds.length === 0) {
      return [];
    }
    
    const products = Array.from(this.products.values())
      .filter(product => storeIds.includes(product.storeId));
      
    // Add store information to each product
    return products.map(product => {
      const store = this.stores.get(product.storeId);
      return {
        ...product,
        store: store ? { id: store.id, name: store.name } : undefined
      };
    });
  }

  async getRelatedProducts(productId: number, limit: number = 4): Promise<Product[]> {
    const product = this.products.get(productId);
    if (!product) return [];
    
    // Get products in the same category
    let relatedProducts = Array.from(this.products.values())
      .filter(p => p.id !== productId && p.category === product.category);
    
    // Limit results
    relatedProducts = relatedProducts.slice(0, limit);
    
    // Add store information to each product
    return relatedProducts.map(product => {
      const store = this.stores.get(product.storeId);
      return {
        ...product,
        store: store ? { id: store.id, name: store.name } : undefined
      };
    });
  }

  async getFeaturedProducts(limit: number = 8): Promise<Product[]> {
    // Get products with promotions or discounts
    const now = new Date();
    const activePromotions = Array.from(this.promotions.values())
      .filter(promo => 
        new Date(promo.startTime) <= now &&
        new Date(promo.endTime) >= now
      );
    
    const promotionProductIds = activePromotions.map(p => p.productId);
    
    let featuredProducts = Array.from(this.products.values())
      .filter(product => 
        promotionProductIds.includes(product.id) || 
        product.discountedPrice !== undefined
      );
    
    // If not enough products with promotions, add some random products
    if (featuredProducts.length < limit) {
      const otherProducts = Array.from(this.products.values())
        .filter(product => !featuredProducts.includes(product));
      
      // Shuffle and add more products
      const shuffled = otherProducts.sort(() => 0.5 - Math.random());
      featuredProducts = [...featuredProducts, ...shuffled.slice(0, limit - featuredProducts.length)];
    }
    
    // Limit results
    featuredProducts = featuredProducts.slice(0, limit);
    
    // Add store information to each product
    return featuredProducts.map(product => {
      const store = this.stores.get(product.storeId);
      return {
        ...product,
        store: store ? { id: store.id, name: store.name } : undefined
      };
    });
  }

  async createProduct(productData: InsertProduct): Promise<Product> {
    const id = this.productIdCounter++;
    const now = new Date();
    
    const product: Product = {
      ...productData,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.products.set(id, product);
    
    // Add store information
    const store = this.stores.get(product.storeId);
    
    return {
      ...product,
      store: store ? { id: store.id, name: store.name } : undefined
    };
  }

  async updateProduct(id: number, productData: Partial<Product>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;
    
    const updatedProduct = {
      ...product,
      ...productData,
      updatedAt: new Date()
    };
    
    this.products.set(id, updatedProduct);
    
    // Add store information
    const store = this.stores.get(updatedProduct.storeId);
    
    return {
      ...updatedProduct,
      store: store ? { id: store.id, name: store.name } : undefined
    };
  }

  // Promotion operations
  async getPromotion(id: number): Promise<Promotion | undefined> {
    return this.promotions.get(id);
  }

  async getPromotions(type?: string, limit?: number): Promise<Promotion[]> {
    let promotions = Array.from(this.promotions.values());
    
    if (type) {
      promotions = promotions.filter(promo => promo.type === type);
    }
    
    // Sort by end time (closest to expiring first)
    promotions.sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime());
    
    if (limit) {
      promotions = promotions.slice(0, limit);
    }
    
    // Add product information to each promotion
    return Promise.all(promotions.map(async promotion => {
      const product = await this.getProduct(promotion.productId);
      return {
        ...promotion,
        product
      };
    }));
  }

  async getPromotionsByStore(storeId: number): Promise<Promotion[]> {
    // Get all products for this store
    const storeProducts = await this.getProductsByStore(storeId);
    const storeProductIds = storeProducts.map(p => p.id);
    
    // Get promotions for these products
    const promotions = Array.from(this.promotions.values())
      .filter(promo => storeProductIds.includes(promo.productId));
    
    // Add product information to each promotion
    return Promise.all(promotions.map(async promotion => {
      const product = await this.getProduct(promotion.productId);
      return {
        ...promotion,
        product
      };
    }));
  }
  
  async getProductsPromotions(productIds: number[]): Promise<Promotion[]> {
    if (!productIds || productIds.length === 0) {
      return [];
    }
    
    // Get promotions for these products
    const promotions = Array.from(this.promotions.values())
      .filter(promo => productIds.includes(promo.productId));
    
    // Add product information to each promotion
    return Promise.all(promotions.map(async promotion => {
      const product = await this.getProduct(promotion.productId);
      return {
        ...promotion,
        product
      };
    }));
  }

  async createPromotion(promotionData: InsertPromotion): Promise<Promotion> {
    const id = this.promotionIdCounter++;
    const now = new Date();
    
    const promotion: Promotion = {
      ...promotionData,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.promotions.set(id, promotion);
    
    // Apply discount to product if it's active
    const product = this.products.get(promotion.productId);
    if (product) {
      const isActive = new Date(promotion.startTime) <= now && new Date(promotion.endTime) >= now;
      
      if (isActive) {
        const discountedPrice = product.price * (1 - promotion.discountPercentage / 100);
        await this.updateProduct(product.id, { discountedPrice });
      }
    }
    
    // Add product information
    const productWithDetails = await this.getProduct(promotion.productId);
    
    return {
      ...promotion,
      product: productWithDetails
    };
  }

  async updatePromotion(id: number, promotionData: Partial<Promotion>): Promise<Promotion | undefined> {
    const promotion = this.promotions.get(id);
    if (!promotion) return undefined;
    
    const updatedPromotion = {
      ...promotion,
      ...promotionData,
      updatedAt: new Date()
    };
    
    this.promotions.set(id, updatedPromotion);
    
    // Add product information
    const product = await this.getProduct(updatedPromotion.productId);
    
    return {
      ...updatedPromotion,
      product
    };
  }
  
  async deletePromotion(id: number): Promise<boolean> {
    const promotion = await this.getPromotion(id);
    if (!promotion) return false;
    
    // Reset product's discounted price if the promotion is active
    const product = await this.getProduct(promotion.productId);
    if (product) {
      const now = new Date();
      const isActive = new Date(promotion.startTime) <= now && new Date(promotion.endTime) >= now;
      
      if (isActive) {
        // Reset the discounted price
        await this.updateProduct(product.id, { discountedPrice: null });
      }
    }
    
    return this.promotions.delete(id);
  }

  // Coupon operations
  async getCoupon(id: number): Promise<Coupon | undefined> {
    return this.coupons.get(id);
  }

  async getCoupons(search?: string): Promise<Coupon[]> {
    let coupons = Array.from(this.coupons.values());
    
    if (search) {
      const searchLower = search.toLowerCase();
      coupons = coupons.filter(coupon => 
        coupon.code.toLowerCase().includes(searchLower) || 
        coupon.description?.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter active coupons
    const now = new Date();
    coupons = coupons.filter(coupon => 
      coupon.isActive && 
      new Date(coupon.startTime) <= now && 
      new Date(coupon.endTime) >= now
    );
    
    // Sort by end time (closest to expiring first)
    coupons.sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime());
    
    // Add store information to each coupon
    return coupons.map(coupon => {
      const store = this.stores.get(coupon.storeId);
      return {
        ...coupon,
        store: store ? { 
          id: store.id, 
          name: store.name,
          images: store.images 
        } : undefined
      };
    });
  }

  async getCouponsByStore(storeId: number): Promise<Coupon[]> {
    const coupons = Array.from(this.coupons.values())
      .filter(coupon => coupon.storeId === storeId);
    
    // Filter active coupons
    const now = new Date();
    const activeCoupons = coupons.filter(coupon => 
      coupon.isActive && 
      new Date(coupon.startTime) <= now && 
      new Date(coupon.endTime) >= now
    );
    
    // Sort by end time (closest to expiring first)
    activeCoupons.sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime());
    
    // Add store information
    const store = this.stores.get(storeId);
    
    return activeCoupons.map(coupon => ({
      ...coupon,
      store: store ? { 
        id: store.id, 
        name: store.name,
        images: store.images 
      } : undefined
    }));
  }

  async createCoupon(couponData: InsertCoupon): Promise<Coupon> {
    const id = this.couponIdCounter++;
    const now = new Date();
    
    const coupon: Coupon = {
      ...couponData,
      id,
      usageCount: 0,
      createdAt: now,
      updatedAt: now
    };
    
    this.coupons.set(id, coupon);
    
    // Add store information
    const store = this.stores.get(coupon.storeId);
    
    return {
      ...coupon,
      store: store ? { 
        id: store.id, 
        name: store.name,
        images: store.images 
      } : undefined
    };
  }

  async updateCoupon(id: number, couponData: Partial<Coupon>): Promise<Coupon | undefined> {
    const coupon = this.coupons.get(id);
    if (!coupon) return undefined;
    
    const updatedCoupon = {
      ...coupon,
      ...couponData,
      updatedAt: new Date()
    };
    
    this.coupons.set(id, updatedCoupon);
    
    // Add store information
    const store = this.stores.get(updatedCoupon.storeId);
    
    return {
      ...updatedCoupon,
      store: store ? { 
        id: store.id, 
        name: store.name,
        images: store.images 
      } : undefined
    };
  }

  // Wishlist operations
  async getWishlistItems(userId: number): Promise<Wishlist[]> {
    const wishlistItems = Array.from(this.wishlists.values())
      .filter(item => item.userId === userId);
    
    // Add product information to each item
    return Promise.all(wishlistItems.map(async item => {
      const product = await this.getProduct(item.productId);
      return {
        ...item,
        product
      };
    }));
  }

  async addToWishlist(userId: number, productId: number): Promise<Wishlist> {
    // Check if already in wishlist
    const existingItem = Array.from(this.wishlists.values())
      .find(item => item.userId === userId && item.productId === productId);
    
    if (existingItem) {
      return existingItem;
    }
    
    const id = this.wishlistIdCounter++;
    const now = new Date();
    
    const wishlistItem: Wishlist = {
      id,
      userId,
      productId,
      createdAt: now
    };
    
    this.wishlists.set(id, wishlistItem);
    
    // Add product information
    const product = await this.getProduct(productId);
    
    return {
      ...wishlistItem,
      product
    };
  }

  async removeFromWishlist(userId: number, productId: number): Promise<boolean> {
    const wishlistItem = Array.from(this.wishlists.values())
      .find(item => item.userId === userId && item.productId === productId);
    
    if (!wishlistItem) return false;
    
    return this.wishlists.delete(wishlistItem.id);
  }

  // Favorite store operations
  async getFavoriteStores(userId: number): Promise<FavoriteStore[]> {
    const favoriteStores = Array.from(this.favoriteStores.values())
      .filter(item => item.userId === userId);
    
    // Add store information to each item
    return favoriteStores.map(item => {
      const store = this.stores.get(item.storeId);
      return {
        ...item,
        store
      };
    });
  }

  async addFavoriteStore(userId: number, storeId: number): Promise<FavoriteStore> {
    // Check if already a favorite
    const existingItem = Array.from(this.favoriteStores.values())
      .find(item => item.userId === userId && item.storeId === storeId);
    
    if (existingItem) {
      return existingItem;
    }
    
    const id = this.favoriteStoreIdCounter++;
    const now = new Date();
    
    const favoriteStore: FavoriteStore = {
      id,
      userId,
      storeId,
      createdAt: now
    };
    
    this.favoriteStores.set(id, favoriteStore);
    
    // Add store information
    const store = this.stores.get(storeId);
    
    return {
      ...favoriteStore,
      store
    };
  }

  async removeFavoriteStore(userId: number, storeId: number): Promise<boolean> {
    const favoriteStore = Array.from(this.favoriteStores.values())
      .find(item => item.userId === userId && item.storeId === storeId);
    
    if (!favoriteStore) return false;
    
    return this.favoriteStores.delete(favoriteStore.id);
  }

  // Reservation operations
  async getReservation(id: number): Promise<Reservation | undefined> {
    const reservation = this.reservations.get(id);
    if (!reservation) return undefined;
    
    // Add product information
    const product = await this.getProduct(reservation.productId);
    
    return {
      ...reservation,
      product
    };
  }

  async getReservations(userId: number, limit?: number): Promise<Reservation[]> {
    let reservations = Array.from(this.reservations.values())
      .filter(reservation => reservation.userId === userId);
    
    // Sort by creation date (newest first)
    reservations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (limit) {
      reservations = reservations.slice(0, limit);
    }
    
    // Add detailed product information to each reservation with flattened fields
    return Promise.all(reservations.map(async reservation => {
      const product = await this.getProduct(reservation.productId);
      
      // Get primary image for the product
      let productImage = '';
      if (product && product.images && product.images.length > 0) {
        productImage = product.images[0];
      }
      
      return {
        ...reservation,
        product,
        // Add flattened fields for easier access
        product_id: product?.id || 0,
        product_name: product?.name || '',
        product_price: product?.price || 0,
        product_image: productImage
      };
    }));
  }

  async createReservation(userId: number, productId: number, quantity: number = 1): Promise<Reservation> {
    const id = this.reservationIdCounter++;
    const now = new Date();
    
    // Calculate expiration date (72 hours from now)
    const expiresAt = new Date(now);
    expiresAt.setHours(expiresAt.getHours() + 72);
    
    const reservation: Reservation = {
      id,
      userId,
      productId,
      quantity,
      status: 'pending',
      expiresAt,
      createdAt: now,
      updatedAt: now
    };
    
    this.reservations.set(id, reservation);
    
    // Update product stock
    const product = this.products.get(productId);
    if (product && product.stock !== undefined) {
      await this.updateProduct(productId, { stock: product.stock - quantity });
    }
    
    // Add product information
    const productWithDetails = await this.getProduct(productId);
    
    return {
      ...reservation,
      product: productWithDetails
    };
  }

  async updateReservationStatus(id: number, status: 'pending' | 'completed' | 'expired' | 'cancelled'): Promise<Reservation | undefined> {
    const reservation = this.reservations.get(id);
    if (!reservation) return undefined;
    
    const oldStatus = reservation.status;
    
    const updatedReservation = {
      ...reservation,
      status,
      updatedAt: new Date()
    };
    
    this.reservations.set(id, updatedReservation);
    
    // If cancelling or expiring a reservation, return the quantity to stock
    if ((status === 'cancelled' || status === 'expired') && oldStatus === 'pending') {
      const product = this.products.get(reservation.productId);
      if (product && product.stock !== undefined) {
        await this.updateProduct(reservation.productId, { stock: product.stock + reservation.quantity });
      }
    }
    
    // Add product information
    const product = await this.getProduct(reservation.productId);
    
    return {
      ...updatedReservation,
      product
    };
  }

  // Category operations
  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    return Array.from(this.categories.values())
      .find(category => category.slug === slug);
  }

  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async createCategory(categoryData: InsertCategory): Promise<Category> {
    const id = this.categoryIdCounter++;
    const now = new Date();
    
    const category: Category = {
      ...categoryData,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.categories.set(id, category);
    return category;
  }

  // Banner operations
  async getBanner(id: number): Promise<Banner | undefined> {
    return this.banners.get(id);
  }

  async getBanners(isActive: boolean = true): Promise<Banner[]> {
    const banners = Array.from(this.banners.values());
    
    if (isActive !== undefined) {
      return banners.filter(banner => banner.isActive === isActive);
    }
    
    return banners;
  }

  async createBanner(bannerData: InsertBanner): Promise<Banner> {
    const id = this.bannerIdCounter++;
    const now = new Date();
    
    const banner: Banner = {
      ...bannerData,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.banners.set(id, banner);
    return banner;
  }

  async updateBanner(id: number, bannerData: Partial<Banner>): Promise<Banner | undefined> {
    const banner = this.banners.get(id);
    if (!banner) return undefined;
    
    const updatedBanner = {
      ...banner,
      ...bannerData,
      updatedAt: new Date()
    };
    
    this.banners.set(id, updatedBanner);
    return updatedBanner;
  }

  // Store analytics operations
  async recordStoreImpression(storeId: number): Promise<StoreImpression> {
    const id = this.storeImpressionIdCounter++;
    const now = new Date();
    
    const impression: StoreImpression = {
      id,
      storeId,
      date: now,
      count: 1
    };
    
    this.storeImpressions.set(id, impression);
    return impression;
  }

  async getStoreImpressions(storeId: number, startDate?: Date, endDate?: Date): Promise<StoreImpression[]> {
    let impressions = Array.from(this.storeImpressions.values())
      .filter(impression => impression.storeId === storeId);
    
    if (startDate) {
      impressions = impressions.filter(imp => new Date(imp.date) >= startDate);
    }
    
    if (endDate) {
      impressions = impressions.filter(imp => new Date(imp.date) <= endDate);
    }
    
    return impressions;
  }

  // User statistics
  async getUserStats(userId: number): Promise<{ wishlistCount: number; reservationsCount: number; favoriteStoresCount: number; }> {
    const wishlistCount = Array.from(this.wishlists.values())
      .filter(item => item.userId === userId).length;
    
    const reservationsCount = Array.from(this.reservations.values())
      .filter(reservation => reservation.userId === userId).length;
    
    const favoriteStoresCount = Array.from(this.favoriteStores.values())
      .filter(item => item.userId === userId).length;
    
    return { wishlistCount, reservationsCount, favoriteStoresCount };
  }
}

import connectPg from "connect-pg-simple";
import session from "express-session";
import { eq, and, like, or, gte, lte, desc, sql } from "drizzle-orm";
import { db, pool } from "./db";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }
  
  // Implementação dos métodos adicionados à interface
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    try {
      // Remover o campo de senha se estiver vazio
      if (userData.password === '') {
        delete userData.password;
      }
      
      // Se for atualizar a senha, hashear a nova senha
      if (userData.password) {
        const salt = await bcrypt.genSalt(10);
        userData.password = await bcrypt.hash(userData.password, salt);
      }
      
      // Atualizar a data de modificação
      userData.updatedAt = new Date();
      
      // Executar a atualização
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
  
  async verifyUserPassword(id: number, password: string): Promise<boolean> {
    try {
      // Obter o usuário pelo ID
      const user = await this.getUser(id);
      if (!user) return false;
      
      // Verificar a senha usando bcrypt
      return await bcrypt.compare(password, user.password);
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      return false;
    }
  }
  
  async getUserStores(userId: number): Promise<Store[]> {
    return this.getStoresByUserId(userId);
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

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
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
  
  // Store operations
  async getStore(id: number): Promise<Store | undefined> {
    // Validar se o ID é um número válido antes de consultar o banco de dados
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
    
    if (options.category) {
      query = query.where(like(stores.category, `%${options.category}%`));
    }
    
    if (options.search) {
      query = query.where(
        or(
          like(stores.name, `%${options.search}%`),
          like(stores.description, `%${options.search}%`)
        )
      );
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    return await query;
  }

  async getNearbyStores(lat: number, lng: number, radius: number = 5): Promise<Store[]> {
    // In a real implementation, this would use geospatial queries
    // For simplicity, we're just returning all stores
    return await db.select().from(stores);
  }
  
  async getStoresByUserId(userId: number): Promise<Store[]> {
    return await db.select()
      .from(stores)
      .where(eq(stores.userId, userId))
      .orderBy(desc(stores.createdAt));
  }

  async createStore(storeData: InsertStore): Promise<Store> {
    const [store] = await db.insert(stores).values(storeData).returning();
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
  
  // Product operations
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
    console.log('Database storage received price filters:', { 
      minPrice: options.minPrice, 
      maxPrice: options.maxPrice,
      minPriceType: typeof options.minPrice,
      maxPriceType: typeof options.maxPrice
    });
    
    let query = db.select().from(products);
    
    if (options.category) {
      query = query.where(eq(products.category, options.category));
    }
    
    if (options.search) {
      query = query.where(
        or(
          like(products.name, `%${options.search}%`),
          like(products.description, `%${options.search}%`)
        )
      );
    }
    
    // Melhorado o filtro de preço mínimo
    if (options.minPrice !== undefined && options.minPrice !== null) {
      const minPrice = Number(options.minPrice);
      console.log('Applying min price filter in DB query:', minPrice);
      
      // Verificar se tem preço com desconto primeiro, caso contrário usa o preço normal
      query = query.where(
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
    
    // Melhorado o filtro de preço máximo
    if (options.maxPrice !== undefined && options.maxPrice !== null) {
      const maxPrice = Number(options.maxPrice);
      console.log('Applying max price filter in DB query:', maxPrice);
      
      // Verificar se tem preço com desconto primeiro, caso contrário usa o preço normal
      query = query.where(
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
        query = query.orderBy(products.price);
      } else if (options.sortBy === 'price_desc') {
        query = query.orderBy(desc(products.price));
      } else if (options.sortBy === 'newest') {
        query = query.orderBy(desc(products.createdAt));
      }
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
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
    console.log('Getting products by category slug:', slug);
    
    // Primeiro, obter o ID da categoria pelo slug
    const [category] = await db.select().from(categories).where(eq(categories.slug, slug));
    
    if (!category) {
      console.log('Category not found with slug:', slug);
      return [];
    }
    
    console.log('Found category:', category.name, 'with ID:', category.id);
    
    // Consulta para buscar produtos que tenham esta categoria como principal
    // ou em categorias secundárias (se existir)
    let query = db.select()
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          eq(products.category, category.name)
        )
      );
    
    // Aplicar filtros adicionais
    if (options.minPrice !== undefined && options.minPrice !== null) {
      const minPrice = Number(options.minPrice);
      console.log('Applying min price filter in category products:', minPrice);
      
      query = query.where(
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
      console.log('Applying max price filter in category products:', maxPrice);
      
      query = query.where(
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
    
    // Aplicar ordenação
    if (options.sortBy) {
      if (options.sortBy === 'price_asc') {
        query = query.orderBy(products.price);
      } else if (options.sortBy === 'price_desc') {
        query = query.orderBy(desc(products.price));
      } else if (options.sortBy === 'newest') {
        query = query.orderBy(desc(products.createdAt));
      } else {
        // Default to popularity (we could use views or ratings here in the future)
        query = query.orderBy(desc(products.id));
      }
    } else {
      // Default ordering
      query = query.orderBy(desc(products.createdAt));
    }
    
    // Aplicar limite
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const categoryProducts = await query;
    console.log(`Found ${categoryProducts.length} products for category ${category.name}`);
    
    return categoryProducts;
  }

  async getProductsByStore(storeId: number): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.storeId, storeId));
  }

  async getRelatedProducts(productId: number, limit: number = 4): Promise<Product[]> {
    const product = await this.getProduct(productId);
    if (!product) return [];
    
    // Get products from the same category, excluding this one
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
    // Como a coluna featured não existe na tabela, vamos retornar produtos com desconto por enquanto
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
  
  // Promotion operations
  async getPromotion(id: number): Promise<Promotion | undefined> {
    const [promotion] = await db.select().from(promotions).where(eq(promotions.id, id));
    return promotion;
  }

  async getPromotions(type?: string, limit?: number): Promise<Promotion[]> {
    let query = db.select().from(promotions);
    
    if (type) {
      query = query.where(eq(promotions.type, type));
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query;
  }

  async getPromotionsByStore(storeId: number): Promise<Promotion[]> {
    // This requires joining product and promotions
    // For simplicity, we'll just get all promotions and filter in app
    const allPromotions = await this.getPromotions();
    const storeProducts = await this.getProductsByStore(storeId);
    const storeProductIds = storeProducts.map(p => p.id);
    
    return allPromotions.filter(promo => 
      storeProductIds.includes(promo.productId)
    );
  }

  async createPromotion(promotionData: InsertPromotion): Promise<Promotion> {
    const [promotion] = await db.insert(promotions).values(promotionData).returning();
    return promotion;
  }

  async updatePromotion(id: number, promotionData: Partial<Promotion>): Promise<Promotion | undefined> {
    try {
      console.log(`[Storage] Atualizando promoção ${id} com dados:`, promotionData);
      
      // First, get the existing promotion to keep unchanged data
      const existingPromotion = await this.getPromotion(id);
      if (!existingPromotion) {
        throw new Error('Promotion not found');
      }
      
      // Prepare update data
      let type = promotionData.type || existingPromotion.type;
      let discountPercentage = promotionData.discountPercentage !== undefined 
        ? promotionData.discountPercentage 
        : existingPromotion.discountPercentage;
      let discountAmount = promotionData.discountAmount !== undefined 
        ? promotionData.discountAmount 
        : existingPromotion.discountAmount;
      let productId = existingPromotion.productId; // Always keep original productId
      
      // Format dates as strings
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
      
      // Use direct pool query to completely bypass ORM
      const { pool } = await import('./db');
      
      // Construct safe parameterized query
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
      
      const values = [
        type,
        discountPercentage,
        discountAmount,
        startTime,
        endTime,
        id
      ];
      
      console.log('[Storage] Executing query with values:', {
        query,
        values
      });
      
      // Execute query directly via pool
      const result = await pool.query(query, values);
      console.log('[Storage] Update result rows:', result.rows);
      
      if (!result.rows || result.rows.length === 0) {
        return undefined;
      }
      
      // Return the first row as the updated promotion
      const updatedPromotion = result.rows[0] as Promotion;
      return updatedPromotion;
    } catch (error) {
      console.error('[Storage] Error updating promotion:', error);
      throw error;
    }
  }
  
  // Delete promotion
  async deletePromotion(id: number): Promise<boolean> {
    try {
      console.log(`[Storage] Deleting promotion with ID: ${id}`);
      const result = await db.delete(promotions).where(eq(promotions.id, id)).returning();
      console.log(`[Storage] Delete result:`, result);
      return result.length > 0;
    } catch (error) {
      console.error(`[Storage] Error deleting promotion:`, error);
      return false;
    }
  }
  
  // Coupon operations
  async getCoupon(id: number): Promise<Coupon | undefined> {
    const [coupon] = await db.select().from(coupons).where(eq(coupons.id, id));
    return coupon;
  }

  async getCoupons(search?: string): Promise<Coupon[]> {
    let query = db.select().from(coupons);
    
    if (search) {
      query = query.where(
        or(
          like(coupons.code, `%${search}%`),
          like(coupons.description, `%${search}%`)
        )
      );
    }
    
    return await query;
  }

  async getCouponsByStore(storeId: number): Promise<Coupon[]> {
    return await db.select().from(coupons).where(eq(coupons.storeId, storeId));
  }

  async createCoupon(couponData: InsertCoupon): Promise<Coupon> {
    const [coupon] = await db.insert(coupons).values(couponData).returning();
    return coupon;
  }

  async updateCoupon(id: number, couponData: Partial<Coupon>): Promise<Coupon | undefined> {
    const [updatedCoupon] = await db
      .update(coupons)
      .set(couponData)
      .where(eq(coupons.id, id))
      .returning();
    return updatedCoupon;
  }
  
  // Wishlist operations
  async getWishlistItems(userId: number): Promise<Wishlist[]> {
    return await db.select().from(wishlists).where(eq(wishlists.userId, userId));
  }

  async addToWishlist(userId: number, productId: number): Promise<Wishlist> {
    // Check if already exists
    const [existing] = await db.select()
      .from(wishlists)
      .where(
        and(
          eq(wishlists.userId, userId),
          eq(wishlists.productId, productId)
        )
      );
      
    if (existing) return existing;
    
    // Create new wishlist item
    const [wishlistItem] = await db.insert(wishlists)
      .values({ userId, productId })
      .returning();
    return wishlistItem;
  }

  async removeFromWishlist(userId: number, productId: number): Promise<boolean> {
    const result = await db.delete(wishlists)
      .where(
        and(
          eq(wishlists.userId, userId),
          eq(wishlists.productId, productId)
        )
      );
    return true; // PostgreSQL doesn't return count of deleted rows easily with drizzle
  }
  
  // Favorite store operations
  async getFavoriteStores(userId: number): Promise<FavoriteStore[]> {
    return await db.select().from(favoriteStores).where(eq(favoriteStores.userId, userId));
  }

  async addFavoriteStore(userId: number, storeId: number): Promise<FavoriteStore> {
    // Check if already exists
    const [existing] = await db.select()
      .from(favoriteStores)
      .where(
        and(
          eq(favoriteStores.userId, userId),
          eq(favoriteStores.storeId, storeId)
        )
      );
      
    if (existing) return existing;
    
    // Create new favorite store
    const [favoriteStore] = await db.insert(favoriteStores)
      .values({ userId, storeId })
      .returning();
    return favoriteStore;
  }

  async removeFavoriteStore(userId: number, storeId: number): Promise<boolean> {
    const result = await db.delete(favoriteStores)
      .where(
        and(
          eq(favoriteStores.userId, userId),
          eq(favoriteStores.storeId, storeId)
        )
      );
    return true; // PostgreSQL doesn't return count of deleted rows easily with drizzle
  }
  
  // Reservation operations
  async getReservation(id: number): Promise<Reservation | undefined> {
    const [reservation] = await db.select().from(reservations).where(eq(reservations.id, id));
    return reservation;
  }

  async getReservations(userId: number, limit?: number): Promise<Reservation[]> {
    let query = db.select().from(reservations).where(eq(reservations.userId, userId));
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query;
  }

  async createReservation(userId: number, productId: number, quantity: number = 1): Promise<Reservation> {
    // Set expiration date to 24 hours from now
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
  
  // Category operations
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
  
  // Banner operations
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
  
  // Store analytics operations
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
      query = query.where(gte(storeImpressions.date, startDate));
    }
    
    if (endDate) {
      query = query.where(lte(storeImpressions.date, endDate));
    }
    
    return await query;
  }

  // Métodos para Stripe
  async updateStoreStripeInfo(id: number, stripeInfo: {
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    subscriptionPlan?: 'freemium' | 'start' | 'pro' | 'premium';
    subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'unpaid';
    subscriptionStartDate?: Date | null;
    subscriptionEndDate?: Date | null;
  }): Promise<Store | undefined> {
    const [updatedStore] = await db
      .update(stores)
      .set({
        ...stripeInfo,
        updatedAt: new Date()
      })
      .where(eq(stores.id, id))
      .returning();
    return updatedStore;
  }

  async getStoreByStripeCustomerId(stripeCustomerId: string): Promise<Store | undefined> {
    const [store] = await db
      .select()
      .from(stores)
      .where(eq(stores.stripeCustomerId, stripeCustomerId));
    return store;
  }

  // User statistics
  async getUserStats(userId: number): Promise<{
    wishlistCount: number;
    reservationsCount: number;
    favoriteStoresCount: number;
  }> {
    // Count wishlist items
    const wishlistItems = await db.select().from(wishlists).where(eq(wishlists.userId, userId));
    
    // Count reservations
    const userReservations = await db.select().from(reservations).where(eq(reservations.userId, userId));
    
    // Count favorite stores
    const userFavoriteStores = await db.select().from(favoriteStores).where(eq(favoriteStores.userId, userId));
    
    return {
      wishlistCount: wishlistItems.length,
      reservationsCount: userReservations.length,
      favoriteStoresCount: userFavoriteStores.length
    };
  }
}

export const storage = new DatabaseStorage();
