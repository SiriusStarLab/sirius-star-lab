#!/bin/bash
# Restores the Kamatera SSH key from the KAMATERA_SSH_KEY secret into ~/.ssh/
# The secret stores the raw PEM key; newlines are reconstructed if collapsed.
set -e

if [ -z "$KAMATERA_SSH_KEY" ]; then
  echo "❌  KAMATERA_SSH_KEY secret not set — cannot restore key."
  exit 1
fi

mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Write key — if secret was stored as single line (newlines collapsed), reconstruct PEM format
echo "$KAMATERA_SSH_KEY" | python3 -c "
import sys, re
key = sys.stdin.read().strip()
# If it looks like a collapsed PEM, re-insert newlines at correct positions
if '-----BEGIN' in key and '\n' not in key:
    key = re.sub(r'(-----BEGIN OPENSSH PRIVATE KEY-----)', r'\1\n', key)
    key = re.sub(r'(-----END OPENSSH PRIVATE KEY-----)', r'\n\1', key)
    # Split the base64 body into 64-char lines
    parts = key.split('\n')
    header = parts[0]
    footer = parts[-1]
    body = ''.join(parts[1:-1])
    body_lines = [body[i:i+64] for i in range(0, len(body), 64)]
    key = header + '\n' + '\n'.join(body_lines) + '\n' + footer
print(key)
" > ~/.ssh/id_rsa

chmod 600 ~/.ssh/id_rsa
ssh-keygen -y -f ~/.ssh/id_rsa > /dev/null 2>&1 && echo "✅  SSH key restored and valid" || echo "⚠️  Key restored but validation failed — check KAMATERA_SSH_KEY secret"
