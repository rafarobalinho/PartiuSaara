/**
 * Utilitário de geocodificação para converter endereços em coordenadas geográficas
 * Utiliza a API do Google Maps para fazer a geocodificação
 */

import axios from 'axios';
import { Store } from '@shared/schema';

// Tipos para os resultados da geocodificação
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
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('API key do Google Maps não encontrada no ambiente');
      return null;
    }
    
    // Codificar o endereço para URL
    const encodedAddress = encodeURIComponent(address);
    
    // Fazer a requisição para a API de Geocodificação do Google Maps
    const response = await axios.get<GeocodingResponse>(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
    );
    
    // Verificar se a resposta foi bem-sucedida
    if (response.data.status !== 'OK' || response.data.results.length === 0) {
      console.error(`Erro na geocodificação: ${response.data.status}`, address);
      return null;
    }
    
    const result = response.data.results[0];
    
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
  return `${street}, ${city}, ${state}, ${zipCode}, Brasil`;
}

/**
 * Geocodifica múltiplas lojas em lote
 * @param stores Array de lojas para geocodificar
 * @param processCb Callback opcional para processar cada loja após geocodificação
 * @returns Array com resultados da geocodificação
 */
export async function batchGeocodeStores(
  stores: Partial<Store>[],
  processCb?: (store: Partial<Store>, result: { latitude: number, longitude: number, place_id: string } | null) => Promise<void>
): Promise<{ success: number, failed: number }> {
  let success = 0;
  let failed = 0;
  
  // Processar lojas sequencialmente para evitar limitações de rate da API
  for (const store of stores) {
    if (!store.address) {
      failed++;
      continue;
    }
    
    // Ignorar lojas que já possuem coordenadas
    if (store.location?.latitude && store.location?.longitude) {
      success++;
      continue;
    }
    
    const fullAddress = formatFullAddress(store);
    const result = await geocodeAddress(fullAddress);
    
    if (result) {
      success++;
      // Executar callback se fornecido
      if (processCb) {
        await processCb(store, result);
      }
    } else {
      failed++;
    }
    
    // Pequeno delay para evitar atingir limites de rate da API
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return { success, failed };
}