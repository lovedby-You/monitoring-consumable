# Catatan perbaikan skrip Android

Perbaikan pada paket ini:

1. `start.sh`: path konfigurasi tunnel disamakan dengan `domain.sh`, yaitu `~/.consumable/tunnel.yml`.
2. `update-inside.sh`: path root repository diperbaiki menjadi `/root/monitoring-consumable`.
3. `update-inside.sh`: frontend selalu menjalankan `npm install` dan `npm run build` setelah update, agar perubahan UI dari GitHub ikut terpasang.
4. `setup-inside.sh`: frontend dibangun dari source saat setup, bukan melewati build hanya karena folder `dist` sudah ada.

## Penting sebelum digunakan

- Backup database sebelum pembaruan yang mengubah skema.
- `update.sh` menghentikan server, menjalankan `git pull`, lalu build dan menyalakan server kembali. Jalankan hanya setelah perubahan PC sudah di-push ke branch yang dipakai Android.
- Periksa `git status` dan pastikan tidak ada perubahan lokal di clone Android yang akan berbenturan dengan `git pull`.
- Jangan membagikan file `.env`, token Cloudflare, atau kredensial database.
- Setup menjalankan `npm run users:reset`. Periksa implementasi script itu sebelum menjalankan setup jika sudah ada akun/data yang ingin dipertahankan. Untuk instalasi awal yang benar-benar baru, ikuti prompt setup dan simpan kredensial dengan aman.
- Paket ini memperbaiki skrip yang disebutkan, tetapi belum diuji menjalankan penuh di perangkat Android. Kompatibilitas dependency Prisma dan MariaDB tetap perlu diuji saat setup.
