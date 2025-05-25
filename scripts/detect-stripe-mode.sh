#!/bin/bash

# Detecta o ambiente e configura o modo do Stripe apropriado
detect_stripe_mode() {
    # Verifica se estamos no Replit
    if [ -n "$REPL_ID" ] && [ -n "$REPL_SLUG" ]; then
        # Se for ambiente de preview (contém o ID do Repl), usa modo de teste
        if [[ "$REPL_SLUG" == *"-"* ]]; then
            echo "test"
        else
            # URL de produção/deploy - usa modo live
            echo "live"
        fi
    else
        # Ambiente local - sempre usa modo de teste
        echo "test"
    fi
}

# Obtém o modo apropriado do Stripe
STRIPE_MODE_VALUE=$(detect_stripe_mode)

# Atualiza o .env com o modo do Stripe
if [ -f ".env" ]; then
    # Se STRIPE_MODE já existe, atualiza
    if grep -q "^STRIPE_MODE=" .env; then
        sed -i "s|^STRIPE_MODE=.*|STRIPE_MODE=${STRIPE_MODE_VALUE}|" .env
    else
        # Se não existe, adiciona
        echo "STRIPE_MODE=${STRIPE_MODE_VALUE}" >> .env
    fi
    
    echo "✅ STRIPE_MODE configurado para: ${STRIPE_MODE_VALUE}"
    echo "🔑 Usando chave: $([ "$STRIPE_MODE_VALUE" = "test" ] && echo "STRIPE_SECRET_KEY_TEST" || echo "STRIPE_SECRET_KEY")"
else
    echo "❌ Arquivo .env não encontrado"
fi

# Verifica se as chaves necessárias estão configuradas
if [ "$STRIPE_MODE_VALUE" = "test" ]; then
    if ! grep -q "STRIPE_SECRET_KEY_TEST=" .env || [ -z "$(grep "STRIPE_SECRET_KEY_TEST=" .env | cut -d'=' -f2)" ]; then
        echo "⚠️  Atenção: STRIPE_SECRET_KEY_TEST não está configurada"
    fi
else
    if ! grep -q "STRIPE_SECRET_KEY=" .env || [ -z "$(grep "STRIPE_SECRET_KEY=" .env | cut -d'=' -f2)" ]; then
        echo "⚠️  Atenção: STRIPE_SECRET_KEY não está configurada"
    fi
fi
