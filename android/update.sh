set -e
PROJECT="$(cd "$(dirname "$0")/.." && pwd)"

bash "$PROJECT/android/stop.sh"
cd "$PROJECT"
git pull
proot-distro login ubuntu --bind "$PROJECT:/root/monitoring-consumable" -- bash /root/monitoring-consumable/android/update-inside.sh
bash "$PROJECT/android/start.sh"
