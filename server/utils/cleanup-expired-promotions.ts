// server/utils/cleanup-expired-promotions.ts
// SOLUÇÃO DEFINITIVA baseada na estrutura real do banco

import cron from 'node-cron';
import { db } from '../db';
import { promotions, products } from '../../shared/schema';
import { and, eq, sql } from 'drizzle-orm';

interface CleanupStats {
  totalProcessed: number;
  expiredFound: number;
  successfulCleanups: number;
  errors: number;
  lastRun: Date;
}

class ExpiredPromotionsCleanup {
  private stats: CleanupStats = {
    totalProcessed: 0,
    expiredFound: 0,
    successfulCleanups: 0,
    errors: 0,
    lastRun: new Date()
  };

  /**
   * ✅ DEFINITIVO: Limpar promoções expiradas usando estrutura real
   * 
   * ESTRUTURA REAL:
   * - Tabela: promotions (id, product_id, type, discount_percentage, start_time, end_time)
   * - Tabela: products (id, discounted_price) 
   * 
   * LÓGICA:
   * 1. Deletar registros de promotions onde end_time <= NOW()
   * 2. Limpar discounted_price dos produtos que não têm mais promoções ativas
   */
  async cleanupExpiredPromotions(): Promise<CleanupStats> {
    const startTime = new Date();
    console.log(`🧹 [${startTime.toISOString()}] Iniciando limpeza de promoções expiradas...`);

    try {
      // 1. Buscar promoções expiradas ANTES de deletar (para log)
      const expiredPromotions = await db
        .select({
          id: promotions.id,
          productId: promotions.productId,
          type: promotions.type,
          endTime: promotions.endTime
        })
        .from(promotions)
        .where(sql`${promotions.endTime} <= NOW()`);

      this.stats.expiredFound = expiredPromotions.length;
      this.stats.totalProcessed += expiredPromotions.length;

      if (expiredPromotions.length === 0) {
        console.log('✅ Nenhuma promoção expirada encontrada');
        this.stats.lastRun = startTime;
        return this.stats;
      }

      console.log(`📋 Encontradas ${expiredPromotions.length} promoções expiradas para limpeza`);

      // 2. Deletar promoções expiradas da tabela promotions
      const deletedCount = await db
        .delete(promotions)
        .where(sql`${promotions.endTime} <= NOW()`);

      // 3. Buscar produtos que tinham as promoções deletadas
      const affectedProductIds = [...new Set(expiredPromotions.map(p => p.productId))];

      // 4. Para cada produto afetado, verificar se ainda tem promoções ativas
      for (const productId of affectedProductIds) {
        const activePromotions = await db
          .select()
          .from(promotions)
          .where(
            and(
              eq(promotions.productId, productId),
              sql`${promotions.endTime} > NOW()`
            )
          );

        // Se não tem mais promoções ativas, limpar discounted_price
        if (activePromotions.length === 0) {
          await db
            .update(products)
            .set({
              discountedPrice: null,
              updatedAt: new Date()
            })
            .where(eq(products.id, productId));
        }
      }

      this.stats.successfulCleanups += expiredPromotions.length;

      // 5. Log detalhado das promoções limpas
      expiredPromotions.forEach(promotion => {
        console.log(`🔄 Promoção removida: Produto ID ${promotion.productId} - Promoção ${promotion.type} expirada em ${promotion.endTime}`);
      });

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      console.log(`✅ [${endTime.toISOString()}] Limpeza concluída em ${duration}ms`);
      console.log(`📊 Estatísticas: ${expiredPromotions.length} promoções removidas, ${affectedProductIds.length} produtos verificados`);

      this.stats.lastRun = endTime;
      return this.stats;

    } catch (error) {
      this.stats.errors++;
      console.error('❌ Erro durante limpeza de promoções expiradas:', error);

      this.stats.lastRun = new Date();
      return this.stats;
    }
  }

  /**
   * ✅ DEFINITIVO: Validar integridade usando estrutura real
   */
  async validateCleanupIntegrity(): Promise<boolean> {
    try {
      // Verificar se ainda existem promoções expiradas
      const remainingExpired = await db
        .select()
        .from(promotions)
        .where(sql`${promotions.endTime} <= NOW()`);

      if (remainingExpired.length > 0) {
        console.warn(`⚠️ Ainda existem ${remainingExpired.length} promoções expiradas não limpas`);
        return false;
      }

      console.log('✅ Validação de integridade passou - não há promoções expiradas remanescentes');
      return true;

    } catch (error) {
      console.error('❌ Erro na validação de integridade:', error);
      return false;
    }
  }

  /**
   * ✅ UTILITÁRIO: Obter estatísticas do job
   */
  getStats(): CleanupStats {
    return { ...this.stats };
  }

  /**
   * ✅ UTILITÁRIO: Resetar estatísticas
   */
  resetStats(): void {
    this.stats = {
      totalProcessed: 0,
      expiredFound: 0,
      successfulCleanups: 0,
      errors: 0,
      lastRun: new Date()
    };
  }
}

// Instância singleton do cleanup
const cleanupService = new ExpiredPromotionsCleanup();

/**
 * ✅ CONFIGURAÇÃO: Job agendado para rodar automaticamente
 */
export function startExpiredPromotionsCleanupJob(): void {
  console.log('🚀 Iniciando job de limpeza de promoções expiradas...');

  // Executar a cada 15 minutos
  cron.schedule('*/15 * * * *', async () => {
    await cleanupService.cleanupExpiredPromotions();
  });

  // Executar validação de integridade uma vez por hora
  cron.schedule('0 * * * *', async () => {
    await cleanupService.validateCleanupIntegrity();
  });

  // Log das estatísticas uma vez por dia
  cron.schedule('0 0 * * *', () => {
    const stats = cleanupService.getStats();
    console.log('📊 Estatísticas diárias do cleanup de promoções:', stats);
    cleanupService.resetStats();
  });

  console.log('⏰ Jobs agendados:');
  console.log('   - Limpeza: a cada 15 minutos');
  console.log('   - Validação: a cada hora');
  console.log('   - Relatório: diariamente às 00:00');
}

/**
 * ✅ ENDPOINT: Para execução manual via API
 */
export async function manualCleanupExpiredPromotions(): Promise<CleanupStats> {
  console.log('🔧 Execução manual de limpeza de promoções expiradas');
  return await cleanupService.cleanupExpiredPromotions();
}

/**
 * ✅ INICIALIZAÇÃO: Chamada no app.ts
 */
export function initializeCleanupJobs(): void {
  startExpiredPromotionsCleanupJob();

  // Executar uma limpeza inicial na inicialização
  setTimeout(async () => {
    console.log('🎯 Executando limpeza inicial de promoções expiradas...');
    await cleanupService.cleanupExpiredPromotions();
  }, 5000); // Aguardar 5 segundos após inicialização
}

export default cleanupService;