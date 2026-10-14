#!/usr/bin/env bash
# Backup do Core 4 ERP (ver DEPLOY.md › "Backup e restauração").
#
# Gera, em um diretório com carimbo de data/hora:
#   core4erp.sql.gz     pg_dump do banco do ERP (formato SQL, --clean --if-exists)
#   n8n.sql.gz          pg_dump do banco do n8n (workflows, credenciais criptografadas, memória)
#   qdrant-<col>.snapshot  snapshot de cada coleção do Qdrant (API REST, com api-key)
#   n8n_data.tar.gz     volume /home/node/.n8n (config, binários de execução)
#   SHA256SUMS          checksums para verificar integridade antes de restaurar
#
# Uso:   scripts/backup.sh
# Cron:  ver DEPLOY.md (ex.: diário às 03:15).
#
# Configuração por env (todas opcionais):
#   BACKUP_DIR            destino local          (default: <projeto>/backups)
#   BACKUP_RETENTION_DAYS dias mantidos no local (default: 14)
#   QDRANT_URL            REST do Qdrant no host (default: http://127.0.0.1:6333)
#   QDRANT_COLLECTIONS    coleções, separadas por espaço (default: core4erp_rag)
#   N8N_DB_NAME           banco do n8n           (default: n8n)
#   RCLONE_REMOTE         se definido (ex.: "b2:core4erp-backups"), copia o backup para fora do
#                         servidor com `rclone copy` (o rclone precisa estar configurado no host)
#
# Segredos NÃO são lidos de arquivo: usuário/banco do Postgres e a API key do Qdrant vêm das envs
# dos próprios containers (docker compose exec). Nada é impresso na saída.
# As expansões entre aspas simples são avaliadas DENTRO dos containers (envs deles), de propósito.
# shellcheck disable=SC2016
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
QDRANT_URL="${QDRANT_URL:-http://127.0.0.1:6333}"
QDRANT_COLLECTIONS="${QDRANT_COLLECTIONS:-core4erp_rag}"
N8N_DB_NAME="${N8N_DB_NAME:-n8n}"
HELPER_IMAGE="alpine:3.22.6"

STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="$BACKUP_DIR/core4erp-$STAMP"

log() { printf '[backup %s] %s\n' "$(date +%H:%M:%S)" "$*"; }
fail() { printf '[backup] ERRO: %s\n' "$*" >&2; exit 1; }

[[ "$BACKUP_RETENTION_DAYS" =~ ^[0-9]+$ ]] || fail "BACKUP_RETENTION_DAYS deve ser inteiro"

cd "$PROJECT_DIR"
umask 077                                  # backups contêm dados pessoais (LGPD): só o dono lê
mkdir -p "$DEST"

# Em caso de falha no meio, não deixa um backup parcial com cara de completo.
QDRANT_HDR=""
cleanup() {
  local rc=$?
  [[ -n "$QDRANT_HDR" ]] && rm -f -- "$QDRANT_HDR"
  if [[ $rc -ne 0 ]]; then mv -- "$DEST" "$DEST.INCOMPLETO" 2>/dev/null || true; fi
}
trap cleanup EXIT

compose() { docker compose "$@"; }

# ── 1. Postgres: ERP ─────────────────────────────────────────────────────────
log "pg_dump do banco do ERP..."
compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' \
  | gzip -9 > "$DEST/core4erp.sql.gz"

# ── 2. Postgres: n8n ─────────────────────────────────────────────────────────
if compose exec -T -e DBN="$N8N_DB_NAME" db \
     sh -c 'psql -U "$POSTGRES_USER" -d postgres -Atc "SELECT datname FROM pg_database" | grep -qx "$DBN"'; then
  log "pg_dump do banco do n8n..."
  compose exec -T -e DBN="$N8N_DB_NAME" db \
    sh -c 'pg_dump -U "$POSTGRES_USER" -d "$DBN" --clean --if-exists' \
    | gzip -9 > "$DEST/n8n.sql.gz"
else
  log "banco '$N8N_DB_NAME' não existe (n8n em SQLite?) — coberto pelo tar do volume n8n_data."
fi

# ── 3. Qdrant: snapshot por coleção ──────────────────────────────────────────
# A api-key vai num arquivo temporário (curl -H @arquivo) para não aparecer no `ps` do host.
QDRANT_HDR="$(mktemp)"
compose exec -T qdrant sh -c 'printf "api-key: %s\n" "${QDRANT__SERVICE__API_KEY:-}"' > "$QDRANT_HDR"
for col in $QDRANT_COLLECTIONS; do
  log "snapshot do Qdrant: coleção $col..."
  resp="$(curl -fsS -X POST -H @"$QDRANT_HDR" "$QDRANT_URL/collections/$col/snapshots?wait=true")" \
    || fail "falha ao criar snapshot da coleção $col"
  snap="$(printf '%s' "$resp" | sed -n 's/.*"name":"\([^"]*\)".*/\1/p')"
  [[ -n "$snap" ]] || fail "resposta inesperada do Qdrant ao criar snapshot de $col"
  curl -fsS -H @"$QDRANT_HDR" -o "$DEST/qdrant-$col.snapshot" \
    "$QDRANT_URL/collections/$col/snapshots/$snap" || fail "falha ao baixar snapshot de $col"
  # Remove o snapshot do disco do Qdrant (a cópia fica no backup).
  curl -fsS -X DELETE -H @"$QDRANT_HDR" "$QDRANT_URL/collections/$col/snapshots/$snap" >/dev/null || true
done

# ── 4. Volume do n8n ─────────────────────────────────────────────────────────
# Contém o config com a chave de criptografia (se não vier de env) e arquivos binários.
# Leitura com o n8n no ar: com DB_TYPE=postgresdb o estado relevante está no dump acima.
log "tar do volume n8n_data..."
docker run --rm --volumes-from n8n:ro "$HELPER_IMAGE" tar czf - -C /home/node/.n8n . \
  > "$DEST/n8n_data.tar.gz"

# ── 5. Integridade ───────────────────────────────────────────────────────────
for f in "$DEST"/*.gz; do gzip -t "$f" || fail "arquivo corrompido: $f"; done
(cd "$DEST" && sha256sum -- * > SHA256SUMS)
log "backup local concluído: $DEST ($(du -sh "$DEST" | cut -f1))"

# ── 6. Off-site (opcional) ───────────────────────────────────────────────────
if [[ -n "${RCLONE_REMOTE:-}" ]]; then
  command -v rclone >/dev/null || fail "RCLONE_REMOTE definido, mas rclone não está instalado"
  log "copiando para $RCLONE_REMOTE ..."
  rclone copy "$DEST" "$RCLONE_REMOTE/core4erp-$STAMP" --quiet
  log "cópia off-site concluída."
fi

# ── 7. Rotação local ─────────────────────────────────────────────────────────
log "removendo backups locais com mais de $BACKUP_RETENTION_DAYS dias..."
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name 'core4erp-*' \
  -mtime +"$BACKUP_RETENTION_DAYS" -exec rm -rf -- {} +

log "fim."
