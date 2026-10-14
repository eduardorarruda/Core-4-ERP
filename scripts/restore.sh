#!/usr/bin/env bash
# Restauração do Core 4 ERP a partir de um diretório gerado por scripts/backup.sh.
# Ver DEPLOY.md › "Backup e restauração" (inclui o teste de restauração periódico).
#
# Uso:
#   scripts/restore.sh <diretorio-do-backup> <componente> [--sim]
#
# Componentes:
#   erp       banco do ERP      (core4erp.sql.gz)      — para backend e n8n durante a restauração
#   n8n       banco do n8n      (n8n.sql.gz)           — para o n8n durante a restauração
#   qdrant    coleções do RAG   (qdrant-<col>.snapshot) — substitui a coleção pelo snapshot
#   n8n-data  volume do n8n     (n8n_data.tar.gz)      — para o n8n e repõe /home/node/.n8n
#   tudo      todos acima, nessa ordem
#
# --sim  pula a confirmação interativa (uso em automação/teste de restauração).
#
# ATENÇÃO: restaurar SOBRESCREVE os dados atuais do componente. Faça um backup antes.
# O n8n só consegue ler as credenciais restauradas com a MESMA N8N_ENCRYPTION_KEY do backup.
# Os campos criptografados do ERP (CPF/CNPJ) exigem a MESMA DATA_ENCRYPTION_KEY.
# As expansões entre aspas simples são avaliadas DENTRO dos containers, de propósito.
# shellcheck disable=SC2016
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
QDRANT_URL="${QDRANT_URL:-http://127.0.0.1:6333}"
N8N_DB_NAME="${N8N_DB_NAME:-n8n}"
HELPER_IMAGE="alpine:3.22.6"

uso() { sed -n '2,19p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-1}"; }
log() { printf '[restore %s] %s\n' "$(date +%H:%M:%S)" "$*"; }
fail() { printf '[restore] ERRO: %s\n' "$*" >&2; exit 1; }

[[ $# -ge 2 ]] || uso
SRC="$(cd "$1" 2>/dev/null && pwd)" || fail "diretório de backup não encontrado: $1"
COMPONENTE="$2"
CONFIRMAR=1
[[ "${3:-}" == "--sim" ]] && CONFIRMAR=0

cd "$PROJECT_DIR"
compose() { docker compose "$@"; }

confirmar() {
  [[ $CONFIRMAR -eq 0 ]] && return 0
  read -r -p "Isto SOBRESCREVE $1 com o backup de $SRC. Digite 'restaurar' para continuar: " resp
  [[ "$resp" == "restaurar" ]] || fail "cancelado pelo usuário"
}

verificar_integridade() {
  [[ -f "$SRC/SHA256SUMS" ]] || fail "SHA256SUMS ausente em $SRC (backup incompleto?)"
  log "verificando checksums..."
  (cd "$SRC" && sha256sum -c --quiet SHA256SUMS) || fail "checksum não confere — backup corrompido"
}

restaurar_erp() {
  local f="$SRC/core4erp.sql.gz"
  [[ -f "$f" ]] || fail "arquivo ausente: $f"
  confirmar "o banco do ERP"
  log "parando backend e n8n..."
  compose stop backend n8n
  log "restaurando banco do ERP..."
  gunzip -c "$f" | compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -q -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
  log "subindo backend e n8n..."
  compose up -d backend n8n
}

restaurar_n8n_db() {
  local f="$SRC/n8n.sql.gz"
  [[ -f "$f" ]] || fail "arquivo ausente: $f"
  confirmar "o banco do n8n"
  compose stop n8n
  log "restaurando banco do n8n..."
  gunzip -c "$f" | compose exec -T -e DBN="$N8N_DB_NAME" db \
    sh -c 'psql -v ON_ERROR_STOP=1 -q -U "$POSTGRES_USER" -d "$DBN"'
  # O dump (sem --no-owner) já traz os "ALTER ... OWNER TO <role do n8n>": a posse é preservada.
  compose up -d n8n
}

restaurar_qdrant() {
  local hdr found=0 snap col
  hdr="$(mktemp)"
  # shellcheck disable=SC2064  # expande agora, de propósito (caminho do arquivo temporário)
  trap "rm -f -- '$hdr'" RETURN
  compose exec -T qdrant sh -c 'printf "api-key: %s\n" "${QDRANT__SERVICE__API_KEY:-}"' > "$hdr"
  for snap in "$SRC"/qdrant-*.snapshot; do
    [[ -e "$snap" ]] || continue
    found=1
    col="$(basename "$snap" .snapshot)"; col="${col#qdrant-}"
    confirmar "a coleção Qdrant '$col'"
    log "restaurando coleção $col (upload do snapshot)..."
    curl -fsS -X POST -H @"$hdr" -F "snapshot=@$snap" \
      "$QDRANT_URL/collections/$col/snapshots/upload?priority=snapshot&wait=true" >/dev/null \
      || fail "falha ao restaurar a coleção $col"
  done
  [[ $found -eq 1 ]] || fail "nenhum qdrant-*.snapshot em $SRC"
}

restaurar_n8n_data() {
  local f="$SRC/n8n_data.tar.gz"
  [[ -f "$f" ]] || fail "arquivo ausente: $f"
  confirmar "o volume de dados do n8n"
  compose stop n8n
  log "repondo /home/node/.n8n..."
  # O helper roda como o mesmo usuário do n8n (node = 1000) para manter a posse dos arquivos.
  docker run --rm -i --volumes-from n8n --user 1000:1000 "$HELPER_IMAGE" \
    sh -c 'find /home/node/.n8n -mindepth 1 -delete && tar xzf - -C /home/node/.n8n' < "$f"
  compose up -d n8n
}

verificar_integridade
case "$COMPONENTE" in
  erp)      restaurar_erp ;;
  n8n)      restaurar_n8n_db ;;
  qdrant)   restaurar_qdrant ;;
  n8n-data) restaurar_n8n_data ;;
  tudo)     restaurar_erp; restaurar_n8n_db; restaurar_qdrant; restaurar_n8n_data ;;
  -h|--help) uso 0 ;;
  *)        fail "componente inválido: $COMPONENTE (use erp | n8n | qdrant | n8n-data | tudo)" ;;
esac
log "restauração de '$COMPONENTE' concluída. Rode o smoke test do DEPLOY.md."
