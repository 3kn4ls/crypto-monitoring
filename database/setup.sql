-- Script de inicialización de base de datos para Crypto Wallet Monitor
-- Ejecutar como superusuario de PostgreSQL

-- Crear base de datos
CREATE DATABASE crypto_monitoring;

-- Conectar a la base de datos
\c crypto_monitoring;

-- Crear extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Las tablas serán creadas automáticamente por TypeORM
-- Este script es solo para setup inicial

-- Crear índices adicionales para optimizar consultas
-- (Se ejecutarán después de que TypeORM cree las tablas)

-- Script de optimización (ejecutar después de tener datos)
-- CREATE INDEX CONCURRENTLY idx_transactions_timestamp ON transactions(timestamp DESC);
-- CREATE INDEX CONCURRENTLY idx_wallet_performances_score ON wallet_performances(performance_score DESC);
-- CREATE INDEX CONCURRENTLY idx_wallets_balance ON wallets(balance_usd DESC);

-- Consultas útiles:

-- Top 10 carteras por balance
-- SELECT address, crypto_type, balance, balance_usd
-- FROM wallets
-- ORDER BY balance_usd DESC
-- LIMIT 10;

-- Top 10 carteras por rendimiento
-- SELECT w.address, w.crypto_type, wp.performance_score, wp.profit_loss_percentage, wp.win_rate
-- FROM wallets w
-- JOIN wallet_performances wp ON w.id = wp.wallet_id
-- ORDER BY wp.performance_score DESC
-- LIMIT 10;

-- Transacciones recientes
-- SELECT w.address, t.type, t.amount, t.timestamp
-- FROM transactions t
-- JOIN wallets w ON t.wallet_id = w.id
-- ORDER BY t.timestamp DESC
-- LIMIT 50;

-- Estadísticas generales
-- SELECT
--   COUNT(*) as total_wallets,
--   SUM(CASE WHEN crypto_type = 'BITCOIN' THEN 1 ELSE 0 END) as bitcoin_wallets,
--   SUM(CASE WHEN crypto_type = 'ETHEREUM' THEN 1 ELSE 0 END) as ethereum_wallets,
--   COUNT(DISTINCT id) as unique_wallets
-- FROM wallets;

GRANT ALL PRIVILEGES ON DATABASE crypto_monitoring TO postgres;

-- Mensaje de confirmación
SELECT 'Base de datos crypto_monitoring creada correctamente' as status;
