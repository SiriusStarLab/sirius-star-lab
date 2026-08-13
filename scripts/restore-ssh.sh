#!/bin/bash
# Restores the Kamatera SSH key from the KAMATERA_SSH_KEY secret into ~/.ssh/
# Key is stored as base64 to avoid newline mangling.
# Run once at the start of any session that needs server access.
set -e

if [ -z "$KAMATERA_SSH_KEY" ]; then
  echo "❌  KAMATERA_SSH_KEY secret not set — cannot restore key."
  exit 1
fi

mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Decode base64 key to file
printf '%s' "$KAMATERA_SSH_KEY" | base64 -d > ~/.ssh/id_rsa 2>/dev/null || printf '%s' "$KAMATERA_SSH_KEY" > ~/.ssh/id_rsa
chmod 600 ~/.ssh/id_rsa

ssh-keygen -y -f ~/.ssh/id_rsa > /dev/null 2>&1 && echo "✅  SSH key restored and valid" || echo "⚠️  Key restored but validation failed — check KAMATERA_SSH_KEY secret format"
