import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { insertProductSchema } from '@shared/schema';
import { sellerMiddleware } from '../middleware/auth';
import { pool } from '../db';

// Get products with filtering options
export async function getProducts(req: Request, res: Response) {
  try {
    // Parâmetros de filtro
    const { 
      category, 
      categoryId, 
      categorySlug,
      search, 
      minPrice, 
      maxPrice, 
      sortBy,
      promotion,
      limit,
      storeId,
      ownerOnly // Parâmetro para filtrar apenas produtos do usuário autenticado
    } = req.query;

    console.log('Fetching products with filters:', { 
      category, categoryId, categorySlug, search, minPrice, maxPrice, sortBy, promotion, limit, storeId, ownerOnly 
    });

    let query = 'SELECT p.* FROM products p';
    let params = [];
    let paramIndex = 1;
    let whereConditions = ['p.is_active = true'];

    // Se ownerOnly=true, filtrar apenas produtos das lojas do usuário autenticado
    if (ownerOnly === 'true' && req.session?.userId) {
      query += ' INNER JOIN stores s ON p.store_id = s.id';
      whereConditions.push(`s.user_id = $${paramIndex}`);
      params.push(req.session.userId);
      paramIndex++;
      console.log('Filtering products for authenticated user:', req.session.userId);
    }

    // Se um storeId específico foi fornecido, validar propriedade se o usuário estiver autenticado
    if (storeId && req.session?.userId) {
      // Verificar se o usuário é proprietário da loja
      const storeOwnerQuery = 'SELECT user_id FROM stores WHERE id = $1';
      const storeOwnerResult = await pool.query(storeOwnerQuery, [storeId]);

      if (storeOwnerResult.rows.length === 0) {
        return res.status(404).json({ 
          products: [],
          error: 'Loja não encontrada',
          message: 'A loja especificada não existe'
        });
      }

      if (storeOwnerResult.rows[0].user_id !== req.session.userId) {
        return res.status(403).json({ 
          products: [],
          error: 'Acesso negado',
          message: 'Você não tem permissão para acessar produtos desta loja'
        });
      }

      whereConditions.push(`p.store_id = $${paramIndex}`);
      params.push(storeId);
      paramIndex++;
      console.log('Filtering products for specific store:', storeId);
    }

    query += ` WHERE ${whereConditions.join(' AND ')}`;

    // Adicionar filtro por categoria se fornecido
    if (category) {
      query += ` AND LOWER(p.category) = LOWER($${paramIndex})`;
      params.push(category);
      paramIndex++;
    } else if (categorySlug) {
      // Se tiver slug da categoria, buscar nome da categoria
      const categoryQuery = 'SELECT name FROM categories WHERE slug = $1';
      const categoryResult = await pool.query(categoryQuery, [categorySlug]);

      if (categoryResult.rows.length > 0) {
        const categoryName = categoryResult.rows[0].name;
        query += ` AND LOWER(p.category) = LOWER($${paramIndex})`;
        params.push(categoryName);
        paramIndex++;
      }
    }

    // Filtros de preço
    if (minPrice) {
      query += ` AND p.price >= $${paramIndex}`;
      params.push(minPrice);
      paramIndex++;
    }

    if (maxPrice) {
      query += ` AND p.price <= $${paramIndex}`;
      params.push(maxPrice);
      paramIndex++;
    }

    // Filtro de busca
    if (search) {
      query += ` AND (LOWER(p.name) LIKE LOWER($${paramIndex}) OR LOWER(p.description) LIKE LOWER($${paramIndex}))`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Ordenação
    if (sortBy === 'price_asc') {
      query += ' ORDER BY p.price ASC';
    } else if (sortBy === 'price_desc') {
      query += ' ORDER BY p.price DESC';
    } else if (sortBy === 'newest') {
      query += ' ORDER BY p.created_at DESC';
    } else if (sortBy === 'name_asc') {
      query += ' ORDER BY p.name ASC';
    } else if (sortBy === 'name_desc') {
      query += ' ORDER BY p.name DESC';
    } else {
      // Default ordering
      query += ' ORDER BY p.created_at DESC';
    }

    // Adicionar limite se fornecido
    if (limit) {
      query += ` LIMIT ${Number(limit)}`;
    }

    const { rows } = await pool.query(query, params);

    // Buscar informações adicionais para cada produto (imagens e loja)
    const productsWithDetails = await Promise.all(
      rows.map(async (product) => {
        try {
          // Buscar imagens do produto
          const imagesQuery = 'SELECT * FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC, display_order ASC';
          const imagesResult = await pool.query(imagesQuery, [product.id]);

          // Buscar informações da loja
          const storeQuery = 'SELECT id, name FROM stores WHERE id = $1';
          const storeResult = await pool.query(storeQuery, [product.store_id]);

          if (storeResult.rows.length > 0) {
            // Retornar produto com imagens e detalhes da loja
            return {
              ...product,
              images: imagesResult.rows.map(img => img.image_url),
              store: storeResult.rows[0]
            };
          }

          // Caso a loja não seja encontrada
          return {
            ...product,
            images: imagesResult.rows.map(img => img.image_url)
          };
        } catch (err) {
          console.error(`Erro ao buscar detalhes do produto ${product.id}:`, err);
          return product;
        }
      })
    );

    // SEMPRE retornar um JSON válido com produtos completos
    return res.json({ 
      products: productsWithDetails,
      count: productsWithDetails.length,
      filters: { category, categoryId, categorySlug }
    });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);

    // SEMPRE retornar um JSON válido, mesmo em caso de erro
    return res.status(500).json({ 
      products: [],
      error: 'Erro ao buscar produtos',
      message: error instanceof Error ? error.message : 'Erro inesperado'
    });
  }
}

// Get featured products
export async function getFeaturedProducts(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 8;
    const products = await storage.getFeaturedProducts(limit);

    // SEMPRE retornar um JSON válido
    return res.json({ 
      products: products,
      count: products.length
    });
  } catch (error) {
    console.error('Erro ao buscar produtos em destaque:', error);

    // SEMPRE retornar um JSON válido, mesmo em caso de erro
    return res.status(500).json({ 
      products: [],
      error: 'Erro ao buscar produtos em destaque',
      message: error instanceof Error ? error.message : 'Erro inesperado'
    });
  }
}

// Get a single product by ID
export async function getProduct(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const product = await storage.getProduct(Number(id));

    if (!product) {
      return res.status(404).json({ 
        product: null,
        error: 'Product not found',
        message: 'O produto solicitado não foi encontrado'
      });
    }

    return res.json({
      product: product,
      success: true
    });
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    return res.status(500).json({ 
      product: null,
      error: 'Erro ao buscar produto',
      message: error instanceof Error ? error.message : 'Erro inesperado'
    });
  }
}

// Get related products
export async function getRelatedProducts(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : 4;

    const relatedProducts = await storage.getRelatedProducts(Number(id), limit);

    // SEMPRE retornar um JSON válido
    return res.json({ 
      products: relatedProducts,
      count: relatedProducts.length,
      productId: Number(id)
    });
  } catch (error) {
    console.error('Erro ao buscar produtos relacionados:', error);

    // SEMPRE retornar um JSON válido, mesmo em caso de erro
    return res.status(500).json({ 
      products: [],
      error: 'Erro ao buscar produtos relacionados',
      message: error instanceof Error ? error.message : 'Erro inesperado'
    });
  }
}

// Create a new product (sellers only)
export async function createProduct(req: Request, res: Response) {
  try {
    // Ensure user is a seller
    sellerMiddleware(req, res, async () => {
      const user = req.user!;

      // Validate product data
      const productSchema = insertProductSchema.extend({
        storeId: z.number()
      });

      const validationResult = productSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          success: false,
          product: null,
          error: 'Validation error', 
          errors: validationResult.error.errors 
        });
      }

      const productData = validationResult.data;

      // Verify the store belongs to the user
      const store = await storage.getStore(productData.storeId);
      if (!store || store.userId !== user.id) {
        return res.status(403).json({ 
          success: false, 
          product: null,
          error: 'Authorization error',
          message: 'Você não tem permissão para adicionar produtos a esta loja'
        });
      }

      const product = await storage.createProduct(productData);
      return res.status(201).json({
        success: true,
        product: product,
        message: 'Produto criado com sucesso'
      });
    });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    return res.status(500).json({ 
      success: false,
      product: null,
      error: 'Erro ao criar produto',
      message: error instanceof Error ? error.message : 'Erro inesperado'
    });
  }
}

// Update a product (sellers only)
export async function updateProduct(req: Request, res: Response) {
  try {
    // Ensure user is a seller
    sellerMiddleware(req, res, async () => {
      const { id } = req.params;
      const user = req.user!;

      // Get the product
      const product = await storage.getProduct(Number(id));
      if (!product) {
        return res.status(404).json({ 
          success: false,
          product: null,
          error: 'Product not found',
          message: 'O produto solicitado não foi encontrado'
        });
      }

      // Verify the store belongs to the user
      const store = await storage.getStore(product.storeId);
      if (!store || store.userId !== user.id) {
        return res.status(403).json({ 
          success: false,
          product: null,
          error: 'Authorization error',
          message: 'Você não tem permissão para modificar este produto'
        });
      }

      // Update the product
      const updatedProduct = await storage.updateProduct(Number(id), req.body);
      return res.json({
        success: true,
        product: updatedProduct,
        message: 'Produto atualizado com sucesso'
      });
    });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    return res.status(500).json({ 
      success: false,
      product: null,
      error: 'Erro ao atualizar produto',
      message: error instanceof Error ? error.message : 'Erro inesperado'
    });
  }
}