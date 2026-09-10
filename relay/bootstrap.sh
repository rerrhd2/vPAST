#!/usr/bin/env bash
# ============================================================
# vPast relay — one-shot setup for a Linux VPS (Ubuntu 22.04/24.04)
#
# Installs:
#   1) tdlib/telegram-bot-api (local server)  -> 2 GB upload limit, /bot<TOKEN>
#   2) vpast-relay (relay.js)                 -> :8787 public upload/download API
#
# Generate /opt/vpast-relay/vpast-relay.env BEFORE running:
#   TELEGRAM_BOT_TOKEN=123:ABC            (from @BotFather)
#   TELEGRAM_CHAT_ID=-1001234567890       (your private channel ID, bot must be admin)
#   RELAY_PUBLIC_URL=http://<SERVER_IP>:8787
#   TELEGRAM_API_ID=                      (optional, from my.telegram.org/apps)
#   TELEGRAM_API_HASH=                    (optional, from my.telegram.org/apps)
#
# Run:  sudo bash bootstrap.sh
# ============================================================

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run with sudo: sudo bash bootstrap.sh" >&2
  exit 1
fi

ENV_FILE=/opt/vpast-relay/vpast-relay.env
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE does not exist. Create it first (see header)." >&2
  exit 1
fi

mkdir -p /opt/vpast-relay /opt/tg-bot-api/bin /var/tg-bot-api

# ---------- 1. base packages ----------
apt-get update -y
apt-get install -y curl wget ca-certificates nodejs

# ---------- 2. telegram-bot-api local server ----------
ARCH=$(uname -m)
case "$ARCH" in
  x86_64) TG_ARCH="amd64" ;;
  aarch64|arm64) TG_ARCH="arm64" ;;
  *) echo "Unsupported arch: $ARCH" >&2; exit 1 ;;
esac

. "$ENV_FILE"
TG_VER="${TG_VER:-latest}"
if [ "$TG_VER" = "latest" ]; then
  TG_VER=$(curl -fsSL "https://api.github.com/repos/tdlib/telegram-bot-api/releases/latest" \
    | grep -oP '"tag_name":\s*"\K[^"]+')
fi
TG_VER=${TG_VER#v}
URL="https://github.com/tdlib/telegram-bot-api/releases/download/v${TG_VER}/telegram-bot-api-${TG_VER}-linux-${TG_ARCH}.tar.gz"
echo "Downloading telegram-bot-api $TG_VER ($TG_ARCH)..."
curl -fsSL -o /tmp/tg-bin.tar.gz "$URL"
tar -xzf /tmp/tg-bin.tar.gz -C /opt/tg-bot-api/bin --strip-components=1
chmod +x /opt/tg-bot-api/bin/telegram-bot-api

# ---------- 3. relay app ----------
cp /opt/vpast-relay/relay.js /opt/vpast-relay/relay.js.orig 2>/dev/null || true
mkdir -p /opt/vpast-relay/uploads

# ---------- 4. systemd units ----------
cat >/etc/systemd/system/telegram-bot-api.service <<EOF
[Unit]
Description=Telegram Bot API local server
After=network-online.target

[Service]
WorkingDirectory=/var/tg-bot-api
ExecStart=/opt/tg-bot-api/bin/telegram-bot-api --local --http-port=8081 --dir=/var/tg-bot-api --maximum-file-size=2147483648 --maximum-webhook-file-size=2147483648
Restart=always
RestartSec=3
User=root

[Install]
WantedBy=multi-user.target
EOF

cat >/etc/systemd/system/vpast-relay.service <<EOF
[Unit]
Description=vPast relay
After=network-online.target telegram-bot-api.service
Wants=telegram-bot-api.service

[Service]
WorkingDirectory=/opt/vpast-relay
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/node /opt/vpast-relay/relay.js
Restart=always
RestartSec=3
User=root

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now telegram-bot-api.service
sleep 2
systemctl enable --now vpast-relay.service

# ---------- 5. firewall ----------
command -v ufw >/dev/null 2>&1 && {
  ufw allow 8787/tcp || true
  ufw --force enable || true
}

echo
echo "Done. Check status with:"
echo "  systemctl status telegram-bot-api  systemctl status vpast-relay"
echo "Health:  curl $(grep RELAY_PUBLIC_URL "$ENV_FILE" | cut -d= -f2)/health"