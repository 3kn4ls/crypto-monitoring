#!/bin/bash

# Script de actualización para Crypto Wallet Monitor en Raspberry Pi 5 con k3s
# Autor: Crypto Monitoring Team
# Fecha: 2024

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
NAMESPACE="crypto-monitoring"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Crypto Wallet Monitor - Actualización ${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Función para imprimir mensajes
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que k3s está instalado
check_k3s() {
    if ! command -v k3s &> /dev/null; then
        log_error "k3s no está instalado. Ejecuta ./scripts/install.sh primero"
        exit 1
    fi
    log_info "✓ k3s detectado"
}

# Actualizar código desde Git
update_code() {
    log_info "Actualizando código desde Git..."
    cd "$PROJECT_DIR"

    if [ -d ".git" ]; then
        git fetch origin
        git pull origin $(git rev-parse --abbrev-ref HEAD)
        log_info "✓ Código actualizado"
    else
        log_warn "No es un repositorio Git, saltando actualización de código"
    fi
}

# Reconstruir imágenes Docker
rebuild_images() {
    log_info "Reconstruyendo imágenes Docker..."

    cd "$PROJECT_DIR"

    # Backend
    log_info "Reconstruyendo imagen del backend..."
    docker build -t crypto-monitor-backend:latest -f Dockerfile .

    # Importar imagen a k3s
    docker save crypto-monitor-backend:latest | sudo k3s ctr images import -

    log_info "✓ Imagen del backend reconstruida"

    # Frontend
    log_info "Reconstruyendo imagen del frontend..."
    cd "$PROJECT_DIR/frontend"
    docker build -t crypto-monitor-frontend:latest -f Dockerfile .

    # Importar imagen a k3s
    docker save crypto-monitor-frontend:latest | sudo k3s ctr images import -

    log_info "✓ Imagen del frontend reconstruida"

    cd "$PROJECT_DIR"
}

# Actualizar ConfigMaps y Secrets
update_configs() {
    log_info "Actualizando ConfigMaps y Secrets..."

    cd "$PROJECT_DIR"

    # Aplicar ConfigMaps
    sudo k3s kubectl apply -f k8s/postgres/configmap.yaml
    sudo k3s kubectl apply -f k8s/backend/configmap.yaml

    # Aplicar Secrets (solo si han cambiado)
    log_warn "Verifica que los Secrets en k8s/*/secret.yaml estén actualizados antes de continuar"
    read -p "¿Continuar con la actualización? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo k3s kubectl apply -f k8s/postgres/secret.yaml
        sudo k3s kubectl apply -f k8s/backend/secret.yaml
        log_info "✓ Configs actualizados"
    else
        log_info "Saltando actualización de Secrets"
    fi
}

# Reiniciar deployments
restart_deployments() {
    log_info "Reiniciando deployments..."

    cd "$PROJECT_DIR"

    # Aplicar manifiestos actualizados
    sudo k3s kubectl apply -f k8s/postgres/
    sudo k3s kubectl apply -f k8s/backend/
    sudo k3s kubectl apply -f k8s/frontend/
    sudo k3s kubectl apply -f k8s/ingress/

    # Reiniciar pods para cargar nuevas imágenes
    log_info "Reiniciando pods del backend..."
    sudo k3s kubectl rollout restart deployment/backend -n $NAMESPACE

    log_info "Reiniciando pods del frontend..."
    sudo k3s kubectl rollout restart deployment/frontend -n $NAMESPACE

    log_info "Reiniciando pods del monitor..."
    sudo k3s kubectl rollout restart deployment/monitor -n $NAMESPACE || true

    log_info "✓ Deployments reiniciados"
}

# Esperar a que los pods estén listos
wait_for_pods() {
    log_info "Esperando a que los pods estén listos..."

    log_info "Esperando backend..."
    sudo k3s kubectl wait --for=condition=Ready pod -l app=backend -n $NAMESPACE --timeout=300s

    log_info "Esperando frontend..."
    sudo k3s kubectl wait --for=condition=Ready pod -l app=frontend -n $NAMESPACE --timeout=300s

    log_info "✓ Todos los pods están listos"
}

# Verificar estado
check_status() {
    log_info "Verificando estado de la aplicación...\n"

    echo -e "${BLUE}Pods:${NC}"
    sudo k3s kubectl get pods -n $NAMESPACE

    echo -e "\n${BLUE}Services:${NC}"
    sudo k3s kubectl get svc -n $NAMESPACE

    echo -e "\n${BLUE}Ingress:${NC}"
    sudo k3s kubectl get ingress -n $NAMESPACE
}

# Ejecutar job de extracción
run_extraction_job() {
    log_info "¿Deseas ejecutar el job de extracción ahora? (y/n)"
    read -p "" -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Ejecutando job de extracción..."
        sudo k3s kubectl create job --from=cronjob/wallet-extractor manual-extract-$(date +%s) -n $NAMESPACE
        log_info "✓ Job de extracción iniciado"
        log_info "Para ver el progreso: sudo k3s kubectl logs -f job/manual-extract-* -n $NAMESPACE"
    fi
}

# Mostrar logs recientes
show_logs() {
    log_info "¿Deseas ver los logs recientes? (y/n)"
    read -p "" -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "\n${BLUE}Logs del Backend:${NC}"
        sudo k3s kubectl logs -l app=backend -n $NAMESPACE --tail=20

        echo -e "\n${BLUE}Logs del Monitor:${NC}"
        sudo k3s kubectl logs -l app=monitor -n $NAMESPACE --tail=20 || log_warn "Monitor no está corriendo"
    fi
}

# Mostrar información de acceso
show_access_info() {
    IP_ADDRESS=$(hostname -I | awk '{print $1}')

    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}  ✓ Actualización completada${NC}"
    echo -e "${GREEN}========================================${NC}\n"

    echo -e "${BLUE}Acceso a la aplicación:${NC}"
    echo -e "  - Frontend: ${GREEN}http://${IP_ADDRESS}/crypto${NC}"
    echo -e "  - API:      ${GREEN}http://${IP_ADDRESS}/crypto/api${NC}\n"

    echo -e "${BLUE}Comandos útiles:${NC}"
    echo -e "  - Ver pods:          ${YELLOW}sudo k3s kubectl get pods -n $NAMESPACE${NC}"
    echo -e "  - Ver logs backend:  ${YELLOW}sudo k3s kubectl logs -f -l app=backend -n $NAMESPACE${NC}"
    echo -e "  - Ver logs monitor:  ${YELLOW}sudo k3s kubectl logs -f -l app=monitor -n $NAMESPACE${NC}"
    echo -e "  - Reiniciar backend: ${YELLOW}sudo k3s kubectl rollout restart deployment/backend -n $NAMESPACE${NC}\n"
}

# Limpiar imágenes antiguas
cleanup_old_images() {
    log_info "¿Deseas limpiar imágenes Docker antiguas? (y/n)"
    read -p "" -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Limpiando imágenes antiguas..."
        docker image prune -f
        sudo k3s crictl rmi --prune
        log_info "✓ Limpieza completada"
    fi
}

# Función principal
main() {
    log_info "Iniciando actualización..."

    check_k3s
    update_code
    rebuild_images
    update_configs
    restart_deployments
    wait_for_pods
    check_status
    run_extraction_job
    show_logs
    cleanup_old_images
    show_access_info

    log_info "¡Actualización completada con éxito!"
}

# Manejo de errores
trap 'log_error "Error en línea $LINENO. Código de salida: $?"' ERR

# Ejecutar función principal
main
