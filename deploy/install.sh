#!/usr/bin/env bash
# ==============================================================================
# Script Instalasi Otomatis LMS Pintar di Server Ubuntu (20.04 / 22.04 / 24.04)
# Jalankan dengan: sudo bash deploy/install.sh
# ==============================================================================

set -e

# Warna output terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================${NC}"
echo -e "${GREEN}   🚀 MEMULAI INSTALASI OTOMATIS LMS PINTAR (UBUNTU)  ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. Pastikan script dijalankan sebagai root (sudo)
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ Harap jalankan script ini dengan hak akses sudo/root!${NC}"
  echo -e "Contoh: sudo bash deploy/install.sh"
  exit 1
fi

# 2. Update sistem paket Ubuntu
echo -e "\n${YELLOW}[1/7] Memperbarui paket repositori Ubuntu...${NC}"
apt update && apt upgrade -y
apt install -y curl wget git build-essential ufw software-properties-common

# 3. Install Node.js 20 LTS & PM2
echo -e "\n${YELLOW}[2/7] Menginstall Node.js 20 LTS & PM2 Process Manager...${NC}"
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
echo -e "Versi Node.js: $(node -v), npm: $(npm -v)"

npm install -g pm2

# 4. Install & Konfigurasi PostgreSQL
echo -e "\n${YELLOW}[3/7] Menginstall & Menyiapkan Database PostgreSQL...${NC}"
apt install -y postgresql postgresql-contrib

# Mulai service postgresql
systemctl enable postgresql
systemctl start postgresql

# Buat database & user lms jika belum ada
DB_NAME="lms_db"
DB_USER="lms_user"
DB_PASS="lms_password_$(openssl rand -hex 6)"

sudo -u postgres psql -tc "SELECT 1 FROM pg_user WHERE usename = '$DB_USER'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

echo -e "${GREEN}✓ Database $DB_NAME dan User $DB_USER berhasil disiapkan.${NC}"

# 5. Siapkan File Konfigurasi .env
echo -e "\n${YELLOW}[4/7] Menyiapkan environment configuration (.env)...${NC}"
APP_DIR="$(pwd)"
if [ ! -f "$APP_DIR/.env" ]; then
  JWT_RANDOM=$(openssl rand -base64 32)
  cat <<EOF > "$APP_DIR/.env"
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}
JWT_SECRET=${JWT_RANDOM}
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
  echo -e "${GREEN}✓ File .env baru telah dibuat dengan kredensial database otomatis.${NC}"
else
  echo -e "${GREEN}✓ File .env sudah ada, mempertahankan konfigurasi yang ada.${NC}"
fi

# 6. Install Dependencies & Build Aplikasi Next.js
echo -e "\n${YELLOW}[5/7] Menginstall NPM Dependencies & Build Production Next.js...${NC}"
mkdir -p logs
npm install --production=false
npm run build

# 7. Jalankan Aplikasi dengan PM2 Cluster
echo -e "\n${YELLOW}[6/7] Menjalankan LMS via PM2 Process Manager...${NC}"
pm2 delete lms-app 2>/dev/null || true
if [ -f "ecosystem.config.js" ]; then
  pm2 start ecosystem.config.js
else
  pm2 start npm --name "lms-app" -- start
fi
pm2 save
pm2 startup systemd -u root --hp /root || true

# 8. Konfigurasi Nginx Web Server
echo -e "\n${YELLOW}[7/7] Menginstall & Mengonfigurasi Nginx Reverse Proxy...${NC}"
apt install -y nginx certbot python3-certbot-nginx

# Buat konfigurasi Nginx reverse proxy
NGINX_CONF="/etc/nginx/sites-available/lms"
cat <<'EOF' > "$NGINX_CONF"
server {
    listen 80;
    server_name _;

    client_max_body_size 100M;

    # Gzip Compression
    gzip on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    # Static Asset Caching
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Aktifkan site Nginx
ln -sf /etc/nginx/sites-available/lms /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
systemctl enable nginx

# 9. Firewall (UFW)
ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true
ufw --force enable || true

echo -e "\n${BLUE}======================================================${NC}"
echo -e "${GREEN}  🎉 INSTALASI SELESAI & APLIKASI BERJALAN DENGAN SUKSES! ${NC}"
echo -e "${BLUE}======================================================${NC}"
echo -e "📍 Akses Website: ${GREEN}http://$(curl -s ifconfig.me || echo 'IP_SERVER_ANDA')${NC}"
echo -e "📊 Cek Status PM2: ${YELLOW}pm2 status${NC}"
echo -e "📜 Cek Log Aplikasi: ${YELLOW}pm2 logs lms-app${NC}"
echo -e "🔒 Untuk memasang Domain & SSL HTTPS gratis:"
echo -e "   ${YELLOW}sudo certbot --nginx -d nama-domain-anda.com${NC}"
echo -e "${BLUE}======================================================${NC}"
