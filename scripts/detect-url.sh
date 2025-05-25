#!/bin/bash

# Detecta o ambiente e configura a URL apropriada
detect_app_url() {
    # Verifica se estamos no Replit
    if [ -n "$REPL_ID" ] && [ -n "$REPL_SLUG" ]; then
        # Verifica se é ambiente de preview (contém o ID do Repl)
        if [[ "$REPL_SLUG" == *"-"* ]]; then
            echo "https://${REPL_ID}-${REPL_OWNER}-${REPL_SLUG}.${REPL_CLUSTER}.replit.dev"
        else
            # URL de produção/deploy
            echo "https://partiusaara.replit.app"
        fi
    else
        # Ambiente local
        echo "http://localhost:5000"
    fi
}

# Obtém a URL apropriada
APP_URL=$(detect_app_url)

# Atualiza o .env com a nova URL
if [ -f ".env" ]; then
    # Se NEXT_PUBLIC_APP_URL já existe, atualiza
    if grep -q "^NEXT_PUBLIC_APP_URL=" .env; then
        sed -i "s|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=${APP_URL}|" .env
    else
        # Se não existe, adiciona
        echo "NEXT_PUBLIC_APP_URL=${APP_URL}" >> .env
    fi
    echo "✅ NEXT_PUBLIC_APP_URL atualizada para: ${APP_URL}"
else
    echo "❌ Arquivo .env não encontrado"
fi
