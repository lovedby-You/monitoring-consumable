start_db() {
  mkdir -p /run/mysqld && chown mysql:mysql /run/mysqld
  if ! mariadb -e "SELECT 1" > /dev/null 2>&1; then
    mysqld_safe --user=mysql > /root/mariadb.log 2>&1 &
  fi
  for _ in $(seq 1 40); do
    mariadb -e "SELECT 1" > /dev/null 2>&1 && return 0
    sleep 1
  done
  echo "Database gagal menyala. Lihat isi /root/mariadb.log"
  return 1
}

stop_db() {
  mariadb-admin shutdown > /dev/null 2>&1 || true
}
