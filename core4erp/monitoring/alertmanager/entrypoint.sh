#!/bin/sh
# Entrypoint do Alertmanager do Core 4.
#
# O Alertmanager NÃO expande variáveis de ambiente no alertmanager.yml. Este script gera a
# configuração a partir das envs (definidas no .env → docker-compose.yml) e inicia o processo.
# Nenhum segredo fica versionado no repositório.
#
# Destinos (todos opcionais; configure pelo menos um em produção):
#   ALERT_EMAIL_TO          e-mail(s) que recebem os alertas (separados por vírgula)
#   ALERT_SMTP_SMARTHOST    host:porta do SMTP (default no compose: MAIL_HOST:MAIL_PORT)
#   ALERT_SMTP_FROM         remetente (default no compose: MAIL_FROM)
#   ALERT_SMTP_USER         usuário SMTP (default no compose: MAIL_USERNAME)
#   ALERT_SMTP_PASSWORD     senha SMTP (default no compose: MAIL_PASSWORD)
#   ALERT_WEBHOOK_URL       URL que recebe POST JSON do Alertmanager (Slack/Discord via ponte,
#                           n8n, ntfy, etc.)
# Sem nenhum destino, os alertas ficam visíveis só na UI/API do Alertmanager (aviso no log).
set -eu

CONFIG=/tmp/alertmanager.yml

# Aspas simples em YAML: o único escape necessário é dobrar a própria aspa simples.
yq() {
  printf "'%s'" "$(printf '%s' "$1" | sed "s/'/''/g")"
}

{
  echo "route:"
  echo "  receiver: padrao"
  echo "  group_by: ['alertname', 'severity']"
  echo "  group_wait: 30s"
  echo "  group_interval: 5m"
  echo "  repeat_interval: 4h"
  echo ""
  echo "inhibit_rules:"
  echo "  # Backend fora do ar: silencia os demais alertas da mesma instância (são consequência)."
  echo "  - source_matchers: ['alertname = InstanciaFora']"
  echo "    target_matchers: ['alertname != InstanciaFora']"
  echo "    equal: ['instance']"
  echo ""
  echo "receivers:"
  echo "  - name: padrao"

  if [ -n "${ALERT_EMAIL_TO:-}" ]; then
    echo "    email_configs:"
    echo "      - to: $(yq "$ALERT_EMAIL_TO")"
    echo "        from: $(yq "${ALERT_SMTP_FROM:-alertas@localhost}")"
    echo "        smarthost: $(yq "${ALERT_SMTP_SMARTHOST:-localhost:587}")"
    if [ -n "${ALERT_SMTP_USER:-}" ]; then
      echo "        auth_username: $(yq "$ALERT_SMTP_USER")"
      echo "        auth_password: $(yq "${ALERT_SMTP_PASSWORD:-}")"
    fi
    echo "        require_tls: true"
    echo "        send_resolved: true"
  fi

  if [ -n "${ALERT_WEBHOOK_URL:-}" ]; then
    echo "    webhook_configs:"
    echo "      - url: $(yq "$ALERT_WEBHOOK_URL")"
    echo "        send_resolved: true"
  fi
} > "$CONFIG"

if [ -z "${ALERT_EMAIL_TO:-}" ] && [ -z "${ALERT_WEBHOOK_URL:-}" ]; then
  echo "AVISO: nenhum destino de alerta configurado (ALERT_EMAIL_TO / ALERT_WEBHOOK_URL)." >&2
  echo "AVISO: os alertas só aparecerão na UI do Alertmanager." >&2
fi

exec /bin/alertmanager \
  --config.file="$CONFIG" \
  --storage.path=/alertmanager \
  --web.listen-address=:9093 \
  --cluster.listen-address= \
  "$@"
