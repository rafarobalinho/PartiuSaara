import { Request, Response } from 'express';
import { pool, db } from '../db';
import axios from 'axios';
import { sql } from 'drizzle-orm';

/**
 * Configura a tabela store_place_details no banco de dados se ainda não existir
 */
export async function setupPlaceDetailsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_place_details (
        id SERIAL PRIMARY KEY,
        store_id INTEGER NOT NULL UNIQUE,
        place_id TEXT,
        formatted_address TEXT,
        formatted_phone_number TEXT,
        international_phone_number TEXT,
        website TEXT,
        url TEXT,
        vicinity TEXT,
        utc_offset_minutes INTEGER,
        rating NUMERIC(3,1),
        user_ratings_total INTEGER,
        opening_hours TEXT,
        photos TEXT,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Tabela store_place_details criada ou verificada com sucesso");
    return true;
  } catch (error) {
    console.error("Erro ao configurar tabela store_place_details:", error);
    return false;
  }
}

/**
 * Obtém detalhes de um lugar do Google Places usando o ID da loja
 * e suas coordenadas de geocodificação
 */
export async function getStoreGooglePlaceDetails(req: Request, res: Response) {
  const { storeId } = req.params;
  
  if (!storeId) {
    return res.status(400).json({ error: 'ID da loja não fornecido' });
  }
  
  try {
    // Verificar se já existem detalhes para esta loja
    const result = await pool.query(
      'SELECT * FROM store_place_details WHERE store_id = $1',
      [storeId]
    );
    
    if (result.rows.length > 0) {
      // Detalhes existem, retornar dados armazenados
      const placeDetails = result.rows[0];
      return res.status(200).json(placeDetails);
    } else {
      // Nenhum detalhe encontrado
      return res.status(404).json({ 
        error: 'Detalhes do lugar não encontrados', 
        message: 'É necessário buscar os detalhes primeiro'
      });
    }
    
  } catch (error: any) {
    console.error('Erro ao buscar detalhes do lugar:', error);
    return res.status(500).json({ 
      error: 'Erro ao buscar detalhes do lugar',
      message: error.message
    });
  }
}

/**
 * Atualiza os detalhes do lugar usando a API do Google Places
 */
export async function refreshStoreGooglePlaceDetails(req: Request, res: Response) {
  const { storeId } = req.params;
  
  if (!storeId) {
    return res.status(400).json({ error: 'ID da loja não fornecido' });
  }
  
  try {
    // Buscar coordenadas da loja
    const store = await pool.query(
      'SELECT name, location FROM stores WHERE id = $1',
      [storeId]
    );
    
    if (store.rows.length === 0) {
      return res.status(404).json({ error: 'Loja não encontrada' });
    }
    
    const storeData = store.rows[0];
    
    if (!storeData.location || !storeData.location.latitude || !storeData.location.longitude) {
      return res.status(400).json({ 
        error: 'Coordenadas de geocodificação ausentes', 
        message: 'A loja precisa ser geocodificada antes de buscar detalhes do lugar'
      });
    }
    
    const lat = storeData.location.latitude;
    const lng = storeData.location.longitude;
    
    // Buscar detalhes do lugar usando a API do Google Places
    const googleAPIKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!googleAPIKey) {
      return res.status(500).json({ 
        error: 'API key não configurada', 
        message: 'A chave de API do Google Maps não está configurada'
      });
    }
    
    // Primeiro, vamos fazer uma busca por lugares próximos para obter o place_id
    const nearbySearchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=50&key=${googleAPIKey}`;
    
    const nearbyResponse = await axios.get(nearbySearchUrl);
    
    if (!nearbyResponse.data.results || nearbyResponse.data.results.length === 0) {
      return res.status(404).json({ 
        error: 'Nenhum lugar encontrado próximo às coordenadas',
        message: 'Não foi possível encontrar lugares próximos às coordenadas fornecidas'
      });
    }
    
    // Usar o primeiro resultado como o mais provável (mais próximo)
    const place = nearbyResponse.data.results[0];
    const placeId = place.place_id;
    
    // Agora, buscar detalhes completos usando o place_id
    const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,international_phone_number,website,url,vicinity,utc_offset_minutes,rating,user_ratings_total,opening_hours,photos&key=${googleAPIKey}`;
    
    const detailsResponse = await axios.get(placeDetailsUrl);
    
    if (!detailsResponse.data.result) {
      return res.status(404).json({ 
        error: 'Detalhes do lugar não encontrados',
        message: 'Não foi possível obter detalhes do lugar usando o place_id'
      });
    }
    
    const placeDetails = detailsResponse.data.result;
    
    // Verificar se já existe um registro para essa loja
    const checkQuery = `
      SELECT id FROM store_place_details WHERE store_id = $1
    `;
    
    const checkResult = await pool.query(checkQuery, [storeId]);
    
    let savedDetails;
    
    if (checkResult.rows.length > 0) {
      // Atualizar registro existente
      const updateQuery = `
        UPDATE store_place_details 
        SET 
          place_id = $2,
          formatted_address = $3,
          formatted_phone_number = $4,
          international_phone_number = $5,
          website = $6,
          url = $7,
          vicinity = $8,
          utc_offset_minutes = $9,
          rating = $10,
          user_ratings_total = $11,
          opening_hours = $12,
          photos = $13
        WHERE store_id = $1
        RETURNING *
      `;
      
      const values = [
        storeId,
        placeDetails.place_id || null,
        placeDetails.formatted_address || null,
        placeDetails.formatted_phone_number || null,
        placeDetails.international_phone_number || null,
        placeDetails.website || null,
        placeDetails.url || null,
        placeDetails.vicinity || null,
        placeDetails.utc_offset_minutes || null,
        placeDetails.rating || null,
        placeDetails.user_ratings_total || null,
        placeDetails.opening_hours ? JSON.stringify(placeDetails.opening_hours) : null,
        placeDetails.photos ? JSON.stringify(placeDetails.photos) : null
      ];
      
      savedDetails = await pool.query(updateQuery, values);
    } else {
      // Inserir novo registro
      const insertQuery = `
        INSERT INTO store_place_details 
          (store_id, place_id, formatted_address, formatted_phone_number, 
           international_phone_number, website, url, vicinity, 
           utc_offset_minutes, rating, user_ratings_total, opening_hours, photos)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      
      const values = [
        storeId,
        placeDetails.place_id || null,
        placeDetails.formatted_address || null,
        placeDetails.formatted_phone_number || null,
        placeDetails.international_phone_number || null,
        placeDetails.website || null,
        placeDetails.url || null,
        placeDetails.vicinity || null,
        placeDetails.utc_offset_minutes || null,
        placeDetails.rating || null,
        placeDetails.user_ratings_total || null,
        placeDetails.opening_hours ? JSON.stringify(placeDetails.opening_hours) : null,
        placeDetails.photos ? JSON.stringify(placeDetails.photos) : null
      ];
      
      savedDetails = await pool.query(insertQuery, values);
    }
    
    return res.status(200).json({ 
      ...savedDetails.rows[0],
      storeId: parseInt(storeId),
      message: 'Detalhes do lugar atualizados com sucesso'
    });
    
  } catch (error: any) {
    console.error('Erro ao atualizar detalhes do lugar:', error);
    return res.status(500).json({ 
      error: 'Erro ao atualizar detalhes do lugar',
      message: error.message
    });
  }
}

/**
 * Função para atualizar detalhes de todas as lojas em lote
 * Busca lojas que têm place_id ou coordenadas geocodificadas
 * mas não têm detalhes ou com detalhes desatualizados
 */
export async function updateAllStoresPlaceDetails(req: Request, res: Response) {
  try {
    console.log('Iniciando processo de atualização de detalhes das lojas');
    
    // Buscar todas as lojas que têm coordenadas geocodificadas mas não têm detalhes
    // CORREÇÃO: Simplificamos a consulta para evitar problemas com updated_at
    const result = await pool.query(`
      SELECT s.id, s.name, s.location
      FROM stores s
      LEFT JOIN store_place_details d ON s.id = d.store_id
      WHERE s.location IS NOT NULL 
        AND s.location::jsonb ? 'latitude' 
        AND s.location::jsonb ? 'longitude'
        AND d.id IS NULL
      LIMIT 50
    `);
    
    const stores = result.rows;
    console.log(`Encontradas ${stores.length} lojas para atualizar detalhes`);
    
    const results = {
      total: stores.length,
      success: 0,
      failed: 0,
      details: [] as Array<{
        id: number;
        name: string;
        status: string;
        reason?: string;
        details_id?: number;
      }>
    };
    
    // Se não houver lojas para atualizar, retornar imediatamente
    if (stores.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhuma loja precisa de atualização de detalhes',
        results
      });
    }
    
    // API Key do Google Maps
    const googleAPIKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!googleAPIKey) {
      return res.status(500).json({ 
        success: false,
        error: 'API key não configurada', 
        message: 'A chave de API do Google Maps não está configurada'
      });
    }
    
    // Processar cada loja
    for (const store of stores) {
      try {
        console.log(`Buscando detalhes para loja ID ${store.id}: ${store.name}`);
        
        if (!store.location || !store.location.latitude || !store.location.longitude) {
          console.log(`Loja ID ${store.id} não possui coordenadas válidas`);
          results.failed++;
          results.details.push({
            id: store.id,
            name: store.name || '',
            status: 'failed',
            reason: 'Coordenadas não disponíveis'
          });
          continue;
        }
        
        const lat = store.location.latitude;
        const lng = store.location.longitude;
        
        // Primeiro, fazer uma busca por lugares próximos para obter o place_id
        console.log(`Buscando lugares próximos às coordenadas: ${lat}, ${lng}`);
        const nearbySearchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=50&key=${googleAPIKey}`;
        
        const nearbyResponse = await axios.get(nearbySearchUrl);
        
        if (!nearbyResponse.data.results || nearbyResponse.data.results.length === 0) {
          console.log(`Nenhum lugar encontrado próximo às coordenadas da loja ID ${store.id}`);
          results.failed++;
          results.details.push({
            id: store.id,
            name: store.name || '',
            status: 'failed',
            reason: 'Nenhum lugar encontrado próximo às coordenadas'
          });
          continue;
        }
        
        // Usar o primeiro resultado como o mais provável (mais próximo)
        const place = nearbyResponse.data.results[0];
        const placeId = place.place_id;
        
        // Campos que queremos recuperar da API
        const fields = [
          'name',
          'formatted_address',
          'formatted_phone_number',
          'international_phone_number',
          'website',
          'url',
          'vicinity',
          'utc_offset_minutes',
          'rating',
          'user_ratings_total',
          'opening_hours',
          'photos'
        ].join(',');
        
        // Buscar detalhes completos usando o place_id
        console.log(`Buscando detalhes do lugar para place_id: ${placeId}`);
        const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${googleAPIKey}`;
        
        const detailsResponse = await axios.get(placeDetailsUrl);
        
        // Verificar se a requisição foi bem-sucedida
        if (detailsResponse.data.status !== 'OK' || !detailsResponse.data.result) {
          throw new Error(`Falha ao obter detalhes do lugar: ${detailsResponse.data.status}`);
        }
        
        // Extrair os dados relevantes
        const placeDetails = detailsResponse.data.result;
        
        console.log(`Detalhes obtidos com sucesso para loja ID ${store.id}`);
        
        // Função auxiliar para escapar strings para SQL
        const escapeSql = (str: any) => {
          if (str === null || str === undefined) return null;
          return str.toString().replace(/'/g, "''");
        };
        
        // CORREÇÃO: Usar SQL nativo para evitar problemas
        const insertSql = `
          INSERT INTO store_place_details (
            store_id, place_id, formatted_address, formatted_phone_number, 
            international_phone_number, website, url, vicinity, 
            utc_offset_minutes, rating, user_ratings_total, opening_hours, photos
          ) 
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
          )
          RETURNING id
        `;
        
        const values = [
          store.id,
          placeDetails.place_id || null,
          placeDetails.formatted_address || null,
          placeDetails.formatted_phone_number || null,
          placeDetails.international_phone_number || null,
          placeDetails.website || null,
          placeDetails.url || null,
          placeDetails.vicinity || null,
          placeDetails.utc_offset_minutes || null,
          placeDetails.rating || null,
          placeDetails.user_ratings_total || null,
          placeDetails.opening_hours ? JSON.stringify(placeDetails.opening_hours) : null,
          placeDetails.photos ? JSON.stringify(placeDetails.photos) : null
        ];
        
        const saveResult = await pool.query(insertSql, values);
        
        if (saveResult.rows.length === 0) {
          throw new Error('Nenhum registro foi inserido');
        }
        
        console.log(`Detalhes salvos com sucesso para loja ID ${store.id}`);
        
        results.success++;
        results.details.push({
          id: store.id,
          name: store.name,
          status: 'success',
          details_id: saveResult.rows[0].id
        });
        
      } catch (error: any) {
        console.error(`Erro ao processar loja ID ${store.id}:`, error);
        results.failed++;
        results.details.push({
          id: store.id,
          name: store.name || '',
          status: 'failed',
          reason: error.message
        });
      }
      
      // Pequeno atraso para evitar limites de taxa da API
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log('Atualização de detalhes concluída:', results);
    
    return res.status(200).json({
      success: true,
      message: `Atualização concluída: ${results.success} lojas atualizadas, ${results.failed} falhas`,
      results
    });
    
  } catch (error: any) {
    console.error('Erro na atualização de detalhes das lojas:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro ao processar atualização de detalhes',
      message: error.message
    });
  }
}