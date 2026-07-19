# CONTRATOS — Payloads backend ↔ n8n (Áurea)

> **Fonte de verdade** dos contratos de payload trocados entre o backend Spring do Core 4 ERP
> e os workflows do n8n (v2.28.3). Deriva do Anexo A do `Plano_Migracao_n8n.md`.
> Qualquer mudança em request/response de webhook DEVE ser refletida aqui **antes** de ir para produção.
>
> **Princípio inegociável:** o n8n nunca acessa o banco do ERP diretamente. Toda leitura/escrita de
> dado financeiro passa pela API REST do backend, autenticada com o **JWT do usuário** repassado no
> header `Authorization: Bearer`. O n8n é orquestrador; o backend é a única porta para os dados.

---

## Autenticação — dois segredos distintos

| Segredo | Direção | Onde vive | Uso |
|---|---|---|---|
| `N8N_WEBHOOK_SECRET` | backend → n8n | `.env` (server) + credencial Header Auth no n8n | Header `X-Webhook-Secret` em TODO webhook de entrada do n8n. Autentica que quem chamou o webhook é o backend. |
| JWT do usuário | n8n → backend | trafega no corpo do payload (`jwt`) | Repassado como `Authorization: Bearer <jwt>` em cada HTTP Request Tool que chama a API do backend. Preserva RBAC, multi-tenancy e auditoria. |

- **Nunca** logar `N8N_WEBHOOK_SECRET` nem o `jwt` em plaintext (LGPD / segurança).
- O `X-Webhook-Secret` é validado pelo nó de Webhook (Header Auth) OU por um nó Code logo após o
  Webhook (comparação com a credencial). POST sem o header correto → **403**.

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
| `403` | `X-Webhook-Secret` ausente/errado | Loga WARN; **fallback automático** para pipeline interno (`CHAT_ORQUESTRADOR=interno`). |
| `408` / timeout (60s) | Orquestração demorou demais | Fallback interno + log WARN. |
| `500` | Falha não tratada num nó | Fallback interno + log ERROR. Corpo `{ "erro": "mensagem genérica" }`. |
| `503` | OpenAI indisponível dentro do n8n | Fallback interno; mensagem ao usuário "assistente temporariamente indisponível". |

> **Regra de ouro:** qualquer falha do WF-ROUTER **nunca** derruba o chat — o backend cai para o
> pipeline interno (@Tool Java). n8n é aditivo, não crítico.

---

## Contrato 2 — backend → WF-DOC (`POST /webhook/rag-ingest`)

Pré-processamento e vetorização de anexos/textos para o RAG (Qdrant). Evolução do stub atual:
a partir da Fase 2.1 o campo **`empresaId` é OBRIGATÓRIO** (isolamento multi-tenant no vector store).

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
| `texto` | string | sim | Conteúdo a chunkar/embeddar. |
| `tipo` | string | não | `anexo`, `resumo`, `perfil`, … Default `anexo`. Vira metadado do ponto no Qdrant. |
| `fonte` | string | não | Nome do arquivo/origem. Metadado do ponto (rastreabilidade). |
| `empresaId` | number | **sim (Fase 2.1+)** | **Metadado OBRIGATÓRIO** de todo ponto inserido no Qdrant. Sem ele = vazamento cross-tenant. |

**Response body (200)**
```json
{ "ok": true, "chunks": 7 }
```

| Campo | Tipo | Observação |
|---|---|---|
| `ok` | boolean | `true` se a indexação concluiu. |
| `chunks` | number | Quantidade de chunks efetivamente inseridos no Qdrant. |

**Códigos de erro**

| HTTP | Quando | Ação do backend |
|---|---|---|
| `403` | secret inválido | Fallback: usa o texto original sem indexar (padrão já existente). |
| `400` | `texto` vazio ou `empresaId` ausente | Loga; não indexa. Resposta `{ "ok": false, "erro": "empresaId obrigatório" }`. |
| `500` | Falha em Embeddings/Qdrant | Fallback à prova de falha: backend segue com o texto original (não bloqueia o chat). |

> **Compatibilidade:** o backend chama este webhook de forma **síncrona com fallback** (3s/15s).
> Se o n8n não responder no prazo, o backend usa o texto bruto — o upload nunca falha por causa do n8n.

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
- Contratos 2 e 3 já têm ganchos ativos no backend (stubs), evoluídos na **Fase 2**.
- Variáveis de ambiente relacionadas (Anexo B do plano): `N8N_WEBHOOK_SECRET`, `N8N_ENCRYPTION_KEY`,
  `N8N_DB_PASSWORD`, `CHAT_ORQUESTRADOR`.
