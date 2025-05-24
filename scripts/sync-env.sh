#!/bin/bash

# Script para sincronizar variáveis de ambiente entre Replit e desenvolvimento local

# Verifica se está rodando no Replit
if [ -n "$REPL_ID" ]; then
    echo "Ambiente Replit detectado"
    
    # Navega para o diretório raiz do projeto
    cd "$(dirname "$0")/.." || exit
    
    # Se .env não existe, cria a partir do .env.example
    if [ ! -f .env ]; then
        echo "Criando .env a partir do .env.example..."
        cp .env.example .env
    fi
    
    # Atualiza .env com as variáveis do Replit
    echo "Atualizando .env com as variáveis do Replit..."
    
    # Lista de variáveis que queremos sincronizar
    VARS_TO_SYNC=(
        "STRIPE_MODE"
        "STRIPE_SECRET_KEY_TEST"
        "STRIPE_SECRET_KEY"
        "NEXT_PUBLIC_APP_URL"
    )
    
    # Para cada variável na lista
    for VAR in "${VARS_TO_SYNC[@]}"; do
        # Se a variável existe no Replit
        if [ -n "${!VAR}" ]; then
            # Atualiza ou adiciona a variável no .env
            if grep -q "^$VAR=" .env; then
                # Variável existe, atualiza
                sed -i "s|^$VAR=.*|$VAR=${!VAR}|" .env
            else
                # Variável não existe, adiciona
                echo "$VAR=${!VAR}" >> .env
            fi
        fi
    done
    
    echo "Sincronização concluída!"
else
    echo "Ambiente local detectado"
    echo "Usando variáveis do arquivo .env local"
fi
