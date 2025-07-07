// server/controllers/highlight.controller.ts

import { Request, Response } from 'express';
import { db } from '../db';
// ✅ 1. Importar a tabela 'promotions' do schema
import { stores, products, highlightImpressions, highlightConfigurations, promotions } from '../../shared/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

/**
 * Buscar produtos em destaque para a home
 * Implementa algoritmo de distribuição justa E DADOS DE PROMOÇÃO
 */
export const getHomeHighlights = async (req: Request, res: Response) => {
  try {
    console.log('🔍 [Highlights] Buscando produtos em destaque...');
    const now = new Date(); // Usado para buscar apenas promoções ativas

    // 🎯 EXTRAIR DADOS DO REQUEST PARA PERSONALIZAÇÃO (FUTURO)
    const userId = req.user?.id || null;
    const categoryFilter = req.query.category as string || null;

    console.log('🎯 [Highlights] Parâmetros:', {
      userId,
      categoryFilter
    });

    // 1. Buscar configurações de destaque por plano (Sua lógica original)
    const configs = await db.select().from(highlightConfigurations).where(eq(highlightConfigurations.isActive, true));

    if (configs.length === 0) {
      return res.json({ success: true, highlights: {}, message: 'Nenhuma configuração de destaque encontrada' });
    }

    // ✅ 2. QUERY PRINCIPAL - APENAS CAMPOS QUE EXISTEM
    const storesWithProducts = await db.select({
      storeId: stores.id,
      storeName: stores.name,
      subscriptionPlan: stores.subscriptionPlan,
      isInTrial: stores.isInTrial,
      highlightWeight: stores.highlightWeight,
      lastHighlightedAt: stores.lastHighlightedAt,
      totalImpressions: stores.totalHighlightImpressions,
      // ✅ INCLUIR location da loja para futuras funcionalidades
      storeLocation: stores.location,
      productId: products.id,
      productName: products.name,
      productPrice: products.price,
      productCategory: products.category,
      productCreatedAt: products.createdAt,
      images: products.images,
      // CAMPOS DA PROMOÇÃO (serão null se não houver promoção ativa)
      promotionType: promotions.type,
      discountPercentage: promotions.discountPercentage,
      promotionEndTime: promotions.endTime
    })
    .from(stores)
    .innerJoin(products, eq(products.storeId, stores.id))
    // O LEFT JOIN garante que produtos sem promoção ainda sejam incluídos.
    .leftJoin(
        promotions,
        and(
            eq(promotions.productId, products.id),
            // Condição para garantir que a promoção está ATIVA
            lte(promotions.startTime, now),
            gte(promotions.endTime, now)
        )
    )
    .where(and(
      eq(products.isActive, true),
      eq(stores.isOpen, true),
      // 🎯 FILTRO POR CATEGORIA se especificado
      categoryFilter ? eq(products.category, categoryFilter) : sql`true`
    ))
    .orderBy(desc(products.createdAt));

    console.log(`🔍 [Highlights] Encontradas ${storesWithProducts.length} combinações loja-produto`);

    // ✅ 3. PROCESSAMENTO DE DADOS - REMOVIDAS FUNCIONALIDADES DE LOCALIZAÇÃO PROBLEMÁTICAS
    const processedProducts = storesWithProducts.map(item => {
        let discountedPrice = null;
        if (item.discountPercentage && item.productPrice) {
            const discount = item.productPrice * (item.discountPercentage / 100);
            discountedPrice = Math.round((item.productPrice - discount) * 100) / 100;
        }

        return {
            ...item,
            discountedPrice // Adiciona a propriedade ao objeto do produto
        };
    });

    // 4. Agrupar por plano e aplicar algoritmo de distribuição
    const highlightsBySection: Record<string, any[]> = {};

    for (const config of configs) {
      const planType = config.planType;
      const sections = config.sections || [];

      // A filtragem agora opera sobre os produtos já processados
      let planProducts = processedProducts.filter(item => {
        if (planType === 'trial') {
          return item.isInTrial === true;
        }
        return item.subscriptionPlan === planType;
      });

      // ✅ Se a seção for 'ofertas_especiais', priorizamos produtos que REALMENTE têm desconto
      if (sections.includes('ofertas_especiais')) {
          const promoProducts = planProducts.filter(p => p.discountedPrice !== null);
          const regularProducts = planProducts.filter(p => p.discountedPrice === null);
          planProducts = [...promoProducts, ...regularProducts]; // Produtos em promoção primeiro
      }

      console.log(`🔍 [Highlights] Plano ${planType}: ${planProducts.length} produtos`);

      // Aplicar algoritmo de peso
      planProducts = planProducts.map(item => {
        const baseWeight = item.highlightWeight || 1;
        const impressionPenalty = item.totalImpressions ? Math.min(item.totalImpressions / 1000, 0.5) : 0;
        const finalWeight = Math.max(baseWeight - impressionPenalty, 0.1);

        return { 
          ...item, 
          calculatedWeight: finalWeight
        };
      });

      planProducts.sort((a, b) => {
        // Usar lastHighlightedAt diretamente do banco
        const aLastHighlighted = a.lastHighlightedAt ? new Date(a.lastHighlightedAt).getTime() : 0;
        const bLastHighlighted = b.lastHighlightedAt ? new Date(b.lastHighlightedAt).getTime() : 0;
        const timeDiff = aLastHighlighted - bLastHighlighted;
        if (Math.abs(timeDiff) > 6 * 60 * 60 * 1000) {
          return aLastHighlighted - bLastHighlighted;
        }
        return (b as any).calculatedWeight - (a as any).calculatedWeight;
      });

      for (const section of sections) {
        if (!highlightsBySection[section]) {
          highlightsBySection[section] = [];
        }
        const sectionLimit = getSectionLimit(section, planType);
        const sectionProducts = planProducts.slice(0, sectionLimit);
        highlightsBySection[section].push(...sectionProducts);
      }
    }

    // 5. Finalizar seções com limites e diversificação
    const finalHighlights: Record<string, any[]> = {};
    for (const [section, products] of Object.entries(highlightsBySection)) {
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
    res.status(500).json({ success: false, error: 'Erro ao buscar produtos em destaque', highlights: {} });
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
const ipAddress = req.ip || (req as any).connection?.remoteAddress || null;

if (!storeId || !section) {
return res.status(400).json({
success: false,
error: 'storeId e section são obrigatórios'
});
}

// ✅ CORRIGIDO: Converter storeId para number explicitamente
const numericStoreId = Number(storeId);
if (isNaN(numericStoreId)) {
  return res.status(400).json({
    success: false,
    error: 'storeId deve ser um número válido'
  });
}

// Verificar spam: mesma impressão nos últimos 5 minutos
const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

const recentImpression = await db.select()
.from(highlightImpressions)
.where(and(
eq(highlightImpressions.storeId, numericStoreId),
productId ? eq(highlightImpressions.productId, Number(productId)) : sql`product_id IS NULL`,
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
storeId: numericStoreId,
productId: productId ? Number(productId) : null,
section,
userId,
ipAddress
});

// Atualizar contador na loja
await db.update(stores)
.set({
totalHighlightImpressions: sql`${stores.totalHighlightImpressions} + 1`,
lastHighlightedAt: sql`NOW()`
})
.where(eq(stores.id, numericStoreId));

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

// ✅ CORRIGIDO: Validar storeId
const numericStoreId = Number(storeId);
if (isNaN(numericStoreId)) {
  return res.status(400).json({
    success: false,
    error: 'storeId deve ser um número válido'
  });
}

const daysAgo = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

const impressions = await db.select({
section: highlightImpressions.section,
date: sql<string>`DATE(${highlightImpressions.timestamp})`,
count: sql<number>`COUNT(*)::int`
})
.from(highlightImpressions)
.where(and(
eq(highlightImpressions.storeId, numericStoreId),
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

// ✅ CORRIGIDO: Validar storeId
const numericStoreId = Number(storeId);
if (isNaN(numericStoreId)) {
  return res.status(400).json({
    success: false,
    error: 'storeId deve ser um número válido'
  });
}

if (typeof weight !== 'number' || weight < 0 || weight > 10) {
return res.status(400).json({
success: false,
error: 'Peso deve ser um número entre 0 e 10'
});
}

await db.update(stores)
.set({ highlightWeight: weight })
.where(eq(stores.id, numericStoreId));

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