/**
 * Controller for map-related operations
 */
import { Request, Response } from 'express';
import { geocodeAddress, getPlaceDetails } from '../utils/geocoding';
import { storage } from '../storage';

/**
 * Geocode an address to get coordinates and place ID
 * @param req Request object
 * @param res Response object
 */
export async function geocodeAddressController(req: Request, res: Response) {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Endereço é obrigatório' });
    }

    const result = await geocodeAddress(address);
    
    if (!result) {
      return res.status(404).json({ error: 'Não foi possível geocodificar o endereço fornecido' });
    }

    res.json(result);
  } catch (error) {
    console.error('Erro ao geocodificar endereço:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

/**
 * Update a store with geolocation data
 * @param req Request object
 * @param res Response object
 */
export async function updateStoreGeolocation(req: Request, res: Response) {
  try {
    const { storeId } = req.params;
    const { latitude, longitude, placeId } = req.body;
    
    if (!storeId || !latitude || !longitude) {
      return res.status(400).json({ error: 'ID da loja, latitude e longitude são obrigatórios' });
    }

    // Verificar se a loja existe
    const store = await storage.getStore(parseInt(storeId));
    if (!store) {
      return res.status(404).json({ error: 'Loja não encontrada' });
    }

    // Verificar se o usuário é dono da loja (se não for um admin)
    if (req.user?.role !== 'seller' && store.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Você não tem permissão para atualizar esta loja' });
    }

    // Atualizar as informações de localização da loja
    const updatedStore = await storage.updateStore(parseInt(storeId), {
      location: { latitude, longitude }, 
      ...(placeId && { placeId })
    });

    res.json(updatedStore);
  } catch (error) {
    console.error('Erro ao atualizar geolocalização da loja:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

/**
 * Get all stores with geolocation data for map display
 * @param req Request object
 * @param res Response object
 */
export async function getStoresForMap(req: Request, res: Response) {
  try {
    const stores = await storage.getStores();
    
    // Filtrar apenas lojas com dados de localização e mapear para o formato necessário para o mapa
    const storesWithLocation = stores
      .filter((store: any) => {
        // Verificar se o store.location existe e tem latitude/longitude
        try {
          const location = store.location;
          return location && 
                 typeof location === 'object' && 
                 'latitude' in location && 
                 'longitude' in location;
        } catch (e) {
          return false;
        }
      })
      .map((store: any) => ({
        id: store.id,
        name: store.name,
        description: store.description,
        category: store.category,
        location: store.location,
        address: store.address,
        images: store.images
      }));

    res.json(storesWithLocation);
  } catch (error) {
    console.error('Erro ao buscar lojas para o mapa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}