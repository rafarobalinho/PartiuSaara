import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

/**
 * Middleware para verificar e proteger o acesso a imagens
 * Garante que imagens sejam servidas de diretórios isolados por loja/produto quando possível
 */
export const secureImageMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Verificar se é uma solicitação de imagem via upload
  if (!req.path.startsWith('/uploads/')) {
    return next();
  }

  const requestPath = req.path;
  const publicDir = path.join(process.cwd(), 'public');
  const requestedFilePath = path.join(publicDir, requestPath);
  
  // Se o caminho parece ser uma imagem (por extensão)
  if (requestPath.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    // Verificar se o caminho está em um formato seguro (inclui /stores/{storeId}/)
    const isSecurePath = requestPath.includes('/uploads/stores/') && 
                         /\/stores\/\d+\//.test(requestPath);
    
    // Se já for um caminho seguro, apenas continuar
    if (isSecurePath) {
      return next();
    }
    
    // Se for um caminho de imagem não seguro, verificar se podemos identificar o contexto
    const imageNameMatch = requestPath.match(/\/(\d+\-\d+)\.(jpg|jpeg|png|gif|webp)$/i);
    
    if (imageNameMatch && imageNameMatch[1]) {
      const imageName = imageNameMatch[1];
      console.warn(`⚠️ Caminho de imagem suspeito detectado: ${requestPath}`);
      
      // Verificar contexto da solicitação - produto ou loja
      let entityType: string | null = null;
      let entityId: string | null = null;
      
      // Tentar identificar contexto de produto
      const productMatch = req.originalUrl.match(/\/products\/(\d+)\/primary-image/);
      if (productMatch && productMatch[1]) {
        entityType = 'product';
        entityId = productMatch[1];
      } 
      // Tentar identificar contexto de loja
      else {
        const storeMatch = req.originalUrl.match(/\/stores\/(\d+)\/primary-image/);
        if (storeMatch && storeMatch[1]) {
          entityType = 'store';
          entityId = storeMatch[1];
        }
      }
      
      // Se identificamos o contexto, tentar encontrar a versão segura da imagem
      if (entityType && entityId) {
        let expectedSecurePath = '';
        
        if (entityType === 'product') {
          // Para produto, precisamos buscar o storeId no banco
          // Por enquanto, usamos um wildcard para busca no sistema de arquivos
          expectedSecurePath = `/uploads/stores/*/products/${entityId}/`;
          console.warn(`⚠️ Era esperado um caminho contendo: ${expectedSecurePath}`);
          
          // Buscar em todas as pastas de lojas
          const storesDir = path.join(publicDir, 'uploads', 'stores');
          if (fs.existsSync(storesDir)) {
            try {
              // Listar diretórios de lojas
              const storeDirs = fs.readdirSync(storesDir).filter(dir => 
                fs.statSync(path.join(storesDir, dir)).isDirectory()
              );
              
              // Procurar em cada loja
              for (const storeDir of storeDirs) {
                const productDir = path.join(storesDir, storeDir, 'products', entityId);
                
                if (fs.existsSync(productDir)) {
                  // Buscar por nome de arquivo específico
                  const secureFilePath = path.join(productDir, `${imageName}.jpg`);
                  const secureThumbPath = path.join(productDir, 'thumbnails', `thumb-${imageName}.jpg`);
                  
                  // Verificar se a imagem original existe
                  if (fs.existsSync(secureFilePath)) {
                    console.log(`Arquivo encontrado em caminho seguro: ${secureFilePath}`);
                    return res.sendFile(secureFilePath);
                  } 
                  // Verificar se é um thumbnail
                  else if (fs.existsSync(secureThumbPath)) {
                    console.log(`Thumbnail encontrado em caminho seguro: ${secureThumbPath}`);
                    return res.sendFile(secureThumbPath);
                  }
                }
              }
            } catch (err) {
              console.error('Erro ao buscar imagem segura:', err);
            }
          }
        } else if (entityType === 'store') {
          // Para loja, o path seguro é mais simples
          expectedSecurePath = `/uploads/stores/${entityId}/`;
          console.warn(`⚠️ Era esperado um caminho contendo: ${expectedSecurePath}`);
          
          // Caminho esperado
          const storeDir = path.join(publicDir, 'uploads', 'stores', entityId);
          if (fs.existsSync(storeDir)) {
            // Buscar por nome de arquivo específico
            const secureFilePath = path.join(storeDir, `${imageName}.jpg`);
            const secureThumbPath = path.join(storeDir, 'thumbnails', `thumb-${imageName}.jpg`);
            
            // Verificar se a imagem original existe
            if (fs.existsSync(secureFilePath)) {
              console.log(`Arquivo encontrado em caminho seguro: ${secureFilePath}`);
              return res.sendFile(secureFilePath);
            } 
            // Verificar se é um thumbnail
            else if (fs.existsSync(secureThumbPath)) {
              console.log(`Thumbnail encontrado em caminho seguro: ${secureThumbPath}`);
              return res.sendFile(secureThumbPath);
            }
          }
        }
      }
      
      // Fallback: Verificar se o arquivo existe no caminho solicitado (não seguro)
      if (fs.existsSync(requestedFilePath)) {
        console.warn(`Arquivo não encontrado em caminhos seguros`);
        console.warn(`⚠️ Servindo arquivo de caminho não seguro: ${requestedFilePath}`);
        return res.sendFile(requestedFilePath);
      }
    }
  }
  
  // Para outros casos, prosseguir normalmente
  next();
};