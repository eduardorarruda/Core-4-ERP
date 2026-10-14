# CONTRATOS — Payloads backend ↔ n8n (Áurea)

> **Fonte de verdade** dos contratos de payload trocados entre o backend Spring do Core 4
> e os workflows do n8n (v2.28.3). Deriva do Anexo A do `Plano_Migracao_n8n.md`.
> Qualquer mudança em request/response de webhook DEVE ser refletida aqui **antes** de ir para produção.
>
> **Princípio inegociável:** o n8n nunca acessa o banco da aplicação diretamente. Toda leitura/escrita de
> dado financeiro passa pela API REST do backend, autenticada com o **JWT do usuário** repassado no
> header `Authorization: Bearer`. O n8n é orquestrador; o backend é a única porta para os dados.

---

## Autenticação — dois segredos distintos

| Segredo | Direção | Onde vive | Uso |
|---|---|---|---|
| `N8N_WEBHOOK_SECRET` | backend → n8n | `.env` (server) + credencial Header Auth no n8n | Header `X-Webhook-Secret` em TODO webhook de entrada do n8n. Autentica que quem chamou o webhook é o backend. |
| JWT do usuário | n8n → backend | trafega no corpo do payload (`jwt`) | Repassado como `Authorization: Bearer <jwt>` em cada HTTP Request Tool que chama a API do backend. Preserva RBAC, multi-tenancy e auditoria. |

- **Nunca** logar `N8N_WEBHOOK_SECRET` nem o `jwt` em plaintext (LGPD / segurança).
- **`X-Webhook-Secret` é OBRIGATÓRIO em todos os webhooks** (`/aurea`, `/rag-ingest`, `/evento`).
  Não existe mais modo "aberto": `N8N_WEBHOOK_SECRET` é exigido pelo `docker-compose.yml` (o stack
  não sobe sem ele) e todo nó Webhook usa **Header Auth** com a credencial
  `N8N Webhook Secret (X-Webhook-Secret)` (Name = `X-Webhook-Secret`, Value = valor do `.env`).
  POST sem o header ou com valor errado → **403** gerado pelo próprio n8n, antes de qualquer nó rodar.
- Ao importar um workflow, o id `PLACEHOLDER_HEADER_AUTH` precisa ser re-associado à credencial real
  no editor (abrir o nó Webhook → Credential → selecionar). Webhook sem credencial = workflow inválido.
- **Execuções do n8n guardam o payload** (inclusive o `jwt`). Por isso o compose desliga o salvamento
  de execuções de sucesso/manuais/progresso e expurga o restante em 7 dias
  (`EXECUTIONS_DATA_SAVE_ON_SUCCESS=none`, `EXECUTIONS_DATA_MAX_AGE=168`). O JWT continua no item
  do Webhook durante a execução porque cada tool precisa dele.

### Validação de tenant no WF-AUREA (`empresaId`/`usuarioId` não são confiáveis por si só)

O corpo do webhook é montado pelo backend, mas o n8n **não confia cegamente** em `empresaId`,
`usuarioId` e `conversaId`: logo após o Webhook, o workflow valida a sessão contra o backend.

```
Webhook (Header Auth) ──► Validar sessão (auth/me) ──► Sessão confere? ──true──► Roteador / AI Agent
                                                              └──false──► Responder 403
```

1. **Validar sessão (auth/me)** — `GET http://backend:8080/api/auth/me` com
   `Authorization: Bearer <jwt>` e **`X-Empresa-Id: <empresaId do corpo>`**.
   - O `/api/auth/me` devolve o `MeResponseDto` (`id`, `nome`, `email`, `telefone`, `role`,
     `fotoPerfil`, `tipoConta`) — **não** traz a empresa ativa. A checagem de empresa é feita pelo
     `TenantFilter` do backend: com `X-Empresa-Id`, ele responde **403** se o usuário não pertence
     àquela empresa e **401** se está inativo nela. JWT inválido/expirado → 401/403.
   - Opção `neverError` + `fullResponse`: o status volta como dado para o IF decidir.
2. **Sessão confere?** (IF, todas verdadeiras):
   - `statusCode == 200`;
   - `body.id` (usuário do JWT) `==` `usuarioId` do corpo;
   - `empresaId > 0` e `conversaId > 0`.
3. **Responder 403** — `{ "erro": "Sessão inválida ou empresa não corresponde ao usuário." }`.
   O backend trata como falha do n8n e cai para o pipeline interno (ver tabela de erros abaixo).

Além disso, **todas as HTTP Request Tools enviam `X-Empresa-Id` = `empresaId` validado**, para que
as leituras/escritas aconteçam exatamente na empresa conferida (sem o header, o backend usaria a
primeira empresa ativa do usuário, o que divergiria do filtro do RAG para quem tem várias empresas).

> **Admin do sistema:** o `TenantFilter` não exige vínculo para `adminSistema` (acesso a qualquer
> empresa é por design e auditado em log INFO). A validação acima, portanto, garante que o JWT é
> válido e pertence ao `usuarioId` informado; para admin, a empresa é a que ele escolheu na sessão.

---

## Contrato 1 — backend → WF-ROUTER (`POST /webhook/aurea`)

Fluxo principal do chat. O backend delega uma mensagem do usuário para a orquestração multi-agente.

**Headers**
```
Content-Type: application/json
X-Webhook-Secret: <N8N_WEBHOOK_SECRET>
```

**Request body**
```json
{
  "conversaId": 123,
  "usuarioId": 45,
  "empresaId": 6,
  "canal": "ASSISTENTE",
  "mensagem": "paga a conta de luz de julho",
  "pensamentoEstendido": false,
  "jwt": "<token JWT do usuário — repassado no header Authorization de cada tool>"
}
```

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| `conversaId` | number | sim | Chave da memória Postgres do n8n (`key = conversaId`). |
| `usuarioId` | number | sim | Auditoria/roteamento. Nunca usado como filtro de dados (isso é via JWT). |
| `empresaId` | number | sim | Tenant. Usado no filtro do RAG (Qdrant) do ANALISTA. |
| `canal` | string | sim | `ASSISTENTE` ou `BALAO` (V40). |
| `mensagem` | string | sim | Texto do usuário (já sanitizado no backend, teto 4000 chars). |
| `pensamentoEstendido` | boolean | não | Ativa raciocínio estendido no agente quando suportado. Default `false`. |
| `jwt` | string | sim | JWT do usuário. **Único** meio de autenticar as tools contra o backend. |

**Response body (200)**
```json
{
  "resposta": "Prontinho! Baixei a conta de luz de julho (R$ 189,90).",
  "agente": "EXECUTOR",
  "acoes": [
    { "acao": "baixarConta", "id": 789 }
  ]
}
```

| Campo | Tipo | Observação |
|---|---|---|
| `resposta` | string (Markdown) | Texto final ao usuário. Backend persiste em `tb_chat_mensagem` e envia via SSE. |
| `agente` | string | Agente que atendeu: `CONSULTOR` \| `EXECUTOR` \| `CADASTRADOR` \| `ANALISTA` \| `SMALLTALK`. Métrica por agente. |
| `acoes` | array | Opcional. Ações de escrita executadas (para auditoria/telemetria no backend). Pode ser `[]`. |

**Códigos de erro**

| HTTP | Quando | Ação do backend |
|---|---|---|
| `403` | `X-Webhook-Secret` ausente/errado **ou** sessão/empresa não confere (validação `auth/me`) | Loga WARN; **fallback automático** para pipeline interno (`CHAT_ORQUESTRADOR=interno`). |
| `408` / timeout (60s) | Orquestração demorou demais | Fallback interno + log WARN. |
| `500` | Falha não tratada num nó | Fallback interno + log ERROR. Corpo `{ "erro": "mensagem genérica" }`. |
| `503` | OpenAI indisponível dentro do n8n | Fallback interno; mensagem ao usuário "assistente temporariamente indisponível". |

> **Regra de ouro:** qualquer falha do WF-ROUTER **nunca** derruba o chat — o backend cai para o
> pipeline interno (@Tool Java). n8n é aditivo, não crítico.

---

## Contrato 2 — backend → WF-DOC (`POST /webhook/rag-ingest`)

**Pré-processamento** (normalização/validação) de anexos antes da indexação no RAG (Qdrant).
O campo **`empresaId` é OBRIGATÓRIO** (o WF-DOC recusa payload sem tenant).

> **Quem indexa é o backend — uma única vez.** O WF-DOC **não grava no Qdrant**: devolve o texto
> limpo e o backend o indexa via Spring AI (`RagService.indexar`), com `empresaId` no metadado.
> Motivo: a coleção `core4erp_rag` usa o layout de payload do Spring AI (`doc_content` + `empresaId`
> no topo do payload), que é o lido pelo backend **e** pelo `baseConhecimento` do WF-ANALISTA
> (`contentPayloadKey = doc_content`, filtro `key = empresaId`). O insert LangChain do n8n grava
> `content` + `metadata.empresaId` (aninhado) — pontos invisíveis ao filtro por empresa — e, somado
> ao fallback do backend, indexava o mesmo anexo duas vezes. Versão anterior deste contrato
> respondia `{ok, chunks}`; se o backend receber esse formato, registra WARN
> (`evento=n8n.contrato_desatualizado`) e indexa o original — **reimporte o workflow**.

**Headers**
```
Content-Type: application/json
X-Webhook-Secret: <N8N_WEBHOOK_SECRET>
```

**Request body**
```json
{
  "texto": "conteúdo extraído do anexo ou texto a indexar…",
  "tipo": "anexo",
  "fonte": "extrato-julho.pdf",
  "empresaId": 6
}
```

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| `texto` | string | sim | Conteúdo a normalizar (o backend extrai; teto 100.000 chars). |
| `tipo` | string | não | `anexo`, `resumo`, `perfil`, … Default `anexo`. |
| `fonte` | string | não | Nome do arquivo/origem (já sanitizado no backend). |
| `empresaId` | number | **sim** | Tenant. Inteiro > 0; sem ele o WF-DOC responde 400. |

**Response body (200)**
```json
{ "ok": true, "texto": "conteúdo normalizado…", "chars": 1234 }
```

| Campo | Tipo | Observação |
|---|---|---|
| `ok` | boolean | `true` se o pré-processamento concluiu. |
| `texto` | string | Texto normalizado (CRLF→LF, espaços finais removidos, ≥3 quebras → 2). É o que o backend indexa. |
| `chars` | number | Tamanho de `texto` (telemetria). |

**Códigos de erro**

| HTTP | Quando | Ação do backend |
|---|---|---|
| `403` | secret inválido | Fallback: indexa o texto original. |
| `400` | `texto` vazio ou `empresaId` ausente/inválido. Corpo `{ "ok": false, "erro": "empresaId obrigatório" }` | Loga WARN; indexa o texto original. |
| `500` / timeout | Falha no workflow | Fallback à prova de falha: indexa o texto original (não bloqueia o chat). |

> **Compatibilidade:** chamada **síncrona com fallback** (3s conexão / 15s leitura). Em qualquer
> falha o backend indexa o texto bruto — o upload nunca falha por causa do n8n, e em nenhum caminho o
> anexo é indexado mais de uma vez.

---

## Contrato 3 — EventoN8nAspect → WF-EVENTOS (`POST /webhook/evento`)

Disparado por `EventoN8nAspect` (@AfterReturning) em **toda** ação de escrita — tela E IA.
Assíncrono, fire-and-forget (3s/8s). Alimenta automações determinísticas (e-mail, notificação, re-sync RAG).

**Headers**
```
Content-Type: application/json
X-Webhook-Secret: <N8N_WEBHOOK_SECRET>
```

**Request body**
```json
{
  "acao": "ContaService.baixar",
  "detalhe": "conta 789 — Luz Julho",
  "usuarioId": 45,
  "empresaId": 6,
  "origemIa": true,
  "timestamp": "2026-07-18T20:00:00Z"
}
```

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| `acao` | string | sim | Identificador da operação (`Classe.metodo`). Chave do Switch no WF-EVENTOS. |
| `detalhe` | string | não | Resumo curto e **não-sensível** dos args (sem CPF/valores mascarados conforme LGPD). |
| `usuarioId` | number | sim | Autor da ação. |
| `empresaId` | number | sim | Tenant. Usado para marcar a empresa para re-sync RAG incremental. |
| `origemIa` | boolean | **sim (Fase 2.3)** | `true` se a ação partiu da Áurea (via `OrigemIaHolder.isIa()`); `false` se veio da tela. Permite ao workflow ramificar tela × IA. |
| `timestamp` | string (ISO-8601 UTC) | sim | Momento da ação. |

**Response body (200)**
```json
{ "recebido": true, "acao": "ContaService.baixar" }
```

**Códigos de erro**

| HTTP | Quando | Ação do backend |
|---|---|---|
| `403` | secret inválido | Ignora silenciosamente (fire-and-forget); loga WARN. |
| qualquer erro | — | **Não afeta a operação financeira.** O aspecto é fire-and-forget: falha do n8n nunca faz rollback nem propaga exceção ao usuário. |

> Como é fire-and-forget, o corpo da resposta é irrelevante para o backend. O importante é o webhook
> aceitar rápido (< 8s) para não segurar a thread do aspecto.

---

## Notas de implementação

- **Endpoints de tool** (as ~48 @Tool que viram HTTP Request Tools) estão mapeados em
  [`TOOLS_ENDPOINTS.md`](./TOOLS_ENDPOINTS.md).
- O contrato 1 (`/webhook/aurea`) só entra em uso na **Fase 3** (feature-flag `CHAT_ORQUESTRADOR=n8n`).
  Até lá, o chat roda 100% no pipeline interno Java.
- Contratos 2 e 3 estão ativos no backend (`ChatAnexoService` e `EventoN8nAspect`/`N8nEventDispatcher`).
- Variáveis de ambiente relacionadas (todas no `.env.example` da raiz): `N8N_WEBHOOK_SECRET`
  (obrigatória), `N8N_ENCRYPTION_KEY` (obrigatória), `N8N_DB_USER`/`N8N_DB_PASSWORD` (role Postgres
  dedicado, obrigatórias), `QDRANT_API_KEY` (a credencial Qdrant do n8n precisa dela),
  `CHAT_ORQUESTRADOR`.
- **Exclusões pela IA:** o WF-AUREA multi-agente expõe `excluirConta` (`DELETE /api/contas/{id}`) e
  `estornarConta` (`DELETE /api/contas/{id}/baixa`) ao agente EXECUTOR. A exigência de confirmação
  explícita do usuário antes de excluir/estornar está **apenas no prompt** (system message do
  Executor e descrição da tool) — é uma instrução ao LLM, **não** um bloqueio técnico. O que é
  garantido tecnicamente: RBAC do backend (`CONTA_DELETAR`/`CONTA_ESTORNAR` via `@Requer`), tenant
  validado (acima) e auditoria. Ver `TOOLS_ENDPOINTS.md` › "Ferramentas destrutivas".
- **Confirmação técnica só no pipeline interno:** no modo interno (`CHAT_ORQUESTRADOR=interno`, padrão), as tools
  críticas (`@AcaoCritica`: exclusões, estorno, baixa, transferência, aporte/resgate, fechar fatura) passam pelo
  `GateAcaoCriticaAspect` — a 1ª chamada só registra a pendência e devolve "CONFIRMAÇÃO NECESSÁRIA"; executa no
  turno seguinte após o "sim" do usuário, com os mesmos argumentos. Esse portão é um aspecto nas classes `@Tool`
  e **não alcança** o modo n8n, que chama os endpoints REST diretamente com o JWT do usuário: aqui a confirmação
  permanece **em nível de prompt**. Por isso, **recomenda-se `CHAT_ORQUESTRADOR=interno` em produção**; use
  `shadow`/`n8n` apenas em validação controlada.
