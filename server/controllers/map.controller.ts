/**
 * Controlador para manipulação de funcionalidades relacionadas ao mapa
 * e geocodificação de lojas
 */

import { Request, Response } from 'express';
import { db, pool } from '../db';
import { formatFullAddress } from '../utils/geocoding';
import { stores } from '@shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';

// ✅ NOVA IMPLEMENTAÇÃO: Classe APIRateLimiter para controle inteligente
class APIRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly minDelayMs: number;

  constructor(maxRequests: number = 50, windowMs: number = 60000, minDelayMs: number = 500) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.minDelayMs = minDelayMs;
  }

  canMakeRequest(id: string = 'global'): { allowed: boolean; waitTimeMs?: number; reason?: string } {
    const now = Date.now();
    const requestHistory = this.requests.get(id) || [];

    // Remove requisições antigas da janela de tempo
    const recentRequests = requestHistory.filter(timestamp => now - timestamp < this.windowMs);
    this.requests.set(id, recentRequests);

    if (recentRequests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...recentRequests);
      const waitTime = this.windowMs - (now - oldestRequest);
      return {
        allowed: false,
        waitTimeMs: waitTime,
        reason: `Rate limit exceeded. ${recentRequests.length}/${this.maxRequests} requests in window.`
      };
    }

    // Verificar delay mínimo entre requisições
    if (recentRequests.length > 0) {
      const lastRequest = Math.max(...recentRequests);
      const timeSinceLastRequest = now - lastRequest;

      if (timeSinceLastRequest < this.minDelayMs) {
        return {
          allowed: false,
          waitTimeMs: this.minDelayMs - timeSinceLastRequest,
          reason: `Minimum delay not met. Wait ${this.minDelayMs - timeSinceLastRequest}ms.`
        };
      }
    }

    return { allowed: true };
  }

  async waitIfNeeded(id: string = 'global'): Promise<void> {
    const check = this.canMakeRequest(id);
    if (!check.allowed && check.waitTimeMs) {
      console.log(`Rate limiting: Waiting ${check.waitTimeMs}ms for ${id}. Reason: ${check.reason}`);
      await new Promise(resolve => setTimeout(resolve, check.waitTimeMs));
    }
  }

  recordRequest(id: string = 'global'): void {
    const now = Date.now();
    const requestHistory = this.requests.get(id) || [];
    requestHistory.push(now);
    this.requests.set(id, requestHistory);
  }

  getStats(id: string = 'global'): { requests: number; maxRequests: number; timeRemaining: number; windowMs: number } {
    const now = Date.now();
    const requestHistory = this.requests.get(id) || [];
    const recentRequests = requestHistory.filter(timestamp => now - timestamp < this.windowMs);

    const oldestRequest = recentRequests.length > 0 ? Math.min(...recentRequests) : now;
    const timeRemaining = Math.max(0, this.windowMs - (now - oldestRequest));

    return {
      requests: recentRequests.length,
      maxRequests: this.maxRequests,
      timeRemaining,
      windowMs: this.windowMs
    };
  }
}

// ✅ INSTÂNCIA GLOBAL DO RATE LIMITER: 50 req/min com delays de 500ms
const geocodingRateLimiter = new APIRateLimiter(50, 60000, 500);

// ✅ NOVA FUNÇÃO: Validação rigorosa da Google Maps API Key
function validateGoogleMapsApiKey(): { isValid: boolean; error?: string } {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return { isValid: false, error: 'GOOGLE_MAPS_API_KEY não está definida no ambiente' };
  }

  if (apiKey.length < 10) {
    return { isValid: false, error: 'GOOGLE_MAPS_API_KEY parece ser inválida (muito curta)' };
  }

  if (apiKey.startsWith('AIza') && apiKey.length !== 39) {
    return { isValid: false, error: 'GOOGLE_MAPS_API_KEY tem formato inválido' };
  }

  return { isValid: true };
}

// ✅ NOVA FUNÇÃO: Requisição de geocodificação segura com rate limiting
async function makeGeocodingRequest(address: string, requestId: string = 'global'): Promise<{
  geometry: { location: { lat: number; lng: number } };
  place_id: string;
}> {
  // Validar API Key antes de qualquer coisa
  const keyValidation = validateGoogleMapsApiKey();
  if (!keyValidation.isValid) {
    throw new Error(keyValidation.error);
  }

  // Aguardar se necessário devido ao rate limiting
  await geocodingRateLimiter.waitIfNeeded(requestId);

  // Preparar URL da API
  const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

  try {
    // Registrar a requisição no rate limiter
    geocodingRateLimiter.recordRequest(requestId);

    // Fazer a requisição com timeout
    const response = await axios.get(apiUrl, { timeout: 10000 });

    // Validar resposta da API
    if (response.data.status === 'OVER_QUERY_LIMIT') {
      throw new Error('Google Maps API quota exceeded');
    }

    if (response.data.status === 'REQUEST_DENIED') {
      throw new Error('Google Maps API request denied - check API key');
    }

    if (response.data.status !== 'OK' || !response.data.results || response.data.results.length === 0) {
      throw new Error(`Geocoding failed: ${response.data.status}`);
    }

    return response.data.results[0];
  } catch (error) {
    console.error(`Erro na requisição de geocodificação para "${address}":`, error);
    throw error;
  }
}

// ✅ NOVO ENDPOINT: Estatísticas do rate limiting
export async function getRateLimitStats(req: Request, res: Response) {
  try {
    const globalStats = geocodingRateLimiter.getStats('global');

    res.json({
      success: true,
      rateLimiting: {
        ...globalStats,
        status: globalStats.requests < globalStats.maxRequests ? 'healthy' : 'approaching_limit'
      },
      apiKey: {
        configured: !!process.env.GOOGLE_MAPS_API_KEY,
        valid: validateGoogleMapsApiKey().isValid
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas de rate limiting:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao obter estatísticas' 
    });
  }
}

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

    // ✅ MUDANÇA: Usar nova função segura com rate limiting
    const geoResult = await makeGeocodingRequest(fullAddress, `store-${id}`);

    // Verificamos se os valores são válidos
    if (!geoResult.geometry?.location?.lat || !geoResult.geometry?.location?.lng) {
      return res.status(400).json({ 
        success: false,
        error: 'Coordenadas inválidas retornadas pela API de geocodificação'
      });
    }

    const locationData = {
      latitude: geoResult.geometry.location.lat,
      longitude: geoResult.geometry.location.lng,
      place_id: geoResult.place_id
    };

    // Atualizar a loja com as coordenadas
    await db.update(stores)
      .set({ 
        location: locationData
      })
      .where(eq(stores.id, parseInt(id)));

    res.json({
      message: 'Geocodificação concluída com sucesso',
      store_id: id,
      location: locationData
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
    console.log('Iniciando processo de geocodificação em lote com rate limiting');

    // Obter todas as lojas sem coordenadas
    const query = `
      SELECT id, name, address 
      FROM stores 
      WHERE address IS NOT NULL 
        AND (location IS NULL OR place_id IS NULL)
    `;

    // Usar a instância do db para consulta SQL segura
    const queryResult = await pool.query(query);
    const storeArray: any[] = queryResult.rows || [];

    console.log(`Encontradas ${storeArray.length} lojas para geocodificar`);

    const results = {
      total: storeArray.length,
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

    // Se não houver lojas para geocodificar, retornar imediatamente
    if (storeArray.length === 0) {
      return res.json({ 
        success: true,
        message: 'Nenhuma loja sem coordenadas encontrada',
        total: 0,
        processed: 0,
        details: []
      });
    }

    // ✅ MUDANÇA: Processar cada loja com rate limiting inteligente
    for (let i = 0; i < storeArray.length; i++) {
      const store = storeArray[i];
      const requestId = `batch-store-${store.id}`;

      try {
        console.log(`[${i+1}/${storeArray.length}] Geocodificando loja ID ${store.id}: ${store.name}`);

        // Verificar se o endereço está completo
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

        // Formar o endereço completo
        const storeAddress = store.address as any;
        const zipCode = storeAddress.zipCode || '';
        const formattedAddress = `${storeAddress.street}, ${storeAddress.city}, ${storeAddress.state}${zipCode ? ', ' + zipCode : ''}, Brasil`;
        console.log(`Endereço formatado: ${formattedAddress}`);

        // ✅ MUDANÇA: Usar função segura com rate limiting
        const geoResult = await makeGeocodingRequest(formattedAddress, requestId);

        // Extrair latitude, longitude e place_id da resposta
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

        // Atualizar usando SQL nativo (preservando a lógica original)
        console.log(`Atualizando loja ID ${store.id} no banco de dados usando SQL nativo`);

        const storeId = typeof store.id === 'string' ? parseInt(store.id) : store.id;

        try {
          const updateSql = `
            UPDATE stores 
            SET 
              location = $1::jsonb,
              place_id = $2
            WHERE id = $3
            RETURNING id;
          `;

          console.log(`Executando SQL nativo para atualizar loja ID ${storeId}`);

          const updateResult = await pool.query(updateSql, [
            JSON.stringify(locationObj),
            placeId,
            storeId
          ]);

          if (updateResult.rows.length === 0) {
            throw new Error(`Nenhuma linha atualizada para loja ID ${storeId}`);
          }

          console.log(`Loja ID ${storeId} atualizada com sucesso:`, updateResult.rows);
        } catch (updateError) {
          console.error(`Erro SQL ao atualizar loja ID ${storeId}:`, updateError);
          throw updateError;
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

        // ✅ MUDANÇA: Rate limiting inteligente substitui delay fixo
        // O delay agora é calculado automaticamente pela classe APIRateLimiter

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