# Configuración de Ruta Base /crypto

## 📋 Resumen

La aplicación ahora está configurada para funcionar desde la ruta `/crypto` en lugar de la raíz `/`. Esto permite que la aplicación conviva con otras aplicaciones en el mismo servidor/Raspberry Pi.

## 🌐 URLs de Acceso

### Producción
- **Frontend:** `http://IP_DE_TU_PI/crypto`
- **API:** `http://IP_DE_TU_PI/crypto/api`
- **Health Check:** `http://IP_DE_TU_PI/crypto/api/health`

### Desarrollo Local
- **Frontend:** `http://localhost:4200/crypto`
- **API (via proxy):** `http://localhost:4200/crypto/api`

## 🔧 Cambios Realizados

### Frontend Angular

1. **angular.json**
   - Añadido `baseHref: "/crypto/"` en build options

2. **src/index.html**
   - Actualizado `<base href="/crypto/">`

3. **src/environments/environment.ts**
   - `apiUrl: '/crypto/api'` (desarrollo)

4. **src/environments/environment.prod.ts**
   - `apiUrl: '/crypto/api'` (producción)

5. **src/manifest.webmanifest**
   - `scope: "/crypto/"`
   - `start_url: "/crypto/"`

6. **ngsw-config.json**
   - URLs de cache actualizadas a `/crypto/api/**`

7. **src/proxy.conf.json**
   - Proxy configurado para `/crypto/api` → `http://localhost:3000/api`

### Nginx

**frontend/nginx.conf**
- Configuración completa para servir desde `/crypto`
- Service Worker en `/crypto/ngsw-worker.js`
- Manifest en `/crypto/manifest.webmanifest`
- Static assets con cache desde `/crypto/`
- Redirect automático de `/crypto` a `/crypto/`

### Kubernetes

1. **k8s/ingress/ingress.yaml**
   - Rutas actualizadas a `/crypto/api` y `/crypto`
   - Sin host específico (funciona con cualquier IP)

2. **k8s/ingress/middleware.yaml** (nuevo)
   - Middleware de Traefik para strip prefix
   - Convierte `/crypto/api` → `/api` para el backend

3. **k8s/ingress/ingressroute.yaml** (nuevo)
   - IngressRoute de Traefik con middleware
   - Manejo correcto de rutas con PathPrefix

### Scripts

1. **scripts/install.sh**
   - URLs actualizadas en mensajes de salida
   - Eliminada configuración innecesaria de /etc/hosts

2. **scripts/update.sh**
   - URLs actualizadas en mensajes de salida

### Documentación

1. **DEPLOYMENT.md**
   - URLs actualizadas
   - Nota explicativa sobre la ruta `/crypto`

## 🚀 Cómo Funciona

### Flujo de Peticiones

```
Browser → Traefik Ingress
         ↓
    /crypto/* → Frontend (Nginx)
         ↓
    Nginx sirve archivos desde /usr/share/nginx/html
    con baseHref="/crypto/"
         ↓
    Angular Router maneja /crypto/dashboard, etc.

Browser → Traefik Ingress
         ↓
    /crypto/api/* → Middleware (strip prefix)
         ↓
    /api/* → Backend Service
         ↓
    Express API responde
```

### Nginx Location Matching

```nginx
# Assets estáticos
location ~* ^/crypto/.*\.(css|js|...)$ { }

# Service Worker
location = /crypto/ngsw-worker.js { }

# Manifest PWA
location = /crypto/manifest.webmanifest { }

# Angular SPA
location /crypto/ {
    alias /usr/share/nginx/html/;
    try_files $uri $uri/ /crypto/index.html;
}

# Redirect sin trailing slash
location = /crypto {
    return 301 /crypto/;
}
```

## 🧪 Testing

### Desarrollo Local

```bash
cd frontend
npm start
# Navega a: http://localhost:4200/crypto
```

### Producción

```bash
# Build
cd frontend
npm run build:prod

# El output estará en dist/ con baseHref=/crypto/
```

### Verificar rutas

```bash
# Verificar index.html
grep "base href" frontend/dist/*/index.html
# Debe mostrar: <base href="/crypto/">

# Verificar manifest
cat frontend/dist/*/manifest.webmanifest | grep -E "scope|start_url"
# Debe mostrar:
#   "scope": "/crypto/",
#   "start_url": "/crypto/",
```

## 🔄 Actualización

Si ya tienes la aplicación desplegada:

```bash
# 1. Actualizar código
git pull

# 2. Ejecutar script de actualización
sudo ./scripts/update.sh

# 3. Acceder a nueva URL
# http://IP_DE_TU_PI/crypto
```

## 📱 PWA

La PWA sigue funcionando correctamente:

1. Navega a `http://IP_DE_TU_PI/crypto`
2. En Chrome/Safari móvil: Menú → "Agregar a pantalla de inicio"
3. La app se instalará con scope `/crypto/`
4. Al abrir, siempre empezará en `/crypto/`

## ⚠️ Notas Importantes

1. **Service Worker Scope**: El SW solo cachea recursos bajo `/crypto/`
2. **API Calls**: Todas las llamadas API deben ir a `/crypto/api/*`
3. **Deep Links**: Los deep links funcionan correctamente (`/crypto/dashboard`)
4. **Browser History**: El history API funciona con baseHref
5. **Assets**: Todos los assets se sirven desde `/crypto/assets/*`

## 🐛 Troubleshooting

### La app no carga

```bash
# Verificar Ingress
kubectl get ingress -n crypto-monitoring
kubectl describe ingress crypto-monitoring-ingress -n crypto-monitoring

# Verificar rutas en Traefik
kubectl get ingressroute -n crypto-monitoring
```

### API no responde

```bash
# Verificar middleware
kubectl get middleware -n crypto-monitoring

# Ver logs del backend
kubectl logs -l app=backend -n crypto-monitoring
```

### Assets 404

```bash
# Verificar que baseHref está configurado
# Debe ser /crypto/ en todos los archivos HTML
```

## 📚 Referencias

- [Angular Base Href](https://angular.io/guide/deployment#the-base-tag)
- [Nginx Location Matching](https://nginx.org/en/docs/http/ngx_http_core_module.html#location)
- [Traefik Middleware](https://doc.traefik.io/traefik/middlewares/overview/)
- [PWA Scope](https://web.dev/add-manifest/#scope)
