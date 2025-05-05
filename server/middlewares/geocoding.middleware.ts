/**
 * Middleware de geocodificação para processar automaticamente os endereços quando
 * uma loja é criada ou atualizada
 */

import { Request, Response, NextFunction } from 'express';
import { geocodeAddress, formatFullAddress } from '../utils/geocoding';
import { Store } from '@shared/schema';

/**
 * Middleware que processa automaticamente o endereço da loja para obter as coordenadas geográficas
 * Deve ser utilizado em rotas de criação e atualização de lojas
 */
export async function geocodingMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Verificar se há dados de loja no corpo da requisição
    if (!req.body || !req.body.address) {
      return next();
    }
    
    // Verificar se as coordenadas já foram fornecidas manualmente
    if (req.body.location?.latitude && req.body.location?.longitude) {
      console.log('Coordenadas já foram fornecidas manualmente, pulando geocodificação automática');
      return next();
    }
    
    // Criar objeto temporário de loja para processar o endereço
    const tempStore: Partial<Store> = {
      address: req.body.address
    };
    
    // Formatação do endereço completo
    const fullAddress = formatFullAddress(tempStore);
    
    if (!fullAddress) {
      console.log('Endereço incompleto para geocodificação');
      return next();
    }
    
    // Realizar a geocodificação
    console.log('Geocodificando endereço:', fullAddress);
    const geoResult = await geocodeAddress(fullAddress);
    
    if (!geoResult) {
      console.log('Falha na geocodificação, prosseguindo sem coordenadas');
      return next();
    }
    
    // Adicionar as coordenadas e place_id ao corpo da requisição
    req.body.location = {
      latitude: geoResult.latitude,
      longitude: geoResult.longitude
    };
    
    req.body.place_id = geoResult.place_id;
    
    console.log('Geocodificação concluída com sucesso:', geoResult);
    next();
  } catch (error) {
    console.error('Erro no middleware de geocodificação:', error);
    // Não interromper o fluxo em caso de erro na geocodificação
    next();
  }
}