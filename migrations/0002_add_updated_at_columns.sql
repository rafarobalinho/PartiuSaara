-- Migration 0002_add_updated_at_columns.sql

BEGIN;

-- 1. Adicionar coluna updated_at nas tabelas de imagens
ALTER TABLE store_images 
ADD COLUMN updated_at TIMESTAMP DEFAULT NOW() NOT NULL;

ALTER TABLE product_images 
ADD COLUMN updated_at TIMESTAMP DEFAULT NOW() NOT NULL;

-- 2. Criar função para atualizar automaticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Criar triggers para atualização automática
CREATE TRIGGER update_store_images_updated_at
    BEFORE UPDATE ON store_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_images_updated_at
    BEFORE UPDATE ON product_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Verificação
SELECT 'Migration concluída!' as status;

COMMIT;