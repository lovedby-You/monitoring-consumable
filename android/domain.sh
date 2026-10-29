#!/data/data/com.termux/files/usr/bin/bash
# Memasang domain sendiri lewat Cloudflare Tunnel. Pemakaian: bash ~/consumable-wms/android/domain.sh
# Syarat: domain sudah ditambahkan ke Cloudflare (status Active).
set -e
PROJECT="$(cd "$(dirname "$0")/.." && pwd)"
CONF_DIR="$HOME/.consumable"
CONF="$CONF_DIR/tunnel.yml"
NAME=consumable
mkdir -p "$CONF_DIR"

if [ -f "$CONF" ] && [ "$(grep -c 'hostname:' "$CONF")" -gt 1 ]; then
  echo "Konfigurasi sudah berisi beberapa situs. Untuk menambah situs pakai add-site.sh."
  echo "Untuk mengatur ulang dari awal, hapus dulu file $CONF"
  exit 1
fi

read -r -p "Alamat yang diinginkan (contoh: stok.domainanda.com): " HOST
HOST=$(echo "$HOST" | tr 'A-Z' 'a-z' | sed 's#^https\{0,1\}://##; s#/.*$##')
re='^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
if ! [[ $HOST =~ $re ]]; then
  echo "Alamat tidak valid."
  exit 1
fi

if [ ! -f "$HOME/.cloudflared/cert.pem" ]; then
  echo ""
  echo "Login ke Cloudflare: salin alamat (URL) yang muncul di bawah, buka di browser,"
  echo "pilih domain Anda, lalu tekan Authorize. Setelah itu skrip lanjut sendiri."
  echo ""
  cloudflared tunnel login
fi

if ! cloudflared tunnel list 2> /dev/null | awk -v n="$NAME" '$2==n {f=1} END {exit !f}'; then
  echo "Membuat tunnel '$NAME'..."
  cloudflared tunnel create "$NAME"
fi
UUID=$(cloudflared tunnel list | awk -v n="$NAME" '$2==n {print $1}')
if [ -z "$UUID" ] || [ ! -f "$HOME/.cloudflared/$UUID.json" ]; then
  echo "Tunnel tidak ditemukan atau file kredensialnya hilang. Hapus ~/.cloudflared lalu jalankan ulang skrip ini."
  exit 1
fi

cat > "$CONF" <<YAML
tunnel: $UUID
credentials-file: $HOME/.cloudflared/$UUID.json
ingress:
  - hostname: $HOST
    service: http://localhost:4000
  - service: http_status:404
YAML

echo "Mengarahkan $HOST ke tunnel..."
cloudflared tunnel route dns "$NAME" "$HOST"

if [ -f "$PROJECT/backend/.env" ]; then
  sed -i "s#^CORS_ORIGIN=.*#CORS_ORIGIN=https://$HOST#" "$PROJECT/backend/.env"
fi

echo ""
echo "Selesai. Jalankan: bash $PROJECT/android/start.sh"
echo "Aplikasi akan bisa dibuka di: https://$HOST"
