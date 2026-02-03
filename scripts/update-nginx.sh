#!/bin/bash

# Script para actualizar la configuración de Nginx y agregar /api/docs
# Ejecutar como root o con sudo

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Actualizando Nginx para /api/docs    ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verificar si se ejecuta como root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Este script debe ejecutarse como root${NC}"
    echo "Usa: sudo ./update-nginx.sh"
    exit 1
fi

NGINX_CONFIG="/etc/nginx/sites-available/catabo_front"
BACKUP_CONFIG="/etc/nginx/sites-available/catabo_front.backup.$(date +%Y%m%d_%H%M%S)"
NEW_CONFIG="/root/sensor/ABC2Sense_backend/nginx-catabo_front-updated.conf"

# 1. Hacer backup de la configuración actual
echo -e "${YELLOW}[1/5]${NC} Creando backup de configuración actual..."
cp "$NGINX_CONFIG" "$BACKUP_CONFIG"
echo -e "${GREEN}    ✓ Backup creado: $BACKUP_CONFIG${NC}"

# 2. Copiar nueva configuración
echo -e "${YELLOW}[2/5]${NC} Aplicando nueva configuración..."
cp "$NEW_CONFIG" "$NGINX_CONFIG"
echo -e "${GREEN}    ✓ Configuración actualizada${NC}"

# 3. Verificar que el directorio de docs existe
echo -e "${YELLOW}[3/5]${NC} Verificando directorio de documentación..."
DOCS_DIR="/root/sensor/ABC2Sense_backend/docs"
if [ -d "$DOCS_DIR" ]; then
    echo -e "${GREEN}    ✓ Directorio encontrado: $DOCS_DIR${NC}"

    # Verificar que index.html existe
    if [ -f "$DOCS_DIR/index.html" ]; then
        echo -e "${GREEN}    ✓ index.html encontrado${NC}"
    else
        echo -e "${RED}    ✗ No se encontró index.html${NC}"
        echo -e "${YELLOW}    Ejecuta 'npm run apidoc' en el proyecto${NC}"
    fi
else
    echo -e "${RED}    ✗ No se encontró el directorio de docs${NC}"
    echo -e "${YELLOW}    Ejecuta 'npm run apidoc' en el proyecto${NC}"
fi

# 4. Verificar configuración de Nginx
echo -e "${YELLOW}[4/5]${NC} Verificando sintaxis de Nginx..."
if nginx -t; then
    echo -e "${GREEN}    ✓ Configuración válida${NC}"
else
    echo -e "${RED}    ✗ Error en la configuración${NC}"
    echo -e "${YELLOW}    Restaurando backup...${NC}"
    cp "$BACKUP_CONFIG" "$NGINX_CONFIG"
    echo -e "${RED}    Configuración restaurada. No se aplicaron cambios.${NC}"
    exit 1
fi

# 5. Reiniciar Nginx
echo -e "${YELLOW}[5/5]${NC} Reiniciando Nginx..."
systemctl reload nginx
sleep 1
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}    ✓ Nginx reiniciado correctamente${NC}"
else
    echo -e "${RED}    ✗ Error al reiniciar Nginx${NC}"
    echo -e "${YELLOW}    Restaurando backup...${NC}"
    cp "$BACKUP_CONFIG" "$NGINX_CONFIG"
    systemctl reload nginx
    echo -e "${RED}    Configuración restaurada${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ Configuración aplicada exitosamente${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Documentación de API ahora disponible en:"
echo -e "${BLUE}  http://167.86.91.53/api/docs${NC}"
echo ""
echo -e "Backup guardado en:"
echo -e "  $BACKUP_CONFIG"
echo ""
echo -e "Para verificar:"
echo -e "  curl -I http://localhost/api/docs"
echo ""
echo -e "Para ver logs:"
echo -e "  tail -f /var/log/nginx/catabo_front.access.log"
echo -e "  tail -f /var/log/nginx/catabo_front.error.log"
echo ""
