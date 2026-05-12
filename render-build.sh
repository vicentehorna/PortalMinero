#!/usr/bin/env bash
# Script de build para Render con runtime NATIVO (Python), no se usa si despliegas con Docker.
# Recomendación: en Render elige "Docker" y este archivo se ignora; el Dockerfile instala ODBC + WeasyPrint.
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

# Equivalentes Linux a librerías WeasyPrint (nombres paquetes Debian 12+)
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update && sudo apt-get install -y \
    libpango-1.0-0 \
    libharfbuzz0b \
    libpangoft2-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    || true
fi
