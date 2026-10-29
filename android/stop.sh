#!/data/data/com.termux/files/usr/bin/bash
# Mematikan tunnel, server, dan database dengan rapi. Pemakaian: bash ~/consumable-wms/android/stop.sh
PROJECT="$(cd "$(dirname "$0")/.." && pwd)"

pkill cloudflared 2> /dev/null
proot-distro login ubuntu --bind "$PROJECT:/root/consumable-wms" -- bash -c 'pkill -x node; mariadb-admin shutdown' > /dev/null 2>&1
sleep 3
pkill -f "run-inside.sh" 2> /dev/null
termux-wake-unlock 2> /dev/null
echo "Server dimatikan."
