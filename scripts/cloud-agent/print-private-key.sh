#!/usr/bin/env bash
# Prints the Cloud Agent private key for pasting into Cursor Secrets.
# Do NOT commit the key. Do NOT paste it into chat/git.
set -euo pipefail
KEY=/root/.secrets/cursor-cloud-agent
if [ ! -f "$KEY" ]; then
  echo "Missing $KEY" >&2
  exit 1
fi
cat "$KEY"
