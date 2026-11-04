#!/bin/bash
set -euo pipefail
ENV_FILE=/root/neshastyar/backend/.env
DB_NAME=$(grep -E '^DB_NAME=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r"')
DB_USER=$(grep -E '^DB_USER=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r"')
DB_PASSWORD=$(grep -E '^DB_PASSWORD=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r"')
DB_HOST=$(grep -E '^DB_HOST=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r"')
echo "DB_NAME=$DB_NAME"
mysql -h "${DB_HOST:-127.0.0.1}" -u "$DB_USER" -p"$DB_PASSWORD" -N -e "SHOW COLUMNS FROM participants;" "$DB_NAME"
