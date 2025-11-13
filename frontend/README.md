# Frontend - Crypto Wallet Monitor

Aplicación Angular 19 PWA para monitorizar carteras de Bitcoin y Ethereum.

## 🚀 Características

- ✅ **Angular 19** con Standalone Components
- ✅ **PWA** (Progressive Web App) - Funciona offline
- ✅ **Responsive Design** - Adaptado para móviles y tablets
- ✅ **Material Design** - UI moderna y accesible
- ✅ **Real-time Updates** - Actualización automática cada 30-60 segundos
- ✅ **Charts** - Visualización de datos con ng2-charts
- ✅ **Service Worker** - Cache inteligente y actualizaciones

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Desarrollo
npm start

# Build para producción
npm run build:prod
```

## 🎨 Componentes

### Dashboard
- **Stats Cards**: Estadísticas generales (carteras, transacciones, balance)
- **Top Wallets**: Tabla con las 10 mejores carteras
- **Recent Activity**: Lista de transacciones recientes en tiempo real

### Servicios
- **WalletService**: Comunicación con API REST del backend

### Models
- **Wallet**: Modelo de cartera
- **Transaction**: Modelo de transacción
- **WalletPerformance**: Métricas de rendimiento

## 🔧 Configuración

### Environments

**Development** (`src/environments/environment.ts`):
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};
```

**Production** (`src/environments/environment.prod.ts`):
```typescript
export const environment = {
  production: true,
  apiUrl: '/api'
};
```

### Proxy Configuration

Durante el desarrollo, las peticiones `/api` se redirigen al backend local:

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false
  }
}
```

## 📱 PWA

### Manifest

La aplicación incluye un manifest (`manifest.webmanifest`) que permite:
- Instalación en dispositivos móviles
- Icono en la pantalla de inicio
- Tema personalizado
- Modo standalone (sin barra del navegador)

### Service Worker

El Service Worker (`ngsw-config.json`) proporciona:
- Cache de assets estáticos
- Cache de respuestas de API (5 minutos)
- Estrategia "freshness" para datos en tiempo real
- Funcionamiento offline

## 🎨 Estilos

### Material Theme

La aplicación usa el tema `indigo-pink` de Angular Material.

### Customización

Para cambiar el tema, edita `src/styles.scss`:

```scss
@import '@angular/material/prebuilt-themes/purple-green.css';
```

### Responsive Breakpoints

```scss
// Mobile
@media (max-width: 768px) { }

// Tablet
@media (max-width: 1200px) { }

// Desktop
@media (min-width: 1200px) { }
```

## 🏗️ Estructura

```
src/
├── app/
│   ├── components/
│   │   ├── dashboard/
│   │   ├── stats-cards/
│   │   ├── top-wallets/
│   │   └── recent-activity/
│   ├── services/
│   │   └── wallet.service.ts
│   ├── models/
│   │   └── wallet.model.ts
│   ├── app.component.ts
│   ├── app.config.ts
│   └── app.routes.ts
├── environments/
├── assets/
├── index.html
├── styles.scss
└── main.ts
```

## 🚀 Build y Deploy

### Build local

```bash
npm run build:prod
```

Output en: `dist/crypto-wallet-monitor-frontend/`

### Build Docker

```bash
docker build -t crypto-monitor-frontend:latest .
```

### Deploy en k3s

Ver [DEPLOYMENT.md](../DEPLOYMENT.md) en el root del proyecto.

## 🧪 Testing

```bash
npm test
```

## 📊 Performance

### Optimizaciones

- **Lazy Loading**: Componentes cargados bajo demanda
- **OnPush Change Detection**: Menos ciclos de detección
- **Production Build**: Minificación y tree-shaking
- **Gzip Compression**: Reducción de tamaño de assets
- **Image Optimization**: Formatos WebP cuando sea posible

### Bundle Size

```
Main Bundle: ~300KB (gzipped)
Styles: ~50KB (gzipped)
Vendor: ~200KB (gzipped)
```

## 🔄 Updates

La aplicación se actualiza automáticamente cuando hay una nueva versión desplegada gracias al Service Worker.

## 🌐 Navegadores Soportados

- Chrome/Edge (últimas 2 versiones)
- Firefox (últimas 2 versiones)
- Safari (últimas 2 versiones)
- iOS Safari (últimas 2 versiones)
- Android Chrome (últimas 2 versiones)

## 📝 Scripts Disponibles

```bash
npm start          # Desarrollo con proxy
npm run build      # Build desarrollo
npm run build:prod # Build producción
npm test           # Tests unitarios
npm run lint       # Linter
```

## 🎯 Roadmap

- [ ] Gráficos de rendimiento histórico
- [ ] Filtros avanzados en tablas
- [ ] Dark mode
- [ ] Notificaciones push
- [ ] Export de datos (CSV, PDF)
- [ ] Comparación de carteras
- [ ] Alertas personalizadas

## 🤝 Contribuir

Ver [../README.md](../README.md) para guía de contribución.

---

Desarrollado con ❤️ usando Angular 19
