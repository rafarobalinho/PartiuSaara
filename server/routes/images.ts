import express from 'express';
import { 
  getProductPrimaryImage, 
  getProductThumbnail, 
  getProductImages, 
  getProductImage,
  getStorePrimaryImage,
  getPromotionImage
} from '../controllers/image.controller.js';

const router = express.Router();

// Rotas de imagens de produtos
router.get('/products/:id/primary-image', getProductPrimaryImage);
router.get('/products/:id/thumbnail', getProductThumbnail);
router.get('/products/:id/images', getProductImages);
router.get('/products/:id/image/:imageId', getProductImage);

// Rotas de imagens de lojas
router.get('/stores/:id/primary-image', getStorePrimaryImage);

// Rotas de imagens de promoções
router.get('/promotions/:id/image', getPromotionImage);

export default router;