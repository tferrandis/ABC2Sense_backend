#!/bin/bash

# Script para arreglar el problema de permisos de Nginx con /api/docs
# Ejecutar como root

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Arreglando permisos para /api/docs   ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Ejecutar como root${NC}"
    echo "Usa: sudo ./fix-nginx-permissions.sh"
    exit 1
fi

# Paso 1: Crear directorio en /var/www
echo -e "${YELLOW}[1/5]${NC} Creando directorio /var/www/api-docs..."
mkdir -p /var/www/api-docs
echo -e "${GREEN}    ✓ Directorio creado${NC}"

# Paso 2: Copiar archivos de documentación
echo -e "${YELLOW}[2/5]${NC} Copiando archivos de documentación..."
cp -r /root/sensor/ABC2Sense_backend/docs/* /var/www/api-docs/
echo -e "${GREEN}    ✓ Archivos copiados${NC}"

# Paso 3: Establecer permisos correctos
echo -e "${YELLOW}[3/5]${NC} Estableciendo permisos..."
chown -R www-data:www-data /var/www/api-docs
chmod -R 755 /var/www/api-docs
echo -e "${GREEN}    ✓ Permisos establecidos${NC}"

# Paso 4: Actualizar configuración de Nginx
echo -e "${YELLOW}[4/5]${NC} Actualizando configuración de Nginx..."
NGINX_CONFIG="/etc/nginx/sites-available/catabo_front"
BACKUP_CONFIG="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

# Hacer backup
cp "$NGINX_CONFIG" "$BACKUP_CONFIG"

# Reemplazar la ruta en la configuración
sed -i 's|alias /root/sensor/ABC2Sense_backend/docs;|alias /var/www/api-docs;|g' "$NGINX_CONFIG"

echo -e "${GREEN}    ✓ Configuración actualizada${NC}"
echo -e "    Backup: $BACKUP_CONFIG"

# Paso 5: Verificar y recargar Nginx
echo -e "${YELLOW}[5/5]${NC} Verificando y recargando Nginx..."
if nginx -t 2>&1 | grep -q "successful"; then
    systemctl reload nginx
    echo -e "${GREEN}    ✓ Nginx recargado${NC}"
else
    echo -e "${RED}    ✗ Error en configuración${NC}"
    cp "$BACKUP_CONFIG" "$NGINX_CONFIG"
    echo -e "${YELLOW}    Restaurado backup${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ PROBLEMA SOLUCIONADO                ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Documentación disponible en:"
echo -e "${BLUE}  http://167.86.91.53/api/docs${NC}"
echo ""
echo -e "Verificar con:"
echo -e "  curl -I http://localhost/api/docs"
echo ""
