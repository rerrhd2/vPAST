#!/usr/bin/env bash
# vPast relay entrypoint: telegram-bot-api (local, 2 GB) + relay.js
set -euo pipefail

mkdir -p /var/tg-bot-api /opt/vpast-relay/uploads

# Start the LOCAL Bot API server (2000 MB uploads, no download cap).
# Public URL of the relay is $RELAY_PUBLIC_URL, port $RELAY_PORT (default 7860 for HF).
/opt/tg-bot-api/bin/telegram-bot-api \
  --local \
  --http-port=8081 \
  --dir=/var/tg-bot-api \
  --maximum-file-size=2147483648 \
  --maximum-webhook-file-size=2147483648 \
  --api-id="${TELEGRAM_API_ID:-}" \
  --api-hash="${TELEGRAM_API_HASH:-}" \
  >/var/tg-bot-api/bot-api.log 2>&1 &

sleep 2
exec node /opt/vpast-relay/relay.js