import { Request, Response, NextFunction } from 'express';
import { geocodeAddress } from '../utils/geocoding';

/**
 * Middleware para geocodificar o endereço de uma loja antes de salvá-la
 */
export async function geocodingMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Verificar se temos um endereço completo no body para geocodificar
    const { address } = req.body;
    
    // Se não tivermos um endereço ou ele já tiver uma localização definida, pule a geocodificação
    if (!address || (req.body.location && req.body.location.latitude && req.body.location.longitude)) {
      return next();
    }
    
    // Verificar se o endereço está completo
    if (!address.street || !address.city || !address.state || !address.zipCode) {
      console.log('Endereço incompleto, pulando geocodificação:', address);
      return next();
    }
    
    console.log('Geocodificando endereço:', address);
    
    // Geocodificar o endereço
    const geocodeResult = await geocodeAddress(address);
    
    // Adicionar as coordenadas e o place_id ao body do request
    req.body.location = geocodeResult.location;
    req.body.place_id = geocodeResult.place_id;
    
    console.log('Geocodificação bem-sucedida:', {
      location: geocodeResult.location,
      place_id: geocodeResult.place_id
    });
    
    // Continuar com o próximo middleware
    next();
  } catch (error) {
    console.error('Erro durante a geocodificação:', error);
    
    // Se a geocodificação falhar, não interrompa o fluxo,
    // apenas log e continue (a loja pode ser criada sem geocodificação)
    next();
  }
}