# 📋 Próximos Pasos - Sistema de Monitoreo de Criptomonedas

**Fecha**: 2025-11-13
**Estado actual**: Extracción v3 en progreso con precios históricos
**Branch**: `claude/bitcoin-wallet-extractor-011CV6HHspgEw6Cqv3T2i73t`

---

## 🎯 Estado Actual del Sistema

### ✅ Completado:

1. **PriceService implementado** (`src/services/PriceService.ts`)
   - Integración con CoinGecko API gratuita
   - Obtención de precios históricos (últimos 365 días)
   - Sistema de caché para optimizar requests
   - Rate limiting respetado (1.5s entre llamadas)

2. **Extractor mejorado** (`src/services/WalletExtractor.ts`)
   - Obtiene precio histórico por cada transacción
   - Calcula `amountUsd` y `priceAtTransaction` automáticamente
   - Usa precios actuales reales para `balanceUsd`

3. **Filtro de transacciones** (`src/services/EthereumService.ts`)
   - Solo extrae transacciones de últimos 365 días
   - Compatible con limitaciones de CoinGecko API gratuita

4. **PerformanceAnalyzer mejorado** (`src/services/PerformanceAnalyzer.ts`)
   - Calcula P/L basado en valores USD reales
   - Maneja correctamente tipos PostgreSQL decimal
   - Fallback inteligente cuando faltan precios históricos

5. **Jobs creados**:
   - `src/jobs/backfillPrices.ts` - Actualizar precios históricos en transacciones existentes
   - `src/jobs/cleanDatabase.ts` - Limpiar base de datos
   - `src/jobs/reanalyzePerformance.ts` - Recalcular análisis sin re-extraer

6. **Despliegue actualizado**:
   - Backend con imagen `crypto-backend:recent-tx`
   - Replicas reducidas a 1 (limitación de CPU)
   - Base de datos limpiada y lista para nueva extracción

### 🔄 En Progreso:

**Job de extracción v3** (`extract-wallets-v3`) está ejecutándose:
- ❌ Bitcoin: 0 carteras (Blockchair bloqueó la IP - necesita API key)
- 🔄 Ethereum: Extrayendo 20 carteras con transacciones del último año
- ⏱️ Tiempo estimado: 30-45 minutos
- 📊 Obteniendo precio histórico para cada transacción desde CoinGecko

---

## 🚀 Pasos para Continuar

### 1️⃣ Verificar que la extracción terminó

```bash
# Ver estado del job
sudo k3s kubectl get jobs -n crypto-monitoring

# Debe mostrar algo como:
# NAME                  COMPLETIONS   DURATION   AGE
# extract-wallets-v3    1/1           45m        46m
```

**Resultado esperado**: Estado `Completed (1/1)`

---

### 2️⃣ Verificar datos en la base de datos

```bash
sudo k3s kubectl exec -n crypto-monitoring deploy/backend -- sh -c '
  echo "=== CARTERAS POR TIPO ===" &&
  psql $DATABASE_URL -c "SELECT cryptoType, COUNT(*) FROM wallets GROUP BY cryptoType;" &&
  echo -e "\n=== TRANSACCIONES ===" &&
  psql $DATABASE_URL -c "SELECT COUNT(*) as total, COUNT(\"priceAtTransaction\") as with_price FROM transactions;" &&
  echo -e "\n=== MUESTRA DE PRECIOS ===" &&
  psql $DATABASE_URL -c "SELECT \"txHash\", amount, \"amountUsd\", \"priceAtTransaction\", timestamp FROM transactions WHERE \"priceAtTransaction\" IS NOT NULL LIMIT 5;"
'
```

**Resultado esperado**:
- ~20 carteras de Ethereum
- ~500-2000 transacciones totales
- La mayoría con `priceAtTransaction` NO NULL
- Valores `amountUsd` calculados

---

### 3️⃣ Ejecutar análisis de rendimiento

```bash
# Limpiar job anterior si existe
sudo k3s kubectl delete job reanalyze-performance -n crypto-monitoring 2>/dev/null || true

# Crear y ejecutar job de análisis
sudo k3s kubectl create job reanalyze-performance \
  --image=crypto-backend:recent-tx \
  -n crypto-monitoring \
  -- node dist/jobs/reanalyzePerformance.js

# Seguir los logs en tiempo real
sudo k3s kubectl logs -n crypto-monitoring job/reanalyze-performance --follow
```

**Resultado esperado**:
```
🔄 Recalculando análisis de rendimiento
Analizando 20 carteras...
Wallet 0x000000... (ETHEREUM) - Score 65.32, P/L 12.45%, Win Rate 58%
...
✅ Análisis de rendimiento completado
🏆 Top 10 Mejores Carteras por Rendimiento:
1. 0xabc123... - Score: 85.2, P/L: 45.3%, Win Rate: 72%
...
```

---

### 4️⃣ Verificar resultados en el frontend

```bash
# Abrir en el navegador
http://tu-ip/crypto/dashboard
```

**Verificar**:
- ✅ Lista de carteras se muestra correctamente
- ✅ Métricas de rendimiento NO son todas iguales (40, 0%, etc)
- ✅ Scores variados y coherentes
- ✅ Profit/Loss con valores reales
- ✅ Rankings ordenados por score

---

### 5️⃣ Verificar endpoint de API directamente

```bash
# Obtener top 10 carteras por rendimiento
curl http://localhost:3000/api/wallets/top-performers?limit=10 | jq

# Ver detalles de una cartera específica
curl http://localhost:3000/api/wallets | jq '.[0]'
```

---

## 🐛 Problemas Conocidos y Soluciones

### ❌ Bitcoin no extrae datos

**Causa**: IP bloqueada por Blockchair
**Solución temporal**: Solo usar datos de Ethereum
**Solución permanente**: Obtener API key de Blockchair (info@blockchair.com)

```bash
# Una vez tengas la API key:
sudo k3s kubectl create secret generic backend-secret \
  --from-literal=ETHERSCAN_API_KEY=6ZP2EP3N8QJEFMVACG571MFXY8IRVKWCRA \
  --from-literal=BLOCKCHAIR_API_KEY=tu-nueva-api-key \
  --dry-run=client -o yaml | sudo k3s kubectl apply -f -

# Reiniciar backend
sudo k3s kubectl rollout restart deployment/backend -n crypto-monitoring
```

---

### ❌ Error "exceeds allowed time range" (CoinGecko)

**Causa**: API gratuita solo permite precios de últimos 365 días
**Ya solucionado**: El código filtra transacciones a últimos 365 días
**Si persiste**: Las transacciones en BD son más antiguas, limpiar y re-extraer

```bash
# Limpiar y re-extraer
sudo k3s kubectl delete job clean-database extract-wallets-v3 -n crypto-monitoring 2>/dev/null || true
sudo k3s kubectl apply -f k8s/jobs/clean-db-job.yaml
sleep 10
sudo k3s kubectl apply -f k8s/jobs/extract-wallets-v3-job.yaml
```

---

### ❌ Rate limit de CoinGecko (429)

**Causa**: Demasiadas requests en poco tiempo
**Solución**: El código ya tiene delay de 1.5s, pero si persiste aumentar delay

Editar `src/services/PriceService.ts` línea 176:
```typescript
await new Promise(resolve => setTimeout(resolve, 2000)); // Aumentar a 2 segundos
```

---

### ❌ Pod en "Pending" por falta de CPU

**Ya solucionado**: Backend reducido a 1 replica
**Si persiste**: Reducir recursos en deployment

```bash
# Ver uso de recursos
sudo k3s kubectl top nodes
sudo k3s kubectl top pods -n crypto-monitoring

# Si es necesario, reducir requests/limits en:
# k8s/backend/deployment.yaml
```

---

## 📊 Comandos Útiles para Monitoreo

```bash
# Ver todos los jobs
sudo k3s kubectl get jobs -n crypto-monitoring

# Ver logs del job de extracción actual
sudo k3s kubectl logs -n crypto-monitoring job/extract-wallets-v3 --tail=50

# Ver pods en ejecución
sudo k3s kubectl get pods -n crypto-monitoring

# Conectar a la base de datos directamente
sudo k3s kubectl exec -it -n crypto-monitoring deploy/backend -- psql $DATABASE_URL

# Ver logs del backend en tiempo real
sudo k3s kubectl logs -n crypto-monitoring deploy/backend --follow

# Verificar estadísticas de la base de datos
sudo k3s kubectl exec -n crypto-monitoring deploy/backend -- sh -c '
  psql $DATABASE_URL -c "\dt+"
'
```

---

## 📁 Estructura de Archivos Importantes

```
crypto-monitoring/
├── src/
│   ├── services/
│   │   ├── PriceService.ts          # ✨ NUEVO - Precios históricos CoinGecko
│   │   ├── WalletExtractor.ts       # 🔧 Modificado - Integra PriceService
│   │   ├── EthereumService.ts       # 🔧 Modificado - Filtra últimos 365 días
│   │   └── PerformanceAnalyzer.ts   # 🔧 Modificado - Cálculo con USD reales
│   │
│   ├── jobs/
│   │   ├── extractWallets.ts        # Extracción principal
│   │   ├── backfillPrices.ts        # ✨ NUEVO - Actualizar precios existentes
│   │   ├── cleanDatabase.ts         # ✨ NUEVO - Limpiar BD
│   │   └── reanalyzePerformance.ts  # ✨ NUEVO - Re-analizar sin extraer
│   │
│   └── utils/
│       └── helpers.ts                # 🔧 Modificado - Score mejorado
│
├── k8s/
│   ├── backend/
│   │   └── deployment.yaml           # 🔧 Modificado - 1 replica
│   │
│   └── jobs/
│       ├── extract-wallets-v3-job.yaml  # ✨ NUEVO - Extracción v3
│       ├── backfill-prices-job.yaml     # ✨ NUEVO - Backfill job
│       └── clean-db-job.yaml            # ✨ NUEVO - Clean job
│
└── NEXT_STEPS.md                     # 📋 Este archivo
```

---

## 🔄 Scripts NPM Disponibles

```bash
# En el directorio del proyecto:

npm run extract          # Extraer carteras (usar jobs de k8s en su lugar)
npm run backfill-prices  # Actualizar precios históricos
npm run reanalyze        # Re-analizar rendimiento
npm run clean-db         # Limpiar base de datos
npm run api              # Iniciar servidor API
npm run build            # Compilar TypeScript
```

---

## 📝 Notas Importantes

1. **CoinGecko API gratuita**: Límite de 10-50 req/min, solo últimos 365 días
2. **Blockchair bloqueado**: Necesita API key para Bitcoin
3. **Backend en 1 replica**: Por limitación de CPU del nodo
4. **Rate limiting**: 1.5s entre requests para respetar límites
5. **Caché de precios**: Precios históricos se cachean indefinidamente

---

## 🎯 Objetivo Final

Mostrar en el dashboard:
- ✅ Carteras de Ethereum con transacciones recientes
- ✅ Métricas de rendimiento calculadas con precios históricos reales
- ✅ Profit/Loss en USD precisos
- ✅ Rankings ordenados por performance score
- ✅ Win rates y holding periods calculados correctamente

---

## 💡 Mejoras Futuras (Opcional)

1. **Obtener API key de Blockchair** para datos de Bitcoin
2. **Upgrade a CoinGecko API de pago** para históricos completos
3. **Implementar caché persistente** (Redis) para precios
4. **Agregar más métricas** (ROI, Sharpe ratio, etc)
5. **Alertas automáticas** para movimientos grandes
6. **Exportar datos** a CSV/Excel

---

**¿Listo para continuar?** Ejecuta los pasos desde el punto 1️⃣ 🚀
