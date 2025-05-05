import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

/**
 * Middleware para verificar se o usuário logado é proprietário da loja
 * Rejeita a requisição com status 403 se o usuário não for dono da loja
 */
export async function verifyStoreOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    // Verificar se o usuário está autenticado
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    // Obter o ID da loja a partir dos parâmetros, query ou body
    const storeId = 
      req.params.storeId || 
      req.params.id || 
      req.query.storeId as string || 
      req.body.storeId;
    
    // Se não houver ID de loja, passa para o próximo middleware
    if (!storeId) {
      return next();
    }
    
    // Converter para número se necessário
    const storeIdNum = typeof storeId === 'string' ? parseInt(storeId, 10) : storeId;
    
    // Buscar a loja para verificar o proprietário
    const store = await storage.getStore(storeIdNum);
    
    // Se a loja não existe, retorna 404
    if (!store) {
      return res.status(404).json({ error: 'Loja não encontrada' });
    }
    
    // Verificar se o usuário é o proprietário da loja
    if (store.userId !== req.user.id) {
      console.log(`TENTATIVA DE ACESSO NÃO AUTORIZADO: Usuário ${req.user.id} tentou acessar loja ${storeIdNum} pertencente ao usuário ${store.userId}`);
      return res.status(403).json({ 
        error: 'Você não tem permissão para acessar esta loja' 
      });
    }
    
    // Se chegou aqui, o usuário é proprietário da loja
    next();
  } catch (error) {
    console.error('Erro ao verificar propriedade da loja:', error);
    res.status(500).json({ error: 'Erro interno ao verificar permissões' });
  }
}

/**
 * Middleware para verificar se o usuário logado é proprietário do produto
 * Rejeita a requisição com status 403 se o produto não pertencer a uma loja do usuário
 */
export async function verifyProductOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    // Verificar se o usuário está autenticado
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    // Obter o ID do produto a partir dos parâmetros, query ou body
    const productId = 
      req.params.productId || 
      req.params.id || 
      req.query.productId as string || 
      req.body.productId;
    
    // Se não houver ID de produto, passa para o próximo middleware
    if (!productId) {
      return next();
    }
    
    // Converter para número se necessário
    const productIdNum = typeof productId === 'string' ? parseInt(productId, 10) : productId;
    
    // Buscar o produto para verificar a loja
    const product = await storage.getProduct(productIdNum);
    
    // Se o produto não existe, retorna 404
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    // Buscar a loja do produto
    const store = await storage.getStore(product.storeId);
    
    // Se a loja não existe, retorna um erro
    if (!store) {
      return res.status(500).json({ error: 'Loja do produto não encontrada' });
    }
    
    // Verificar se o usuário é o proprietário da loja do produto
    if (store.userId !== req.user.id) {
      console.log(`TENTATIVA DE ACESSO NÃO AUTORIZADO: Usuário ${req.user.id} tentou acessar produto ${productIdNum} da loja ${product.storeId} pertencente ao usuário ${store.userId}`);
      return res.status(403).json({ 
        error: 'Você não tem permissão para acessar este produto' 
      });
    }
    
    // Se chegou aqui, o usuário é proprietário da loja do produto
    next();
  } catch (error) {
    console.error('Erro ao verificar propriedade do produto:', error);
    res.status(500).json({ error: 'Erro interno ao verificar permissões' });
  }
}