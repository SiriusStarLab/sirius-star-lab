#!/bin/bash
# Restores the Kamatera SSH key from the KAMATERA_SSH_KEY secret into ~/.ssh/
# Run once at the start of any session that needs server access.
set -e

if [ -z "$KAMATERA_SSH_KEY" ]; then
  echo "❌  KAMATERA_SSH_KEY secret not set — cannot restore key."
  exit 1
fi

mkdir -p ~/.ssh
echo "$KAMATERA_SSH_KEY" > ~/.ssh/id_rsa
chmod 600 ~/.ssh/id_rsa
echo "✅  SSH key restored to ~/.ssh/id_rsa"
