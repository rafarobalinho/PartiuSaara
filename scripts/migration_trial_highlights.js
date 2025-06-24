import pkg from 'pg';
import dotenv from 'dotenv';

const { Client } = pkg;
dotenv.config();

console.log('🚀 Iniciando migração: Sistema de Trial + Destaques...');

async function migrateTrialAndHighlights() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados');

    console.log('📋 Adicionando campos de trial na tabela stores...');
    await client.query(`
      ALTER TABLE stores 
      ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS is_in_trial BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS trial_notifications_sent JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS highlight_weight INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_highlighted_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS total_highlight_impressions INTEGER DEFAULT 0;
    `);

    console.log('📋 Criando tabela highlight_impressions...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS highlight_impressions (
        id SERIAL PRIMARY KEY,
        store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        section VARCHAR(100) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER,
        ip_address VARCHAR(45)
      );
    `);

    console.log('📋 Criando índices...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS highlight_impressions_store_id_idx ON highlight_impressions(store_id);
      CREATE INDEX IF NOT EXISTS highlight_impressions_timestamp_idx ON highlight_impressions(timestamp);
      CREATE INDEX IF NOT EXISTS highlight_impressions_section_idx ON highlight_impressions(section);
      CREATE INDEX IF NOT EXISTS stores_trial_idx ON stores(is_in_trial);
      CREATE INDEX IF NOT EXISTS stores_highlight_weight_idx ON stores(highlight_weight);
    `);

    console.log('📋 Criando tabela highlight_configurations...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS highlight_configurations (
        id SERIAL PRIMARY KEY,
        plan_type VARCHAR(50) NOT NULL UNIQUE,
        weight INTEGER DEFAULT 0,
        impression_percentage INTEGER DEFAULT 0,
        sections TEXT[] DEFAULT '{}',
        rotation_interval_hours INTEGER DEFAULT 6,
        max_daily_impressions INTEGER DEFAULT -1,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('📋 Inserindo configurações padrão de destaque...');
    await client.query(`
      INSERT INTO highlight_configurations (plan_type, weight, impression_percentage, sections) VALUES
      ('freemium', 1, 10, '{"descobrir_lojas_locais"}'),
      ('trial', 2, 5, '{"testando_premium", "descobrir_lojas_locais"}'),
      ('start', 3, 15, '{"novidades", "descobrir_lojas_locais"}'),
      ('pro', 4, 25, '{"ofertas_especiais", "novidades"}'),
      ('premium', 5, 45, '{"em_destaque_premium", "ofertas_especiais", "novidades"}')
      ON CONFLICT (plan_type) DO UPDATE SET
        weight = EXCLUDED.weight,
        impression_percentage = EXCLUDED.impression_percentage,
        sections = EXCLUDED.sections;
    `);

    console.log('📋 Atualizando pesos das lojas existentes...');
    await client.query(`
      UPDATE stores SET 
        highlight_weight = CASE 
          WHEN subscription_plan = 'freemium' THEN 1
          WHEN subscription_plan = 'start' THEN 3
          WHEN subscription_plan = 'pro' THEN 4
          WHEN subscription_plan = 'premium' THEN 5
          ELSE 1
        END
      WHERE highlight_weight = 0;
    `);

    console.log('📋 Ativando trial para lojas recentes...');
    const trialResult = await client.query(`
      UPDATE stores SET 
        is_in_trial = TRUE,
        trial_start_date = created_at,
        trial_end_date = created_at + INTERVAL '15 days',
        highlight_weight = 2
      WHERE subscription_plan = 'freemium' 
        AND created_at > NOW() - INTERVAL '30 days'
        AND is_in_trial = FALSE
      RETURNING id, name;
    `);

    console.log(`✅ Trial ativado para ${trialResult.rows.length} lojas recentes`);

    const stats = await client.query(`
      SELECT 
        subscription_plan,
        highlight_weight,
        COUNT(*) as total_lojas,
        COUNT(*) FILTER (WHERE is_in_trial = TRUE) as em_trial
      FROM stores 
      GROUP BY subscription_plan, highlight_weight
      ORDER BY highlight_weight DESC;
    `);

    console.log('\n📊 Estatísticas finais:');
    console.table(stats.rows);
    console.log('\n✅ Migração concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  } finally {
    await client.end();
  }
}

migrateTrialAndHighlights().catch(console.error);
