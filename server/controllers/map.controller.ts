import { Request, Response } from 'express';
import { geocodeAddress } from '../utils/geocoding';
import { pool, db } from '../db';
import { stores } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Controlador para geocodificar um endereço
 */
export async function geocodeAddressController(req: Request, res: Response) {
  try {
    const { address } = req.body;
    
    if (!address || !address.street || !address.city || !address.state || !address.zipCode) {
      return res.status(400).json({ 
        error: 'Endereço incompleto. Por favor, forneça rua, cidade, estado e CEP.' 
      });
    }
    
    const result = await geocodeAddress(address);
    res.json(result);
  } catch (error) {
    console.error('Erro ao geocodificar endereço:', error);
    res.status(500).json({ 
      error: 'Falha ao geocodificar endereço',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Controlador para atualizar a geolocalização de uma loja
 */
export async function updateStoreGeolocation(req: Request, res: Response) {
  try {
    const { storeId } = req.params;
    const { location, place_id } = req.body;
    
    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({ error: 'Dados de localização incompletos' });
    }
    
    // Verificar se a loja existe
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, parseInt(storeId))
    });
    
    if (!store) {
      return res.status(404).json({ error: 'Loja não encontrada' });
    }
    
    // Verificar propriedade (se o usuário é dono da loja)
    const user = req.user;
    if (store.userId !== user?.id) {
      return res.status(403).json({ error: 'Não autorizado a editar esta loja' });
    }
    
    // Atualizar a localização
    const updatedStore = await db.update(stores)
      .set({ 
        location, 
        place_id 
      })
      .where(eq(stores.id, parseInt(storeId)))
      .returning();
    
    res.json(updatedStore[0]);
  } catch (error) {
    console.error('Erro ao atualizar geolocalização:', error);
    res.status(500).json({ 
      error: 'Falha ao atualizar geolocalização',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Controlador para geocodificar todas as lojas
 */
export async function geocodeAllStores(req: Request, res: Response) {
  try {
    console.log('Iniciando geocodificação em lote de todas as lojas');
    
    // Buscar todas as lojas que têm endereço mas não têm coordenadas
    const result = await pool.query(`
      SELECT id, address 
      FROM stores 
      WHERE address IS NOT NULL 
        AND (location IS NULL OR place_id IS NULL)
    `);
    
    const stores = result.rows;
    console.log(`Encontradas ${stores.length} lojas para geocodificar`);
    
    const results = {
      total: stores.length,
      success: 0,
      failed: 0,
      details: [] as any[]
    };
    
    // Geocodificar cada loja
    for (const store of stores) {
      try {
        console.log(`Processando loja ID ${store.id}`);
        
        if (!store.address.street || !store.address.city || 
            !store.address.state || !store.address.zipCode) {
          console.log(`Loja ID ${store.id} tem endereço incompleto, pulando`);
          results.failed++;
          results.details.push({
            id: store.id,
            status: 'failed',
            reason: 'Endereço incompleto'
          });
          continue;
        }
        
        // Geocodificar
        const geocodeResult = await geocodeAddress(store.address);
        
        // Atualizar a loja no banco de dados
        await pool.query(`
          UPDATE stores 
          SET location = $1, place_id = $2 
          WHERE id = $3
        `, [
          geocodeResult.location,
          geocodeResult.place_id,
          store.id
        ]);
        
        console.log(`Loja ID ${store.id} geocodificada com sucesso`);
        results.success++;
        results.details.push({
          id: store.id,
          status: 'success',
          data: geocodeResult
        });
      } catch (error) {
        console.error(`Falha ao geocodificar loja ID ${store.id}:`, error instanceof Error ? error.message : String(error));
        results.failed++;
        results.details.push({
          id: store.id,
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
    
    console.log('Geocodificação em lote concluída:', results);
    res.json(results);
  } catch (error) {
    console.error('Erro ao geocodificar lojas:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Falha ao geocodificar lojas' });
  }
}