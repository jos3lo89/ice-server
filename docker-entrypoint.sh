#!/bin/sh

set -e

echo "iniciando proceso de arranque..."

echo "1 -> aplicando migraciones de base de datos..."
npx prisma migrate deploy

echo "2 -> ejecutando seed..."
npx prisma db seed

echo "3 -> iniciando servidor..."
exec node dist/src/main.js