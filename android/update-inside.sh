#!/bin/bash
# Pembaruan setelah git pull. Dijalankan di dalam Ubuntu oleh update.sh.
set -e
ROOT=/root/monitoring-consumable
source "$ROOT/android/common.sh"

start_db
cd "$ROOT/backend"
npm install
npx prisma generate
npx prisma migrate deploy

cd "$ROOT/frontend"
npm install
npm run build

stop_db
echo "Pembaruan selesai."
