---
name: SSH key restore
description: The Kamatera SSH private key is stored as KAMATERA_SSH_KEY secret and restored via scripts/restore-ssh.sh
---

# SSH Key Restore

**Why:** Replit's home directory (~/.ssh/) is ephemeral — wiped on every environment restart. The SSH private key must be stored as a Replit secret and restored at the start of each session.

**How to apply:** At the start of any session that needs server access, run:
```bash
bash scripts/restore-ssh.sh
```

This reads `$KAMATERA_SSH_KEY`, reconstructs PEM newlines if needed (via python3), and writes to `~/.ssh/id_rsa` with correct permissions.

**Key details (Aug 2026):**
- Secret name: `KAMATERA_SSH_KEY`
- Key type: ed25519, comment: replit-sirius-2
- Public key: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKwrpWZMEsTQazJm2vKA5JbCOScB7/vQqt72wGS+8Wfo replit-sirius-2`
- Restore script: `scripts/restore-ssh.sh`
- Key added to server: Aug 13 2026 (via Windows terminal, Garry confirmed)

**⚠️ KAMATERA_SSH_KEY SECRET IS BROKEN (Aug 2026):** The secret currently contains only 68 bytes — the Ed25519 public key body, NOT the private key. The restore script will fail validation. Garry must re-set the KAMATERA_SSH_KEY secret to the full OpenSSH private key. Do not embed the private key in files — request it from Garry and set it via the Replit secrets UI.

**Secret format warning:** Replit secrets may collapse newlines. The restore script uses python3 to reconstruct the PEM format. If `ssh-keygen -y -f ~/.ssh/id_rsa` fails after restore, the secret value needs to be re-entered by Garry.

**Frontend deploy:** Build requires `PORT=3000 BASE_PATH=/`. Copy output to `/opt/sirius/frontend/` (nginx serves static files from there). Run `chattr -R -i /opt/sirius/frontend/` first if cp fails with "Operation not permitted".

**What NOT to do:** Never assume ~/.ssh/id_rsa exists — always run restore script first. Never embed private key material in memory files or any tracked file.
