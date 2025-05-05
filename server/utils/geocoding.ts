import axios from 'axios';

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
    console.log('Geocodificando endereço:', addressData);
    
    // Formar o endereço completo
    const formattedAddress = `${addressData.street}, ${addressData.city}, ${addressData.state}, ${addressData.zipCode}, Brasil`;
    
    // Fazer a requisição para a API de Geocodificação do Google
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: formattedAddress,
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });
    
    // Verificar se há resultados
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      
      console.log('Geocodificação bem-sucedida para:', formattedAddress);
      
      return {
        location: {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng
        },
        place_id: result.place_id,
        formatted_address: result.formatted_address
      };
    } else {
      console.error('Falha na geocodificação. Status:', response.data.status);
      throw new Error(`Geocodificação falhou: ${response.data.status}`);
    }
  } catch (error) {
    console.error('Erro ao geocodificar endereço:', error instanceof Error ? error.message : String(error));
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
    console.log('Obtendo detalhes para Place ID:', placeId);
    
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: placeId,
        fields: 'name,rating,formatted_phone_number,opening_hours,website,formatted_address,photos',
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });
    
    if (response.data.status === 'OK') {
      console.log('Detalhes do lugar obtidos com sucesso');
      return response.data.result;
    } else {
      console.error('Falha ao obter detalhes. Status:', response.data.status);
      throw new Error(`Falha ao obter detalhes do lugar: ${response.data.status}`);
    }
  } catch (error) {
    console.error('Erro ao obter detalhes do lugar:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}