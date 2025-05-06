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
    console.log('Iniciando busca por lojas sem coordenadas');
    
    // Primeiro vamos buscar lojas onde o campo location é totalmente nulo
    let storesWithoutCoordinates = await db.query.stores.findMany({
      where: (stores, { isNull }) => isNull(stores.location)
    });
    
    console.log(`Lojas com location completamente nulo: ${storesWithoutCoordinates.length}`);
    
    // Agora vamos buscar lojas que têm o campo location, mas com latitude ou longitude nulos
    // Precisamos executar uma query SQL nativa, pois o Drizzle ORM não suporta facilmente 
    // verificações em campos específicos de objetos JSON
    const locationNullQueryResult = await db.execute<Store>(`
      SELECT * FROM stores 
      WHERE address IS NOT NULL 
        AND location IS NOT NULL
        AND (
          (location->>'latitude' IS NULL) 
          OR (location->>'longitude' IS NULL)
          OR NOT (location ? 'latitude')
          OR NOT (location ? 'longitude')
        )
    `);
    
    const storesWithPartialLocation = Array.isArray(locationNullQueryResult) 
      ? locationNullQueryResult 
      : locationNullQueryResult.rows || [];
    
    console.log(`Lojas com location parcial (sem latitude/longitude): ${storesWithPartialLocation.length}`);
    
    // Combinando os resultados
    storesWithoutCoordinates = [
      ...storesWithoutCoordinates, 
      ...storesWithPartialLocation
    ];
    
    if (storesWithoutCoordinates.length === 0) {
      return res.json({ 
        success: true,
        message: 'Nenhuma loja sem coordenadas encontrada',
        total: 0,
        processed: 0
      });
    }
    
    console.log(`Total de ${storesWithoutCoordinates.length} lojas para processar`);
    
    // Função de callback para atualizar cada loja após geocodificação
    const updateStoreCallback = async (
      store: Partial<Store>, 
      geocodeResult: { 
        success: boolean; 
        latitude?: number; 
        longitude?: number; 
        place_id?: string;
        error?: string;
      }
    ) => {
      if (!store.id || !geocodeResult.success || !geocodeResult.latitude || !geocodeResult.longitude) {
        console.log(`Falha ao geocodificar loja ID ${store.id}: ${geocodeResult.error || 'Erro desconhecido'}`);
        return;
      }
      
      console.log(`Atualizando loja ID ${store.id} com coordenadas: ${geocodeResult.latitude}, ${geocodeResult.longitude}`);
      
      try {
        await db.update(stores)
          .set({ 
            location: {
              latitude: geocodeResult.latitude,
              longitude: geocodeResult.longitude,
              place_id: geocodeResult.place_id
            },
            updatedAt: new Date()
          })
          .where(eq(stores.id, store.id));
        
        console.log(`Loja ID ${store.id} atualizada com sucesso`);
      } catch (error) {
        console.error(`Erro ao atualizar loja ID ${store.id}:`, error);
      }
    };
    
    // Executar geocodificação em lote
    const result = await batchGeocodeStores(storesWithoutCoordinates, updateStoreCallback);
    
    console.log(`Geocodificação em lote concluída: ${result.success} lojas com sucesso, ${result.failed} falhas`);
    
    res.json({
      success: true,
      message: 'Geocodificação em lote concluída',
      total: storesWithoutCoordinates.length,
      geocoded: result.success,
      failed: result.failed,
      results: result.results || []
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