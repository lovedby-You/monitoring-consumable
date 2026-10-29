source "$(dirname "$0")/common.sh"
start_db || exit 1
if [ -f /root/apps-tambahan.sh ]; then
  bash /root/apps-tambahan.sh &
fi

cd /root/monitoring-consumable/backend || exit 1
exec node src/server.js
