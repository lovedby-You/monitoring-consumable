#!/data/data/com.termux/files/usr/bin/bash
# Menambah situs/aplikasi lain ke tunnel yang sama (satu HP, banyak alamat).
# Pemakaian: bash ~/consumable-wms/android/add-site.sh toko.domainanda.com 4001
# Syarat: domain.sh sudah pernah dijalankan.
set -e
CONF="$HOME/.wms/tunnel.yml"
NAME=wms

HOST=$(echo "$1" | tr 'A-Z' 'a-z' | sed 's#^https\{0,1\}://##; s#/.*$##')
PORT="$2"

if [ -z "$HOST" ] || [ -z "$PORT" ]; then
  echo "Pemakaian: bash add-site.sh alamat.domainanda.com port"
  exit 1
fi
re='^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
if ! [[ $HOST =~ $re ]]; then
  echo "Alamat tidak valid."
  exit 1
fi
if ! [[ $PORT =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1024 ] || [ "$PORT" -gt 65535 ]; then
  echo "Port harus angka 1024 sampai 65535."
  exit 1
fi
if [ ! -f "$CONF" ]; then
  echo "Jalankan domain.sh dulu."
  exit 1
fi
if grep -q "hostname: $HOST\$" "$CONF"; then
  echo "$HOST sudah terdaftar."
  exit 1
fi
if grep -q "localhost:$PORT\$" "$CONF"; then
  echo "Port $PORT sudah dipakai situs lain."
  exit 1
fi

# sisipkan aturan baru tepat sebelum aturan penutup (http_status:404)
TMP=$(mktemp)
awk -v host="$HOST" -v port="$PORT" '
  /^  - service: http_status:404/ { print "  - hostname: " host; print "    service: http://localhost:" port }
  { print }
' "$CONF" > "$TMP"
mv "$TMP" "$CONF"

echo "Mengarahkan $HOST ke tunnel..."
cloudflared tunnel route dns "$NAME" "$HOST"

if pgrep -x cloudflared > /dev/null; then
  pkill -x cloudflared
  sleep 2
  nohup cloudflared tunnel --no-autoupdate --config "$CONF" run > "$HOME/tunnel.log" 2>&1 &
  echo "Tunnel dinyalakan ulang."
fi

echo ""
echo "Selesai. Pastikan aplikasinya berjalan di port $PORT, lalu buka https://$HOST"
