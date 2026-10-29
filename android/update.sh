#!/data/data/com.termux/files/usr/bin/bash
# Mengambil versi terbaru dari GitHub lalu menyalakan ulang. Pemakaian: bash ~/consumable-wms/android/update.sh
set -e
PROJECT="$(cd "$(dirname "$0")/.." && pwd)"

bash "$PROJECT/android/stop.sh"
cd "$PROJECT"
git pull
proot-distro login ubuntu --bind "$PROJECT:/root/consumable-wms" -- bash /root/consumable-wms/android/update-inside.sh
bash "$PROJECT/android/start.sh"
