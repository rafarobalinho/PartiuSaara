/**
 * Controlador para funcionalidades administrativas
 * Responsável por gerenciar operações disponíveis apenas para administradores
 */

import { Request, Response } from 'express';
import { db } from '../db';
import { stores } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { geocodeAddress, formatFullAddress } from '../utils/geocoding';

/**
 * Obter todas as lojas com seus dados de geocodificação
 * Útil para o painel administrativo de gerenciamento de geocodificação
 */
export async function getAllStoresGeocodingStatus(req: Request, res: Response) {
  try {
    // Buscar todas as lojas com seus dados completos
    const allStores = await db.query.stores.findMany({
      orderBy: (stores, { asc }) => [asc(stores.id)]
    });
    
    // Processar os dados para incluir o status de geocodificação
    const storesWithStatus = allStores.map(store => {
      // Verificar se a loja tem coordenadas válidas
      const hasValidCoordinates = store.location && 
                                  typeof store.location.latitude === 'number' && 
                                  typeof store.location.longitude === 'number';
      
      // Verificar se a loja tem endereço completo
      const hasCompleteAddress = store.address && 
                                 store.address.street && 
                                 store.address.city && 
                                 store.address.state;
      
      // Determinar o status da geocodificação
      let geocodingStatus = 'pending';
      if (hasValidCoordinates) {
        geocodingStatus = 'geocoded';
      } else if (!hasCompleteAddress) {
        geocodingStatus = 'incomplete_address';
      }
      
      return {
        ...store,
        geocodingStatus,
        hasValidCoordinates,
        hasCompleteAddress,
        fullAddress: formatFullAddress(store)
      };
    });
    
    res.json({
      stores: storesWithStatus,
      total: storesWithStatus.length,
      geocoded: storesWithStatus.filter(s => s.geocodingStatus === 'geocoded').length,
      pending: storesWithStatus.filter(s => s.geocodingStatus === 'pending').length,
      incomplete: storesWithStatus.filter(s => s.geocodingStatus === 'incomplete_address').length
    });
  } catch (error) {
    console.error('Erro ao buscar lojas para painel de geocodificação:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar lojas para o painel de geocodificação',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Geocodificar uma loja específica pelo ID
 * Atualiza os dados de latitude, longitude e place_id no banco de dados
 */
export async function geocodeStoreById(req: Request, res: Response) {
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
    
    // Verificar se a loja possui endereço completo
    if (!store.address || 
        !store.address.street || 
        !store.address.city || 
        !store.address.state) {
      return res.status(400).json({ 
        error: 'Loja não possui endereço completo',
        address: store.address
      });
    }
    
    // Formatar o endereço completo
    const fullAddress = formatFullAddress(store);
    
    // Geocodificar o endereço
    const geoResult = await geocodeAddress(fullAddress);
    
    if (!geoResult) {
      return res.status(500).json({ 
        error: 'Falha ao geocodificar o endereço',
        address: fullAddress
      });
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
      
    // Buscar a loja atualizada para retornar
    const updatedStore = await db.query.stores.findFirst({
      where: eq(stores.id, parseInt(id))
    });
    
    res.json({
      success: true,
      message: 'Geocodificação concluída com sucesso',
      store: updatedStore,
      geocoding: geoResult
    });
  } catch (error) {
    console.error('Erro ao geocodificar loja:', error);
    res.status(500).json({ 
      error: 'Erro ao geocodificar loja',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Atualizar coordenadas de uma loja manualmente
 * Permite que administradores ajustem coordenadas incorretas
 */
export async function updateStoreCoordinates(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;
    
    // Validar dados de entrada
    if (!id) {
      return res.status(400).json({ error: 'ID da loja não fornecido' });
    }
    
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ 
        error: 'Dados de coordenadas inválidos',
        received: { latitude, longitude }
      });
    }
    
    // Buscar a loja pelo ID
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, parseInt(id))
    });
    
    if (!store) {
      return res.status(404).json({ error: 'Loja não encontrada' });
    }
    
    // Atualizar as coordenadas da loja
    await db.update(stores)
      .set({ 
        location: {
          latitude,
          longitude
        },
        updatedAt: new Date()
      })
      .where(eq(stores.id, parseInt(id)));
      
    // Buscar a loja atualizada para retornar
    const updatedStore = await db.query.stores.findFirst({
      where: eq(stores.id, parseInt(id))
    });
    
    res.json({
      success: true,
      message: 'Coordenadas atualizadas manualmente com sucesso',
      store: updatedStore
    });
  } catch (error) {
    console.error('Erro ao atualizar coordenadas da loja:', error);
    res.status(500).json({ 
      error: 'Erro ao atualizar coordenadas da loja',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}