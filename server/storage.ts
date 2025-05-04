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

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Store operations
  getStore(id: number): Promise<Store | undefined>;
  getStores(options?: { category?: string, search?: string, limit?: number }): Promise<Store[]>;
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
    limit?: number
  }): Promise<Product[]>;
  getProductsByStore(storeId: number): Promise<Product[]>;
  getRelatedProducts(productId: number, limit?: number): Promise<Product[]>;
  getFeaturedProducts(limit?: number): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined>;
  
  // Promotion operations
  getPromotion(id: number): Promise<Promotion | undefined>;
  getPromotions(type?: string, limit?: number): Promise<Promotion[]>;
  getPromotionsByStore(storeId: number): Promise<Promotion[]>;
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

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Esta função está sendo mantida para compatibilidade, mas usamos email para autenticação
    return this.getUserByEmail(username);
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
    let products = Array.from(this.products.values());
    
    // Filter by category
    if (options.category) {
      products = products.filter(product => product.category.toLowerCase() === options.category!.toLowerCase());
    }
    
    // Filter by search term
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      products = products.filter(product => 
        product.name.toLowerCase().includes(searchLower) || 
        product.description?.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by price range
    if (options.minPrice !== undefined) {
      products = products.filter(product => 
        (product.discountedPrice || product.price) >= options.minPrice!
      );
    }
    
    if (options.maxPrice !== undefined) {
      products = products.filter(product => 
        (product.discountedPrice || product.price) <= options.maxPrice!
      );
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
    
    // Add product information to each reservation
    return Promise.all(reservations.map(async reservation => {
      const product = await this.getProduct(reservation.productId);
      return {
        ...reservation,
        product
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

export const storage = new MemStorage();
