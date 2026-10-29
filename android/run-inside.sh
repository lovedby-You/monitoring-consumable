#!/bin/bash
# Menyalakan database lalu backend (backend juga menyajikan tampilan web).
source "$(dirname "$0")/common.sh"
start_db || exit 1
# aplikasi tambahan (opsional): tulis perintah menjalankannya di /root/apps-tambahan.sh
if [ -f /root/apps-tambahan.sh ]; then
  bash /root/apps-tambahan.sh &
fi

cd /root/consumable-wms/backend || exit 1
exec node src/server.js
