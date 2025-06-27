import { Request, Response } from 'express';
import { pool } from '../db';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
// Se você usa o sellerMiddleware e storage, mantenha os imports
// import { sellerMiddleware } from '../middleware/auth';
// import { storage } from '../storage';

/**
 * @route GET /api/products
 * @desc Retorna produtos com filtros, incluindo a imagem principal.
 */
export async function getProducts(req: Request, res: Response) {
  try {
    const { category, categorySlug, search, minPrice, maxPrice, sortBy, limit, storeId } = req.query;

    let query = `
      SELECT 
        p.*, 
        s.name AS store_name,
        img.filename AS primary_image_filename 
      FROM 
        products p
      LEFT JOIN 
        stores s ON p.store_id = s.id
      LEFT JOIN LATERAL (
        SELECT filename FROM product_images pi
        WHERE pi.product_id = p.id
        ORDER BY pi.is_primary DESC, pi.id DESC LIMIT 1
      ) img ON true
    `;
    let params: any[] = [];
    let paramIndex = 1;
    let whereConditions = ['p.is_active = true'];

    if (storeId) {
      whereConditions.push(`p.store_id = $${paramIndex++}`);
      params.push(storeId);
    }
    // Adicione aqui sua lógica de filtros (category, price, search, etc.)

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    if (sortBy === 'price_asc') query += ' ORDER BY p.price ASC';
    else if (sortBy === 'price_desc') query += ' ORDER BY p.price DESC';
    else query += ' ORDER BY p.created_at DESC';

    if (limit) query += ` LIMIT ${parseInt(String(limit), 10)}`;

    const { rows } = await pool.query(query, params);

    const finalProducts = rows.map(product => ({
      ...product,
      store: { id: product.store_id, name: product.store_name },
      primary_image_api_url: product.primary_image_filename ? `/api/products/${product.id}/primary-image` : null,
    }));

    return res.json({ products: finalProducts });

  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return res.status(500).json({ products: [], error: 'Erro ao buscar produtos' });
  }
}

/**
 * @route GET /api/products/featured
 * @desc Retorna produtos em destaque, ordenados pelo maior desconto.
 */
export async function getFeaturedProducts(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 8;

    const query = `
      SELECT 
        p.*, 
        s.name AS store_name, 
        img.filename AS primary_image_filename,
        ((p.price - p.discounted_price) / p.price) AS discount_percentage
      FROM 
        products p
      LEFT JOIN 
        stores s ON p.store_id = s.id
      LEFT JOIN LATERAL (
        SELECT filename FROM product_images pi WHERE pi.product_id = p.id
        ORDER BY pi.is_primary DESC, pi.id DESC LIMIT 1
      ) img ON true
      WHERE 
        p.is_active = true AND
        p.discounted_price IS NOT NULL AND
        p.discounted_price > 0 AND
        p.price > p.discounted_price
      ORDER BY 
        discount_percentage DESC,
        p.created_at DESC
      LIMIT $1;
    `;
    const { rows } = await pool.query(query, [limit]);

    const finalProducts = rows.map(product => ({
      ...product,
      store: { id: product.store_id, name: product.store_name },
      primary_image_api_url: product.primary_image_filename ? `/api/products/${product.id}/primary-image` : null,
    }));

    return res.json({ products: finalProducts });
  } catch (error) {
    console.error('Erro ao buscar produtos em destaque:', error);
    return res.status(500).json({ products: [], error: 'Erro ao buscar produtos em destaque' });
  }
}

/**
 * @route GET /api/products/:id
 * @desc Retorna um único produto com todos os seus detalhes e galeria de imagens.
 */
export async function getProduct(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const productId = parseInt(id, 10);
    if (isNaN(productId)) return res.status(400).json({ error: 'ID de produto inválido' });

    const productQuery = `
      SELECT p.*, s.name AS store_name
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE p.id = $1;
    `;
    const productResult = await pool.query(productQuery, [productId]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    const productData = productResult.rows[0];

    const imagesQuery = `
      SELECT id, filename, is_primary FROM product_images
      WHERE product_id = $1 ORDER BY is_primary DESC, display_order ASC, id ASC;
    `;
    const imagesResult = await pool.query(imagesQuery, [productId]);

    const imageGallery = imagesResult.rows.map(img => ({
      id: img.id,
      filename: img.filename,
      is_primary: img.is_primary,
      secure_url: `/api/products/${productData.id}/image/${img.id}`
    }));

    const finalProduct = {
      ...productData,
      store: { id: productData.store_id, name: productData.store_name },
      images: imageGallery,
    };

    return res.json({ product: finalProduct });
  } catch (error) {
    console.error(`Erro ao buscar produto ${req.params.id}:`, error);
    return res.status(500).json({ error: 'Erro ao buscar produto' });
  }
}

/**
 * @route GET /api/products/:id/related
 * @desc Retorna produtos relacionados (mesma categoria).
 */
export async function getRelatedProducts(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const productId = parseInt(id, 10);
        const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 4;

        const currentProductResult = await pool.query('SELECT category FROM products WHERE id = $1', [productId]);
        if(currentProductResult.rows.length === 0) return res.json({ products: [] });

        const category = currentProductResult.rows[0].category;

        const query = `
            SELECT p.*, s.name AS store_name, img.filename AS primary_image_filename 
            FROM products p
            LEFT JOIN stores s ON p.store_id = s.id
            LEFT JOIN LATERAL (
                SELECT filename FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.id DESC LIMIT 1
            ) img ON true
            WHERE p.is_active = true AND p.category = $1 AND p.id != $2
            ORDER BY p.created_at DESC LIMIT $3;
        `;
        const { rows } = await pool.query(query, [category, productId, limit]);

        const finalProducts = rows.map(product => ({
            ...product,
            store: { id: product.store_id, name: product.store_name },
            primary_image_api_url: product.primary_image_filename ? `/api/products/${product.id}/primary-image` : null,
        }));

        return res.json({ products: finalProducts });
    } catch (error) {
        console.error('Erro ao buscar produtos relacionados:', error);
        return res.status(500).json({ products: [], error: 'Erro ao buscar produtos relacionados' });
    }
}

/**
 * Cria estrutura de pastas para um produto
 */
function createProductDirectories(storeId: number, productId: number) {
  try {
    const baseUploadPath = path.join(process.cwd(), 'public', 'uploads');
    const productDir = path.join(baseUploadPath, 'stores', storeId.toString(), 'products', productId.toString());
    const thumbnailsDir = path.join(productDir, 'thumbnails');

    // Criar estrutura de pastas
    if (!fs.existsSync(productDir)) {
      fs.mkdirSync(productDir, { recursive: true });
      console.log(`📁 [PRODUCT-CREATE] Criada pasta: stores/${storeId}/products/${productId}/`);
    }

    if (!fs.existsSync(thumbnailsDir)) {
      fs.mkdirSync(thumbnailsDir, { recursive: true });
      console.log(`📁 [PRODUCT-CREATE] Criada pasta: stores/${storeId}/products/${productId}/thumbnails/`);
    }

    return true;
  } catch (error) {
    console.error(`❌ [PRODUCT-CREATE] Erro ao criar pastas para produto ${productId}:`, error);
    return false;
  }
}

/**
 * @route POST /api/products
 * @desc Cria um novo produto.
 */
export async function createProduct(req: Request, res: Response) {
    try {
        const { name, description, price, storeId, category, stock } = req.body;
        // Adicionar validação com Zod aqui é uma boa prática
        const query = `
            INSERT INTO products (name, description, price, store_id, category, stock, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *;
        `;
        const params = [name, description, price, storeId, category, stock];
        const result = await pool.query(query, params);
        
        const product = result.rows[0];
        
        // Criar estrutura de pastas automaticamente
        console.log(`📦 [PRODUCT-CREATE] Criando estrutura de pastas para produto ${product.id} (loja ${storeId})...`);
        const foldersCreated = createProductDirectories(storeId, product.id);
        
        if (!foldersCreated) {
          console.warn(`⚠️ [PRODUCT-CREATE] Falha ao criar pastas para produto ${product.id}, mas produto foi criado com sucesso`);
        }
        
        return res.status(201).json({ product });
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        return res.status(500).json({ error: 'Erro ao criar produto' });
    }
}

/**
 * @route PUT /api/products/:id
 * @desc Atualiza um produto existente.
 */
export async function updateProduct(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { name, description, price, category, stock } = req.body;
        const query = `
            UPDATE products SET name = $1, description = $2, price = $3, category = $4, stock = $5
            WHERE id = $6 RETURNING *;
        `;
        const params = [name, description, price, category, stock, id];
        const result = await pool.query(query, params);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Produto não encontrado para atualização.' });
        }
        return res.json({ product: result.rows[0] });
    } catch (error) {
        console.error(`Erro ao atualizar produto ${req.params.id}:`, error);
        return res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
}