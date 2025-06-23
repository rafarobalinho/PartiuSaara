-- Migration 0001_add_filename_fields.sql
-- Adiciona campos filename mantendo compatibilidade

BEGIN;

-- 1. Adicionar campos filename se não existirem (sem quebrar existentes)
ALTER TABLE store_images 
ADD COLUMN IF NOT EXISTS filename TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_filename TEXT;

ALTER TABLE product_images 
ADD COLUMN IF NOT EXISTS filename TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_filename TEXT;

-- 2. Para registros que só têm imageUrl, extrair filename
UPDATE store_images 
SET filename = regexp_replace(image_url, '.*/', '') 
WHERE filename IS NULL AND image_url IS NOT NULL;

UPDATE store_images 
SET thumbnail_filename = regexp_replace(thumbnail_url, '.*/', '') 
WHERE thumbnail_filename IS NULL AND thumbnail_url IS NOT NULL;

UPDATE product_images 
SET filename = regexp_replace(image_url, '.*/', '') 
WHERE filename IS NULL AND image_url IS NOT NULL;

UPDATE product_images 
SET thumbnail_filename = regexp_replace(thumbnail_url, '.*/', '') 
WHERE thumbnail_filename IS NULL AND thumbnail_url IS NOT NULL;

-- 3. Criar índices para os novos campos
CREATE INDEX IF NOT EXISTS idx_store_images_filename ON store_images(filename);
CREATE INDEX IF NOT EXISTS idx_product_images_filename ON product_images(filename);

-- 4. Verificação final
DO $$ 
BEGIN
    RAISE NOTICE 'Store images com filename: %', (SELECT COUNT(*) FROM store_images WHERE filename IS NOT NULL);
    RAISE NOTICE 'Product images com filename: %', (SELECT COUNT(*) FROM product_images WHERE filename IS NOT NULL);
    RAISE NOTICE 'Store images com imageUrl: %', (SELECT COUNT(*) FROM store_images WHERE image_url IS NOT NULL);
    RAISE NOTICE 'Product images com imageUrl: %', (SELECT COUNT(*) FROM product_images WHERE image_url IS NOT NULL);
END $$;

COMMIT;