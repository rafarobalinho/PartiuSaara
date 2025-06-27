import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { insertPromotionSchema } from '@shared/schema';
import { sellerMiddleware, authMiddleware } from '../middleware/auth';
import { pool } from '../db';

// Get flash promotions
export async function getFlashPromotions(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const promotions = await storage.getPromotions('flash', limit);
    res.json(promotions);
  } catch (error) {
    console.error('Error getting flash promotions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Get a promotion by ID
export async function getPromotion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const promotion = await storage.getPromotion(Number(id));

    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    res.json(promotion);
  } catch (error) {
    console.error('Error getting promotion:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Create a new promotion (sellers only)
export async function createPromotion(req: Request, res: Response) {
  try {
    // Ensure user is a seller
    sellerMiddleware(req, res, async () => {
      const user = req.user!;

      // Logs para debug
      console.log("======= CORPO DA REQUISIÇÃO RECEBIDO =======");
      console.log(JSON.stringify(req.body, null, 2));
      console.log("============================================");

      console.log("======= SCHEMA DE VALIDAÇÃO =======");
      console.log(JSON.stringify(insertPromotionSchema, null, 2));
      console.log("===================================");

      // Adaptação dos dados recebidos para o formato esperado pelo schema
      // Se o cliente enviar os dados originais do formulário, convertemos para o formato do schema
      let adaptedData = {...req.body};

      // Se temos discountType e discountValue, precisamos convertê-los para discountPercentage
      if (req.body.discountType && req.body.discountValue) {
        // Se o tipo for percentage, simplesmente usamos o valor
        if (req.body.discountType === 'percentage') {
          adaptedData.discountPercentage = Number(req.body.discountValue);
        } else {
          // Teria que calcular a percentagem com base no preço do produto
          // mas não temos acesso direto a ele aqui, então vamos usar o valor direto
          adaptedData.discountPercentage = Number(req.body.discountValue);
        }

        // Remover campos não utilizados pelo schema
        delete adaptedData.discountType;
        delete adaptedData.discountValue;
      }

      // Convertemos as strings de data para objetos Date
      if (typeof adaptedData.startTime === 'string') {
        adaptedData.startTime = new Date(adaptedData.startTime);
      }

      if (typeof adaptedData.endTime === 'string') {
        adaptedData.endTime = new Date(adaptedData.endTime);
      }

      console.log("======= DADOS ADAPTADOS =======");
      console.log(JSON.stringify(adaptedData, null, 2));
      console.log("==============================");

      // Validate promotion data com os dados adaptados
      const validationResult = insertPromotionSchema.safeParse(adaptedData);
      if (!validationResult.success) {
        console.log("======= ERROS DE VALIDAÇÃO =======");
        console.log(JSON.stringify(validationResult.error.errors, null, 2));
        console.log("==================================");

        return res.status(400).json({ 
          message: 'Validation error', 
          errors: validationResult.error.errors 
        });
      }

      const promotionData = validationResult.data;

      // Get the product
      const product = await storage.getProduct(promotionData.productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Verify the product belongs to the user's store
      const store = await storage.getStore(product.storeId);
      if (!store || store.userId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to create promotions for this product' });
      }

      // Check subscription plan limits for flash promotions
      if (promotionData.type === 'flash' && store.subscriptionPlan === 'freemium') {
        return res.status(403).json({ 
          message: 'Upgrade your subscription plan to create flash promotions',
          subscriptionRequired: true
        });
      }

      // Create the promotion
      const promotion = await storage.createPromotion(promotionData);
      res.status(201).json(promotion);
    });
  } catch (error) {
    console.error('Error creating promotion:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Interface para tipagem das imagens
interface ProductImage {
  id: number;
  filename: string;
  thumbnail_filename: string;
  image_url: string;
  thumbnail_url: string;
  is_primary: boolean;
}

// Get seller's promotions - VERSÃO CORRIGIDA E ROBUSTA
export async function getSellerPromotions(req: Request, res: Response) {
  try {
    // Ensure user is authenticated and is a seller
    sellerMiddleware(req, res, async () => {
      const user = req.user!;

      console.log(`[GET SELLER PROMOTIONS] Buscando promoções do vendedor ${user.id}`);

      // Usar consulta unificada similar aos outros controllers para consistência
      const query = `
        SELECT 
          prom.id as promotion_id,
          prom.type as promotion_type,
          prom.discount_percentage,
          prom.start_time,
          prom.end_time,
          prom.created_at as promotion_created_at,
          prom.updated_at as promotion_updated_at,
          p.id AS p_id,
          p.name AS p_name,
          p.description AS p_description,
          p.category AS p_category,
          p.price AS p_price,
          p.discounted_price AS p_discounted_price,
          p.stock AS p_stock,
          p.store_id AS p_store_id,
          s.name AS store_name,
          pi.id AS pi_id,
          pi.filename AS pi_filename,
          pi.thumbnail_filename AS pi_thumbnail_filename,
          pi.is_primary AS pi_is_primary
        FROM 
          promotions prom
        INNER JOIN 
          products p ON prom.product_id = p.id
        INNER JOIN 
          stores s ON p.store_id = s.id
        LEFT JOIN 
          product_images pi ON p.id = pi.product_id
        WHERE 
          s.user_id = $1
        ORDER BY 
          prom.created_at DESC, 
          pi.is_primary DESC
      `;

      const result = await pool.query(query, [user.id]);

      console.log(`[GET SELLER PROMOTIONS] Encontradas ${result.rows.length} linhas de resultados`);

      // Processar resultados usando Map para agrupar por promoção
      const promotionsMap = new Map();

      result.rows.forEach(row => {
        const promotionId = row.promotion_id;

        // Se esta promoção ainda não foi processada, inicialize-a
        if (!promotionsMap.has(promotionId)) {
          // Calcular preço com desconto
          let discountedPrice = row.p_price;
          if (row.discount_percentage) {
            discountedPrice = row.p_price * (1 - (row.discount_percentage / 100));
            discountedPrice = Math.round(discountedPrice * 100) / 100;
          }

          const promotion = {
            id: promotionId,
            productId: row.p_id,
            type: row.promotion_type,
            discountPercentage: row.discount_percentage,
            startTime: row.start_time,
            endTime: row.end_time,
            createdAt: row.promotion_created_at,
            updatedAt: row.promotion_updated_at,
            promotionEndsAt: row.end_time,
            product: {
              id: row.p_id,
              name: row.p_name,
              description: row.p_description,
              category: row.p_category,
              price: row.p_price,
              discountedPrice: discountedPrice,
              stock: row.p_stock,
              storeId: row.p_store_id,
              store: {
                id: row.p_store_id,
                name: row.store_name
              },
              images: [],
              imageUrl: null
            }
          };

          promotionsMap.set(promotionId, promotion);
        }

        // Adicionar imagem se existir
        if (row.pi_id && row.pi_filename) {
          const promotion = promotionsMap.get(promotionId);

          // Verificar se esta imagem já foi adicionada
          const imageExists = promotion.product.images.some(
            (img: ProductImage) => img.id === row.pi_id
          );

          if (!imageExists) {
            // Construir URLs seguras usando filename
            const imageUrl = `/api/products/${row.p_id}/image/${row.pi_filename}`;
            const thumbnailUrl = `/api/products/${row.p_id}/thumbnail/${row.pi_thumbnail_filename}`;

            promotion.product.images.push({
              id: row.pi_id,
              filename: row.pi_filename,
              thumbnail_filename: row.pi_thumbnail_filename,
              image_url: imageUrl,
              thumbnail_url: thumbnailUrl,
              is_primary: row.pi_is_primary
            });

            // Definir imageUrl se for imagem principal
            if (row.pi_is_primary) {
              promotion.product.imageUrl = imageUrl;
            }
          }
        }
      });

      // Converter Map para array e garantir imageUrl para compatibilidade
      const promotionsWithProducts = Array.from(promotionsMap.values()).map(promotion => {
        // Se não tem imageUrl definida mas tem imagens, usar a primeira
        if (!promotion.product.imageUrl && promotion.product.images.length > 0) {
          promotion.product.imageUrl = promotion.product.images[0].image_url;
        }

        return promotion;
      });

      console.log(`[GET SELLER PROMOTIONS] Retornando ${promotionsWithProducts.length} promoções processadas`);

      res.json(promotionsWithProducts);
    });
  } catch (error) {
    console.error('Error getting seller promotions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Update a promotion (sellers only)
export async function updatePromotion(req: Request, res: Response) {
  try {
    // Ensure user is a seller
    sellerMiddleware(req, res, async () => {
      const { id } = req.params;
      const user = req.user!;

      console.log(`Tentando atualizar promoção ID: ${id}`);
      console.log("Dados recebidos:", JSON.stringify(req.body, null, 2));

      // Get the promotion
      const promotion = await storage.getPromotion(Number(id));
      if (!promotion) {
        return res.status(404).json({ message: 'Promotion not found' });
      }

      // Get the product
      const product = await storage.getProduct(promotion.productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Verify the product belongs to the user's store
      const store = await storage.getStore(product.storeId);
      if (!store || store.userId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to modify this promotion' });
      }

      // Process the incoming data
      let processedData = {...req.body};

      // Handle discount type conversion (from frontend to database format)
      if (req.body.type === 'normal') {
        processedData.type = 'regular';
      }

      if (req.body.discountType && req.body.discountValue) {
        if (req.body.discountType === 'percentage') {
          processedData.discountPercentage = Number(req.body.discountValue);
          delete processedData.discountAmount;
        } else if (req.body.discountType === 'amount') {
          processedData.discountAmount = Number(req.body.discountValue);
          delete processedData.discountPercentage;
        }

        // Remove fields not in the schema
        delete processedData.discountType;
        delete processedData.discountValue;
      }

      // CRITICAL: Proper date handling to fix toISOString errors
      // Handle dates as strings explicitly in formats Postgres will accept
      if (processedData.startTime) {
        try {
          // Convert to string format that Postgres will accept directly
          if (processedData.startTime instanceof Date) {
            processedData.startTime = processedData.startTime.toISOString();
          } else if (typeof processedData.startTime === 'string') {
            // Make sure it's a valid date and convert to ISO format
            const dateObj = new Date(processedData.startTime);
            if (isNaN(dateObj.getTime())) {
              throw new Error('Invalid date format');
            }
            processedData.startTime = dateObj.toISOString();
          } else {
            throw new Error(`Unsupported startTime type: ${typeof processedData.startTime}`);
          }
          console.log(`Converted startTime to: ${processedData.startTime} (${typeof processedData.startTime})`);
        } catch (e) {
          console.error("Error processing startTime:", e);
          return res.status(400).json({ 
            message: 'Invalid startTime format or value',
            error: e instanceof Error ? e.message : 'Unknown error'
          });
        }
      }

      if (processedData.endTime) {
        try {
          // Convert to string format that Postgres will accept directly
          if (processedData.endTime instanceof Date) {
            processedData.endTime = processedData.endTime.toISOString();
          } else if (typeof processedData.endTime === 'string') {
            // Make sure it's a valid date and convert to ISO format
            const dateObj = new Date(processedData.endTime);
            if (isNaN(dateObj.getTime())) {
              throw new Error('Invalid date format');
            }
            processedData.endTime = dateObj.toISOString();
          } else {
            throw new Error(`Unsupported endTime type: ${typeof processedData.endTime}`);
          }
          console.log(`Converted endTime to: ${processedData.endTime} (${typeof processedData.endTime})`);
        } catch (e) {
          console.error("Error processing endTime:", e);
          return res.status(400).json({ 
            message: 'Invalid endTime format or value',
            error: e instanceof Error ? e.message : 'Unknown error'
          });
        }
      }

      console.log("Dados processados para atualização:", JSON.stringify(processedData, null, 2));

      try {
        // Update the promotion with processed data
        const updatedPromotion = await storage.updatePromotion(Number(id), processedData);
        console.log("Promoção atualizada com sucesso:", updatedPromotion);
        res.json(updatedPromotion);
      } catch (updateError) {
        console.error("Erro durante a atualização da promoção:", updateError);
        return res.status(500).json({ 
          message: 'Failed to update promotion', 
          error: updateError instanceof Error ? updateError.message : 'Unknown error'
        });
      }
    });
  } catch (error) {
    console.error('Error updating promotion:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// New simplified method for promotion update
export async function simpleUpdatePromotion(req: Request, res: Response) {
  try {
    // Ensure user is a seller
    sellerMiddleware(req, res, async () => {
      const { id } = req.params;
      const user = req.user!;

      console.log(`[SimpleUpdate] Atualizando promoção ${id} com dados:`, req.body);

      // Get the promotion
      const promotion = await storage.getPromotion(Number(id));
      if (!promotion) {
        return res.status(404).json({ message: 'Promotion not found' });
      }

      // Get the product
      const product = await storage.getProduct(promotion.productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Verify the product belongs to the user's store
      const store = await storage.getStore(product.storeId);
      if (!store || store.userId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to modify this promotion' });
      }

      // Extract fields from request body
      const { 
        type,
        discountType, 
        discountValue,
        startTime, 
        endTime 
      } = req.body;

      // Process discount fields - convert from frontend format to DB format
      let discountPercentage = promotion.discountPercentage;

      if (discountType && discountValue) {
        if (discountType === 'percentage') {
          discountPercentage = Number(discountValue);
        }
      }

      // Format dates as needed
      let formattedStartTime = startTime ? new Date(startTime).toISOString() : promotion.startTime;
      let formattedEndTime = endTime ? new Date(endTime).toISOString() : promotion.endTime;

      // Using direct database query with snake_case column names
      const query = `
        UPDATE promotions 
        SET 
          type = $1,
          discount_percentage = $2,
          start_time = $3::timestamp,
          end_time = $4::timestamp,
          updated_at = NOW()
        WHERE id = $5
        RETURNING *;
      `;

      const values = [
        type || promotion.type,
        discountPercentage,
        formattedStartTime,
        formattedEndTime,
        Number(id)
      ];

      console.log('[SimpleUpdate] Executing query with values:', {
        query,
        values
      });

      const result = await pool.query(query, values);
      console.log('[SimpleUpdate] Update result rows:', result.rows);

      if (!result.rows || result.rows.length === 0) {
        return res.status(500).json({ message: 'Failed to update promotion' });
      }

      const updatedPromotion = result.rows[0];

      // Transform snake_case back to camelCase for the response
      const formattedPromotion = {
        id: updatedPromotion.id,
        productId: updatedPromotion.product_id,
        type: updatedPromotion.type,
        discountPercentage: updatedPromotion.discount_percentage,
        startTime: updatedPromotion.start_time,
        endTime: updatedPromotion.end_time,
        createdAt: updatedPromotion.created_at,
        updatedAt: updatedPromotion.updated_at
      };

      console.log('[SimpleUpdate] Formatted promotion:', formattedPromotion);

      return res.json(formattedPromotion);
    });
  } catch (error) {
    console.error('[SimpleUpdate] Error:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function deletePromotion(req: Request, res: Response) {
  try {
    // Ensure user is a seller
    sellerMiddleware(req, res, async () => {
      const { id } = req.params;
      const user = req.user!;

      // Log for debugging
      console.log(`Tentando excluir promoção com ID: ${id}`);

      // Get the promotion
      const promotion = await storage.getPromotion(Number(id));
      if (!promotion) {
        return res.status(404).json({ message: 'Promotion not found' });
      }

      // Get the product
      const product = await storage.getProduct(promotion.productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Verify the product belongs to the user's store
      const store = await storage.getStore(product.storeId);
      if (!store || store.userId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to delete this promotion' });
      }

      // Check if promotion is expired (for logging purposes)
      const now = new Date();
      const endDate = new Date(promotion.endTime);
      const isExpired = now > endDate;

      if (isExpired) {
        console.log(`Excluindo promoção expirada ${id} (expirou em: ${endDate})`);
      } else {
        console.log(`Excluindo promoção ativa ${id}`);
      }

      // Delete the promotion (permitir exclusão independente de estar expirada)
      const success = await storage.deletePromotion(Number(id));

      if (success) {
        console.log(`Promoção ${id} excluída com sucesso`);
        res.json({ 
          success: true, 
          message: isExpired ? 'Expired promotion deleted successfully' : 'Promotion deleted successfully' 
        });
      } else {
        console.error(`Falha ao excluir promoção ${id}`);
        res.status(500).json({ message: 'Failed to delete promotion' });
      }
    });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}