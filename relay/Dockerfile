# vPast relay — HF Spaces (and any Docker host)
# docker build -t vpast-relay .
# The container runs telegram-bot-api (local, 2 GB limit) on :8081
# and the relay on $RELAY_PORT (7860 is what HF exposes publicly).

FROM ubuntu:22.04

RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates nodejs tini && \
    rm -rf /var/lib/apt/lists/*

ARG TARGETPLATFORM
ARG TG_VERSION=latest

RUN set -eux; \
    ARCH="amd64"; \
    if [ "$TARGETPLATFORM" = "linux/arm64" ] || [ -n "${TG_ARM:-}" ]; then ARCH="arm64"; fi; \
    if [ "$TG_VERSION" = "latest" ]; then \
      TG_VERSION=$(curl -fsSL "https://api.github.com/repos/tdlib/telegram-bot-api/releases/latest" \
        | grep -oP '"tag_name":\s*"\K[^"]+'); \
    fi; \
    TG_VERSION=${TG_VERSION#v}; \
    curl -fsSL -o /tmp/tg.tar.gz \
      "https://github.com/tdlib/telegram-bot-api/releases/download/v${TG_VERSION}/telegram-bot-api-${TG_VERSION}-linux-${ARCH}.tar.gz"; \
    mkdir -p /opt/tg-bot-api/bin; \
    tar -xzf /tmp/tg.tar.gz -C /opt/tg-bot-api/bin --strip-components=1; \
    chmod +x /opt/tg-bot-api/bin/telegram-bot-api; \
    rm /tmp/tg.tar.gz

WORKDIR /opt/vpast-relay
COPY relay.js /opt/vpast-relay/relay.js
COPY entrypoint.sh /opt/vpast-relay/entrypoint.sh
RUN chmod +x /opt/vpast-relay/entrypoint.sh

ENV PORT=${RELAY_PORT}
EXPOSE 7860

ENTRYPOINT ["/usr/bin/tini", "--", "/opt/vpast-relay/entrypoint.sh"]