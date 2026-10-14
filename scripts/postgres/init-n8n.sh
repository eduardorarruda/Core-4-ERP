#!/bin/sh
# Init do Postgres (docker-entrypoint-initdb.d): cria o role e o banco DEDICADOS do n8n.
#
# ATENÇÃO: scripts em /docker-entrypoint-initdb.d só rodam quando o volume de dados está
# VAZIO (primeira subida). Em um volume já existente, aplique o SQL manual do DEPLOY.md
# (seção "n8n — role dedicado no Postgres").
#
# Objetivo (menor privilégio): o n8n NÃO usa mais o usuário do ERP. Ele recebe um role próprio,
# dono apenas do banco `n8n`, e não consegue nem conectar no banco do ERP.
#
# Envs (vindas do docker-compose.yml): POSTGRES_USER, POSTGRES_DB, N8N_DB_USER,
# N8N_DB_PASSWORD, N8N_DB_NAME (default n8n).
set -eu

if [ -z "${N8N_DB_USER:-}" ] || [ -z "${N8N_DB_PASSWORD:-}" ]; then
  echo "init-n8n: N8N_DB_USER/N8N_DB_PASSWORD não definidos — pulando criação do role do n8n." >&2
  exit 0
fi

if [ "$N8N_DB_USER" = "$POSTGRES_USER" ]; then
  echo "init-n8n: N8N_DB_USER não pode ser igual ao usuário do ERP ($POSTGRES_USER)." >&2
  exit 1
fi

# Valores passados como variáveis do psql (:'x' = literal, :"x" = identificador) — o psql
# faz o quoting; nada de concatenar senha em string SQL.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  -v n8n_user="$N8N_DB_USER" \
  -v n8n_pass="$N8N_DB_PASSWORD" \
  -v n8n_db="${N8N_DB_NAME:-n8n}" \
  -v erp_db="$POSTGRES_DB" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD %L',
              :'n8n_user', :'n8n_pass')
 WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'n8n_user') \gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'n8n_db', :'n8n_user')
 WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'n8n_db') \gexec

-- Banco do n8n: só o próprio role conecta.
REVOKE ALL ON DATABASE :"n8n_db" FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE :"n8n_db" TO :"n8n_user";

-- Banco do ERP: ninguém além do dono/superusuário conecta (inclui o role do n8n).
REVOKE CONNECT, TEMPORARY ON DATABASE :"erp_db" FROM PUBLIC;
REVOKE ALL ON DATABASE :"erp_db" FROM :"n8n_user";
SQL

echo "init-n8n: role e banco do n8n prontos; CONNECT no banco do ERP revogado de PUBLIC."
