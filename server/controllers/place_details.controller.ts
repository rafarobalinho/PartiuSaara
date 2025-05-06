/**
 * Controlador para manipulação de detalhes de lugares do Google Maps
 */

import { Request, Response } from 'express';
import { db, pool } from '../db';
import axios from 'axios';

/**
 * Cria a tabela para armazenar detalhes de lugares do Google
 */
export async function createStoreDetailsTable(req: Request, res: Response) {
  try {
    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS store_place_details (
      id SERIAL PRIMARY KEY,
      store_id INTEGER REFERENCES stores(id),
      place_id TEXT UNIQUE NOT NULL,
      name TEXT,
      formatted_address TEXT,
      phone_number TEXT,
      website TEXT,
      rating DECIMAL,
      total_ratings INTEGER,
      business_status TEXT,
      types JSONB,
      opening_hours JSONB,
      reviews JSONB,
      editorial_summary TEXT,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_store_place_details_store_id ON store_place_details(store_id);
    CREATE INDEX IF NOT EXISTS idx_store_place_details_place_id ON store_place_details(place_id);
    `;

    await pool.query(createTableQuery);
    console.log('Tabela store_place_details criada com sucesso');
    
    res.json({ 
      success: true, 
      message: 'Tabela store_place_details criada com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao criar tabela store_place_details:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao criar tabela store_place_details',
      message: error instanceof Error ? error.message : 'Erro desconhecido' 
    });
  }
}

/**
 * Obtém detalhes de um lugar a partir do place_id
 */
async function getPlaceDetails(placeId: string) {
  try {
    console.log(`Obtendo detalhes para o lugar: ${placeId}`);
    
    if (!placeId) {
      throw new Error('Place ID não pode ser nulo ou vazio');
    }
    
    // Campos que queremos recuperar da API
    const fields = [
      'name',
      'formatted_address',
      'formatted_phone_number',
      'website',
      'rating',
      'user_ratings_total',
      'business_status',
      'opening_hours',
      'reviews',
      'types',
      'editorial_summary',
      'photos'
    ].join(',');
    
    // Verificar se a API Key está definida
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY não está definida no ambiente');
    }
    
    // Construir URL da API
    const apiUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&language=pt-BR&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    
    // Fazer a requisição HTTP
    const response = await axios.get(apiUrl);
    
    // Verificar se a requisição foi bem-sucedida
    if (response.data.status !== 'OK') {
      throw new Error(`Falha ao obter detalhes do lugar: ${response.data.status}`);
    }
    
    console.log(`Detalhes recuperados com sucesso para o lugar ${placeId}`);
    
    // Extrair os dados relevantes e formata-los
    const placeData = response.data.result;
    
    return {
      name: placeData.name,
      formatted_address: placeData.formatted_address,
      phone_number: placeData.formatted_phone_number,
      website: placeData.website,
      rating: placeData.rating,
      total_ratings: placeData.user_ratings_total,
      business_status: placeData.business_status,
      types: placeData.types,
      opening_hours: placeData.opening_hours,
      reviews: placeData.reviews,
      editorial_summary: placeData.editorial_summary ? placeData.editorial_summary.overview : null
    };
  } catch (error) {
    console.error(`Erro ao obter detalhes do lugar ${placeId}:`, error);
    throw error;
  }
}

/**
 * Salva ou atualiza os detalhes de um lugar no banco de dados
 */
async function saveStoreDetails(storeId: number, placeId: string, placeDetails: any) {
  try {
    console.log(`Salvando detalhes para loja ID ${storeId}, place ID ${placeId}`);
    
    if (!storeId || !placeId || !placeDetails) {
      throw new Error('Store ID, Place ID e detalhes do lugar são obrigatórios');
    }
    
    // Usar SQL nativo para evitar problemas com conversão de tipos e propriedades inexistentes
    const sql = `
      INSERT INTO store_place_details (
        store_id, place_id, name, formatted_address, phone_number, 
        website, rating, total_ratings, business_status, types,
        opening_hours, reviews, editorial_summary, last_updated
      ) 
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP
      )
      ON CONFLICT (place_id) 
      DO UPDATE SET
        store_id = $1,
        name = $3,
        formatted_address = $4,
        phone_number = $5,
        website = $6,
        rating = $7,
        total_ratings = $8,
        business_status = $9,
        types = $10,
        opening_hours = $11,
        reviews = $12,
        editorial_summary = $13,
        last_updated = CURRENT_TIMESTAMP
      RETURNING id;
    `;
    
    const values = [
      storeId,
      placeId,
      placeDetails.name,
      placeDetails.formatted_address,
      placeDetails.phone_number,
      placeDetails.website,
      placeDetails.rating,
      placeDetails.total_ratings,
      placeDetails.business_status,
      JSON.stringify(placeDetails.types || []),
      JSON.stringify(placeDetails.opening_hours || {}),
      JSON.stringify(placeDetails.reviews || []),
      placeDetails.editorial_summary
    ];
    
    const result = await pool.query(sql, values);
    
    if (result.rows.length === 0) {
      throw new Error('Nenhum registro foi inserido ou atualizado');
    }
    
    console.log(`Detalhes salvos com sucesso para loja ID ${storeId}`);
    return { success: true, id: result.rows[0].id };
  } catch (error) {
    console.error(`Erro ao salvar detalhes da loja ${storeId}:`, error);
    throw error;
  }
}

/**
 * Endpoint para obter e salvar detalhes de uma loja específica
 */
export async function updateStoreDetails(req: Request, res: Response) {
  try {
    const storeId = parseInt(req.params.id);
    
    if (isNaN(storeId)) {
      return res.status(400).json({ success: false, error: 'ID de loja inválido' });
    }
    
    // Buscar a loja para obter o place_id
    const storeResult = await pool.query('SELECT id, name, place_id FROM stores WHERE id = $1', [storeId]);
    
    if (storeResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Loja não encontrada' });
    }
    
    const store = storeResult.rows[0];
    
    if (!store.place_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Loja não possui place_id. Execute a geocodificação primeiro.' 
      });
    }
    
    // Obter detalhes do lugar
    const placeDetails = await getPlaceDetails(store.place_id);
    
    // Salvar detalhes no banco de dados
    await saveStoreDetails(storeId, store.place_id, placeDetails);
    
    res.json({
      success: true,
      message: `Detalhes atualizados com sucesso para loja ${store.name}`
    });
  } catch (error) {
    console.error('Erro ao atualizar detalhes da loja:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar detalhes da loja',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Obtém os detalhes salvos de uma loja específica
 */
export async function getStorePlaceDetails(req: Request, res: Response) {
  try {
    const storeId = parseInt(req.params.id);
    
    if (isNaN(storeId)) {
      return res.status(400).json({ success: false, error: 'ID de loja inválido' });
    }
    
    const query = `
      SELECT * FROM store_place_details
      WHERE store_id = $1
      ORDER BY last_updated DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [storeId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Detalhes não encontrados para esta loja' 
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes da loja:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar detalhes da loja',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}