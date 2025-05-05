/**
 * Utilitário para geocodificação de endereços usando a API do Google Maps
 */

import axios from 'axios';
import { is } from 'drizzle-orm';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

interface AddressData {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

interface GeocodeResult {
  location: {
    latitude: number;
    longitude: number;
  };
  place_id: string;
  formatted_address: string;
}

interface PlaceDetails {
  name: string;
  rating?: number;
  formatted_phone_number?: string;
  opening_hours?: any;
  website?: string;
  formatted_address: string;
  photos?: any[];
}

/**
 * Geocodifica um endereço usando a API do Google Maps
 * @param {Object} addressData - Dados do endereço
 * @returns {Promise<Object>} - Coordenadas e Place ID
 */
export async function geocodeAddress(addressData: AddressData): Promise<GeocodeResult> {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('API key do Google Maps não configurada');
    }

    // Montar o endereço formatado
    const formattedAddress = 
      `${addressData.street}, ${addressData.city}, ${addressData.state}, ${addressData.zipCode}`;
    
    console.log(`Geocodificando endereço: ${formattedAddress}`);
    
    // Fazer a requisição para a API de Geocodificação do Google
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: formattedAddress,
        key: GOOGLE_MAPS_API_KEY
      }
    });
    
    // Verificar se a API retornou resultados
    if (response.data.status !== 'OK' || !response.data.results || response.data.results.length === 0) {
      console.error('Erro na geocodificação:', response.data);
      throw new Error(`Erro na geocodificação: ${response.data.status}`);
    }
    
    // Extrair os dados do primeiro resultado
    const result = response.data.results[0];
    const location = result.geometry.location;
    
    return {
      location: {
        latitude: location.lat,
        longitude: location.lng
      },
      place_id: result.place_id,
      formatted_address: result.formatted_address
    };
  } catch (error) {
    console.error('Erro na geocodificação:', error);
    throw error;
  }
}

/**
 * Obtém detalhes de um lugar usando o Place ID
 * @param {string} placeId - Google Place ID
 * @returns {Promise<Object>} - Detalhes do lugar
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('API key do Google Maps não configurada');
    }
    
    // Fazer a requisição para a API Places do Google
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: placeId,
        fields: 'name,rating,formatted_phone_number,opening_hours,website,formatted_address,photos',
        key: GOOGLE_MAPS_API_KEY
      }
    });
    
    // Verificar se a API retornou resultados
    if (response.data.status !== 'OK' || !response.data.result) {
      throw new Error(`Erro ao obter detalhes do lugar: ${response.data.status}`);
    }
    
    // Extrair dados do resultado
    const result = response.data.result;
    
    return {
      name: result.name,
      rating: result.rating,
      formatted_phone_number: result.formatted_phone_number,
      opening_hours: result.opening_hours,
      website: result.website,
      formatted_address: result.formatted_address,
      photos: result.photos
    };
  } catch (error) {
    console.error('Erro ao obter detalhes do lugar:', error);
    throw error;
  }
}