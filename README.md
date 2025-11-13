# 🚀 Crypto Wallet Monitor

Aplicación para extraer y monitorear las carteras más grandes de Bitcoin y Ethereum, analizando sus transacciones y rendimiento.

## 📋 Características

- ✅ Extracción de las carteras más grandes de Bitcoin y Ethereum
- ✅ Análisis de transacciones y rendimiento de carteras
- ✅ Cálculo de métricas: profit/loss, win rate, frecuencia de trading
- ✅ Ranking de las mejores carteras por rendimiento
- ✅ Monitoreo periódico de las top 10 carteras
- ✅ Registro automático de compras/ventas en logs
- ✅ Base de datos PostgreSQL para almacenamiento persistente
- ✅ Sistema de logging robusto con Winston

## 🏗️ Arquitectura

```
crypto-monitoring/
├── src/
│   ├── config/           # Configuración de DB y logging
│   ├── entities/         # Entidades TypeORM (Wallet, Transaction, Performance)
│   ├── services/         # Servicios de negocio
│   │   ├── BitcoinService.ts
│   │   ├── EthereumService.ts
│   │   ├── WalletExtractor.ts
│   │   └── PerformanceAnalyzer.ts
│   ├── jobs/            # Jobs programados
│   ├── utils/           # Utilidades y helpers
│   ├── types/           # Tipos TypeScript
│   └── index.ts         # Punto de entrada principal
├── logs/                # Logs de la aplicación
└── dist/               # Código compilado
```

## 📦 Requisitos

- Node.js 18+
- PostgreSQL 14+
- npm o yarn

## 🚀 Instalación

1. **Clonar el repositorio**

```bash
cd crypto-monitoring
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Configurar variables de entorno**

Copiar el archivo de ejemplo y configurar:

```bash
cp .env.example .env
```

Editar `.env` con tus configuraciones:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=tu_password
DB_DATABASE=crypto_monitoring

# API Keys
ETHERSCAN_API_KEY=tu_api_key_de_etherscan
BLOCKCHAIR_API_KEY=tu_api_key_de_blockchair

# Configuración
MONITOR_INTERVAL_MINUTES=60
TOP_WALLETS_COUNT=10
NODE_ENV=development
LOG_LEVEL=info
```

4. **Crear base de datos PostgreSQL**

```bash
createdb crypto_monitoring
```

O usando SQL:

```sql
CREATE DATABASE crypto_monitoring;
```

5. **Compilar TypeScript**

```bash
npm run build
```

## 🎯 Uso

### Modo 1: Aplicación Completa

Ejecuta la aplicación en modo completo (extracción + monitoreo periódico):

```bash
npm start
```

O en modo desarrollo:

```bash
npm run dev
```

Esto ejecutará:
1. Extracción inicial de carteras de Bitcoin y Ethereum
2. Análisis de rendimiento de todas las carteras
3. Monitoreo periódico de las top 10 carteras (cada 60 minutos por defecto)

### Modo 2: Solo Extracción

Ejecuta solo la extracción y análisis inicial:

```bash
npm run extract
```

### Modo 3: Solo Monitoreo

Ejecuta solo el monitoreo de las top 10 carteras:

```bash
npm run monitor
```

## 📊 Funcionamiento

### 1. Extracción de Carteras

La aplicación extrae información de las carteras más grandes usando:

- **Bitcoin**: Blockchair API
- **Ethereum**: Etherscan API

Para cada cartera se obtiene:
- Dirección
- Balance actual
- Número de transacciones
- Primera y última actividad
- Historial de transacciones

### 2. Análisis de Rendimiento

El sistema calcula métricas de rendimiento:

- **Profit/Loss (%)**: Ganancia o pérdida porcentual
- **Win Rate (%)**: Porcentaje de operaciones exitosas
- **Total Inflows/Outflows**: Total de entradas y salidas en USD
- **Avg Holding Period**: Período promedio de tenencia
- **Performance Score**: Puntuación ponderada de rendimiento

### 3. Monitoreo Periódico

El job de monitoreo:
- Actualiza información de las top 10 carteras
- Detecta nuevas transacciones
- Registra compras/ventas en los logs
- Ejecuta periódicamente según configuración

## 📝 Logs

Los logs se guardan en el directorio `logs/`:

- `combined.log`: Todos los logs
- `error.log`: Solo errores

Ejemplo de log de transacción:

```
2024-01-15 10:30:45 [info]: 🔍 bc1qgdjqv0av3q56... (BITCOIN)
2024-01-15 10:30:45 [info]:    Balance: 12.5000 | Score: 85.32 | Rank: #1
2024-01-15 10:30:45 [info]:    📝 Actividad reciente:
2024-01-15 10:30:45 [info]:    🟢 COMPRA: 0.500000 BITCOIN - 2024-01-15T08:30:00
2024-01-15 10:30:45 [info]:       💰 La cartera bc1qgdjqv0av3q56... COMPRÓ 0.500000 BITCOIN
```

## 🗄️ Base de Datos

### Tablas principales:

**wallets**
- Información de carteras (dirección, balance, tipo de crypto)

**transactions**
- Historial de transacciones de cada cartera

**wallet_performances**
- Métricas de rendimiento calculadas por fecha

### Consultas útiles:

```sql
-- Top 10 carteras por score
SELECT w.address, w.crypto_type, wp.performance_score, wp.profit_loss_percentage
FROM wallets w
JOIN wallet_performances wp ON w.id = wp.wallet_id
ORDER BY wp.performance_score DESC
LIMIT 10;

-- Transacciones recientes de una cartera
SELECT * FROM transactions
WHERE wallet_id = 'uuid-de-la-cartera'
ORDER BY timestamp DESC
LIMIT 20;
```

## 🔑 APIs Utilizadas

### Etherscan API

Obtener API key gratuita en: https://etherscan.io/apis

Límites gratuitos:
- 5 requests/segundo
- 100,000 requests/día

### Blockchair API

Obtener API key en: https://blockchair.com/api

Límites gratuitos:
- 30 requests/minuto
- Datos básicos de Bitcoin

## ⚙️ Configuración Avanzada

### Cambiar intervalo de monitoreo

Editar `.env`:

```env
MONITOR_INTERVAL_MINUTES=30  # Monitorear cada 30 minutos
```

### Cambiar número de carteras a monitorear

Editar `.env`:

```env
TOP_WALLETS_COUNT=20  # Monitorear top 20 carteras
```

### Ajustar nivel de logging

```env
LOG_LEVEL=debug  # Opciones: error, warn, info, debug
```

## 🐛 Troubleshooting

### Error de conexión a PostgreSQL

Verificar que PostgreSQL está corriendo:

```bash
sudo systemctl status postgresql
```

Verificar credenciales en `.env`

### Rate limit de APIs

Si recibes errores de rate limit:
- Aumentar el delay entre requests en `apiClient.ts`
- Usar API keys premium
- Reducir el número de carteras a procesar

### Transacciones no aparecen

Verificar:
- Las APIs tienen datos de la cartera
- La cartera tiene actividad reciente
- Los timestamps están correctos

## 🚧 Limitaciones Actuales

1. **APIs Gratuitas**: Las APIs gratuitas tienen limitaciones en:
   - Rate limits
   - Datos históricos
   - Endpoints disponibles

2. **Precios Históricos**: No se incluye integración con API de precios históricos (CoinGecko, CryptoCompare)

3. **Carteras Conocidas**: Se usa lista hardcoded de carteras conocidas. En producción usar servicio de ranking real.

## 🔮 Mejoras Futuras

- [ ] Integración con API de precios (CoinGecko, CryptoCompare)
- [ ] Soporte para más criptomonedas (Cardano, Solana, etc.)
- [ ] Dashboard web con visualizaciones
- [ ] Alertas por email/telegram cuando hay movimientos importantes
- [ ] Machine Learning para predicción de movimientos
- [ ] API REST para consultas
- [ ] Caché de datos para reducir llamadas a APIs
- [ ] Migraciones de base de datos con TypeORM

## 📄 Licencia

MIT

## 👨‍💻 Desarrollo

### Estructura de código

```typescript
// Ejemplo: Agregar una nueva criptomoneda

// 1. Crear servicio en src/services/
export class SolanaService {
  async getTopWallets(limit: number): Promise<WalletData[]> {
    // Implementación
  }
}

// 2. Actualizar WalletExtractor
async extractSolanaWallets(limit: number): Promise<Wallet[]> {
  // Implementación
}

// 3. Actualizar enum CryptoType en entities/Wallet.ts
export enum CryptoType {
  BITCOIN = 'BITCOIN',
  ETHEREUM = 'ETHEREUM',
  SOLANA = 'SOLANA',
}
```

### Scripts disponibles

```bash
npm run build      # Compilar TypeScript
npm run dev        # Ejecutar en modo desarrollo
npm start          # Ejecutar aplicación compilada
npm run extract    # Solo extracción
npm run monitor    # Solo monitoreo
```

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📞 Soporte

Para reportar bugs o solicitar features, abre un issue en GitHub.

---

Hecho con ❤️ para la comunidad crypto
