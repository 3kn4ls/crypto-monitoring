# 🚀 Guía de Despliegue en Raspberry Pi 5 con k3s

Esta guía detalla cómo desplegar la aplicación Crypto Wallet Monitor en una Raspberry Pi 5 usando k3s (Kubernetes ligero).

## 📋 Requisitos Previos

### Hardware
- **Raspberry Pi 5** (4GB RAM mínimo, 8GB recomendado)
- Tarjeta microSD de 32GB o más (o SSD NVMe recomendado)
- Conexión a Internet
- Fuente de alimentación oficial de Raspberry Pi

### Software
- Raspberry Pi OS (64-bit) Bookworm o superior
- Acceso SSH o terminal local

## 🔧 Instalación Automática

La forma más rápida de desplegar la aplicación es usando el script de instalación automático:

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/crypto-monitoring.git
cd crypto-monitoring

# 2. Ejecutar script de instalación
sudo ./scripts/install.sh
```

El script realizará automáticamente:
- ✅ Actualización del sistema
- ✅ Instalación de dependencias
- ✅ Instalación de k3s
- ✅ Configuración de kubectl
- ✅ Instalación de Traefik (Ingress Controller)
- ✅ Construcción de imágenes Docker
- ✅ Despliegue completo de la aplicación
- ✅ Configuración de /etc/hosts

**Tiempo estimado:** 15-20 minutos

## 📦 Componentes Desplegados

El despliegue incluye:

1. **PostgreSQL** (1 replica)
   - Base de datos con almacenamiento persistente (10GB)
   - ConfigMap y Secret para configuración

2. **Backend API** (2 replicas)
   - API REST en Node.js/Express
   - Health checks configurados
   - Auto-scaling preparado

3. **Monitor Service** (1 replica)
   - Job de monitoreo periódico
   - Logs de compras/ventas en tiempo real

4. **CronJob de Extracción**
   - Ejecuta diariamente a las 2 AM
   - Extrae carteras de Bitcoin y Ethereum

5. **Frontend Angular** (2 replicas)
   - PWA responsive
   - Nginx optimizado
   - Cache configurado

6. **Traefik Ingress**
   - Enrutamiento HTTP
   - Balanceo de carga

## 🌐 Acceso a la Aplicación

Después de la instalación, puedes acceder a:

- **Frontend:** http://crypto-monitor.local o http://IP_DE_TU_PI
- **API:** http://IP_DE_TU_PI/api
- **Health Check:** http://IP_DE_TU_PI/health

### Configurar acceso desde otros dispositivos

Para acceder desde tu teléfono u otro dispositivo en la red local:

1. Obtén la IP de tu Raspberry Pi:
```bash
hostname -I
```

2. En tu dispositivo móvil/PC, navega a:
```
http://IP_DE_TU_PI
```

## 🔄 Actualización

Para actualizar la aplicación después de cambios en el código:

```bash
# Actualizar y redesplegar
sudo ./scripts/update.sh
```

El script de actualización:
- Actualiza el código desde Git
- Reconstruye las imágenes Docker
- Aplica cambios en ConfigMaps/Secrets
- Reinicia los deployments
- Verifica el estado

## 🛠️ Comandos Útiles

### Ver estado de pods
```bash
sudo k3s kubectl get pods -n crypto-monitoring
```

### Ver logs del backend
```bash
sudo k3s kubectl logs -f -l app=backend -n crypto-monitoring
```

### Ver logs del monitor
```bash
sudo k3s kubectl logs -f -l app=monitor -n crypto-monitoring
```

### Ver logs del job de extracción
```bash
sudo k3s kubectl logs -f job/wallet-extractor-* -n crypto-monitoring
```

### Reiniciar un deployment
```bash
sudo k3s kubectl rollout restart deployment/backend -n crypto-monitoring
```

### Ver recursos
```bash
sudo k3s kubectl top pods -n crypto-monitoring
sudo k3s kubectl top nodes
```

### Escalar replicas
```bash
sudo k3s kubectl scale deployment/backend --replicas=3 -n crypto-monitoring
```

### Ejecutar job de extracción manualmente
```bash
sudo k3s kubectl create job --from=cronjob/wallet-extractor manual-extract-$(date +%s) -n crypto-monitoring
```

## 🔐 Configuración de Secrets

**IMPORTANTE:** Antes del primer despliegue, configura tus API keys:

```bash
# Editar secrets
nano k8s/backend/secret.yaml
```

Añade tus API keys:
```yaml
stringData:
  DB_PASSWORD: "tu_password_seguro"
  ETHERSCAN_API_KEY: "tu_etherscan_api_key"
  BLOCKCHAIR_API_KEY: "tu_blockchair_api_key"
```

Luego aplica los cambios:
```bash
sudo k3s kubectl apply -f k8s/backend/secret.yaml
sudo k3s kubectl rollout restart deployment/backend -n crypto-monitoring
```

## 💾 Backup de la Base de Datos

### Crear backup
```bash
# Obtener nombre del pod de postgres
POSTGRES_POD=$(sudo k3s kubectl get pod -l app=postgres -n crypto-monitoring -o jsonpath='{.items[0].metadata.name}')

# Crear backup
sudo k3s kubectl exec -n crypto-monitoring $POSTGRES_POD -- pg_dump -U postgres crypto_monitoring > backup_$(date +%Y%m%d).sql
```

### Restaurar backup
```bash
# Copiar backup al pod
sudo k3s kubectl cp backup_20240115.sql crypto-monitoring/$POSTGRES_POD:/tmp/backup.sql

# Restaurar
sudo k3s kubectl exec -n crypto-monitoring $POSTGRES_POD -- psql -U postgres crypto_monitoring < /tmp/backup.sql
```

## 🔍 Troubleshooting

### Los pods no inician
```bash
# Ver eventos
sudo k3s kubectl get events -n crypto-monitoring --sort-by='.lastTimestamp'

# Describir pod
sudo k3s kubectl describe pod <pod-name> -n crypto-monitoring
```

### Error de imágenes
```bash
# Listar imágenes
sudo k3s ctr images list | grep crypto-monitor

# Reimportar imagen
docker save crypto-monitor-backend:latest | sudo k3s ctr images import -
```

### PostgreSQL no conecta
```bash
# Verificar servicio
sudo k3s kubectl get svc postgres -n crypto-monitoring

# Verificar logs
sudo k3s kubectl logs -l app=postgres -n crypto-monitoring
```

### Ingress no funciona
```bash
# Verificar Traefik
sudo k3s kubectl get pods -n traefik

# Ver logs de Traefik
sudo k3s kubectl logs -n traefik -l app.kubernetes.io/name=traefik
```

## 🧹 Limpieza

Para eliminar completamente la aplicación:

```bash
# Eliminar namespace (elimina todo)
sudo k3s kubectl delete namespace crypto-monitoring

# Opcional: Desinstalar k3s
/usr/local/bin/k3s-uninstall.sh
```

## 📊 Monitoreo de Recursos

### Instalar Metrics Server (opcional)
```bash
sudo k3s kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### Ver uso de recursos
```bash
sudo k3s kubectl top nodes
sudo k3s kubectl top pods -n crypto-monitoring
```

## ⚡ Optimización para Raspberry Pi

### Limitar recursos de pods
Edita los deployments para ajustar los límites según tu Pi:

```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"
    cpu: "250m"
```

### Usar almacenamiento en SSD
Si tienes un SSD NVMe conectado, móntalo y úsalo para PostgreSQL:

```bash
# Montar SSD en /mnt/ssd
# Luego editar k8s/postgres/pvc.yaml para usar ese path
```

## 🌡️ Monitoreo de Temperatura

Para evitar throttling en la Pi:

```bash
# Ver temperatura
vcgencmd measure_temp

# Instalar fan control (si tienes fan activo)
sudo apt-get install fancontrol
```

## 📱 PWA en Móvil

Para instalar la PWA en tu móvil:

1. Abre la URL en Chrome/Safari mobile
2. Menú → "Agregar a pantalla de inicio"
3. ¡Listo! Ahora puedes usarla como app nativa

## 🔄 Auto-inicio

k3s se inicia automáticamente con el sistema. Para verificar:

```bash
sudo systemctl status k3s
```

## 📈 Próximos Pasos

- Configurar Let's Encrypt para HTTPS
- Añadir monitoreo con Prometheus/Grafana
- Configurar backups automáticos
- Implementar alertas por Telegram/Email

## 🆘 Soporte

Si encuentras problemas:
1. Revisa los logs
2. Consulta la sección de Troubleshooting
3. Abre un issue en GitHub

---

**¡Feliz monitoreo de criptomonedas! 🚀**
