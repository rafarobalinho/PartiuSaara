/**
 * Controlador para manipulação de funcionalidades relacionadas ao mapa
 * e geocodificação de lojas
 */

import { Request, Response } from 'express';
import { db } from '../db';
import { geocodeAddress, formatFullAddress, batchGeocodeStores } from '../utils/geocoding';
import { stores } from '@shared/schema';
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
    
    // Atualizar a loja com as coordenadas
    await db.update(stores)
      .set({ 
        location: {
          latitude: geoResult.latitude,
          longitude: geoResult.longitude
        },
        place_id: geoResult.place_id,
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
    // Buscar todas as lojas que não possuem coordenadas
    const storesWithoutCoordinates = await db.query.stores.findMany({
      where: (stores, { or, isNull }) => 
        or(
          isNull(stores.location),
          // @ts-ignore - Verificação mais profunda de location nulo ou vazio 
          (stores) => stores.location.latitude === null || stores.location.longitude === null
        )
    });
    
    if (storesWithoutCoordinates.length === 0) {
      return res.json({ message: 'Nenhuma loja sem coordenadas encontrada' });
    }
    
    // Função de callback para atualizar cada loja após geocodificação
    const updateStoreCallback = async (store: any, geoResult: { latitude: number, longitude: number, place_id: string } | null) => {
      if (!store.id || !geoResult) return;
      
      await db.update(stores)
        .set({ 
          location: {
            latitude: geoResult.latitude,
            longitude: geoResult.longitude
          },
          place_id: geoResult.place_id,
          updated_at: new Date()
        })
        .where(eq(stores.id, store.id));
    };
    
    // Executar geocodificação em lote
    const result = await batchGeocodeStores(storesWithoutCoordinates, updateStoreCallback);
    
    res.json({
      message: 'Geocodificação em lote concluída',
      total_processed: storesWithoutCoordinates.length,
      success: result.success,
      failed: result.failed
    });
  } catch (error) {
    console.error('Erro na geocodificação em lote:', error);
    res.status(500).json({ error: 'Erro ao processar geocodificação em lote' });
  }
}