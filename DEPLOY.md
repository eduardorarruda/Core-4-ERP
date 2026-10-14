# Deploy — Core 4 ERP (produção)

> Servidor: `root@SEU_SERVIDOR` · Projeto: `/opt/core4erp` · Stack: Docker Compose v2 (`docker compose`)
> Branch de produção: `main`. O servidor **segue a `main`** do GitHub.

## Visão geral

O deploy é feito **no servidor**, a partir do código da branch `main`:

```
push para main (GitHub)  ──►  git pull --ff-only no servidor  ──►  docker compose build  ──►  docker compose up -d
```

O backend é compilado **dentro do container** (Dockerfile multi-stage, `./gradlew bootJar -x test`),
então **não é preciso buildar localmente** para o deploy — basta o código estar na `main`.
Os testes são pulados no build da imagem (`-x test`); rode-os localmente antes do push.

### Serviços

| Serviço | Container | Imagem | Exposição | Redes |
|---|---|---|---|---|
| `db` | `core4erp-db` | `postgres:16-alpine` | nenhuma | data |
| `backend` | `core4erp-backend-1` | build `core4erp/` (Temurin 21 JRE, usuário `app`) | `127.0.0.1:8080` (API). Actuator em **8081, só interno** | app, data, monitoring |
| `frontend` | `core4erp-frontend` | build `front-end/` (`nginxinc/nginx-unprivileged`, porta **8080**) | nenhuma (só via túnel) | edge, app |
| `cloudflared` | `cloudflared` | `cloudflare/cloudflared:2026.10.0` | túnel de saída | edge |
| `qdrant` | `qdrant` | `qdrant/qdrant:v1.18.2` (API key obrigatória) | `127.0.0.1:6333` | app |
| `n8n` | `n8n` | `n8nio/n8n:2.28.3` | `127.0.0.1:5678` (editor via túnel SSH) | app, data |
| `prometheus` | `prometheus` | `prom/prometheus:v3.15.0` | nenhuma | monitoring |
| `alertmanager` | `alertmanager` | `prom/alertmanager:v0.34.1` | nenhuma | monitoring |
| `grafana` | `grafana` | `grafana/grafana:13.0.11` | `127.0.0.1:3001` (via túnel SSH) | monitoring |
| `loki` | `loki` | `grafana/loki:3.6.11` | nenhuma | monitoring |
| `promtail` | `promtail` | `grafana/promtail:3.6.11` | nenhuma | monitoring |

Todas as imagens têm **versão fixada** (nada de `:latest`). Para atualizar, troque a tag no
`docker-compose.yml`/Dockerfile, leia as release notes e faça o deploy normal.

### Segmentação de rede

```
Internet ─► Cloudflare ─► cloudflared ─(edge)─► frontend/nginx ─(app)─► backend ─(data)─► db
                                                                    │  ├─(app)─► qdrant
                                                                    │  └─(app)─► n8n ─(data)─► db (banco n8n)
                                         prometheus ─(monitoring)─► backend:8081/actuator/prometheus
                     grafana ─(monitoring)─► prometheus, loki ◄─ promtail (lê /var/lib/docker/containers :ro)
```

- `data` é `internal: true`: o Postgres não tem rota para a internet.
- O `cloudflared` só enxerga o `frontend`. Ele **não** alcança backend, n8n, Grafana nem Qdrant.
- O Actuator vive na **porta de gestão 8081**, que não é publicada nem roteada pelo nginx: só o
  Prometheus (rede `monitoring`) a acessa. Por isso o scrape é sem token.

### Hardening aplicado a todos os containers

- `security_opt: no-new-privileges:true` em todos;
- `cap_drop: [ALL]` em todos, menos `db` (o entrypoint do Postgres precisa de chown/setuid) e `n8n`;
- `mem_limit` em todos (total ~5,6 GB no pior caso; servidor com 7,9 GB);
- logs `json-file` com rotação (`10m × 5` por container);
- backend e frontend rodam **sem root**; o OTel Java agent tem versão fixa e SHA-256 verificado no build.

---

## Antes do primeiro deploy (checklist)

- [ ] **Contato público real**: trocar o placeholder `noreply@core4erp.com` em
  `front-end/public/.well-known/security.txt` (`Contact:`) e em `front-end/src/content/legal.js`
  (`CONTATO_EMAIL`, encarregado/DPO na Política de Privacidade) por um e-mail lido por uma pessoa.
  Renove também o `Expires:` do `security.txt` (no máximo 1 ano à frente).
- [ ] **E-mail transacional**: com `MAIL_ENABLED=false` (padrão) nada é enviado — recuperação de senha e
  convites ficam inoperantes em produção. Para usá-los, `MAIL_ENABLED=true` + `MAIL_*` válidos (com o
  envio ligado o `/actuator/health` também passa a checar o SMTP).
- [ ] **Rede `edge`**: o `cloudflared` tem IP fixo `172.31.10.10` (sub-rede `172.31.10.0/24`) e é o
  único peer cujo `CF-Connecting-IP` o nginx aceita. Se a sub-rede colidir com outra rede do host,
  troque-a no `docker-compose.yml` **e** o `set_real_ip_from` em `front-end/nginx.conf`.

## Passo a passo

### 1. Local — validar e publicar

```bash
# na raiz do repositório
cd core4erp && ./gradlew test          # rode os testes antes (o build da imagem os pula)
cd ..
git add -A
git commit -m "..."                    # ver convenção de mensagens nos commits existentes
git push origin main
```

> O backend é Java 21 (imagem `eclipse-temurin:21`).

### 2. Servidor — atualizar, construir e subir

O `restart.sh` (na pasta acima do repositório) faz exatamente isto, **sem derrubar nada antes do build**:

```bash
ssh root@SEU_SERVIDOR
cd /opt/core4erp
git pull --ff-only                     # falha (sem estragar nada) se o servidor divergiu da main
git log --oneline -1                   # confirme o commit esperado
docker compose build                   # containers antigos seguem no ar durante o build
docker compose up -d --remove-orphans  # recria só o que mudou
docker compose ps
```

> Se o `git pull --ff-only` falhar, há mudança local no servidor. Investigue com `git status`
> antes de qualquer `git reset --hard` (que descarta mudanças locais não commitadas — o `.env`
> é ignorado pelo Git e **não** é afetado).

Atalhos por componente:

- **Só backend**: `docker compose build backend && docker compose up -d backend`
- **Só frontend**: `docker compose build frontend && docker compose up -d frontend`
- **Monitoramento** (`core4erp/monitoring/...`): arquivos montados por volume, basta reiniciar:
  ```bash
  docker compose restart grafana       # provisioning de dashboards/datasources
  docker compose restart prometheus    # prometheus.yml / alert_rules.yml
  docker compose restart alertmanager  # destinos ALERT_* (após mudar o .env: up -d alertmanager)
  docker compose restart loki promtail # loki-config.yml / promtail-config.yml
  ```

### 3. Verificar

```bash
docker compose ps                                                     # todos Up/healthy
docker compose exec backend wget -qO- http://localhost:8081/actuator/health   # {"status":"UP"}
docker compose logs backend 2>&1 | grep -iE 'Started Core4erpApplication|"ERROR"' | tail
docker compose exec grafana wget -qO- http://loki:3100/ready          # "ready" (Loki não tem healthcheck: imagem distroless)
docker compose exec grafana wget -qO- http://prometheus:9090/api/v1/targets | grep -o '"health":"[a-z]*"'
```

Validação funcional da IA (com login real, observando o log):

```bash
docker compose logs -f backend 2>&1 | grep -E 'CHAT-USAGE|CHAT-AUDIT|CHAT-TOOL-ERRO|CHAT-STREAM'
```

---

## Pós-deploy — smoke test (obrigatório)

Rode **no servidor** após todo deploy. Cada linha diz o resultado esperado.

```bash
# 1) Webhook do n8n SEM o segredo → 403 (Header Auth obrigatório em todos os webhooks)
for w in aurea rag-ingest evento; do
  curl -s -o /dev/null -w "$w sem segredo: %{http_code} (esperado 403)\n" \
    -X POST http://127.0.0.1:5678/webhook/$w -H 'Content-Type: application/json' -d '{}'
done

# 2) Actuator NÃO responde na porta da API (8080) — vive só na 8081 interna
curl -s -o /dev/null -w 'actuator via 8080: %{http_code} (esperado 401/403/404, nunca 200)\n' \
  http://127.0.0.1:8080/actuator/prometheus
curl -s -o /dev/null -w 'actuator via site público: %{http_code} (esperado != 200)\n' \
  https://SEU_DOMINIO/actuator/health

# 3) Cabeçalhos de segurança presentes no site público
curl -sI https://SEU_DOMINIO/ | grep -iE 'content-security-policy|strict-transport-security|x-frame-options|x-content-type-options|referrer-policy|permissions-policy'
curl -sI https://SEU_DOMINIO/ | grep -i '^server:'               # "nginx" SEM versão
curl -sI https://SEU_DOMINIO/contas | grep -i 'x-robots-tag'     # noindex, nofollow
curl -sI https://SEU_DOMINIO/login  | grep -ic 'x-robots-tag'    # 0 (página pública indexável)

# 4) Chat roteado e protegido: sem login → 401/403
curl -s -o /dev/null -w 'chat sem login: %{http_code} (esperado 401/403)\n' -X POST \
  https://SEU_DOMINIO/api/chat/stream -H 'Content-Type: application/json' -d '{"mensagem":"oi"}'

# 5) Qdrant exige API key
curl -s -o /dev/null -w 'qdrant sem key: %{http_code} (esperado 401)\n' http://127.0.0.1:6333/collections

# 6) Grafana e n8n NÃO acessíveis de fora (rodar de OUTRA máquina): conexão recusada/timeout
#    curl -m5 http://IP_DO_SERVIDOR:3001  ;  curl -m5 http://IP_DO_SERVIDOR:5678

# 7) Prometheus coletando o backend e com o Alertmanager conectado
docker compose exec grafana wget -qO- 'http://prometheus:9090/api/v1/query?query=up{job="core4erp"}'   # value "1"
docker compose exec grafana wget -qO- http://prometheus:9090/api/v1/alertmanagers                      # alertmanager:9093
```

Abra o app no navegador com o DevTools aberto: **nenhum erro de CSP** no console (login, dashboard,
chat, upload de anexo, instalação do PWA).

---

## Migração para esta versão (fazer UMA vez no servidor)

Esta versão endurece a stack e muda alguns pontos que exigem ação manual. Ordem sugerida:

1. **Backup completo antes de tudo**: `scripts/backup.sh` (ver seção Backup).
2. **`.env`**: adicione as novas variáveis obrigatórias (ver tabela abaixo). Sem elas o
   `docker compose` recusa subir e diz qual falta.
3. **`N8N_ENCRYPTION_KEY`**: o n8n já tem uma chave gerada no volume. Ela precisa ir para o `.env`,
   senão o n8n não abre as credenciais existentes ("Mismatching encryption keys"):
   ```bash
   docker compose exec n8n sh -c 'grep -o "\"encryptionKey\": *\"[^\"]*\"" /home/node/.n8n/config'
   ```
   Copie o valor para `N8N_ENCRYPTION_KEY=` no `.env` **e** para o cofre fora do servidor.
4. **Role dedicado do n8n no Postgres** (volume já existe → o init script não roda). Ver seção abaixo.
5. **Cloudflare Tunnel**: desligue o túnel do host e ajuste as rotas (seção abaixo).
6. `docker compose build && docker compose up -d --remove-orphans`.
7. **n8n** (editor via túnel SSH): ajuste as credenciais —
   - *Qdrant Core4*: preencher a API key (`QDRANT_API_KEY`);
   - *Postgres n8n* (memória de chat): host `db`, banco `n8n`, usuário `N8N_DB_USER`;
   - *N8N Webhook Secret*: Header Auth, Name `X-Webhook-Secret`, Value = `N8N_WEBHOOK_SECRET`;
   - reimporte `n8n/aurea-workflow.json` ou `n8n/aurea-multiagente-workflow.json` (Webhook agora com
     Header Auth + validação de sessão) e associe a credencial *N8N Webhook Secret* ao nó Webhook.
8. Rode o **smoke test** acima.

### n8n — role dedicado no Postgres

O n8n deixa de usar o usuário do ERP. Em **volume novo** o `scripts/postgres/init-n8n.sh` cria tudo
sozinho. Em **volume existente**, rode uma vez (troque `n8n_app`/senha pelos valores do `.env`, e
`core4erp` pelo `POSTGRES_DB` se for diferente):

```bash
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d postgres'
```
```sql
-- 1) role do n8n (sem superuser, sem createdb/createrole)
CREATE ROLE n8n_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD 'SENHA_DO_N8N_DB_PASSWORD';

-- 2a) banco 'n8n' ainda NÃO existe:
CREATE DATABASE n8n OWNER n8n_app;

-- 2b) banco 'n8n' JÁ existe (criado com o usuário do ERP): transfira a posse do banco e das tabelas.
--     (Não use REASSIGN OWNED: o usuário do ERP é o superusuário de bootstrap da imagem e o
--     Postgres recusa reatribuir objetos do sistema dele.)
ALTER DATABASE n8n OWNER TO n8n_app;
\c n8n
SELECT format('ALTER TABLE public.%I OWNER TO n8n_app', tablename) FROM pg_tables WHERE schemaname = 'public' \gexec
SELECT format('ALTER VIEW public.%I OWNER TO n8n_app', viewname) FROM pg_views WHERE schemaname = 'public' \gexec
\c postgres

-- 3) isolamento: só o n8n conecta no banco dele; ninguém além do dono conecta no ERP
REVOKE ALL ON DATABASE n8n FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE n8n TO n8n_app;
REVOKE CONNECT, TEMPORARY ON DATABASE core4erp FROM PUBLIC;
REVOKE ALL ON DATABASE core4erp FROM n8n_app;
```

> `ALTER TABLE ... OWNER` também transfere as sequences ligadas às colunas (serial/identity).
> No Postgres 16 o schema `public` pertence a `pg_database_owner`, ou seja, ao dono do banco
> (`n8n_app`) — o n8n consegue criar tabelas nas próximas migrations.
> Se o n8n ainda usava SQLite (`N8N_DB_TYPE` vazio), basta criar o role/banco e setar
> `N8N_DB_TYPE=postgresdb` — os workflows precisam ser exportados/importados.

### Cloudflare Tunnel — túnel único e n8n não público

- O túnel agora é **só** o container `cloudflared` (token em `TUNNEL_TOKEN`, obrigatório). Desative o
  serviço do host para não haver dois conectores: `sudo systemctl disable --now cloudflared`.
- No painel (Zero Trust → Networks → Tunnels → *public hostnames*), o hostname do app deve apontar
  para **`http://frontend:8080`** (antes era a porta 80). Sem essa troca o site cai após o deploy.
- **n8n**: o editor do n8n **não pode ser público**. O backend chama os webhooks pela rede interna
  (`http://n8n:5678`), então nenhum hostname público é necessário. Ação recomendada: **remover** o
  public hostname `n8n.SEU_DOMINIO` do túnel. Se ele precisar existir (ex.: webhook externo), proteja
  **todo** o hostname com **Cloudflare Access** (política de e-mail/SSO) e libere só `/webhook/*`
  por uma regra de bypass com Service Token — e, nesse caso, conecte o `cloudflared` a uma rede
  compartilhada com o `n8n` (hoje ele só está na `edge`, de propósito).
- Acesso ao editor do n8n: `ssh -L 5678:127.0.0.1:5678 root@SEU_SERVIDOR` → http://localhost:5678.
  `N8N_SECURE_COOKIE=true` funciona aqui porque o navegador trata `localhost` como contexto seguro.

---

## Acesso a Grafana, n8n e Qdrant (túnel SSH)

Nada administrativo é publicado. Use túnel SSH:

```bash
ssh -L 3001:127.0.0.1:3001 -L 5678:127.0.0.1:5678 -L 6333:127.0.0.1:6333 root@SEU_SERVIDOR
# Grafana: http://localhost:3001  (admin / GRAFANA_PASSWORD)
#   painel "Chat IA — Uso, Custo e Latência" na pasta "Core 4 ERP"; logs no Explore → Loki
#   ({service="backend", level="error"}). traceId/usuarioId/empresaId são metadados (não labels).
# n8n:     http://localhost:5678
# Qdrant:  http://localhost:6333/dashboard (pede a API key)
```

Datasources do Grafana são provisionados como código (`editable: false`).

## Alertas

Regras em `core4erp/monitoring/alert_rules.yml` (InstanciaFora, TaxaErrosAlta como proporção de 5xx,
AltaLatenciaHTTP p95 agregado, PoolConexoesSaturado, heap, CPU, erros do chat). O Prometheus envia ao
`alertmanager`, cujo destino vem do `.env`:

- **E-mail**: `ALERT_EMAIL_TO` (+ `ALERT_SMTP_*`, que herdam `MAIL_*` se vazios);
- **Webhook**: `ALERT_WEBHOOK_URL` (POST JSON — ntfy, ponte para Slack/Discord/Telegram, n8n…).

Sem nenhum destino os alertas só aparecem na UI do Alertmanager (aviso no log do container).
Teste: `docker compose stop backend` → em ~2 min chega o alerta **InstanciaFora**.

## Logs (Loki) e retenção LGPD

- Backend loga **JSON (ECS)** no stdout; o promtail lê os arquivos do Docker (somente leitura, **sem
  docker.sock**) e envia ao Loki. Labels: `service`, `container`, `stream`, `level` (baixa cardinalidade).
- **Retenção: 30 dias** (`retention_period: 720h` + compactor). Logs podem conter dados pessoais
  (IP, ids); o prazo atende investigação de incidentes e minimização (LGPD art. 6º, III e art. 16).
  Execuções do n8n: só erros são guardados, por 7 dias. Métricas do Prometheus: 30 dias.

---

## Variáveis de ambiente

Ficam em `/opt/core4erp/.env` (fora do Git, `chmod 600`). Modelo completo: `.env.example`.
Ao adicionar uma env nova no `docker-compose.yml`, **atualize também o `.env` de produção** antes do `up`.

| Variável | Obrigatória | Para quê / como gerar |
|---|---|---|
| `DB_USERNAME`, `DB_PASSWORD` | sim | Postgres do ERP. Senha: `openssl rand -base64 32` |
| `SECRET_KEY` | sim | JWT HS256. `openssl rand -base64 64` |
| `DATA_ENCRYPTION_KEY` | sim | AES-256 do CPF/CNPJ em repouso. `openssl rand -base64 32`. **Perdeu = dados ilegíveis** |
| `DATA_HMAC_KEY` | sim | Índice cego (busca/unicidade de CPF/CNPJ). `openssl rand -base64 32` (≠ da anterior) |
| `QDRANT_API_KEY` | sim | API key do Qdrant (backend, n8n, backup). `openssl rand -hex 32` |
| `N8N_WEBHOOK_SECRET` | sim | Header `X-Webhook-Secret` backend→n8n. `openssl rand -hex 32` |
| `N8N_ENCRYPTION_KEY` | sim | Cifra as credenciais do n8n. **Guardar fora do servidor** |
| `N8N_DB_USER`, `N8N_DB_PASSWORD` | sim | Role Postgres dedicado do n8n (≠ `DB_USERNAME`) |
| `GRAFANA_PASSWORD` | sim | Admin do Grafana (sem default) |
| `TUNNEL_TOKEN` | sim | Token do Cloudflare Tunnel |
| `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY` | não | JWT Ed25519 (ver abaixo); sem elas, HS256 |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | (chat) | IA |
| `CORS_ORIGINS` | recomendada | Origem pública do front (1º valor = link do e-mail de reset) |
| `MAIL_*` | se `MAIL_ENABLED=true` | SMTP |
| `ALERT_EMAIL_TO`, `ALERT_SMTP_*`, `ALERT_WEBHOOK_URL` | recomendada | Destinos do Alertmanager |
| `NMON_*`, `OTEL_*` | não | Traces OpenTelemetry → Painel EBPÓS |
| `CHAT_ORQUESTRADOR`, `N8N_*` (URLs/host) | não | Ver `.env.example` |

Fixadas no compose (não precisam do `.env`): `SPRING_PROFILES_ACTIVE=prod`, `LOG_FORMAT=json`,
`TRUSTED_PROXY=true` (o backend usa `CF-Connecting-IP` → `X-Real-IP`; seguro porque o backend só
recebe tráfego do nginx, que sobrescreve os dois com o IP resolvido pelo módulo realip — o
`CF-Connecting-IP` do cliente só é aceito quando a conexão vem do `cloudflared`).

> Parâmetros do Spring AI definidos em `application.properties` (ex.: `max-tokens`,
> `stream-usage`, `temperature`) **não** são env vars — vão na imagem no rebuild do backend.

### JWT Ed25519 (opcional)

```bash
openssl genpkey -algorithm ed25519 -out jwt-priv.pem
openssl pkey -in jwt-priv.pem -pubout -out jwt-pub.pem
# PEM multilinha → uma linha com \n literais, entre ASPAS DUPLAS (o compose converte \n em quebra):
printf 'JWT_PRIVATE_KEY="%s"\n' "$(awk 'NF{printf "%s\\n",$0}' jwt-priv.pem)" >> .env
printf 'JWT_PUBLIC_KEY="%s"\n'  "$(awk 'NF{printf "%s\\n",$0}' jwt-pub.pem)"  >> .env
shred -u jwt-priv.pem            # a privada fica só no .env e no cofre
```

Ativar Ed25519 invalida os tokens HS256 emitidos (todos fazem login de novo).

### CSP e scripts inline do `index.html`

A CSP do `front-end/nginx.conf` libera os 2 `<script>` inline do `index.html` (tema e PWA) por
**hash SHA-256**. Se algum deles mudar, recalcule e atualize o `script-src`:

```bash
python3 -c "import re,hashlib,base64;s=open('front-end/index.html').read();[print(\"'sha256-\"+base64.b64encode(hashlib.sha256(m.encode()).digest()).decode()+\"'\") for m in re.findall(r'<script>(.*?)</script>',s,re.S)]"
```

Novas APIs externas chamadas pelo navegador também precisam entrar no `connect-src`.

---

## Backup e restauração

`scripts/backup.sh` gera `backups/core4erp-AAAAMMDD-HHMMSS/` com:
`core4erp.sql.gz` (ERP), `n8n.sql.gz` (n8n), `qdrant-<coleção>.snapshot`, `n8n_data.tar.gz` e
`SHA256SUMS`. Arquivos com permissão `600` (contêm dados pessoais). Falha no meio → diretório
renomeado para `*.INCOMPLETO`. Rotação local por `BACKUP_RETENTION_DAYS` (default 14).
Off-site: defina `RCLONE_REMOTE` (ex.: `b2:core4erp-backups`) com o `rclone` configurado no host.

**Cron** (diário às 03:15, log em arquivo):

```cron
15 3 * * * cd /opt/core4erp && BACKUP_DIR=/var/backups/core4erp RCLONE_REMOTE=b2:core4erp-backups BACKUP_RETENTION_DAYS=14 scripts/backup.sh >> /var/log/core4erp-backup.log 2>&1
```

**Restaurar** (pede confirmação digitando `restaurar`; `--sim` pula):

```bash
scripts/restore.sh /var/backups/core4erp/core4erp-20261013-031500 erp       # banco do ERP
scripts/restore.sh <dir> n8n | qdrant | n8n-data | tudo
```

**RPO/RTO**

- **RPO** (perda máxima): **24 h** com o cron diário. Para reduzir, rode o backup mais vezes
  (ex.: a cada 6 h) — o dump é rápido para o volume atual.
- **RTO** (tempo para voltar): **~30 min** com servidor de pé (restore do dump + subir serviços);
  **~2 h** em servidor novo (instalar Docker, clonar repo, recriar `.env` a partir do cofre,
  baixar backup off-site, `docker compose up`, restaurar `tudo`, smoke test).

**Segredos que NÃO estão no backup** e precisam estar num **cofre fora do servidor** (gerenciador
de senhas da equipe): o `.env` inteiro — em especial `N8N_ENCRYPTION_KEY` (sem ela as credenciais
do n8n restauradas não abrem) e `DATA_ENCRYPTION_KEY`/`DATA_HMAC_KEY` (sem elas CPF/CNPJ
restaurados ficam ilegíveis). Backup sem essas chaves é backup perdido.

**Teste de restauração (mensal, obrigatório)** — em máquina/VM separada, nunca na produção:

1. Clone o repo, copie o `.env` do cofre, baixe o backup mais recente do remoto (`rclone copy`).
2. `docker compose up -d db qdrant` → `scripts/restore.sh <dir> tudo --sim` → `docker compose up -d`.
3. Confira: login funciona; um parceiro mostra o CPF/CNPJ legível; dashboard com números de ontem;
   n8n abre as credenciais sem erro; `points_count` da coleção no Qdrant > 0.
4. Anote data, duração (RTO real) e problemas. Destrua o ambiente de teste.

---

## Rotação de segredos (checklist)

Rode após suspeita de vazamento, saída de alguém da equipe, ou a cada 6–12 meses. Sempre: backup antes,
atualize o **cofre** e o `.env` juntos, depois `docker compose up -d` dos serviços afetados.

- [ ] **`SECRET_KEY`** (JWT): trocar e `up -d backend`. Todos os usuários são deslogados (esperado).
- [ ] **`JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY`** (se em uso): gerar novo par e `up -d backend`. Idem.
- [ ] **`DB_PASSWORD`** (ERP): `ALTER ROLE <DB_USERNAME> PASSWORD '...'` no Postgres → `.env` → `up -d backend`.
- [ ] **`N8N_DB_PASSWORD`**: `ALTER ROLE <N8N_DB_USER> PASSWORD '...'` → `.env` → `up -d n8n`
      (e a credencial *Postgres n8n* no editor, se usar o mesmo role).
- [ ] **`N8N_WEBHOOK_SECRET`**: `.env` → `up -d backend n8n` → no editor do n8n, atualizar a
      credencial *N8N Webhook Secret* (Header Auth). Smoke test 1 deve dar 403 sem o header.
- [ ] **`QDRANT_API_KEY`**: `.env` → `up -d qdrant backend` → credencial *Qdrant Core4* no n8n.
- [ ] **`N8N_ENCRYPTION_KEY`**: **não troque direto** (as credenciais salvas ficam ilegíveis). Exporte
      as credenciais (`n8n export:credentials --decrypted`), troque a chave, reimporte e apague o export.
- [ ] **`DATA_ENCRYPTION_KEY` / `DATA_HMAC_KEY`**: **nunca troque sem um procedimento de
      re-cifragem** dos dados (decifrar com a antiga, cifrar com a nova). Perder ou trocar sem migrar
      = CPF/CNPJ ilegíveis e busca quebrada.
- [ ] **`GRAFANA_PASSWORD`**: trocar pela UI do Grafana (a env só vale na 1ª subida do volume) e no `.env`.
- [ ] **`TUNNEL_TOKEN`**: rotacionar no painel Cloudflare → `.env` → `up -d cloudflared`.
- [ ] **`OPENAI_API_KEY`**, **`MAIL_PASSWORD`**, **`NMON_INGEST_KEY`**: revogar no provedor, gerar
      nova, `.env`, `up -d backend` (e credencial OpenAI do n8n).

---

## Rollback

```bash
cd /opt/core4erp
git log --oneline                      # ache o commit anterior
git checkout <commit-anterior> -- .    # ou: git reset --hard <commit-anterior> (descarta mudanças locais)
docker compose build backend frontend
docker compose up -d backend frontend
```

Migrations são Flyway (versionadas). Reverter código não desfaz uma migration já aplicada —
avalie o impacto antes de voltar uma versão que tenha rodado `V__` novas no banco.

---

## Notas

- Backend publicado só em `127.0.0.1:8080`; acesso externo apenas via `cloudflared` → `frontend` (nginx).
- `mem_limit` do backend: 1500m (`-XX:MaxRAMPercentage=75`). OOM mata o container (`ExitOnOutOfMemoryError`).
- Logs de build do último deploy podem ficar em `/opt/core4erp/deploy-build.log` (não versionado).
- Promtail sem `docker.sock`: containers criados antes desta versão não têm `attrs` no log; eles são
  recriados no primeiro `up -d` e passam a ser coletados.
