#!/data/data/com.termux/files/usr/bin/bash
# Menyalakan database, server, dan tunnel publik. Pemakaian: bash ~/consumable-wms/android/start.sh
PROJECT="$(cd "$(dirname "$0")/.." && pwd)"

termux-wake-lock

echo "Menyalakan database dan server..."
nohup proot-distro login ubuntu --bind "$PROJECT:/root/monitoring-consumable" -- bash /root/monitoring-consumable/android/run-inside.sh > "$HOME/server.log" 2>&1 &

for _ in $(seq 1 60); do
  curl -s http://localhost:4000/api/health > /dev/null && break
  sleep 2
done
if ! curl -s http://localhost:4000/api/health > /dev/null; then
  echo "Server belum siap. Lihat isi ~/server.log"
  exit 1
fi

TUNNEL_CONF="$HOME/.consumbale/tunnel.yml"
URL=""

if [ -f "$TUNNEL_CONF" ]; then
  # domain sendiri (dibuat dengan domain.sh)
  HOST=$(grep -m1 'hostname:' "$TUNNEL_CONF" | awk '{print $3}')
  echo "Membuka tunnel ke domain $HOST..."
  nohup cloudflared tunnel --no-autoupdate --config "$TUNNEL_CONF" run > "$HOME/tunnel.log" 2>&1 &
  for _ in $(seq 1 30); do
    grep -q "Registered tunnel connection" "$HOME/tunnel.log" && URL="https://$HOST" && break
    sleep 2
  done
else
  # alamat sementara acak (tanpa domain)
  echo "Membuka tunnel publik sementara..."
  nohup cloudflared tunnel --no-autoupdate --url http://localhost:4000 > "$HOME/tunnel.log" 2>&1 &
  for _ in $(seq 1 30); do
    URL=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' "$HOME/tunnel.log" | head -1)
    [ -n "$URL" ] && break
    sleep 2
  done
fi

echo ""
if [ -n "$URL" ]; then
  echo "Aplikasi bisa dibuka di: $URL"
else
  echo "Tunnel belum tersambung. Lihat isi ~/tunnel.log"
fi
