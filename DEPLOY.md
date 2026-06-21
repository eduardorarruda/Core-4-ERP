# Deploy — Core 4 ERP (produção)

> Servidor: `root@2.25.197.81` · Projeto: `/opt/core4erp` · Stack: Docker Compose
> Branch de produção: `main`. O servidor **segue a `main`** do GitHub.

## Visão geral

O deploy é feito **no servidor**, a partir do código da branch `main`:

```
push para main (GitHub)  ──►  git reset --hard no servidor  ──►  docker compose build/up
```

O backend é compilado **dentro do container** (Dockerfile multi-stage, `./gradlew bootJar -x test`),
então **não é preciso buildar localmente** para o deploy — basta o código estar na `main`.
Os testes são pulados no build da imagem (`-x test`); rode-os localmente antes do push.

Containers: `core4erp-backend-1`, `core4erp-frontend`, `core4erp-db` (postgres),
`grafana`, `prometheus`, `loki`, `promtail`, `cloudflared`.

---

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

> O backend é Java 17 (imagem `eclipse-temurin:17`). Não use recursos de Java mais novo.

### 2. Servidor — atualizar o código

```bash
ssh root@2.25.197.81
cd /opt/core4erp
git fetch origin main
git reset --hard origin/main           # alinha exatamente com a main publicada
git log --oneline -1                   # confirme o commit esperado
```

> Use `reset --hard` (e não `pull`) para evitar conflitos com arquivos locais do servidor
> (ex.: `deploy.log`, `.env.bak`). **Atenção:** isso descarta mudanças locais não commitadas
> no `/opt/core4erp` — o `.env` de produção é ignorado pelo Git e **não** é afetado.

### 3. Servidor — rebuild e subida

Reconstrua apenas o que mudou:

```bash
# Mudou backend (Java/resources) E/OU frontend (React)?
docker compose build backend frontend
docker compose up -d backend frontend
```

- **Só backend** (Java, `application.properties`): `docker compose build backend && docker compose up -d backend`
- **Só frontend** (`front-end/`): `docker compose build frontend && docker compose up -d frontend`
- **Monitoramento** (`core4erp/monitoring/...`, provisioning do Grafana/Prometheus):
  os arquivos são montados por volume — basta reiniciar, sem rebuild:
  ```bash
  docker compose restart grafana       # provisioning de dashboards/datasources
  docker compose restart prometheus    # prometheus.yml / alert_rules.yml
  ```

### 4. Verificar

```bash
docker compose ps                                              # todos Up/healthy
docker exec core4erp-backend-1 wget -qO- http://localhost:8080/actuator/health   # {"status":"UP"}
docker logs core4erp-backend-1 2>&1 | grep -iE 'Started Core4erpApplication|ERROR|Exception' | tail
```

Smoke test do chat (sem login deve retornar 403, confirmando que está roteado):

```bash
curl -s -o /dev/null -w 'HTTP=%{http_code}\n' -X POST http://localhost:8080/api/chat/stream \
  -H 'Content-Type: application/json' -d '{"mensagem":"oi"}'
```

Validação funcional da IA (com login real, observando o log):

```bash
docker logs -f core4erp-backend-1 2>&1 | grep -E 'CHAT-USAGE|CHAT-AUDIT|CHAT-TOOL-ERRO|CHAT-STREAM'
```

- `[CHAT-USAGE] ... promptTokens=.. completionTokens=..` deve aparecer (depende de
  `spring.ai.openai.chat.options.stream-usage=true`).
- Operação de escrita via streaming deve registrar `[CHAT-AUDIT]` com o e-mail correto.

---

## Variáveis de ambiente

Ficam em `/opt/core4erp/.env` (fora do Git). Ao adicionar uma env nova no `docker-compose.yml`,
**atualize também o `.env` de produção** antes do `up`. Chaves relevantes do chat IA:
`OPENAI_API_KEY`, `OPENAI_MODEL` (padrão `gpt-4o-mini`).

> Parâmetros do Spring AI definidos em `application.properties` (ex.: `max-tokens`,
> `stream-usage`, `temperature`) **não** são env vars — vão na imagem no rebuild do backend.

---

## Rollback

```bash
cd /opt/core4erp
git reset --hard <commit-anterior>     # git log --oneline para achar o hash
docker compose build backend frontend
docker compose up -d backend frontend
```

Migrations são Flyway (versionadas). Reverter código não desfaz uma migration já aplicada —
avalie o impacto antes de voltar uma versão que tenha rodado `V__` novas no banco.

---

## Notas

- Backend exposto só em `127.0.0.1:8080`; acesso externo via `cloudflared` → `frontend` (nginx).
- Grafana: `http://2.25.197.81:3001` (painel **Chat IA — Uso, Custo e Latência** na pasta *Core 4 ERP*).
- `mem_limit` do backend: 1500m (`-XX:MaxRAMPercentage=75`). OOM mata o container (`ExitOnOutOfMemoryError`).
- Logs de build do último deploy ficam em `/opt/core4erp/deploy-build.log` (não versionado).
