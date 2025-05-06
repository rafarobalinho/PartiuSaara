/**
 * Controlador para manipulação de funcionalidades relacionadas ao mapa
 * e geocodificação de lojas
 */

import { Request, Response } from 'express';
import { db } from '../db';
import { geocodeAddress, formatFullAddress, batchGeocodeStores } from '../utils/geocoding';
import { stores, Store } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Obter todas as lojas com informações de localização para exibição no mapa
 */
export async function getStoresForMap(req: Request, res: Response) {
  try {
    // Buscar todas as lojas ativas que tenham coordenadas geográficas
    const results = await db.query.stores.findMany({
      where: (stores, { and, isNotNull }) => 
        and(
          eq(stores.isOpen, true),
          isNotNull(stores.location)
        )
    });
    
    // Contar lojas com coordenadas válidas para debug
    const totalStores = results.length;
    const storesWithLocation = results.filter(store => 
      store.location && 
      store.location.latitude && 
      store.location.longitude
    ).length;
    
    console.log(`Lojas encontradas total: ${totalStores}`);
    console.log(`Lojas com localização válida: ${storesWithLocation}`);
    
    res.json(results);
  } catch (error) {
    console.error('Erro ao buscar lojas para o mapa:', error);
    res.status(500).json({ error: 'Erro ao buscar lojas para o mapa' });
  }
}

/**
 * Geocodificar uma loja específica pelo ID
 */
export async function geocodeStore(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'ID da loja não fornecido' });
    }
    
    // Buscar a loja pelo ID
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, parseInt(id))
    });
    
    if (!store) {
      return res.status(404).json({ error: 'Loja não encontrada' });
    }
    
    // Verificar se a loja já possui coordenadas
    if (store.location && store.location.latitude && store.location.longitude) {
      return res.json({ 
        message: 'Loja já possui coordenadas',
        location: store.location
      });
    }
    
    // Verificar se a loja possui endereço completo
    if (!store.address) {
      return res.status(400).json({ error: 'Loja não possui endereço completo' });
    }
    
    // Formatar o endereço completo
    const fullAddress = formatFullAddress(store);
    
    // Geocodificar o endereço
    const geoResult = await geocodeAddress(fullAddress);
    
    if (!geoResult) {
      return res.status(500).json({ error: 'Falha ao geocodificar o endereço' });
    }
    
    // Verificamos se os valores são válidos
    if (!geoResult.latitude || !geoResult.longitude) {
      return res.status(400).json({ 
        success: false,
        error: 'Coordenadas inválidas retornadas pela API de geocodificação'
      });
    }
    
    // Atualizar a loja com as coordenadas
    await db.update(stores)
      .set({ 
        location: {
          latitude: geoResult.latitude,
          longitude: geoResult.longitude,
          place_id: geoResult.place_id
        },
        updatedAt: new Date()
      })
      .where(eq(stores.id, parseInt(id)));
    
    res.json({
      message: 'Geocodificação concluída com sucesso',
      store_id: id,
      location: geoResult
    });
  } catch (error) {
    console.error('Erro ao geocodificar loja:', error);
    res.status(500).json({ error: 'Erro ao geocodificar loja' });
  }
}

/**
 * Geocodificar todas as lojas que não possuem coordenadas (operação em lote)
 * Esta operação deve ser protegida e acessível apenas por administradores
 */
export async function batchGeocodeAllStores(req: Request, res: Response) {
  try {
    console.log('Iniciando processo de geocodificação em lote');
    
    // Buscar lojas que precisam de geocodificação usando sintaxe SQL correta
    // Usando query nativa para maior controle
    const result = await pool.query(`
      SELECT id, name, address 
      FROM stores 
      WHERE address IS NOT NULL 
        AND (location IS NULL OR place_id IS NULL)
    `);
    
    const stores = result.rows;
    console.log(`Encontradas ${stores.length} lojas para geocodificar`);
    
    const results = {
      total: stores.length,
      success: 0,
      failed: 0,
      details: [] as Array<{
        id: number;
        name?: string;
        status: 'success' | 'failed';
        reason?: string;
        data?: {
          location: {
            latitude: number;
            longitude: number;
          };
          place_id: string;
        };
      }>
    };
    
    if (stores.length === 0) {
      return res.json({ 
        success: true,
        message: 'Nenhuma loja sem coordenadas encontrada',
        total: 0,
        processed: 0,
        details: []
      });
    }
    
    // Importar axios para requisições HTTP
    const axios = await import('axios');
    
    // Processar cada loja com tratamento de erro robusto
    for (const store of stores) {
      try {
        // Verificar se o endereço está completo - verificação mais robusta
        if (!store.address || 
            typeof store.address !== 'object' || 
            !store.address.street || 
            !store.address.city || 
            !store.address.state) {
          
          console.log(`Loja ID ${store.id} tem endereço incompleto, pulando`);
          results.failed++;
          results.details.push({
            id: store.id,
            name: store.name || '',
            status: 'failed',
            reason: 'Endereço incompleto'
          });
          continue;
        }
        
        // Log detalhado para depuração
        console.log(`Geocodificando loja ID ${store.id}: ${JSON.stringify(store.address)}`);
        
        // Formar o endereço completo
        const zipCode = store.address.zipCode || '';
        const formattedAddress = `${store.address.street}, ${store.address.city}, ${store.address.state}${zipCode ? ', ' + zipCode : ''}, Brasil`;
        console.log(`Endereço formatado: ${formattedAddress}`);
        
        // Verificar se a API Key está definida
        if (!process.env.GOOGLE_MAPS_API_KEY) {
          throw new Error('GOOGLE_MAPS_API_KEY não está definida no ambiente');
        }
        
        // Preparar URL da API Google Geocoding
        const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formattedAddress)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
        
        // Fazer a requisição HTTP
        const response = await axios.default.get(apiUrl);
        
        // Log da resposta
        console.log(`Resposta para loja ID ${store.id}: status=${response.data.status}, resultados=${response.data.results ? response.data.results.length : 0}`);
        
        // Verificar se a geocodificação foi bem-sucedida
        if (response.data.status !== 'OK' || !response.data.results || response.data.results.length === 0) {
          throw new Error(`Falha na geocodificação: ${response.data.status}`);
        }
        
        // Extrair latitude, longitude e place_id da resposta
        const geoResult = response.data.results[0];
        
        // Criar objeto de localização no formato correto para o banco
        const locationObj = {
          latitude: geoResult.geometry.location.lat,
          longitude: geoResult.geometry.location.lng
        };
        
        const placeId = geoResult.place_id;
        
        // Verificar se os dados são válidos
        if (!locationObj.latitude || !locationObj.longitude || !placeId) {
          throw new Error('Dados de geocodificação incompletos ou inválidos');
        }
        
        console.log(`Dados extraídos: latitude=${locationObj.latitude}, longitude=${locationObj.longitude}, place_id=${placeId}`);
        
        // Atualizar a loja no banco de dados usando query nativa para evitar problemas com TypeORM
        console.log(`Atualizando loja ID ${store.id} no banco de dados`);
        
        // Usar query nativa com formatação JSON adequada para o PostgreSQL
        const updateResult = await pool.query(`
          UPDATE stores 
          SET 
            location = $1::jsonb,
            place_id = $2,
            "updatedAt" = NOW()
          WHERE id = $3
          RETURNING id
        `, [
          JSON.stringify(locationObj), // Converte explicitamente para string JSON
          placeId,
          store.id
        ]);
        
        // Verificar se a atualização foi bem-sucedida
        if (!updateResult.rows || updateResult.rows.length === 0) {
          throw new Error('Falha ao atualizar o banco de dados');
        }
        
        console.log(`Loja ID ${store.id} atualizada com sucesso: location=${JSON.stringify(locationObj)}, place_id=${placeId}`);
        
        results.success++;
        results.details.push({
          id: store.id,
          name: store.name || '',
          status: 'success',
          data: {
            location: locationObj,
            place_id: placeId
          }
        });
        
        // Adicionar um pequeno atraso para evitar limites de taxa da API
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`Erro ao geocodificar loja ID ${store.id}:`, error);
        results.failed++;
        results.details.push({
          id: store.id,
          name: store.name || '',
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
    
    console.log('Geocodificação em lote concluída:', results);
    
    res.json({
      success: true,
      message: `Geocodificação concluída: ${results.success} lojas atualizadas, ${results.failed} falhas`,
      total: results.total,
      geocoded: results.success,
      failed: results.failed,
      details: results.details
    });
  } catch (error) {
    console.error('Erro na geocodificação em lote:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erro ao processar geocodificação em lote',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}