#!/usr/bin/env bash
# ==============================================================================
# Script Update Otomatis LMS Pintar (Zero/Low Downtime Reload)
# Jalankan di server: bash deploy/update.sh
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================${NC}"
echo -e "${GREEN}      🔄 MEMULAI UPDATE APLIKASI LMS PINTAR           ${NC}"
echo -e "${BLUE}======================================================${NC}"

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

# 1. Tarik pembaruan kode terbaru dari Git
echo -e "\n${YELLOW}[1/4] Menarik source code terbaru (git pull)...${NC}"
if [ -d ".git" ]; then
  git pull origin main || git pull origin master || echo "Melewati git pull..."
else
  echo "Direktori bukan git repo, melanjutkan pembaruan file..."
fi

# 2. Update dependensi jika ada paket baru
echo -e "\n${YELLOW}[2/4] Menginstall dependensi (npm install)...${NC}"
npm install --production=false

# 3. Build ulang versi produksi Next.js
echo -e "\n${YELLOW}[3/4] Melakukan build Next.js (npm run build)...${NC}"
npm run build

# 4. Reload PM2 Cluster (Zero-downtime)
echo -e "\n${YELLOW}[4/4] Me-reload PM2 Cluster secara aman...${NC}"
if pm2 list | grep -q "lms-app"; then
  pm2 reload lms-app --update-env
else
  if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js
  else
    pm2 start npm --name "lms-app" -- start
  fi
fi

pm2 save

echo -e "\n${BLUE}======================================================${NC}"
echo -e "${GREEN}       ✅ UPDATE BERHASIL DILAKUKAN DENGAN SUKSES!    ${NC}"
echo -e "${BLUE}======================================================${NC}"
pm2 status lms-app
