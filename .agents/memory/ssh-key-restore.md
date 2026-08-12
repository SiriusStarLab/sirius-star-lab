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

This reads `$KAMATERA_SSH_KEY` and writes it to `~/.ssh/id_rsa` with correct permissions.

**Key details:**
- Secret name: `KAMATERA_SSH_KEY`
- Key type: ed25519
- Restore script: `scripts/restore-ssh.sh`
- Public key fingerprint: `SHA256:wnFu9zVioBC6kO3Tv7CnmamAWkxuAolC5wcZjKeEnmI replit-sirius`
- Key added to server authorized_keys: Aug 12 2026

**What NOT to do:** Never assume ~/.ssh/id_rsa exists at the start of a session — always run the restore script first.
