#!/bin/bash
# Pemasangan pertama kali. Dijalankan di dalam Ubuntu oleh setup.sh. Aman dijalankan ulang.
set -e
ROOT=/root/monitoring-consumable
source "$ROOT/android/common.sh"
export DEBIAN_FRONTEND=noninteractive

ask_password() {
  local label="$1" p1 p2
  local re='^[A-Za-z0-9!@#%^*_.+=-]{10,64}$'
  while true; do
    read -r -s -p "$label (minimal 10 karakter): " p1 >&2; echo >&2
    read -r -s -p "Ulangi password: " p2 >&2; echo >&2
    if [ "$p1" != "$p2" ]; then echo "Password tidak sama, ulangi." >&2; continue; fi
    if ! [[ $p1 =~ $re ]]; then
      echo "Minimal 10 karakter, hanya huruf, angka, dan simbol ! @ # % ^ * _ . + = -" >&2
      continue
    fi
    printf '%s' "$p1"
    return
  done
}

echo "== 1/5 Memasang paket Ubuntu =="
apt-get update -y
apt-get install -y curl ca-certificates openssl mariadb-server

echo "== 2/5 Memasang Node.js =="
NODE_MAJOR=$(node -v 2>/dev/null | sed 's/v\([0-9]*\).*/\1/')
if [ "${NODE_MAJOR:-0}" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo "Node.js $(node -v)"

echo "== 3/5 Menyiapkan database dan file .env =="
cat > /etc/mysql/mariadb.conf.d/99-hemat.cnf <<'CNF'
[mysqld]
innodb_buffer_pool_size=64M
max_connections=30
performance_schema=OFF
CNF
[ -d /var/lib/mysql/mysql ] || mariadb-install-db --user=mysql --datadir=/var/lib/mysql > /dev/null
start_db

if [ -f "$ROOT/backend/.env" ]; then
  echo "backend/.env sudah ada, dilewati."
else
  echo "Buat password untuk login aplikasi (admin dan staff):"
  ADMIN_PASS=$(ask_password "Password ADMIN")
  STAFF_PASS=$(ask_password "Password STAFF")
  DB_PASS=$(openssl rand -hex 16)
  JWT_SECRET=$(openssl rand -hex 32)

  mariadb <<SQL
CREATE DATABASE IF NOT EXISTS consumable_wms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'wms'@'localhost' IDENTIFIED BY '$DB_PASS';
CREATE USER IF NOT EXISTS 'wms'@'127.0.0.1' IDENTIFIED BY '$DB_PASS';
ALTER USER 'wms'@'localhost' IDENTIFIED BY '$DB_PASS';
ALTER USER 'wms'@'127.0.0.1' IDENTIFIED BY '$DB_PASS';
GRANT ALL ON consumable_wms.* TO 'wms'@'localhost';
GRANT ALL ON consumable_wms.* TO 'wms'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

  cat > "$ROOT/backend/.env" <<ENV
NODE_ENV=production
PORT=4000
DATABASE_URL="mysql://wms:$DB_PASS@127.0.0.1:3306/consumable_wms"
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=8h
COOKIE_SECURE=true
TRUST_PROXY=1
CORS_ORIGIN=http://localhost:4000
APP_TIMEZONE=Asia/Jakarta
USAGE_PERIOD_DAYS=30
LEAD_TIME_DAYS=8
ORDER_COVER_DAYS=75
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD="$ADMIN_PASS"
SEED_USER_USERNAME=staff
SEED_USER_PASSWORD="$STAFF_PASS"
ENV
  chmod 600 "$ROOT/backend/.env"
  echo "File backend/.env dibuat."
fi

echo "== 4/5 Memasang backend =="
cd "$ROOT/backend"
npm install
npx prisma generate
npx prisma migrate deploy
npm run users:reset

echo "== 5/5 Menyiapkan tampilan web =="
if [ ! -f "$ROOT/frontend/dist/index.html" ]; then
  cd "$ROOT/frontend"
  npm install
  npm run build
else
  echo "Tampilan (frontend/dist) sudah ada."
fi

stop_db
echo ""
echo "Pemasangan selesai."
