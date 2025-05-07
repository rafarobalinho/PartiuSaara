#!/bin/bash
# clean-replit.sh - Script para limpar o cache do Replit

echo "==== Limpando cache do Replit ===="

# Verificar diretórios de cache
if [ -d ".replit.cache" ]; then
  echo "Removendo .replit.cache..."
  rm -rf .replit.cache
fi

if [ -d ".config/replit/cache" ]; then
  echo "Removendo .config/replit/cache..."
  rm -rf .config/replit/cache
fi

if [ -d "node_modules/.cache" ]; then
  echo "Removendo node_modules/.cache..."
  rm -rf node_modules/.cache
fi

# Verificar e limpar arquivos de log
if [ -f "*.log" ]; then
  echo "Removendo arquivos de log..."
  rm -f *.log
fi

echo "==== Verificando diretórios de uploads ===="

# Verificar diretórios de uploads
UPLOADS_DIR="public/uploads"
THUMBNAILS_DIR="public/uploads/thumbnails"
ORIGINALS_DIR="public/uploads/originals"

# Verificar e criar diretório de uploads principal
if [ ! -d "$UPLOADS_DIR" ]; then
  echo "Criando diretório $UPLOADS_DIR..."
  mkdir -p "$UPLOADS_DIR"
  chmod 755 "$UPLOADS_DIR"
else
  echo "Diretório $UPLOADS_DIR já existe!"
  # Exibir permissões
  ls -la "$UPLOADS_DIR" | head -n 1
fi

# Verificar e criar diretório de thumbnails
if [ ! -d "$THUMBNAILS_DIR" ]; then
  echo "Criando diretório $THUMBNAILS_DIR..."
  mkdir -p "$THUMBNAILS_DIR"
  chmod 755 "$THUMBNAILS_DIR"
else
  echo "Diretório $THUMBNAILS_DIR já existe!"
  # Exibir permissões
  ls -la "$THUMBNAILS_DIR" | head -n 1
fi

# Verificar e criar diretório de originais
if [ ! -d "$ORIGINALS_DIR" ]; then
  echo "Criando diretório $ORIGINALS_DIR..."
  mkdir -p "$ORIGINALS_DIR"
  chmod 755 "$ORIGINALS_DIR"
else
  echo "Diretório $ORIGINALS_DIR já existe!"
  # Exibir permissões
  ls -la "$ORIGINALS_DIR" | head -n 1
fi

echo "==== Limpeza concluída! ===="
echo "Execute 'chmod +x clean-replit.sh && ./clean-replit.sh' para executar este script novamente."
echo ""
echo "Para reiniciar o servidor, execute 'npm run dev' ou reinicie o workflow."