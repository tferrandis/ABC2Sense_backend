#!/bin/bash

# Script para configurar Nginx para servir la documentación de la API
# Ejecutar como root o con sudo

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Configurando Nginx para ABC2Sense  ${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Verificar si se ejecuta como root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Este script debe ejecutarse como root${NC}"
    echo "Usa: sudo ./configure-nginx.sh"
    exit 1
fi

# Ubicaciones
NGINX_AVAILABLE="/etc/nginx/sites-available/abc2sense"
NGINX_ENABLED="/etc/nginx/sites-enabled/abc2sense"
PROJECT_DIR="/root/sensor/ABC2Sense_backend"

# 1. Copiar configuración de ejemplo
echo -e "${YELLOW}[1/4]${NC} Copiando configuración de Nginx..."
cp "$PROJECT_DIR/nginx.conf.example" "$NGINX_AVAILABLE"
echo -e "${GREEN}    ✓ Archivo copiado a $NGINX_AVAILABLE${NC}"

# 2. Crear enlace simbólico
echo -e "${YELLOW}[2/4]${NC} Habilitando sitio..."
if [ -L "$NGINX_ENABLED" ]; then
    echo -e "${YELLOW}    ! El enlace ya existe, eliminando...${NC}"
    rm "$NGINX_ENABLED"
fi
ln -s "$NGINX_AVAILABLE" "$NGINX_ENABLED"
echo -e "${GREEN}    ✓ Sitio habilitado${NC}"

# 3. Verificar configuración
echo -e "${YELLOW}[3/4]${NC} Verificando configuración de Nginx..."
if nginx -t; then
    echo -e "${GREEN}    ✓ Configuración válida${NC}"
else
    echo -e "${RED}    ✗ Error en la configuración${NC}"
    exit 1
fi

# 4. Reiniciar Nginx
echo -e "${YELLOW}[4/4]${NC} Reiniciando Nginx..."
systemctl restart nginx
sleep 1
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}    ✓ Nginx reiniciado correctamente${NC}"
else
    echo -e "${RED}    ✗ Error al reiniciar Nginx${NC}"
    systemctl status nginx --no-pager
    exit 1
fi

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  ✓ Configuración completada         ${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "Documentación de API disponible en:"
echo -e "${BLUE}  http://167.86.91.53/api/docs${NC}"
echo ""
echo -e "Para ver logs de Nginx:"
echo -e "  tail -f /var/log/nginx/abc2sense_access.log"
echo -e "  tail -f /var/log/nginx/abc2sense_error.log"
echo ""
