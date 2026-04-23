#!/bin/bash
# Sirius Star Lab — Private Server Setup Script
# Run this on your private server as root or with sudo

set -e

echo "=== Sirius Star Lab — Server Setup ==="

# 1. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 2. Install pnpm
npm install -g pnpm

# 3. Install PostgreSQL
apt-get install -y postgresql postgresql-contrib

# 4. Start PostgreSQL
systemctl enable postgresql
systemctl start postgresql

# 5. Create database and user
sudo -u postgres psql <<SQL
CREATE USER sirius WITH PASSWORD 'CHANGE_THIS_PASSWORD';
CREATE DATABASE siriusdb OWNER sirius;
GRANT ALL PRIVILEGES ON DATABASE siriusdb TO sirius;
SQL

echo "=== Database created ==="
echo "Now import the database dump:"
echo "  psql -U sirius -d siriusdb -f sirius_db_export.sql"

# 6. Install nginx as reverse proxy
apt-get install -y nginx

# 7. Write nginx config
cat > /etc/nginx/sites-available/sirius << 'NGINX'
server {
    listen 80;
    server_name sirius-ai.live www.sirius-ai.live;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;

        # Critical for SSE streaming — disable buffering
        proxy_buffering off;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        chunked_transfer_encoding on;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/sirius /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo "=== Nginx configured ==="

# 8. Install PM2 for process management
npm install -g pm2

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "1. Upload the Sirius codebase to /opt/sirius/"
echo "2. Create /opt/sirius/.env with all environment variables (see sirius_env_template.txt)"
echo "3. cd /opt/sirius && pnpm install && pnpm run build"
echo "4. Import database: psql -U sirius -d siriusdb -f sirius_db_export.sql"
echo "5. pm2 start 'node artifacts/api-server/dist/index.js' --name sirius"
echo "6. pm2 save && pm2 startup"
echo "7. Get SSL: certbot --nginx -d sirius-ai.live -d www.sirius-ai.live"
