import { Request, Response, NextFunction } from 'express';
import { geocodeAddress } from '../utils/geocoding';

/**
 * Middleware para geocodificar o endereço de uma loja antes de salvá-la
 */
export async function geocodingMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('Executando middleware de geocodificação');
    
    // Verificar se temos os dados de endereço necessários
    const { address } = req.body;
    
    if (!address || !address.street || !address.city || !address.state || !address.zipCode) {
      // Se não tivermos endereço completo, apenas continuamos sem geocodificar
      console.log('Endereço incompleto, pulando geocodificação');
      return next();
    }
    
    // Verificar se já temos coordenadas e place_id (caso seja uma atualização)
    if (req.body.location?.latitude && req.body.location?.longitude && req.body.place_id) {
      console.log('Loja já possui coordenadas e place_id, pulando geocodificação');
      return next();
    }
    
    console.log('Iniciando geocodificação para:', address);
    
    // Geocodificar o endereço
    const geocodeResult = await geocodeAddress(address);
    
    // Adicionar os dados geocodificados ao corpo da requisição
    req.body.location = geocodeResult.location;
    req.body.place_id = geocodeResult.place_id;
    
    console.log('Geocodificação concluída:', geocodeResult);
    
    next();
  } catch (error) {
    console.error('Erro durante a geocodificação:', error instanceof Error ? error.message : String(error));
    // Não bloqueamos a criação da loja se a geocodificação falhar
    next();
  }
}