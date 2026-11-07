# Cursor Cloud Agent ↔ Neshastyar VPS

VPS SSH for Cloud Agents is prepared on **TeraxrNewVPS**.

## Already done on the VPS

- SSH key generated at `/root/.secrets/cursor-cloud-agent` (private) and `.pub`
- Public key installed in `/root/.ssh/authorized_keys`
- SSH verified on port **9011**
- Helper scripts in `scripts/cloud-agent/`

## What you must do in Cursor (2 minutes)

### 1. Copy the private key

On the VPS (this machine), run:

```bash
cat /root/.secrets/cursor-cloud-agent
```

Copy the full block including:

```text
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

### 2. Add Cloud Agent secrets

Open: https://cursor.com/dashboard/cloud-agents

Add these secrets (use **Runtime Secret** for the private key):

| Name | Value |
|---|---|
| `SSH_PRIVATE_KEY` | paste the private key |
| `VPS_HOST` | `155.117.234.253` |
| `VPS_PORT` | `9011` |
| `VPS_USER` | `root` |

### 3. Network allowlist

Allow outbound access to:

- `155.117.234.253`
- `www.neshastyar.com`
- `n8nnew.teraxr.com`

Or temporarily allow all network access.

### 4. Startup command

In Cloud Agent environment / install / startup commands, add:

```bash
bash /workspace/scripts/cloud-agent/startup.sh
```

(If the repo path differs, use the checkout path that contains `scripts/cloud-agent/startup.sh`.)

### 5. Start a NEW Cloud Agent

Secrets only apply to new runs. Start a fresh Cloud Agent and paste:

```text
SSH is ready via: ssh -o BatchMode=yes neshastyar-vps '...'

First verify:
ssh -o BatchMode=yes neshastyar-vps 'hostname; ls /root/neshastyar | head'

Then run unattended model QA for meeting fcfd83cb-a8a1-47be-9915-c0b6fcc65f93:

ssh -o BatchMode=yes neshastyar-vps 'cd /root/neshastyar/backend && node ../scripts/cloud-agent/test-all-models.cjs fcfd83cb-a8a1-47be-9915-c0b6fcc65f93'

If any model fails (ok=false or primaryOk=false):
1) inspect n8n executions and backend logs on the VPS
2) fix the broken model path
3) retry ONLY that model with ONLY_MODELS=<key>
4) continue until all models pass or document an unfixable provider issue

Write a final pass/fail report.
My laptop will be off — work only via SSH to the VPS.
```

Then turn off your computer.

## Manual VPS test (optional)

```bash
cd /root/neshastyar/backend
node ../scripts/cloud-agent/test-all-models.cjs fcfd83cb-a8a1-47be-9915-c0b6fcc65f93
```

Report file:

`/root/neshastyar/scripts/cloud-agent/model-qa-fcfd83cb.json`

## Notes

- Private-key secret may be stored with literal `\n`; `startup.sh` expands those.
- Prefer **Remote Machine → TeraXRNewVPSWorker** so the agent runs on this VPS without SSH.
- Keep `neshastyar-backend` up via PM2: `pm2 start /root/ecosystem.config.js && pm2 save`.
