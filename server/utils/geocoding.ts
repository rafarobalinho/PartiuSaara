/**
 * Utilitário de geocodificação para converter endereços em coordenadas geográficas
 * Utiliza a API do Google Maps para fazer a geocodificação
 */

import axios from 'axios';
import { Store } from '@shared/schema';

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
 * @returns Objeto com latitude, longitude e place_id
 */
export async function geocodeAddress(address: string): Promise<{ latitude: number, longitude: number, place_id: string } | null> {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('Chave da API do Google Maps não definida');
      return null;
    }

    // Codificar o endereço para URL
    const encodedAddress = encodeURIComponent(address);
    
    // URL da API de geocodificação
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;
    
    // Fazer a requisição
    const response = await axios.get<GeocodingResponse>(url);
    
    // Verificar se a resposta foi bem-sucedida
    if (response.data.status !== 'OK' || !response.data.results.length) {
      console.error('Falha na geocodificação:', response.data.status);
      return null;
    }
    
    // Obter o primeiro resultado
    const result = response.data.results[0];
    
    // Retornar as coordenadas e place_id
    return {
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      place_id: result.place_id
    };
  } catch (error) {
    console.error('Erro ao geocodificar endereço:', error);
    return null;
  }
}

/**
 * Formatar endereço completo a partir do objeto de loja
 * @param store Objeto da loja com informações de endereço
 * @returns String com endereço completo formatado
 */
export function formatFullAddress(store: Partial<Store>): string {
  if (!store.address) return '';
  
  const { street, city, state, zipCode } = store.address;
  
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
 * @returns Array com resultados da geocodificação
 */
export async function batchGeocodeStores(
  stores: Partial<Store>[],
  processCb?: (store: Partial<Store>, geocodeResult: { latitude: number, longitude: number, place_id: string } | null) => Promise<void>
): Promise<{ success: number, failed: number }> {
  let success = 0;
  let failed = 0;
  
  // Atraso entre as requisições para evitar limites de taxa da API
  const DELAY_MS = 200;
  
  for (const store of stores) {
    try {
      if (!store.address) {
        failed++;
        continue;
      }
      
      // Formatar o endereço completo
      const fullAddress = formatFullAddress(store);
      
      if (!fullAddress) {
        failed++;
        continue;
      }
      
      // Geocodificar o endereço
      const geocodeResult = await geocodeAddress(fullAddress);
      
      if (geocodeResult) {
        success++;
        
        // Se tiver callback, processar a loja
        if (processCb) {
          await processCb(store, geocodeResult);
        }
      } else {
        failed++;
      }
      
      // Atraso para a próxima requisição
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    } catch (error) {
      console.error(`Erro ao geocodificar loja ID ${store.id}:`, error);
      failed++;
    }
  }
  
  return { success, failed };
}