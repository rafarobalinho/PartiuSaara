/**
 * Utilities for geocoding and location services
 */
import axios from 'axios';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Interface for geocoding response
 */
export interface GeocodingResult {
  latitude: number;
  longitude: number;
  placeId: string;
  formattedAddress: string;
}

/**
 * Geocode an address to get coordinates and Place ID
 * @param address The address to geocode
 * @returns A promise that resolves to geocoding results
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address,
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status !== 'OK' || !response.data.results.length) {
      console.error('Geocoding error:', response.data.status);
      return null;
    }

    const result = response.data.results[0];
    return {
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      placeId: result.place_id,
      formattedAddress: result.formatted_address
    };
  } catch (error) {
    console.error('Geocoding request failed:', error);
    return null;
  }
}

/**
 * Get place details by Place ID
 * @param placeId The Google Maps Place ID
 * @returns A promise that resolves to place details
 */
export async function getPlaceDetails(placeId: string): Promise<any | null> {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: placeId,
        fields: 'name,formatted_address,formatted_phone_number,website,opening_hours',
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status !== 'OK') {
      console.error('Place details error:', response.data.status);
      return null;
    }

    return response.data.result;
  } catch (error) {
    console.error('Place details request failed:', error);
    return null;
  }
}