set -e
PROJECT="$(cd "$(dirname "$0")/.." && pwd)"

echo "== Memasang paket Termux =="
pkg update -y
pkg upgrade -y
pkg install -y proot-distro cloudflared curl git

echo "== Memasang Ubuntu di Termux (sekali saja, butuh beberapa menit) =="
if ! proot-distro login ubuntu -- true > /dev/null 2>&1; then
  proot-distro install ubuntu
fi

proot-distro login ubuntu --bind "$PROJECT:/root/consumable-wms" -- bash /root/consumable-wms/android/setup-inside.sh

echo ""
echo "Selanjutnya jalankan: bash $PROJECT/android/start.sh"
