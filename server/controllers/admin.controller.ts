/**
 * Controlador para funcionalidades administrativas
 * Responsável por gerenciar operações disponíveis apenas para administradores
 */

import { Request, Response } from 'express';
import { db } from '../db';
import { stores, Store } from '@shared/schema';
import { eq, and, isNull, isNotNull } from 'drizzle-orm';
import { geocodeAddress, batchGeocodeStores } from '../utils/geocoding';

/**
 * 🔒 Validação de segurança para todas as funções administrativas
 */
function validateAdminAccess(req: Request, res: Response): boolean {
  // Verificar autenticação
  if (!req.user) {
    res.status(401).json({ 
      success: false,
      message: 'Não autorizado: Usuário não autenticado' 
    });
    return false;
  }

  // Verificar se é admin
  if (req.user.role !== 'admin') {
    console.warn(`🚨 [SECURITY] Tentativa de acesso admin negada para usuário ${req.user.id} (role: ${req.user.role})`);
    res.status(403).json({ 
      success: false,
      message: 'Acesso negado: Esta funcionalidade é restrita a administradores' 
    });
    return false;
  }

  return true;
}

/**
 * Obter todas as lojas com seus dados de geocodificação
 * Útil para o painel administrativo de gerenciamento de geocodificação
 */
export async function getAllStoresGeocodingStatus(req: Request, res: Response) {
  try {
    // 🔒 VALIDAÇÃO DE SEGURANÇA OBRIGATÓRIA
    if (!validateAdminAccess(req, res)) return;

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
  try {
    // 🔒 VALIDAÇÃO DE SEGURANÇA OBRIGATÓRIA
    if (!validateAdminAccess(req, res)) return;

    const { id } = req.params;
    const storeId = parseInt(id);

    if (isNaN(storeId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de loja inválido' 
      });
    }

    // Buscar a loja para obter o endereço
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });

    if (!store) {
      return res.status(404).json({ 
        success: false, 
        message: 'Loja não encontrada' 
      });
    }

    // Verificar se o endereço está completo
    if (!store.address?.street || !store.address?.city || !store.address?.state) {
      return res.status(400).json({ 
        success: false,
        message: 'Endereço incompleto. É necessário ter rua, cidade e estado para geocodificar.'
      });
    }

    console.log(`Iniciando geocodificação para loja ID ${storeId} - ${store.name}`);

    // Formar o endereço completo para geocodificação
    const address = `${store.address.street}, ${store.address.city}, ${store.address.state}${store.address.zipCode ? `, ${store.address.zipCode}` : ''}`;
    console.log(`Endereço formatado: "${address}"`);

    // Geocodificar o endereço
    const geocodeResult = await geocodeAddress(address);

    if (!geocodeResult.success) {
      console.log(`Falha na geocodificação: ${geocodeResult.error}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Não foi possível geocodificar este endereço',
        error: geocodeResult.error
      });
    }

    // Extrair os valores garantindo que existem
    const { latitude, longitude, place_id, formatted_address } = geocodeResult;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Geocodificação não retornou coordenadas válidas'
      });
    }

    console.log(`Coordenadas obtidas: ${latitude}, ${longitude}`);
    console.log(`Endereço formatado pelo Google: ${formatted_address}`);

    // Atualizar os dados de localização no banco de dados
    await db
      .update(stores)
      .set({
        location: {
          latitude,
          longitude,
          place_id: place_id || undefined
        },
      })
      .where(eq(stores.id, storeId));

    // Buscar a loja atualizada
    const updatedStore = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });

    console.log(`Loja ID ${storeId} atualizada com sucesso`);

    res.json({
      success: true,
      message: 'Loja geocodificada com sucesso',
      store: updatedStore,
      geocoding: {
        latitude,
        longitude,
        formatted_address
      }
    });
  } catch (error) {
    console.error('Error geocoding store:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erro ao geocodificar loja',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Atualizar coordenadas de uma loja manualmente
 * Permite que administradores ajustem coordenadas incorretas
 */
export async function updateStoreCoordinates(req: Request, res: Response) {
  try {
    // 🔒 VALIDAÇÃO DE SEGURANÇA OBRIGATÓRIA
    if (!validateAdminAccess(req, res)) return;

    const { id } = req.params;
    const storeId = parseInt(id);
    const { latitude, longitude } = req.body;

    if (isNaN(storeId)) {
      return res.status(400).json({ 
        success: false,
        message: 'ID de loja inválido' 
      });
    }

    // Converter para número se for string (para lidar com dados de formulário)
    const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
    const lng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;

    if (typeof lat !== 'number' || isNaN(lat) || typeof lng !== 'number' || isNaN(lng)) {
      return res.status(400).json({ 
        success: false,
        message: 'Coordenadas inválidas. Latitude e longitude devem ser números válidos.' 
      });
    }

    // Validar faixa de latitude (-90 a 90) e longitude (-180 a 180)
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ 
        success: false,
        message: 'Coordenadas fora dos limites válidos. Latitude deve estar entre -90 e 90, longitude entre -180 e 180.' 
      });
    }

    console.log(`Atualizando coordenadas manualmente para loja ID ${storeId}: ${lat}, ${lng}`);

    // Verificar se a loja existe
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });

    if (!store) {
      return res.status(404).json({ 
        success: false,
        message: 'Loja não encontrada' 
      });
    }

    // Atualizar as coordenadas
    await db
      .update(stores)
      .set({
        location: {
          ...(store.location || {}),
          latitude: lat,
          longitude: lng
        },
      })
      .where(eq(stores.id, storeId));

    // Buscar a loja atualizada
    const updatedStore = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });

    console.log(`Coordenadas da loja ID ${storeId} atualizadas com sucesso: ${lat}, ${lng}`);

    res.json({
      success: true,
      message: 'Coordenadas da loja atualizadas com sucesso',
      store: updatedStore,
      coordinates: {
        latitude: lat,
        longitude: lng
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar coordenadas:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erro ao atualizar coordenadas da loja',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Geocodificar todas as lojas com endereços completos
 * Útil para processar várias lojas de uma vez
 */
export async function geocodeAllStores(req: Request, res: Response) {
  try {
    // 🔒 VALIDAÇÃO DE SEGURANÇA OBRIGATÓRIA
    if (!validateAdminAccess(req, res)) return;

    console.log('Iniciando processo de geocodificação em lote para todas as lojas');

    // Buscar todas as lojas com endereços completos mas sem coordenadas
    const storesNeedingGeocoding = await db.query.stores.findMany({
      where: and(
        isNull(stores.location),
        isNotNull(stores.address)
      )
    });

    console.log(`Encontradas ${storesNeedingGeocoding.length} lojas sem coordenadas`);

    // Filtrar apenas lojas com endereços completos
    const eligibleStores = storesNeedingGeocoding.filter(store => 
      store.address?.street && 
      store.address.city && 
      store.address.state
    );

    console.log(`${eligibleStores.length} lojas têm endereços completos elegíveis para geocodificação`);

    if (eligibleStores.length === 0) {
      return res.json({
        success: true,
        message: 'Nenhuma loja encontrada para geocodificação',
        total: 0,
        geocoded: 0,
        failed: 0
      });
    }

    // ✅ CORRIGIDO: Tipagem correta para o callback
    const processStoreCallback = async (
      store: Partial<Store>, 
      geocodeResult: { 
        success: boolean; 
        latitude?: number; 
        longitude?: number; 
        place_id?: string;
        error?: string;
      }
    ): Promise<void> => {
      if (!store.id || !geocodeResult.success || !geocodeResult.latitude || !geocodeResult.longitude) {
        return;
      }

      // Atualizar os dados de localização no banco
      await db
        .update(stores)
        .set({
          location: {
            latitude: geocodeResult.latitude,
            longitude: geocodeResult.longitude,
            place_id: geocodeResult.place_id
          },
        })
        .where(eq(stores.id, store.id));

      console.log(`Loja ID ${store.id} geocodificada com sucesso: ${geocodeResult.latitude}, ${geocodeResult.longitude}`);
    };

    // Executar geocodificação em lote usando a função utilitária
    const batchResults = await batchGeocodeStores(eligibleStores, processStoreCallback);

    // ✅ PRESERVADO: Sua interface BatchGeocodeResult
    interface BatchGeocodeResult {
      id: number | undefined;
      name: string | undefined;
      success: boolean;
      error?: string;
      coords?: { latitude: number; longitude: number; };
    }

    // Formatar resultados para a resposta
    const response = {
      success: true,
      message: 'Processo de geocodificação em lote concluído',
      total: eligibleStores.length,
      geocoded: batchResults.success,
      failed: batchResults.failed,
      results: batchResults.results.map((result: BatchGeocodeResult) => ({
        id: result.id,
        name: result.name,
        success: result.success,
        ...(result.success && result.coords 
          ? { coordinates: result.coords } 
          : { error: result.error })
      }))
    };

    console.log(`Geocodificação em lote concluída: ${batchResults.success} sucessos, ${batchResults.failed} falhas`);

    res.json(response);
  } catch (error) {
    console.error('Erro ao geocodificar lojas em lote:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erro ao processar geocodificação em lote',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}