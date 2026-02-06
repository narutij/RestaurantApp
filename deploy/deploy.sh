#!/bin/bash
# RestaurantApp - One-Command Deploy Script
# Run this on the VPS after pushing changes to git
#
# Usage: cd /opt/restaurant-app && bash deploy/deploy.sh

set -euo pipefail

APP_DIR="/opt/restaurant-app"
APP_NAME="restaurant-app"
LOG_PREFIX="[deploy]"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}${LOG_PREFIX}${NC} $1"; }
warn() { echo -e "${YELLOW}${LOG_PREFIX}${NC} $1"; }
error() { echo -e "${RED}${LOG_PREFIX}${NC} $1"; }

cd "$APP_DIR"

# 1. Pull latest changes
log "Pulling latest changes from git..."
git pull origin main

# 2. Install dependencies
log "Installing dependencies..."
npm install 2>&1 | tail -1

# 3. Build the app
log "Building production bundle..."
npm run build 2>&1

if [ $? -ne 0 ]; then
    error "Build failed! Aborting deploy."
    error "The previous version is still running."
    exit 1
fi

# 4. Run database migrations (push schema changes)
log "Pushing database schema changes..."
npx drizzle-kit push 2>&1 || warn "Schema push had warnings (may be fine if no changes)"

# 5. Restart the app with PM2
log "Restarting app..."
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
    pm2 restart "$APP_NAME" --update-env
else
    pm2 start deploy/ecosystem.config.cjs
fi

# 6. Wait and health check
log "Waiting for app to start..."
sleep 3

if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    echo ""
    log "========================================"
    log "  Deploy successful!"
    log "  App is running on port 3000"
    log "========================================"
    echo ""
    pm2 status "$APP_NAME"
else
    error "Health check failed! App may not have started correctly."
    error "Check logs with: pm2 logs $APP_NAME --lines 50"
    exit 1
fi
