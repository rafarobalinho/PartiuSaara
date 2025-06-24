// server/controllers/highlight.controller.ts
import { Request, Response } from 'express';
import { db } from '../db';
import { stores, products, highlightImpressions, highlightConfigurations } from '../../shared/schema';
import { eq, and, gte, lte, desc, sql, inArray } from 'drizzle-orm';

/**
 * Buscar produtos em destaque para a home
 * Implementa algoritmo de distribuição justa incluindo Freemium
 */
export const getHomeHighlights = async (req: Request, res: Response) => {
  try {
    console.log('🔍 [Highlights] Buscando produtos em destaque...');

    // 1. Buscar configurações de destaque por plano
    const configs = await db.select().from(highlightConfigurations).where(eq(highlightConfigurations.isActive, true));

    if (configs.length === 0) {
      return res.json({
        success: true,
        highlights: {},
        message: 'Nenhuma configuração de destaque encontrada'
      });
    }

    // 2. Buscar lojas com seus produtos por plano
    const storesWithProducts = await db.select({
      storeId: stores.id,
      storeName: stores.name,
      subscriptionPlan: stores.subscriptionPlan,
      isInTrial: stores.isInTrial,
      // ✅ CORRIGIDO: usar highlightWeight em vez de highlight_weight
      highlightWeight: stores.highlightWeight,
      lastHighlightedAt: stores.lastHighlightedAt,
      totalImpressions: stores.totalHighlightImpressions,
      productId: products.id,
      productName: products.name,
      productPrice: products.price,
      productCategory: products.category,
      productCreatedAt: products.createdAt
    })
    .from(stores)
    .innerJoin(products, eq(products.storeId, stores.id))
    .where(and(
      eq(products.isActive, true),
      eq(stores.isOpen, true)
    ))
    .orderBy(desc(products.createdAt));

    console.log(`🔍 [Highlights] Encontradas ${storesWithProducts.length} combinações loja-produto`);

    // 3. Agrupar por plano e aplicar algoritmo de distribuição
    const highlightsBySection: Record<string, any[]> = {};

    for (const config of configs) {
      const planType = config.planType;
      const sections = config.sections || [];

      // Filtrar produtos do plano atual (incluindo trial)
      let planProducts = storesWithProducts.filter(item => {
        if (planType === 'trial') {
          return item.isInTrial === true;
        }
        return item.subscriptionPlan === planType;
      });

      console.log(`🔍 [Highlights] Plano ${planType}: ${planProducts.length} produtos`);

      // Aplicar algoritmo de peso com penalidade por impressões
      planProducts = planProducts.map(item => {
        const baseWeight = item.highlightWeight || 1;

        // ✅ CORRIGIDO: Verificar se totalImpressions não é null
        const impressionPenalty = item.totalImpressions ? Math.min(item.totalImpressions / 1000, 0.5) : 0;

        const finalWeight = Math.max(baseWeight - impressionPenalty, 0.1);

        return {
          ...item,
          calculatedWeight: finalWeight,
          lastHighlighted: item.lastHighlightedAt ? new Date(item.lastHighlightedAt) : null
        };
      });

      // Ordenar por peso e diversificar
      planProducts.sort((a, b) => {
        // Priorizar produtos que não foram destacados recentemente
        const aLastHighlighted = a.lastHighlighted?.getTime() || 0;
        const bLastHighlighted = b.lastHighlighted?.getTime() || 0;
        const timeDiff = aLastHighlighted - bLastHighlighted;

        if (Math.abs(timeDiff) > 6 * 60 * 60 * 1000) { // 6 horas
          return aLastHighlighted - bLastHighlighted; // Menos recente primeiro
        }

        return b.calculatedWeight - a.calculatedWeight; // Maior peso primeiro
      });

      // Distribuir produtos pelas seções do plano
      for (const section of sections) {
        if (!highlightsBySection[section]) {
          highlightsBySection[section] = [];
        }

        const sectionLimit = getSectionLimit(section, planType);
        const sectionProducts = planProducts.slice(0, sectionLimit);

        highlightsBySection[section].push(...sectionProducts);
      }
    }

    // 4. Finalizar seções com limites e diversificação
    const finalHighlights: Record<string, any[]> = {};

    for (const [section, products] of Object.entries(highlightsBySection)) {
      // Diversificar por categoria e loja
      const diversified = diversifyProducts(products);
      const maxItems = getMaxItemsPerSection(section);

      finalHighlights[section] = diversified.slice(0, maxItems);
    }

    console.log('✅ [Highlights] Distribuição final:', Object.keys(finalHighlights).map(k => `${k}: ${finalHighlights[k].length}`));

    res.json({
      success: true,
      highlights: finalHighlights,
      totalSections: Object.keys(finalHighlights).length
    });

  } catch (error) {
    console.error('❌ [Highlights] Erro ao buscar destaques:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar produtos em destaque',
      highlights: {}
    });
  }
};

/**
 * Registrar impressão de destaque
 * Anti-spam: máximo 1 impressão por IP por produto a cada 5 minutos
 */
export const recordHighlightImpression = async (req: Request, res: Response) => {
  try {
    const { storeId, productId, section } = req.body;
    const userId = req.user?.id || null;
    const ipAddress = req.ip || req.connection.remoteAddress || null;

    if (!storeId || !section) {
      return res.status(400).json({
        success: false,
        error: 'storeId e section são obrigatórios'
      });
    }

    // Verificar spam: mesma impressão nos últimos 5 minutos
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const recentImpression = await db.select()
      .from(highlightImpressions)
      .where(and(
        eq(highlightImpressions.storeId, storeId),
        productId ? eq(highlightImpressions.productId, productId) : sql`product_id IS NULL`,
        eq(highlightImpressions.section, section),
        gte(highlightImpressions.timestamp, fiveMinutesAgo),
        // ✅ CORRIGIDO: Verificar ipAddress antes de usar
        ipAddress ? eq(highlightImpressions.ipAddress, ipAddress) : sql`ip_address IS NULL`
      ))
      .limit(1);

    if (recentImpression.length > 0) {
      return res.json({
        success: true,
        message: 'Impressão já registrada recentemente'
      });
    }

    // Registrar nova impressão
    await db.insert(highlightImpressions).values({
      storeId,
      productId: productId || null,
      section,
      timestamp: new Date(),
      userId,
      ipAddress
    });

    // Atualizar contador na loja
    await db.update(stores)
      .set({
        totalHighlightImpressions: sql`${stores.totalHighlightImpressions} + 1`,
        lastHighlightedAt: new Date()
      })
      .where(eq(stores.id, storeId));

    res.json({
      success: true,
      message: 'Impressão registrada com sucesso'
    });

  } catch (error) {
    console.error('❌ [Highlights] Erro ao registrar impressão:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao registrar impressão'
    });
  }
};

/**
 * Analytics de destaque para lojistas
 */
export const getHighlightAnalytics = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { days = 30 } = req.query;

    const daysAgo = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    const impressions = await db.select({
      section: highlightImpressions.section,
      date: sql<string>`DATE(${highlightImpressions.timestamp})`,
      count: sql<number>`COUNT(*)::int`
    })
    .from(highlightImpressions)
    .where(and(
      eq(highlightImpressions.storeId, Number(storeId)),
      gte(highlightImpressions.timestamp, daysAgo)
    ))
    .groupBy(highlightImpressions.section, sql`DATE(${highlightImpressions.timestamp})`)
    .orderBy(sql`DATE(${highlightImpressions.timestamp})`);

    res.json({
      success: true,
      analytics: impressions,
      period: `${days} dias`
    });

  } catch (error) {
    console.error('❌ [Highlights] Erro ao buscar analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar analytics de destaque'
    });
  }
};

/**
 * Atualizar peso de destaque (admin)
 */
export const updateHighlightWeight = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { weight } = req.body;

    if (typeof weight !== 'number' || weight < 0 || weight > 10) {
      return res.status(400).json({
        success: false,
        error: 'Peso deve ser um número entre 0 e 10'
      });
    }

    await db.update(stores)
      .set({ highlightWeight: weight })
      .where(eq(stores.id, Number(storeId)));

    res.json({
      success: true,
      message: 'Peso de destaque atualizado com sucesso'
    });

  } catch (error) {
    console.error('❌ [Highlights] Erro ao atualizar peso:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar peso de destaque'
    });
  }
};

// ===== FUNÇÕES AUXILIARES =====

function getSectionLimit(section: string, planType: string): number {
  const limits: Record<string, Record<string, number>> = {
    'em_destaque_premium': { premium: 10, pro: 0, start: 0, freemium: 0, trial: 0 },
    'ofertas_especiais': { premium: 8, pro: 6, start: 0, freemium: 0, trial: 3 },
    'novidades': { premium: 6, pro: 4, start: 3, freemium: 0, trial: 2 },
    'descobrir_lojas_locais': { premium: 3, pro: 2, start: 2, freemium: 2, trial: 1 },
    'testando_premium': { premium: 0, pro: 0, start: 0, freemium: 0, trial: 5 }
  };

  return limits[section]?.[planType] || 0;
}

function getMaxItemsPerSection(section: string): number {
  const maxItems: Record<string, number> = {
    'em_destaque_premium': 15,
    'ofertas_especiais': 12,
    'novidades': 10,
    'descobrir_lojas_locais': 8,
    'testando_premium': 6
  };

  return maxItems[section] || 10;
}

function diversifyProducts(products: any[]): any[] {
  const diversified: any[] = [];
  const usedStores = new Set<number>();
  const usedCategories = new Set<string>();

  // Primeira passada: diversificar por loja
  for (const product of products) {
    if (!usedStores.has(product.storeId)) {
      diversified.push(product);
      usedStores.add(product.storeId);
      usedCategories.add(product.productCategory);
    }
  }

  // Segunda passada: adicionar produtos de categorias diferentes
  for (const product of products) {
    if (diversified.length >= getMaxItemsPerSection('descobrir_lojas_locais')) break;

    if (!diversified.find(p => p.productId === product.productId) && 
        !usedCategories.has(product.productCategory)) {
      diversified.push(product);
      usedCategories.add(product.productCategory);
    }
  }

  // Terceira passada: completar com produtos restantes
  for (const product of products) {
    if (diversified.length >= getMaxItemsPerSection('descobrir_lojas_locais')) break;

    if (!diversified.find(p => p.productId === product.productId)) {
      diversified.push(product);
    }
  }

  return diversified;
}