#!/bin/bash

# Script de instalación completa para Crypto Wallet Monitor en Raspberry Pi 5 con k3s
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
K3S_VERSION="v1.28.5+k3s1"
NAMESPACE="crypto-monitoring"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Crypto Wallet Monitor - Instalación  ${NC}"
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

# Verificar que estamos en Raspberry Pi
check_raspberry_pi() {
    log_info "Verificando Raspberry Pi..."
    if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
        log_warn "No se detectó Raspberry Pi, continuando de todas formas..."
    else
        log_info "✓ Raspberry Pi detectada"
    fi
}

# Actualizar sistema
update_system() {
    log_info "Actualizando sistema..."
    sudo apt-get update
    sudo apt-get upgrade -y
    log_info "✓ Sistema actualizado"
}

# Instalar dependencias
install_dependencies() {
    log_info "Instalando dependencias..."
    sudo apt-get install -y \
        curl \
        git \
        ca-certificates \
        apt-transport-https \
        software-properties-common \
        gnupg \
        lsb-release
    log_info "✓ Dependencias instaladas"
}

# Instalar k3s
install_k3s() {
    if command -v k3s &> /dev/null; then
        log_warn "k3s ya está instalado"
        return
    fi

    log_info "Instalando k3s ${K3S_VERSION}..."
    curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="${K3S_VERSION}" sh -s - \
        --write-kubeconfig-mode 644 \
        --disable traefik \
        --disable servicelb

    # Esperar a que k3s esté listo
    log_info "Esperando a que k3s esté listo..."
    sleep 10
    sudo k3s kubectl wait --for=condition=Ready node --all --timeout=120s

    log_info "✓ k3s instalado correctamente"
}

# Configurar kubectl
configure_kubectl() {
    log_info "Configurando kubectl..."

    # Crear directorio .kube si no existe
    mkdir -p $HOME/.kube

    # Copiar configuración
    sudo cp /etc/rancher/k3s/k3s.yaml $HOME/.kube/config
    sudo chown $(id -u):$(id -g) $HOME/.kube/config

    # Añadir alias al bashrc si no existe
    if ! grep -q "alias kubectl='k3s kubectl'" ~/.bashrc; then
        echo "alias kubectl='k3s kubectl'" >> ~/.bashrc
    fi

    log_info "✓ kubectl configurado"
}

# Instalar Traefik como Ingress Controller
install_traefik() {
    log_info "Instalando Traefik..."

    sudo k3s kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: traefik
---
apiVersion: helm.cattle.io/v1
kind: HelmChart
metadata:
  name: traefik
  namespace: kube-system
spec:
  chart: traefik
  repo: https://traefik.github.io/charts
  targetNamespace: traefik
  valuesContent: |-
    service:
      type: NodePort
    ports:
      web:
        nodePort: 30080
      websecure:
        nodePort: 30443
EOF

    log_info "✓ Traefik instalado"
}

# Construir imágenes Docker
build_images() {
    log_info "Construyendo imágenes Docker..."

    # Backend
    log_info "Construyendo imagen del backend..."
    cd "$PROJECT_DIR"
    sudo k3s ctr images import <(docker build -t crypto-monitor-backend:latest -f Dockerfile . -q) 2>/dev/null || \
        docker build -t crypto-monitor-backend:latest -f Dockerfile .
    log_info "✓ Imagen del backend construida"

    # Frontend
    log_info "Construyendo imagen del frontend..."
    cd "$PROJECT_DIR/frontend"
    sudo k3s ctr images import <(docker build -t crypto-monitor-frontend:latest -f Dockerfile . -q) 2>/dev/null || \
        docker build -t crypto-monitor-frontend:latest -f Dockerfile .
    log_info "✓ Imagen del frontend construida"

    cd "$PROJECT_DIR"
}

# Desplegar aplicación en k3s
deploy_application() {
    log_info "Desplegando aplicación en k3s..."

    cd "$PROJECT_DIR"

    # Crear namespace
    log_info "Creando namespace..."
    sudo k3s kubectl apply -f k8s/namespace.yaml

    # Desplegar PostgreSQL
    log_info "Desplegando PostgreSQL..."
    sudo k3s kubectl apply -f k8s/postgres/

    # Esperar a que PostgreSQL esté listo
    log_info "Esperando a que PostgreSQL esté listo..."
    sudo k3s kubectl wait --for=condition=Ready pod -l app=postgres -n $NAMESPACE --timeout=300s

    # Desplegar Backend
    log_info "Desplegando Backend..."
    sudo k3s kubectl apply -f k8s/backend/

    # Esperar a que Backend esté listo
    log_info "Esperando a que Backend esté listo..."
    sleep 20
    sudo k3s kubectl wait --for=condition=Ready pod -l app=backend -n $NAMESPACE --timeout=300s

    # Desplegar Frontend
    log_info "Desplegando Frontend..."
    sudo k3s kubectl apply -f k8s/frontend/

    # Esperar a que Frontend esté listo
    log_info "Esperando a que Frontend esté listo..."
    sudo k3s kubectl wait --for=condition=Ready pod -l app=frontend -n $NAMESPACE --timeout=300s

    # Desplegar Ingress
    log_info "Desplegando Ingress..."
    sudo k3s kubectl apply -f k8s/ingress/

    log_info "✓ Aplicación desplegada correctamente"
}

# Configurar /etc/hosts (ya no es necesario con la nueva configuración)
configure_hosts() {
    log_info "✓ Configuración de red completada"
}

# Mostrar información de acceso
show_access_info() {
    IP_ADDRESS=$(hostname -I | awk '{print $1}')

    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}  ✓ Instalación completada${NC}"
    echo -e "${GREEN}========================================${NC}\n"

    echo -e "${BLUE}Acceso a la aplicación:${NC}"
    echo -e "  - Frontend: ${GREEN}http://${IP_ADDRESS}/crypto${NC}"
    echo -e "  - API:      ${GREEN}http://${IP_ADDRESS}/crypto/api${NC}\n"

    echo -e "${BLUE}Comandos útiles:${NC}"
    echo -e "  - Ver pods:       ${YELLOW}sudo k3s kubectl get pods -n $NAMESPACE${NC}"
    echo -e "  - Ver logs:       ${YELLOW}sudo k3s kubectl logs -f <pod-name> -n $NAMESPACE${NC}"
    echo -e "  - Ver servicios:  ${YELLOW}sudo k3s kubectl get svc -n $NAMESPACE${NC}"
    echo -e "  - Ver ingress:    ${YELLOW}sudo k3s kubectl get ingress -n $NAMESPACE${NC}\n"

    echo -e "${BLUE}Para actualizar la aplicación:${NC}"
    echo -e "  ${YELLOW}./scripts/update.sh${NC}\n"
}

# Función principal
main() {
    log_info "Iniciando instalación..."

    check_raspberry_pi
    update_system
    install_dependencies
    install_k3s
    configure_kubectl
    install_traefik
    build_images
    deploy_application
    configure_hosts
    show_access_info

    log_info "¡Instalación completada con éxito!"
}

# Ejecutar función principal
main
