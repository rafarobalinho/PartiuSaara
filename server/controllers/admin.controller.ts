/**
 * Controlador para funcionalidades administrativas
 * Responsável por gerenciar operações disponíveis apenas para administradores
 */

import { Request, Response } from 'express';
import { db } from '../db';
import { stores } from '@shared/schema';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';
import { geocodeAddress } from '../utils/geocoding';

/**
 * Obter todas as lojas com seus dados de geocodificação
 * Útil para o painel administrativo de gerenciamento de geocodificação
 */
export async function getAllStoresGeocodingStatus(req: Request, res: Response) {
  try {
    // Buscar todas as lojas no banco de dados
    const storesData = await db.query.stores.findMany({
      columns: {
        id: true,
        name: true,
        address: true,
        location: true,
      },
    });

    // Processar os dados para adicionar informações sobre geocodificação
    const processedStores = storesData.map(store => {
      const hasValidCoordinates = 
        store.location?.latitude != null && 
        store.location?.longitude != null;
      
      const hasCompleteAddress = 
        store.address?.street != null && 
        store.address?.street.trim() !== '' && 
        store.address?.city != null && 
        store.address?.city.trim() !== '' &&
        store.address?.state != null && 
        store.address?.state.trim() !== '';
      
      // Determinar o status de geocodificação
      let geocodingStatus: 'geocoded' | 'pending' | 'incomplete_address';
      
      if (hasValidCoordinates) {
        geocodingStatus = 'geocoded';
      } else if (!hasCompleteAddress) {
        geocodingStatus = 'incomplete_address';
      } else {
        geocodingStatus = 'pending';
      }

      // Formar o endereço completo
      const fullAddress = [
        store.address?.street,
        store.address?.city,
        store.address?.state,
        store.address?.zipCode
      ].filter(Boolean).join(', ');

      return {
        ...store,
        geocodingStatus,
        hasValidCoordinates,
        hasCompleteAddress,
        fullAddress
      };
    });

    // Calcular estatísticas
    const total = processedStores.length;
    const geocoded = processedStores.filter(s => s.geocodingStatus === 'geocoded').length;
    const pending = processedStores.filter(s => s.geocodingStatus === 'pending').length;
    const incomplete = processedStores.filter(s => s.geocodingStatus === 'incomplete_address').length;

    res.json({
      stores: processedStores,
      total,
      geocoded,
      pending,
      incomplete
    });
  } catch (error) {
    console.error('Error fetching stores geocoding status:', error);
    res.status(500).json({ message: 'Erro ao buscar dados de geocodificação de lojas' });
  }
}

/**
 * Geocodificar uma loja específica pelo ID
 * Atualiza os dados de latitude, longitude e place_id no banco de dados
 */
export async function geocodeStoreById(req: Request, res: Response) {
  const { id } = req.params;
  const storeId = parseInt(id);

  if (isNaN(storeId)) {
    return res.status(400).json({ message: 'ID de loja inválido' });
  }

  try {
    // Buscar a loja para obter o endereço
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });

    if (!store) {
      return res.status(404).json({ message: 'Loja não encontrada' });
    }

    // Verificar se o endereço está completo
    if (!store.address?.street || !store.address?.city || !store.address?.state) {
      return res.status(400).json({ 
        message: 'Endereço incompleto. É necessário ter rua, cidade e estado para geocodificar.'
      });
    }

    // Formar o endereço completo para geocodificação
    const address = `${store.address.street}, ${store.address.city}, ${store.address.state}${store.address.zipCode ? `, ${store.address.zipCode}` : ''}`;

    // Geocodificar o endereço
    const geocodeResult = await geocodeAddress(address);

    if (!geocodeResult.success) {
      return res.status(400).json({ 
        message: 'Não foi possível geocodificar este endereço',
        details: geocodeResult.error
      });
    }

    // Atualizar os dados de localização no banco de dados
    await db
      .update(stores)
      .set({
        location: {
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude,
          place_id: geocodeResult.place_id
        }
      })
      .where(eq(stores.id, storeId));

    // Buscar a loja atualizada
    const updatedStore = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });

    res.json({
      success: true,
      message: 'Loja geocodificada com sucesso',
      store: updatedStore
    });
  } catch (error) {
    console.error('Error geocoding store:', error);
    res.status(500).json({ message: 'Erro ao geocodificar loja' });
  }
}

/**
 * Atualizar coordenadas de uma loja manualmente
 * Permite que administradores ajustem coordenadas incorretas
 */
export async function updateStoreCoordinates(req: Request, res: Response) {
  const { id } = req.params;
  const storeId = parseInt(id);
  const { latitude, longitude } = req.body;

  if (isNaN(storeId)) {
    return res.status(400).json({ message: 'ID de loja inválido' });
  }

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ message: 'Coordenadas inválidas' });
  }

  try {
    // Verificar se a loja existe
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });

    if (!store) {
      return res.status(404).json({ message: 'Loja não encontrada' });
    }

    // Atualizar as coordenadas
    await db
      .update(stores)
      .set({
        location: {
          ...(store.location || {}),
          latitude,
          longitude
        }
      })
      .where(eq(stores.id, storeId));

    // Buscar a loja atualizada
    const updatedStore = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });

    res.json({
      success: true,
      message: 'Coordenadas da loja atualizadas com sucesso',
      store: updatedStore
    });
  } catch (error) {
    console.error('Error updating store coordinates:', error);
    res.status(500).json({ message: 'Erro ao atualizar coordenadas da loja' });
  }
}

/**
 * Geocodificar todas as lojas com endereços completos
 * Útil para processar várias lojas de uma vez
 */
export async function geocodeAllStores(req: Request, res: Response) {
  try {
    // Buscar todas as lojas com endereços completos mas sem coordenadas
    const storesNeedingGeocoding = await db.query.stores.findMany({
      where: and(
        isNull(stores.location),
        isNotNull(stores.address)
      )
    });

    // Filtrar apenas lojas com endereços completos
    const eligibleStores = storesNeedingGeocoding.filter(store => 
      store.address?.street && 
      store.address.city && 
      store.address.state
    );

    // Resultados
    const results = {
      total: eligibleStores.length,
      success: 0,
      failed: 0,
      details: [] as any[]
    };

    // Processar cada loja
    for (const store of eligibleStores) {
      try {
        // Formar o endereço completo para geocodificação
        const address = `${store.address!.street}, ${store.address!.city}, ${store.address!.state}${store.address!.zipCode ? `, ${store.address!.zipCode}` : ''}`;

        // Geocodificar o endereço
        const geocodeResult = await geocodeAddress(address);

        if (geocodeResult.success) {
          // Atualizar os dados de localização no banco de dados
          await db
            .update(stores)
            .set({
              location: {
                latitude: geocodeResult.latitude,
                longitude: geocodeResult.longitude,
                place_id: geocodeResult.place_id
              }
            })
            .where(eq(stores.id, store.id));
          
          results.success++;
          results.details.push({
            id: store.id,
            name: store.name,
            success: true
          });
        } else {
          results.failed++;
          results.details.push({
            id: store.id,
            name: store.name,
            success: false,
            error: geocodeResult.error
          });
        }
      } catch (error) {
        console.error(`Error geocoding store ${store.id}:`, error);
        results.failed++;
        results.details.push({
          id: store.id,
          name: store.name,
          success: false,
          error: 'Erro interno ao processar geocodificação'
        });
      }

      // Pequeno delay para evitar atingir limites de API
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    res.json(results);
  } catch (error) {
    console.error('Error geocoding all stores:', error);
    res.status(500).json({ message: 'Erro ao geocodificar lojas' });
  }
}