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
        store_id INTEGER NOT NULL UNIQUE REFERENCES stores(id),
        place_id TEXT,
        name TEXT,
        formatted_address TEXT,
        phone_number TEXT,
        website TEXT,
        rating DECIMAL,
        total_ratings INTEGER,
        opening_hours TEXT,
        photo_reference TEXT,
        business_status TEXT,
        types TEXT,
        reviews TEXT,
        editorial_summary TEXT,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Tabela store_place_details criada ou verificada com sucesso");
    
    // Verificar e adicionar colunas que podem não existir em instalações anteriores
    try {
      await pool.query(`
        ALTER TABLE store_place_details 
        ADD COLUMN IF NOT EXISTS business_status TEXT,
        ADD COLUMN IF NOT EXISTS types TEXT,
        ADD COLUMN IF NOT EXISTS reviews TEXT,
        ADD COLUMN IF NOT EXISTS editorial_summary TEXT
      `);
      console.log("✅ Colunas adicionais verificadas/adicionadas na tabela store_place_details");
    } catch (columnError) {
      console.error("⚠️ Erro ao adicionar colunas adicionais:", columnError);
    }
    
    // Criar índices para melhorar a performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_store_place_details_store_id ON store_place_details(store_id);
      CREATE INDEX IF NOT EXISTS idx_store_place_details_place_id ON store_place_details(place_id);
    `);
    
    return true;
  } catch (error) {
    console.error("❌ Erro ao configurar tabela store_place_details:", error);
    throw error;
  }
}

/**
 * Garante que a restrição UNIQUE exista na coluna store_id da tabela store_place_details
 */
/**
 * Função auxiliar para salvar apenas dados básicos em caso de falha na API
 */
async function saveBasicPlaceDetails(store: any, placeId: string) {
  console.log(`⚠️ Salvando apenas dados básicos para loja ID ${store.id}`);
  
  await pool.query(`
    INSERT INTO store_place_details (
      store_id, place_id, name, last_updated
    ) 
    VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    ON CONFLICT (store_id) 
    DO UPDATE SET
      place_id = $2,
      name = $3,
      last_updated = CURRENT_TIMESTAMP
  `, [
    store.id,
    placeId,
    store.name
  ]);
  
  console.log(`✅ Dados básicos salvos com sucesso para loja ID ${store.id}`);
}

export async function ensureUniqueConstraint() {
  try {
    // Verificar se a restrição já existe
    const checkConstraint = await pool.query(`
      SELECT COUNT(*) FROM pg_constraint 
      WHERE conname = 'store_place_details_store_id_key' 
        AND conrelid = 'store_place_details'::regclass
    `);
    
    if (checkConstraint.rows[0].count === '0') {
      // Adicionar a restrição UNIQUE se não existir
      await pool.query(`
        ALTER TABLE store_place_details 
        ADD CONSTRAINT store_place_details_store_id_key 
        UNIQUE (store_id)
      `);
      console.log('✅ Restrição UNIQUE adicionada à coluna store_id');
    } else {
      console.log('✅ Restrição UNIQUE já existe na coluna store_id');
    }
    return true;
  } catch (error) {
    console.error('❌ Erro ao verificar/adicionar restrição UNIQUE:', error);
    throw error;
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
 * e atualiza ou insere seus detalhes através da API do Google Places
 */
export async function updateAllStoresPlaceDetails(req: Request, res: Response) {
  try {
    console.log('Iniciando processo de atualização de detalhes das lojas');
    
    // Garantir que a tabela de detalhes existe
    await setupPlaceDetailsTable();
    
    // Garantir que a restrição UNIQUE exista
    await ensureUniqueConstraint();
    
    // Buscar todas as lojas que têm coordenadas
    const result = await pool.query(`
      SELECT s.id, s.name, s.location, s.place_id as current_place_id
      FROM stores s
      WHERE s.location IS NOT NULL
        AND s.location::jsonb ? 'latitude' 
        AND s.location::jsonb ? 'longitude'
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
        place_name?: string;
        place_id?: string;
      }>
    };
    
    // Se não houver lojas para atualizar, retornar imediatamente
    if (stores.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhuma loja encontrada para atualizar detalhes',
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
        
        // Verificar se a loja tem coordenadas
        if (!store.location || !store.location.latitude || !store.location.longitude) {
          throw new Error('Coordenadas não disponíveis');
        }
        
        const lat = store.location.latitude;
        const lng = store.location.longitude;
        const storeName = encodeURIComponent(store.name);
        
        console.log(`Buscando estabelecimento "${store.name}" nas coordenadas: ${lat}, ${lng}`);
        
        let placeId = null;
        let placeName = store.name;
        let placeVicinity = null;
        let placeRating = null;
        let placeTotalRatings = 0;
        
        // Primeiro tenta buscar pelo nome + localização (mais preciso)
        try {
          const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${storeName}&inputtype=textquery&locationbias=point:${lat},${lng}&fields=place_id,name,formatted_address&key=${googleAPIKey}`;
          
          const findPlaceResponse = await axios.get(findPlaceUrl);
          
          if (findPlaceResponse.data.status === 'OK' && findPlaceResponse.data.candidates && 
              findPlaceResponse.data.candidates.length > 0) {
            // Encontrou um lugar correspondente ao nome
            placeId = findPlaceResponse.data.candidates[0].place_id;
            placeName = findPlaceResponse.data.candidates[0].name || store.name;
            placeVicinity = findPlaceResponse.data.candidates[0].formatted_address;
            console.log(`Estabelecimento encontrado via Find Place API: ${placeId}`);
          }
        } catch (findPlaceError: any) {
          console.log('Erro ao buscar pelo nome, tentando busca por proximidade:', findPlaceError.message);
        }
        
        // Se não encontrar pelo nome, tenta buscar lugares próximos
        if (!placeId) {
          console.log('Estabelecimento não encontrado pelo nome. Buscando lugares próximos...');
          
          const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=100&key=${googleAPIKey}`;
          
          const nearbyResponse = await axios.get(nearbyUrl);
          
          if (nearbyResponse.data.status !== 'OK' || !nearbyResponse.data.results || 
              nearbyResponse.data.results.length === 0) {
            throw new Error('Nenhum lugar encontrado próximo às coordenadas');
          }
          
          // Usar o primeiro resultado (mais próximo)
          const place = nearbyResponse.data.results[0];
          placeId = place.place_id;
          placeName = place.name || store.name;
          placeVicinity = place.vicinity;
          placeRating = place.rating;
          placeTotalRatings = place.user_ratings_total || 0;
          console.log(`Lugar mais próximo encontrado: ${placeName}, place_id: ${placeId}`);
        }
        
        // Atualizar o place_id na tabela stores
        if (placeId && (!store.current_place_id || store.current_place_id !== placeId)) {
          console.log(`Atualizando place_id na tabela stores de "${store.current_place_id || 'NULL'}" para "${placeId}"`);
          
          await pool.query(`
            UPDATE stores 
            SET place_id = $1
            WHERE id = $2
          `, [placeId, store.id]);
        }
        
        // Buscar detalhes completos do lugar usando o Place Details API
        console.log(`Obtendo detalhes completos do estabelecimento usando place_id: ${placeId}`);
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,opening_hours,business_status,types,reviews,editorial_summary,photos&key=${googleAPIKey}`;
        
        let placePhone = null;
        let placeWebsite = null;
        let placeOpeningHours = null;
        let placeBusinessStatus = null;
        let placeTypes = null;
        let placeReviews = null;
        let placeEditorialSummary = null;
        
        try {
          const detailsResponse = await axios.get(detailsUrl);
          
          if (detailsResponse.data.status !== 'OK') {
            console.log(`⚠️ API retornou status: ${detailsResponse.data.status} para place_id: ${placeId}`);
            // Se não conseguir obter detalhes completos, salvamos os dados básicos
            await saveBasicPlaceDetails(store, placeId);
            return;
          }
          
          if (detailsResponse.data.status === 'OK' && detailsResponse.data.result) {
            const placeData = detailsResponse.data.result;
            
            // Exibir detalhes obtidos para debug
            console.log('Detalhes obtidos da API Places Details:');
            console.log('- Nome:', placeData.name);
            console.log('- Endereço:', placeData.formatted_address);
            console.log('- Telefone:', placeData.formatted_phone_number);
            console.log('- Website:', placeData.website);
            console.log('- Avaliação:', placeData.rating);
            console.log('- Total avaliações:', placeData.user_ratings_total);
            console.log('- Status do negócio:', placeData.business_status || 'Não disponível');
            
            // Processar horários de funcionamento
            if (placeData.opening_hours && Array.isArray(placeData.opening_hours.weekday_text)) {
              placeOpeningHours = JSON.stringify(placeData.opening_hours.weekday_text);
              console.log('- Horários detalhados:', placeData.opening_hours.weekday_text);
              console.log('- Horários formatados para salvar:', placeOpeningHours);
            }
            console.log('- Horários:', placeOpeningHours ? 'Disponíveis' : 'Não disponíveis');
            
            // Processar tipos de estabelecimento
            if (Array.isArray(placeData.types) && placeData.types.length > 0) {
              placeTypes = JSON.stringify(placeData.types);
              console.log('- Tipos:', placeData.types);
            }
            console.log('- Tipos:', placeTypes ? 'Disponíveis' : 'Não disponíveis');
            
            // Processar avaliações
            if (Array.isArray(placeData.reviews) && placeData.reviews.length > 0) {
              // Limitar a quantidade de dados para evitar problemas com tamanho
              const limitedReviews = placeData.reviews.slice(0, 5).map((review: any) => ({
                rating: review.rating,
                text: review.text,
                time: review.time,
                author_name: review.author_name
              }));
              placeReviews = JSON.stringify(limitedReviews);
              console.log('- Avaliações:', `${limitedReviews.length} disponíveis`);
            }
            console.log('- Avaliações:', placeReviews ? 'Disponíveis' : 'Não disponíveis');
            
            // Processar resumo editorial
            if (placeData.editorial_summary && typeof placeData.editorial_summary.overview === 'string') {
              placeEditorialSummary = placeData.editorial_summary.overview;
              console.log('- Resumo editorial:', placeEditorialSummary);
            }
            console.log('- Resumo editorial:', placeEditorialSummary ? 'Disponível' : 'Não disponível');
            
            // Atualizar dados com informações mais detalhadas
            placeVicinity = placeData.formatted_address || placeVicinity;
            placeRating = placeData.rating || placeRating;
            placeTotalRatings = placeData.user_ratings_total || placeTotalRatings || 0;
            placePhone = placeData.formatted_phone_number || null;
            placeWebsite = placeData.website || null;
            placeBusinessStatus = placeData.business_status || null;
          }
        } catch (detailsError: any) {
          console.log('⚠️ Erro ao buscar detalhes do lugar, usando dados básicos:', detailsError.message);
          
          // Mesmo com erro, tentamos salvar os dados básicos
          try {
            await saveBasicPlaceDetails(store, placeId);
            // Após salvar os dados básicos, continuamos a execução
            console.log('✅ Dados básicos salvos com sucesso após erro na API');
          } catch (secondaryError: any) {
            console.error(`❌ Erro secundário ao salvar dados básicos: ${secondaryError.message}`);
            throw detailsError; // Propagar o erro original
          }
        }
        
        // Adicionar ou atualizar os detalhes
        const upsertQuery = `
          INSERT INTO store_place_details (
            store_id, place_id, name, formatted_address, phone_number, 
            website, rating, total_ratings, opening_hours, business_status,
            types, reviews, editorial_summary, last_updated
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
          ON CONFLICT (store_id) 
          DO UPDATE SET
            place_id = EXCLUDED.place_id,
            name = EXCLUDED.name,
            formatted_address = EXCLUDED.formatted_address,
            phone_number = EXCLUDED.phone_number,
            website = EXCLUDED.website,
            rating = EXCLUDED.rating,
            total_ratings = EXCLUDED.total_ratings,
            opening_hours = EXCLUDED.opening_hours,
            business_status = EXCLUDED.business_status,
            types = EXCLUDED.types,
            reviews = EXCLUDED.reviews,
            editorial_summary = EXCLUDED.editorial_summary,
            last_updated = CURRENT_TIMESTAMP
          RETURNING *
        `;
        
        const values = [
          store.id,
          placeId,
          store.name, // Mantemos o nome original da loja
          placeVicinity || null,
          placePhone,
          placeWebsite,
          placeRating,
          placeTotalRatings,
          placeOpeningHours,
          placeBusinessStatus,
          placeTypes,
          placeReviews,
          placeEditorialSummary
        ];
        
        console.log(`Inserindo/atualizando detalhes para loja ID ${store.id}`);
        
        const upsertResult = await pool.query(upsertQuery, values);
        
        // Verificar o resultado inserido/atualizado
        if (upsertResult.rows && upsertResult.rows.length > 0) {
          console.log('Registro inserido/atualizado com sucesso:', upsertResult.rows[0].id);
        }
        
        console.log(`Detalhes salvos com sucesso para loja ID ${store.id}`);
        
        results.success++;
        results.details.push({
          id: store.id,
          name: store.name,
          status: 'success',
          place_name: placeName,
          place_id: placeId
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
      await new Promise(resolve => setTimeout(resolve, 500));
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