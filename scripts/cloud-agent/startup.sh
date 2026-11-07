#!/usr/bin/env bash
# Cursor Cloud Agent startup: wire SSH to Neshastyar VPS.
# Requires secrets: SSH_PRIVATE_KEY, VPS_HOST, VPS_PORT, VPS_USER
set -euo pipefail

: "${SSH_PRIVATE_KEY:?SSH_PRIVATE_KEY secret is required}"
: "${VPS_HOST:=155.117.234.253}"
: "${VPS_PORT:=9011}"
: "${VPS_USER:=root}"

mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Support keys that were stored with literal \n
KEY_CONTENT="$SSH_PRIVATE_KEY"
if printf '%s' "$KEY_CONTENT" | grep -q '\\n'; then
  KEY_CONTENT="$(printf '%s' "$KEY_CONTENT" | sed 's/\\n/\n/g')"
fi

printf '%s\n' "$KEY_CONTENT" > ~/.ssh/id_ed25519
chmod 600 ~/.ssh/id_ed25519

cat > ~/.ssh/config <<EOF
Host neshastyar-vps
  HostName ${VPS_HOST}
  Port ${VPS_PORT}
  User ${VPS_USER}
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new
  ServerAliveInterval 30
  ServerAliveCountMax 3
EOF
chmod 600 ~/.ssh/config

echo "Testing SSH to neshastyar-vps..."
ssh -o BatchMode=yes neshastyar-vps 'echo SSH_OK; hostname; ls /root/neshastyar | head -5'
echo "Cloud Agent SSH ready. Use: ssh -o BatchMode=yes neshastyar-vps 'COMMAND'"
