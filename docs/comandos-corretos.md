
# Comandos Corretos para Scripts do Projeto

## Scripts de Migração de Imagens

### ✅ FORMATO CORRETO
```bash
npx tsx scripts/migrate-images-to-structure.js
```

### ❌ FORMATO INCORRETO (que gera erro)
```bash
node scripts/migrate-images-to-structure.js
```

### Motivo
O script importa arquivos TypeScript (`.ts`) como `../server/db.ts` e precisa do `tsx` para transpilar e executar corretamente. O comando `node` simples não consegue processar imports de arquivos `.ts`.

### Outros Scripts que Precisam do Mesmo Formato
- `npx tsx scripts/fix-image-paths.js`
- `npx tsx scripts/verify-image-product-mapping.js`
- `npx tsx scripts/maintain-images.js`
- `npx tsx scripts/complete-migration-cleanup.js`

### Regra Geral
**Sempre que um script JavaScript importar arquivos TypeScript (`.ts`), use `npx tsx` ao invés de `node`.**

---

## Histórico de Erros Resolvidos

### Erro Típico
```
TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".ts" for /home/runner/workspace/server/db.ts
```

### Solução
Usar `npx tsx` que consegue processar tanto arquivos `.js` quanto `.ts` em tempo de execução.

---

**Data de registro:** 18/06/2025
**Autor:** Sistema de Migração de Imagens
