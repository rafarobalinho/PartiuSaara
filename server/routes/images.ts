import express from 'express';
import { authMiddleware } from '../middleware/auth';
import imageController from '../controllers/image.controller';

const router = express.Router();

// Rota para placeholder-image
router.get('/placeholder-image.jpg', imageController.getPlaceholderImage);

// Rotas para imagens de produtos
router.get('/products/:id/primary-image', imageController.getProductPrimaryImage);
router.get('/products/:id/thumbnail', imageController.getProductThumbnail);
router.get('/products/:id/images', imageController.getProductImages);
router.get('/products/:id/image/:imageId', imageController.getProductImage);

// Rotas para imagens de lojas
router.get('/stores/:id/primary-image', imageController.getStorePrimaryImage);
router.get('/stores/:id/images', imageController.getStoreImages);

// Rotas para imagens de promoções (mantém padrão visual específico)
router.get('/promotions/:id/image', imageController.getPromotionImage);
router.get('/promotions/:id/flash-image', imageController.getFlashPromotionImage);

// Rotas para imagens de reservas (protegidas por autenticação)
router.get('/reservations/:id/image', authMiddleware, imageController.getReservationImage);

export default router;