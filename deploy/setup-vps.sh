#!/bin/bash
# RestaurantApp - First-Time VPS Setup Script
# Run once on a fresh Ubuntu 22.04/24.04 Hetzner VPS
#
# Usage: sudo bash setup-vps.sh
#
# What this script does:
#   1. Installs Node.js 20 LTS
#   2. Installs PM2 (process manager)
#   3. Installs/verifies Nginx
#   4. Installs Certbot (for free SSL)
#   5. Creates PostgreSQL database and user
#   6. Creates required directories
#   7. Configures firewall
#   8. Sets up PM2 to start on boot
#   9. Sets up daily database backup cron job
#  10. Installs Nginx site config

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[setup]${NC} $1"; }
warn() { echo -e "${YELLOW}[setup]${NC} $1"; }
error() { echo -e "${RED}[setup]${NC} $1"; }
header() { echo -e "\n${CYAN}========================================${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}========================================${NC}"; }

# Must run as root
if [ "$EUID" -ne 0 ]; then
    error "Please run with sudo: sudo bash setup-vps.sh"
    exit 1
fi

APP_DIR="/opt/restaurant-app"
BACKUP_DIR="/opt/backups/restaurant-app"
LOG_DIR="/var/log/restaurant-app"
DB_NAME="restaurant_app"
DB_USER="restaurant_user"

# Prompt for database password
echo ""
echo -e "${CYAN}Enter a password for the PostgreSQL database user '${DB_USER}':${NC}"
echo "(This will be used in your .env file's DATABASE_URL)"
read -s DB_PASS
echo ""
if [ -z "$DB_PASS" ]; then
    error "Password cannot be empty!"
    exit 1
fi

header "1/10 - Updating system packages"
apt-get update -qq
apt-get upgrade -y -qq

header "2/10 - Installing Node.js 20 LTS"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    log "Node.js already installed: ${NODE_VERSION}"
    if [[ ! "$NODE_VERSION" =~ ^v(18|20|22) ]]; then
        warn "Node.js version may be too old. Recommended: v20+"
    fi
else
    log "Installing Node.js 20 LTS via NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
    log "Node.js installed: $(node -v)"
fi

header "3/10 - Installing PM2"
if command -v pm2 &> /dev/null; then
    log "PM2 already installed: $(pm2 -v)"
else
    npm install -g pm2
    log "PM2 installed: $(pm2 -v)"
fi

header "4/10 - Installing Nginx"
if command -v nginx &> /dev/null; then
    log "Nginx already installed: $(nginx -v 2>&1)"
else
    apt-get install -y -qq nginx
    systemctl enable nginx
    systemctl start nginx
    log "Nginx installed and started"
fi

header "5/10 - Installing Certbot (for free SSL)"
if command -v certbot &> /dev/null; then
    log "Certbot already installed"
else
    apt-get install -y -qq certbot python3-certbot-nginx
    log "Certbot installed"
fi

header "6/10 - Setting up PostgreSQL database"
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    log "Database '${DB_NAME}' already exists"
else
    log "Creating database user and database..."
    sudo -u postgres psql <<EOF
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
        CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
    ELSE
        ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASS}';
    END IF;
END
\$\$;
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF
    log "Database '${DB_NAME}' created with user '${DB_USER}'"
fi

header "7/10 - Creating directories"
mkdir -p "$APP_DIR"
mkdir -p "$BACKUP_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$APP_DIR/uploads"
log "Created: ${APP_DIR}, ${BACKUP_DIR}, ${LOG_DIR}"

header "8/10 - Configuring firewall (ufw)"
if command -v ufw &> /dev/null; then
    ufw allow OpenSSH
    ufw allow 'Nginx Full'
    # Don't expose port 3000 externally - Nginx proxies it
    ufw --force enable
    log "Firewall configured (SSH + HTTP/HTTPS allowed)"
else
    warn "ufw not found, skipping firewall setup"
fi

header "9/10 - Setting up PM2 startup hook"
# Get the actual user who will run the app (not root)
ACTUAL_USER="${SUDO_USER:-$(logname 2>/dev/null || echo root)}"
env PATH=$PATH:/usr/bin pm2 startup systemd -u "$ACTUAL_USER" --hp "/home/$ACTUAL_USER" 2>/dev/null || true
log "PM2 will auto-start on system reboot"

header "10/10 - Setting up daily backup cron job"
# Add cron job for daily backup at 3 AM (if not already present)
CRON_CMD="0 3 * * * /opt/restaurant-app/deploy/backup-db.sh >> /var/log/restaurant-app/backup.log 2>&1"
(crontab -u "$ACTUAL_USER" -l 2>/dev/null | grep -v "backup-db.sh"; echo "$CRON_CMD") | crontab -u "$ACTUAL_USER" -
log "Daily backup cron job set for 3:00 AM"

# Set ownership
chown -R "$ACTUAL_USER":"$ACTUAL_USER" "$APP_DIR" "$BACKUP_DIR" "$LOG_DIR"

# Install Nginx config
if [ -f "${APP_DIR}/deploy/nginx.conf" ]; then
    cp "${APP_DIR}/deploy/nginx.conf" /etc/nginx/sites-available/restaurant-app
    ln -sf /etc/nginx/sites-available/restaurant-app /etc/nginx/sites-enabled/restaurant-app
    # Remove default Nginx site if it exists (it conflicts)
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
    log "Nginx config installed and active"
else
    warn "Nginx config not found at ${APP_DIR}/deploy/nginx.conf"
    warn "You'll need to copy it manually after cloning the repo"
fi

# Print summary
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Setup Complete!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "  ${GREEN}Node.js:${NC}    $(node -v)"
echo -e "  ${GREEN}PM2:${NC}        $(pm2 -v)"
echo -e "  ${GREEN}Nginx:${NC}      $(nginx -v 2>&1)"
echo -e "  ${GREEN}PostgreSQL:${NC} $(psql --version | head -1)"
echo -e "  ${GREEN}Certbot:${NC}    $(certbot --version 2>&1)"
echo ""
echo -e "  ${GREEN}Database:${NC}   ${DB_NAME}"
echo -e "  ${GREEN}DB User:${NC}    ${DB_USER}"
echo -e "  ${GREEN}App Dir:${NC}    ${APP_DIR}"
echo -e "  ${GREEN}Backups:${NC}    ${BACKUP_DIR}"
echo -e "  ${GREEN}Logs:${NC}       ${LOG_DIR}"
echo ""
echo -e "  ${YELLOW}DATABASE_URL for your .env:${NC}"
echo -e "  postgres://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
echo -e "  1. Clone your repo to ${APP_DIR}"
echo -e "  2. Copy .env.production.example to .env and fill in DATABASE_URL"
echo -e "  3. Run: bash deploy/deploy.sh"
echo -e "  4. Set up SSL: sudo certbot --nginx -d YOUR_DOMAIN"
echo ""
