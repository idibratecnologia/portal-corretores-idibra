#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Backup diário do PostgreSQL do Portal IDIBRA.
# - Dump comprimido (custom format) + retenção de N dias.
# - Instalado na VPS em /usr/local/bin/idibra-backup.sh
# - Cron: 0 3 * * * /usr/local/bin/idibra-backup.sh >> /var/log/idibra-backup.log 2>&1
#
# Restaurar:  pg_restore -h localhost -U idibra -d idibra_db --clean <arquivo.dump>
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

BACKUP_DIR=/var/backups/idibra
RETENTION_DAYS=30
DB_NAME=idibra_db
DB_USER=idibra

mkdir -p "$BACKUP_DIR"
export PGPASSWORD="$(cat /root/.idibra_dbpass)"

TS=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/idibra_${TS}.dump"

pg_dump -h localhost -U "$DB_USER" -d "$DB_NAME" -F c -Z 9 -f "$FILE"

# Remove backups mais antigos que a retenção
find "$BACKUP_DIR" -name 'idibra_*.dump' -type f -mtime +$RETENTION_DAYS -delete

echo "[$(date '+%F %T')] backup OK: $(basename "$FILE") ($(du -h "$FILE" | cut -f1))"
