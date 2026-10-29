#!/bin/bash
# Pembaruan setelah git pull. Dijalankan di dalam Ubuntu oleh update.sh.
set -e
ROOT=/root/consumable-wms
source "$ROOT/android/common.sh"

start_db
cd "$ROOT/backend"
npm install
npx prisma generate
npx prisma migrate deploy

if [ ! -f "$ROOT/frontend/dist/index.html" ]; then
  cd "$ROOT/frontend"
  npm install
  npm run build
fi

stop_db
echo "Pembaruan selesai."
