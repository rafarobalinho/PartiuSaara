import { relations } from "drizzle-orm/relations";
import { stores, coupons, users, favoriteStores, wishlists, products, promotions, reservations, storeImpressions, categories, storeImages, productImages, storePlaceDetails } from "./schema";

export const couponsRelations = relations(coupons, ({one}) => ({
	store: one(stores, {
		fields: [coupons.storeId],
		references: [stores.id]
	}),
}));

export const storesRelations = relations(stores, ({one, many}) => ({
	coupons: many(coupons),
	favoriteStores: many(favoriteStores),
	storeImpressions: many(storeImpressions),
	products: many(products),
	storeImages: many(storeImages),
	storePlaceDetails: many(storePlaceDetails),
	user: one(users, {
		fields: [stores.userId],
		references: [users.id]
	}),
}));

export const favoriteStoresRelations = relations(favoriteStores, ({one}) => ({
	user: one(users, {
		fields: [favoriteStores.userId],
		references: [users.id]
	}),
	store: one(stores, {
		fields: [favoriteStores.storeId],
		references: [stores.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	favoriteStores: many(favoriteStores),
	wishlists: many(wishlists),
	reservations: many(reservations),
	stores: many(stores),
}));

export const wishlistsRelations = relations(wishlists, ({one}) => ({
	user: one(users, {
		fields: [wishlists.userId],
		references: [users.id]
	}),
	product: one(products, {
		fields: [wishlists.productId],
		references: [products.id]
	}),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	wishlists: many(wishlists),
	promotions: many(promotions),
	reservations: many(reservations),
	store: one(stores, {
		fields: [products.storeId],
		references: [stores.id]
	}),
	productImages: many(productImages),
}));

export const promotionsRelations = relations(promotions, ({one}) => ({
	product: one(products, {
		fields: [promotions.productId],
		references: [products.id]
	}),
}));

export const reservationsRelations = relations(reservations, ({one}) => ({
	user: one(users, {
		fields: [reservations.userId],
		references: [users.id]
	}),
	product: one(products, {
		fields: [reservations.productId],
		references: [products.id]
	}),
}));

export const storeImpressionsRelations = relations(storeImpressions, ({one}) => ({
	store: one(stores, {
		fields: [storeImpressions.storeId],
		references: [stores.id]
	}),
}));

export const categoriesRelations = relations(categories, ({one, many}) => ({
	category: one(categories, {
		fields: [categories.parentId],
		references: [categories.id],
		relationName: "categories_parentId_categories_id"
	}),
	categories: many(categories, {
		relationName: "categories_parentId_categories_id"
	}),
}));

export const storeImagesRelations = relations(storeImages, ({one}) => ({
	store: one(stores, {
		fields: [storeImages.storeId],
		references: [stores.id]
	}),
}));

export const productImagesRelations = relations(productImages, ({one}) => ({
	product: one(products, {
		fields: [productImages.productId],
		references: [products.id]
	}),
}));

export const storePlaceDetailsRelations = relations(storePlaceDetails, ({one}) => ({
	store: one(stores, {
		fields: [storePlaceDetails.storeId],
		references: [stores.id]
	}),
}));