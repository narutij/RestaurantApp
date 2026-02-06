#!/bin/bash
# RestaurantApp - Automated PostgreSQL Backup Script
# Runs daily via cron to back up the database
#
# Cron entry (added by setup-vps.sh):
#   0 3 * * * /opt/restaurant-app/deploy/backup-db.sh >> /var/log/restaurant-app/backup.log 2>&1

set -euo pipefail

# Configuration
DB_NAME="restaurant_app"
DB_USER="restaurant_user"
BACKUP_DIR="/opt/backups/restaurant-app"
KEEP_DAYS=30
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting backup of ${DB_NAME}..."

# Create compressed backup
pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

# Verify backup was created and is not empty
if [ -s "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup successful: ${BACKUP_FILE} (${SIZE})"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Backup file is empty or missing!"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Remove backups older than KEEP_DAYS
DELETED=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +${KEEP_DAYS} -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Cleaned up ${DELETED} old backup(s)"
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup complete. Total backups: $(ls -1 ${BACKUP_DIR}/${DB_NAME}_*.sql.gz 2>/dev/null | wc -l)"
