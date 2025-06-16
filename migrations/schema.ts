import { pgTable, serial, text, boolean, timestamp, foreignKey, integer, doublePrecision, unique, index, varchar, json, numeric, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const banners = pgTable("banners", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	imageUrl: text("image_url").notNull(),
	buttonText: text("button_text"),
	buttonLink: text("button_link"),
	couponCode: text("coupon_code"),
	isActive: boolean("is_active").default(true),
	startDate: timestamp("start_date", { mode: 'string' }),
	endDate: timestamp("end_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const coupons = pgTable("coupons", {
	id: serial().primaryKey().notNull(),
	storeId: integer("store_id").notNull(),
	code: text().notNull(),
	description: text(),
	discountAmount: doublePrecision("discount_amount"),
	discountPercentage: integer("discount_percentage"),
	maxUsageCount: integer("max_usage_count"),
	usageCount: integer("usage_count").default(0),
	isActive: boolean("is_active").default(true),
	startTime: timestamp("start_time", { mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "coupons_store_id_stores_id_fk"
		}),
]);

export const favoriteStores = pgTable("favorite_stores", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	storeId: integer("store_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "favorite_stores_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "favorite_stores_store_id_stores_id_fk"
		}),
]);

export const wishlists = pgTable("wishlists", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	productId: integer("product_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "wishlists_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "wishlists_product_id_products_id_fk"
		}),
]);

export const promotions = pgTable("promotions", {
	id: serial().primaryKey().notNull(),
	productId: integer("product_id").notNull(),
	type: text().notNull(),
	discountPercentage: integer("discount_percentage").notNull(),
	startTime: timestamp("start_time", { mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "promotions_product_id_products_id_fk"
		}),
]);

export const reservations = pgTable("reservations", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	productId: integer("product_id").notNull(),
	quantity: integer().default(1),
	status: text().default('pending'),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "reservations_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "reservations_product_id_products_id_fk"
		}),
]);

export const storeImpressions = pgTable("store_impressions", {
	id: serial().primaryKey().notNull(),
	storeId: integer("store_id").notNull(),
	date: timestamp({ mode: 'string' }).defaultNow().notNull(),
	count: integer().default(1),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "store_impressions_store_id_stores_id_fk"
		}),
]);

export const categories = pgTable("categories", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	icon: text().notNull(),
	parentId: integer("parent_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "categories_parent_id_categories_id_fk"
		}),
	unique("categories_slug_unique").on(table.slug),
]);

export const products = pgTable("products", {
	id: serial().primaryKey().notNull(),
	storeId: integer("store_id").notNull(),
	name: text().notNull(),
	description: text(),
	category: text().notNull(),
	price: doublePrecision().notNull(),
	discountedPrice: doublePrecision("discounted_price"),
	stock: integer().default(0),
	images: text().array(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	isActive: boolean("is_active").default(true),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "products_store_id_stores_id_fk"
		}),
]);

export const storeImages = pgTable("store_images", {
	id: serial().primaryKey().notNull(),
	storeId: integer("store_id").notNull(),
	imageUrl: text("image_url").notNull(),
	thumbnailUrl: text("thumbnail_url").notNull(),
	isPrimary: boolean("is_primary").default(false),
	displayOrder: integer("display_order").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("store_id_idx").using("btree", table.storeId.asc().nullsLast().op("int4_ops")),
	index("store_images_is_primary_idx").using("btree", table.isPrimary.asc().nullsLast().op("bool_ops")),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "store_images_store_id_fkey"
		}),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	email: text().notNull(),
	password: text().notNull(),
	name: text(),
	role: text().default('customer').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	firstName: text("first_name").default(').notNull(),
	lastName: text("last_name").default(').notNull(),
	dateOfBirth: text("date_of_birth"),
	gender: text(),
	avatarUrl: text("avatar_url"),
	avatarThumbnailUrl: text("avatar_thumbnail_url"),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const productImages = pgTable("product_images", {
	id: serial().primaryKey().notNull(),
	productId: integer("product_id").notNull(),
	imageUrl: text("image_url").notNull(),
	thumbnailUrl: text("thumbnail_url").notNull(),
	isPrimary: boolean("is_primary").default(false),
	displayOrder: integer("display_order").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("product_id_idx").using("btree", table.productId.asc().nullsLast().op("int4_ops")),
	index("product_images_is_primary_idx").using("btree", table.isPrimary.asc().nullsLast().op("bool_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_images_product_id_fkey"
		}),
]);

export const session = pgTable("session", {
	sid: varchar().primaryKey().notNull(),
	sess: json().notNull(),
	expire: timestamp({ precision: 6, mode: 'string' }).notNull(),
}, (table) => [
	index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const storePlaceDetails = pgTable("store_place_details", {
	id: serial().primaryKey().notNull(),
	storeId: integer("store_id"),
	placeId: text("place_id").notNull(),
	name: text(),
	formattedAddress: text("formatted_address"),
	phoneNumber: text("phone_number"),
	website: text(),
	rating: numeric(),
	totalRatings: integer("total_ratings"),
	businessStatus: text("business_status"),
	types: jsonb(),
	openingHours: jsonb("opening_hours"),
	reviews: jsonb(),
	editorialSummary: text("editorial_summary"),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_store_place_details_place_id").using("btree", table.placeId.asc().nullsLast().op("text_ops")),
	index("idx_store_place_details_store_id").using("btree", table.storeId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "store_place_details_store_id_fkey"
		}),
	unique("store_place_details_store_id_key").on(table.storeId),
	unique("store_place_details_place_id_key").on(table.placeId),
]);

export const stores = pgTable("stores", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	name: text().notNull(),
	description: text(),
	category: text().notNull(),
	tags: text().array(),
	rating: doublePrecision().default(0),
	reviewCount: integer("review_count").default(0),
	images: text().array(),
	isOpen: boolean("is_open").default(true),
	address: jsonb().notNull(),
	location: jsonb().notNull(),
	subscriptionPlan: text("subscription_plan").default('freemium'),
	subscriptionEndDate: timestamp("subscription_end_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	placeId: varchar("place_id", { length: 255 }),
	subscriptionStatus: text("subscription_status").default('active'),
	stripeCustomerId: text("stripe_customer_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	subscriptionStartDate: timestamp("subscription_start_date", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "stores_user_id_users_id_fk"
		}),
]);
