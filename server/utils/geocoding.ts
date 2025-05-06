/**
 * Utilitário de geocodificação para converter endereços em coordenadas geográficas
 * Utiliza a API do Google Maps para fazer a geocodificação
 */

import axios from 'axios';
import { Store, StoreAddress, StoreLocation } from '@shared/schema';

// Chave da API do Google Maps
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

// Verificar se a chave da API está disponível
if (!GOOGLE_MAPS_API_KEY) {
  console.warn('⚠️ AVISO: Chave da API do Google Maps não encontrada. A geocodificação não funcionará corretamente.');
}

interface GeocodingResult {
  geometry: {
    location: {
      lat: number;
      lng: number;
    }
  };
  place_id: string;
  formatted_address: string;
}

interface GeocodingResponse {
  results: GeocodingResult[];
  status: string;
}

/**
 * Geocodifica um endereço utilizando a API do Google Maps
 * @param address Endereço completo para geocodificar
 * @returns Objeto com status de sucesso, latitude, longitude e place_id, ou erro se falhar
 */
export async function geocodeAddress(address: string): Promise<{
  success: boolean;
  latitude?: number;
  longitude?: number;
  place_id?: string;
  formatted_address?: string;
  error?: string;
}> {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('Chave da API do Google Maps não definida');
      return {
        success: false,
        error: 'Chave da API do Google Maps não configurada. Contate o administrador do sistema.'
      };
    }

    if (!address || address.trim() === '') {
      return {
        success: false,
        error: 'Endereço vazio ou inválido'
      };
    }

    console.log(`Geocodificando endereço: "${address}"`);

    // Codificar o endereço para URL
    const encodedAddress = encodeURIComponent(address);
    
    // URL da API de geocodificação
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;
    
    // Fazer a requisição
    const response = await axios.get<GeocodingResponse>(url);
    
    // Verificar se a resposta foi bem-sucedida
    if (response.data.status !== 'OK' || !response.data.results.length) {
      console.error('Falha na geocodificação:', response.data.status);
      return {
        success: false,
        error: `Falha na geocodificação: ${response.data.status || 'Nenhum resultado encontrado'}`
      };
    }
    
    // Obter o primeiro resultado
    const result = response.data.results[0];
    
    // Retornar as coordenadas, place_id e endereço formatado
    return {
      success: true,
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      place_id: result.place_id,
      formatted_address: result.formatted_address
    };
  } catch (error) {
    console.error('Erro ao geocodificar endereço:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao geocodificar endereço'
    };
  }
}

/**
 * Formatar endereço completo a partir do objeto de loja ou endereço
 * @param input Objeto da loja com informações de endereço ou objeto de endereço direto
 * @returns String com endereço completo formatado
 */
export function formatFullAddress(input: Partial<Store> | StoreAddress | null): string {
  // Caso seja um objeto de loja
  if (input === null) return '';
  
  let address: StoreAddress | null;
  
  // Verificar se é um objeto Store ou StoreAddress
  if ('address' in input) {
    // É um objeto Store
    address = input.address as StoreAddress;
  } else {
    // É um objeto StoreAddress
    address = input as StoreAddress;
  }
  
  if (!address) return '';
  
  const { street, city, state, zipCode } = address;
  
  // Verificar se todos os campos necessários estão presentes
  if (!street || !city || !state) {
    return '';
  }
  
  // Formatar o endereço completo
  return `${street}, ${city}, ${state}${zipCode ? ' - ' + zipCode : ''}`;
}

/**
 * Geocodifica múltiplas lojas em lote
 * @param stores Array de lojas para geocodificar
 * @param processCb Callback opcional para processar cada loja após geocodificação
 * @returns Objeto com resultados da geocodificação
 */
export async function batchGeocodeStores(
  stores: Partial<Store>[],
  processCb?: (
    store: Partial<Store>, 
    geocodeResult: { 
      success: boolean, 
      latitude?: number, 
      longitude?: number, 
      place_id?: string,
      error?: string
    }
  ) => Promise<void>
): Promise<{ 
  success: number, 
  failed: number, 
  results: Array<{
    id: number | undefined,
    name: string | undefined,
    success: boolean,
    error?: string,
    coords?: { latitude: number, longitude: number }
  }>
}> {
  let successCount = 0;
  let failedCount = 0;
  const results: Array<{
    id: number | undefined,
    name: string | undefined,
    success: boolean,
    error?: string,
    coords?: { latitude: number, longitude: number }
  }> = [];
  
  // Atraso entre as requisições para evitar limites de taxa da API
  const DELAY_MS = 200;
  
  for (const store of stores) {
    try {
      if (!store.address) {
        failedCount++;
        results.push({
          id: store.id,
          name: store.name,
          success: false,
          error: 'Loja não possui endereço'
        });
        continue;
      }
      
      // Formatar o endereço completo
      const fullAddress = formatFullAddress(store);
      
      if (!fullAddress) {
        failedCount++;
        results.push({
          id: store.id,
          name: store.name,
          success: false,
          error: 'Endereço incompleto (falta rua, cidade ou estado)'
        });
        continue;
      }
      
      console.log(`Geocodificando loja ${store.id} - ${store.name}: "${fullAddress}"`);
      
      // Geocodificar o endereço
      const geocodeResult = await geocodeAddress(fullAddress);
      
      if (geocodeResult.success && geocodeResult.latitude && geocodeResult.longitude) {
        successCount++;
        results.push({
          id: store.id,
          name: store.name,
          success: true,
          coords: {
            latitude: geocodeResult.latitude,
            longitude: geocodeResult.longitude
          }
        });
        
        // Se tiver callback, processar a loja
        if (processCb) {
          await processCb(store, geocodeResult);
        }
      } else {
        failedCount++;
        results.push({
          id: store.id,
          name: store.name,
          success: false,
          error: geocodeResult.error || 'Falha na geocodificação'
        });
      }
      
      // Atraso para a próxima requisição
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    } catch (error) {
      console.error(`Erro ao geocodificar loja ID ${store.id}:`, error);
      failedCount++;
      results.push({
        id: store.id,
        name: store.name,
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
  
  return { 
    success: successCount, 
    failed: failedCount,
    results
  };
}