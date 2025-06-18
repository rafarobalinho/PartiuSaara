
export const preventBlobUrls = (req, res, next) => {
  const checkForBlob = (obj, path = '') => {
    for (let key in obj) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof obj[key] === 'string' && obj[key].startsWith('blob:')) {
        return res.status(400).json({
          error: `Campo ${currentPath} contém URL blob inválida. Use o endpoint de upload: /api/upload/images`,
          field: currentPath,
          value: obj[key],
          solution: 'Utilize o endpoint /api/upload/images?type=store ou /api/upload/images?type=product para fazer upload das imagens'
        });
      }
      
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        const result = checkForBlob(obj[key], currentPath);
        if (result) return result;
      }
    }
    return null;
  };
  
  const blobError = checkForBlob(req.body);
  if (blobError) return blobError;
  
  // Verificar query parameters também
  const blobErrorQuery = checkForBlob(req.query, 'query');
  if (blobErrorQuery) return blobErrorQuery;
  
  next();
};

export const logUploadAttempt = (req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`🔍 [BLOB-PREVENTION] ${req.method} ${req.path}`);
    console.log('📋 Body:', JSON.stringify(req.body, null, 2));
    
    // Verificar especificamente por image_url
    if (req.body.image_url) {
      console.log(`🖼️ [IMAGE-URL] ${req.body.image_url}`);
      if (req.body.image_url.startsWith('blob:')) {
        console.log('🚨 [BLOB-DETECTED] URL blob detectada e será rejeitada');
      }
    }
  }
  next();
};
