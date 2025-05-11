# Segurança de Imagens no Aplicativo "Partiu Saara"

Este documento descreve as melhorias de segurança implementadas no sistema de imagens do aplicativo, incluindo a validação de relacionamentos entre entidades, tratamento de erros, e gestão de caminhos de imagens.

## 1. Componentes principais

### Componente `ImageComponent`

Um componente React para exibição segura de imagens que:
- Reconstrói caminhos de imagem para garantir o formato padronizado `/uploads/stores/{storeId}/products/{productId}/[nome_arquivo]`
- Implementa fallbacks automáticos caso a imagem não seja encontrada
- Garante que apenas imagens do produto/loja corretos sejam exibidas

```jsx
<ImageComponent 
  src="/caminho/imagem.jpg"
  alt="Descrição"
  className="classes-css"
  productId={produto.id}
  storeId={produto.storeId}
/>
```

### Middleware `validateImageRelationship`

Middleware para validação de relacionamentos entre imagens, produtos e lojas que:
- Verifica se o produto existe e a que loja pertence
- Verifica se a imagem solicitada pertence ao produto correto
- Adiciona informações validadas ao request para uso nos controllers

## 2. Scripts de manutenção

Foram criados scripts para manutenção do sistema de imagens:

### `scripts/fix-image-paths.js`
Corrige caminhos de imagens inconsistentes no banco de dados, movendo arquivos para o formato seguro.

### `scripts/verify-image-product-mapping.js`
Verifica e corrige problemas de mapeamento entre imagens e produtos/lojas.

### `scripts/update-image-controller.js`
Atualiza controladores para usar o novo middleware de validação de imagens.

### `scripts/maintain-images.js`
Script principal que executa os três scripts acima em sequência.

## 3. Como usar os scripts de manutenção

```bash
# Executar ferramenta completa de manutenção (recomendado)
node scripts/maintain-images.js

# Ou executar scripts individuais
node scripts/fix-image-paths.js
node scripts/verify-image-product-mapping.js
node scripts/update-image-controller.js
```

## 4. Padrão de URLs de imagens

As seguintes convenções são usadas para caminhos de imagens:

**Imagens de produto:**
- Formato seguro: `/uploads/stores/{storeId}/products/{productId}/{nome_arquivo}`
- API URL: `/api/products/{productId}/primary-image`

**Imagens de loja:**
- Formato seguro: `/uploads/stores/{storeId}/{nome_arquivo}`
- API URL: `/api/stores/{storeId}/primary-image`

## 5. Problemas comuns e soluções

1. **Imagens sendo buscadas do local errado**
   - Solução: Use o `ImageComponent` com os IDs corretos

2. **Imagens mostrando produtos incorretos**
   - Solução: O middleware `validateImageRelationship` garante que imagens só serão exibidas para o produto/loja correto

3. **Erros de carregamento de imagens**
   - Solução: O `ImageComponent` implementa um sistema de fallback que tenta diferentes caminhos e, em último caso, exibe uma imagem padrão

## 6. Validações de segurança

- **Validação de proprietário**: Verifica se a loja pertence ao usuário autenticado
- **Validação de relacionamento**: Verifica se a imagem pertence ao produto/loja correto
- **Sanitização de caminho**: Caminhos de arquivo são normalizados para evitar exploits de diretório
- **Fallback seguro**: Em caso de erro, usa imagem padrão para evitar exposição de erros do sistema

## 7. Próximos passos recomendados

1. Implementar limitação de tamanho de upload de imagens
2. Adicionar escaneamento de imagens para malware/conteúdo impróprio
3. Implementar CDN para melhorar desempenho de imagens
4. Adicionar geração automática de versões otimizadas para dispositivos móveis