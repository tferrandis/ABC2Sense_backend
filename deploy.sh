#!/bin/bash

# =============================================
# ABC2Sense Backend Deploy Script
# =============================================

set -e  # Salir si hay errores

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # Sin color

# Configuración
BACKEND_DIR="/root/sensor/ABC2Sense_backend"
BACKUP_DIR="/root/backups/abc2sense_backend"
SERVICE_NAME="sensor_backend.service"

echo -e "${BLUE}"
echo "============================================="
echo "      ABC2Sense Backend Deploy Script       "
echo "============================================="
echo -e "${NC}"

# Crear directorio de backups si no existe
mkdir -p $BACKUP_DIR

# 1. Ir al directorio del proyecto
echo -e "${YELLOW}[1/5]${NC} Accediendo al directorio del proyecto..."
cd $BACKEND_DIR

# 2. Hacer backup del código actual
echo -e "${YELLOW}[2/5]${NC} Creando backup del código actual..."
BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR/$BACKUP_NAME
cp -r src $BACKUP_DIR/$BACKUP_NAME/
cp package.json $BACKUP_DIR/$BACKUP_NAME/ 2>/dev/null || true
echo -e "${GREEN}    ✓ Backup creado: $BACKUP_DIR/$BACKUP_NAME${NC}"

# 3. Actualizar desde Git
echo -e "${YELLOW}[3/5]${NC} Actualizando desde Git..."
git fetch origin
git reset --hard origin/main
echo -e "${GREEN}    ✓ Código actualizado${NC}"

# 4. Instalar dependencias
echo -e "${YELLOW}[4/5]${NC} Instalando dependencias..."
npm install --silent
echo -e "${GREEN}    ✓ Dependencias instaladas${NC}"

# 5. Reiniciar servicio
echo -e "${YELLOW}[5/5]${NC} Reiniciando servicio..."
systemctl restart $SERVICE_NAME
sleep 2
systemctl status $SERVICE_NAME --no-pager
echo -e "${GREEN}    ✓ Servicio reiniciado${NC}"

# Limpiar backups antiguos (mantener últimos 5)
echo -e "${YELLOW}[+]${NC} Limpiando backups antiguos..."
cd $BACKUP_DIR
ls -t | tail -n +6 | xargs -r rm -rf
echo -e "${GREEN}    ✓ Backups limpiados (manteniendo últimos 5)${NC}"

echo ""
echo -e "${GREEN}============================================="
echo "       ✓ DEPLOY COMPLETADO CON ÉXITO        "
echo "=============================================${NC}"
echo ""
echo -e "Backend disponible en: ${BLUE}http://167.86.91.53/api/${NC}"
echo ""
echo -e "${YELLOW}Para ver los logs:${NC}"
echo -e "  journalctl -u $SERVICE_NAME -f"
echo ""
