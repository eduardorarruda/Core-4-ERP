# Plano Tático — Migração do Fluxo de IA (Áurea) para o n8n

> **Documento de execução.** Gerado em 18/07/2026 a partir de auditoria ponta a ponta do código
> (`core4erp/src/main/java/br/com/core4erp/chat/`) e do servidor de produção (2.25.197.81,
> `/opt/core4erp`). Serve como guia definitivo para que uma instância do Claude (ou um dev)
> execute a construção técnica e os deploys fase a fase, sem depender de contexto externo.
>
> **Princípio inegociável herdado do projeto** (decisão registrada em `McpServerConfig.java:22-25`
> e na memória do projeto): o `TenantContext` NÃO atravessa transporte HTTP. Portanto, **o n8n
> nunca acessa o banco do ERP diretamente e nunca executa lógica de negócio própria** — toda
> leitura/escrita de dados financeiros passa pela API REST do backend, autenticada com o JWT do
> usuário, preservando RBAC (`@Requer`), `DtoValidator`, multi-tenancy e auditoria. O n8n é o
> **orquestrador**; o backend continua sendo a **única porta para os dados**.

---

## Sumário

- [Parte 1 — Auditoria de Ambiente e Ferramentas (o que existe, o que falta)](#parte-1)
- [Parte 2 — Análise de Melhoria (gargalos e otimizações)](#parte-2)
- [Parte 3 — Arquitetura no n8n (nós, gatilhos, integrações)](#parte-3)
- [Parte 4 — Separação por Agentes (papéis e prompts de sistema)](#parte-4)
- [Parte 5 — Manual de Execução passo a passo (Fases 0–4)](#parte-5)
- [Anexos — contratos de payload, variáveis, riscos e rollback](#anexos)

---

<a name="parte-1"></a>
## Parte 1 — Auditoria de Ambiente e Ferramentas

### 1.1 Estado atual do fluxo de IA (código)

**Pipeline de uma mensagem** (in-process, Spring AI function-calling):

```
POST /api/chat[/stream] (ChatController L58/L81)
  → ChatService.processar[Stream]
      ├─ ChatMetrics (mensagens, tokens, custo USD, p95)
      ├─ ChatConversaService.resolverOuCriar (tb_chat_conversa)
      ├─ SystemPromptBuilder.build  ...................... ~12.086 chars (~3.0–3.8k tokens)
      ├─ ChatInputSanitizer (teto 4000 chars na mensagem)
      ├─ RagService.recuperarContexto ................... Qdrant, topK=4, filtro empresaId
      ├─ ChatMemoryService.carregarContexto ............. 20 msgs / 8.000 chars
      ├─ ChatClient (gpt-4o-mini, temp 0.1, max-tokens 3072)
      │    └─ .tools(5 classes = 48 @Tool / 135 @ToolParam) ← TODAS em TODA mensagem
      │         └─ tools chamam services direto (DtoValidator + exigirPermissao na porta)
      │              └─ registrarConta/LancamentoCartao s/ categoria → 2ª chamada LLM
      │                 aninhada (ClassificacaoIaService)
      ├─ SSE streaming (pool fixo 16 threads, emitter 120s)
      ├─ tb_chat_mensagem (persistência) + tb_chat_auditoria (REQUIRES_NEW)
      └─ EventoN8nAspect → N8nEventDispatcher → POST n8n /webhook/evento (async, fire-and-forget)
```

**Inventário de tools — 48 @Tool em 5 classes** (14 leitura / 34 escrita):

| Classe | Qtde | Conteúdo |
|---|---|---|
| `ConsultaTools` | 8 (8R) | dashboard, contas correntes, categorias, cartões, investimentos, notificações, assinaturas, parceiros |
| `LancamentoTools` | 9 (1R/8W) | registrarConta, registrarLancamentoCartao, transferir, baixar, transacaoInvestimento, consultarContas, atualizar/excluir/estornarConta |
| `GestaoFinanceiraTools` | 24 (4R/20W) | CRUD por NOME de conta corrente, cartão, lançamento, assinatura, categoria, parceiro, investimento, tipos; fecharFatura; consultas de gastos |
| `CadastroTools` | 6 (1R/5W) | registrarParceiro(s), registrarCategoria(s), atualizarTipoParceiro, consultarCnpj (BrasilAPI) |
| `RelatorioTools` | 1 (1W) | gerarRelatorioExcel (URL via RelatorioDownloadHolder) |

**Integração n8n já existente (2 ganchos, ambos com fallback à prova de falha):**

| Gancho | Direção | Modo | Workflow atual |
|---|---|---|---|
| `chat.n8n.webhook-url` → `/webhook/rag-ingest` | backend→n8n | síncrono (3s/15s), fallback = texto original | `ragingestwf00001` — **stub** (normaliza whitespace) |
| `chat.n8n.eventos-webhook-url` → `/webhook/evento` | backend→n8n | assíncrono fire-and-forget (3s/8s) | `eventowf00000001` — **stub** (loga e responde) |

O `EventoN8nAspect` (@AfterReturning na camada de service) já envia `{acao, usuarioId, empresaId, origem, timestamp}` para **toda** ação de escrita — tela E IA. É a fundação pronta do "Agente de Automação" (Parte 4).

### 1.2 Estado atual do servidor (produção, 18/07/2026)

| Item | Estado | Veredicto p/ migração |
|---|---|---|
| RAM | 7,9 GB total, **4,8 GB livres**, swap **0** | OK para crescer; criar swap como colchão |
| n8n | v2.28.3, imagem `latest`, **SQLite**, **sem mem_limit**, 395 MiB | ⚠️ 3 pré-requisitos na Fase 0 |
| n8n exposição | 127.0.0.1 + Cloudflare Tunnel → https://n8n.core4erp.codes (HTTP 200) | OK |
| Qdrant | v1.18.2, coleção `core4erp_rag`, 186 pontos, dim 1536, green | Reaproveitável direto pelos nós de vector store |
| Postgres | postgres:16 do compose, banco `core4erp` em uso (34 tabelas), interno | OK — recebe também o banco do n8n (Fase 0) |
| Backend | healthy, 607 MiB/1,5 GB | OK |
| OpenAI 429 | **zero nas últimas 48h** | Correções de 16/07 seguraram |

### 1.3 ⚠️ AUSÊNCIAS DETECTADAS (reporte obrigatório da auditoria)

Nada aqui impede a migração, mas **tudo aqui precisa ser resolvido nas fases indicadas**:

| # | Ausência | Impacto | Fase |
|---|---|---|---|
| A1 | **Webhooks n8n sem autenticação** — `/webhook/rag-ingest` e `/webhook/evento` aceitam POST de qualquer origem interna; payload sem assinatura | Qualquer processo na rede docker injeta eventos falsos | Fase 0 |
| A2 | **n8n em SQLite + imagem `latest` + sem `mem_limit`** | Perda de execuções em crash; drift de versão; risco de OOM no host | Fase 0 |
| A3 | **`N8N_ENCRYPTION_KEY` não gerida no `.env`** (vive só no volume) | Perder o volume = perder TODAS as credenciais salvas no n8n | Fase 0 |
| A4 | **JwtFilter: confirmar se aceita `Authorization: Bearer`** além do cookie httpOnly — o n8n vai chamar a API do backend com header, não com cookie | Sem isso, NENHUMA chamada n8n→backend autentica | Fase 1 (passo 1.1 valida; ajuste pequeno se necessário) |
| A5 | **Sem token de serviço backend↔n8n** — `N8N_WEBHOOK_SECRET` inexistente nos dois lados | Mesmo problema de A1, sentido inverso | Fase 0/1 |
| A6 | **Sem endpoint de orquestração** — `ChatService` não tem caminho "delegar ao n8n"; falta feature-flag `CHAT_ORQUESTRADOR` | Necessário p/ shadow-mode e rollback instantâneo | Fase 3 |
| A7 | **Credenciais OpenAI/Qdrant/Postgres não cadastradas no n8n** (auditoria confirmou zero credenciais) | Nós de IA não funcionam sem elas | Fase 1 |
| A8 | **Bug ativo**: `LazyInitializationException` no `RagSincronizacaoService` (scheduler 06:30, empresaId=6) — proxy lazy de `Categoria#61` fora de sessão | RAG da empresa 6 desatualizado desde então | Fase 0 (independe da migração) |
| A9 | **Bug ativo**: SMTP `SocketTimeoutException` intermitente na autenticação | E-mails falhando às vezes | Fase 0 (backlog; não bloqueia) |
| A10 | **Métrica de custo desalinhada**: `application.properties` L95-96 usa preço de gpt-4o ($2.50/$10.00 por M) com modelo default gpt-4o-mini | Dashboards de custo superestimados ~16× | Fase 0 (1 linha) |
| A11 | **Grafana em `0.0.0.0:3001` e nmon-web em `0.0.0.0:8095`** — abertos à internet se não houver firewall | Superfície de ataque fora do escopo core4erp | Fase 0 (validar firewall/`ufw`) |
| A12 | **Streaming SSE**: o n8n responde webhooks de uma vez; streaming token-a-token nativo só existe no Chat Trigger/AI Agent em modo streaming (validar na v2.28.3) | UX de "digitando" pode regredir | Fase 3 decide (plano B documentado) |

---

<a name="parte-2"></a>
## Parte 2 — Análise de Melhoria (gargalos → otimizações)

| # | Gargalo (evidência) | Otimização proposta | Onde resolve |
|---|---|---|---|
| G1 | **48 tools enviadas em toda mensagem** (ChatService L169/245) — definições de 48 tools + 135 params inflam cada request; gpt-4o-mini opera confiável com ~15-20 tools | **Separação por agentes**: cada agente n8n recebe só o subconjunto do seu domínio (8–14 tools). O roteador decide qual agente atende | Parte 4 |
| G2 | **Chamada LLM aninhada** (ClassificacaoIaService dentro de registrarConta/LancamentoCartao) — 2ª chamada síncrona dentro do function-calling; multiplica em lote | No n8n, a classificação vira **nó explícito do fluxo** (1 chamada barata em paralelo, ou em lote único para N itens de um extrato) — sai de "dentro" da tool | Fase 3, workflow WF-EXEC |
| G3 | **System prompt monolítico ~12k chars** reconstruído a cada mensagem, cobrindo TODOS os domínios | Prompts por agente: 1,5–3k chars cada, só as regras do domínio. O total enviado por mensagem CAI mesmo com mais agentes, porque só 1-2 agentes rodam por request | Parte 4 |
| G4 | **Anexo síncrono no request HTTP** (`preprocessarComN8n` bloqueante 15s; extração + embeddings na mesma requisição) | Pipeline assíncrono no n8n: backend enfileira → n8n extrai/normaliza/chunka/embeda → callback. Usuário recebe "estou lendo o arquivo…" imediato | Fase 2, WF-DOC |
| G5 | **Pool fixo de 16 threads + SSE 120s** — tools bloqueantes seguram threads | Orquestração longa passa a viver no n8n (fila própria, `EXECUTIONS_MODE` interno); backend só faz proxy do resultado | Fase 3 |
| G6 | **Resolução por nome repete full-list** (acharX com PageRequest 0..500 em GestaoFinanceiraTools, por operação) | Agente recebe do roteador o contexto já resolvido; nós "Buscar por nome" com cache de execução (Set node) dentro do workflow; futuramente endpoint `GET /api/.../buscar?nome=` paginado | Fase 3 |
| G7 | **Histórico 20 msgs/8k chars** duplo-cortado, sem sumarização | Memória do n8n (Postgres Chat Memory, key = `conversaId`) + nó de **sumarização** quando estourar janela (resumo vira 1 mensagem de sistema) — histórico longo sem estourar tokens | Fase 3 |
| G8 | **RAG injeta contexto em TODA mensagem** (mesmo "oi, bom dia") | Roteador decide: só o Agente Consultor/Analista recebe retrieval; small talk nem toca no Qdrant | Parte 4 |
| G9 | **Eventos n8n sem payload útil** (`detalhe=null`, sem args, não distingue tela×IA) | Enriquecer payload do `EventoN8nAspect` (detalhe = toString curto dos args não-sensíveis + flag `origemIa`) para o Agente de Automação ramificar de verdade | Fase 2 |
| G10 | **Custo por mensagem não segmentado** | n8n registra execuções por workflow/agente → custo e latência POR AGENTE de graça no painel de execuções; manter ChatMetrics no backend como agregado | Fase 3 |

**O que NÃO mudar (aprendizado do projeto, não regredir):**
- `temperature=0.1` (correta para função financeira).
- Cálculo líquido de cartão `SUM(SAIDA) − SUM(ENTRADA)` — está correto no backend.
- Guardrails da classificação (revalidação do id no catálogo da empresa, confiança ≥ 0.5).
- Fallbacks à prova de falha: n8n fora do ar **nunca** pode derrubar operação financeira.
- Parceiro obrigatório em lançamento de cartão — regra de negócio deliberada.

---

<a name="parte-3"></a>
## Parte 3 — Arquitetura no n8n

### 3.1 Visão geral

```
Usuário (front.core4erp.codes)
   │  POST /api/chat/stream (cookie JWT)            ← NADA muda para o frontend
   ▼
Backend Spring (porta de dados + auth + SSE)
   │  feature-flag CHAT_ORQUESTRADOR = interno | n8n
   │  se n8n:  POST http://n8n:5678/webhook/aurea
   │           headers: X-Webhook-Secret, Authorization: Bearer <JWT do usuário>
   │           body: {conversaId, usuarioId, empresaId, mensagem, canal, pensamentoEstendido}
   ▼
n8n — WF-ROUTER (Webhook trigger, Header Auth)
   ├─ [Nó] Validar secret + payload
   ├─ [AI Agent] AGENTE ROTEADOR (gpt-4o-mini, sem tools, saída estruturada)
   │      → {agente: CONSULTOR|EXECUTOR|CADASTRADOR|ANALISTA|SMALLTALK, resumoIntencao}
   ├─ [Switch] por agente
   │      ├─ WF-CONSULTA  (Execute Workflow) ── tools de leitura → API backend (JWT repassado)
   │      ├─ WF-EXEC      (Execute Workflow) ── tools de escrita → API backend (JWT repassado)
   │      │       └─ [AI Agent] AGENTE REVISOR valida payload ANTES do POST de escrita
   │      ├─ WF-CADASTRO  (Execute Workflow) ── parceiros/categorias + BrasilAPI (CNPJ)
   │      ├─ WF-ANALISTA  (Execute Workflow) ── RAG (Qdrant Vector Store) + relatórios
   │      └─ [Nó] Resposta direta (small talk, sem tool nem RAG)
   ├─ [Postgres Chat Memory] key = conversaId (todos os agentes compartilham)
   └─ [Respond to Webhook] → backend → persiste tb_chat_mensagem → SSE ao usuário

Fluxos paralelos (independentes do chat):
   WF-DOC     ← /webhook/rag-ingest (anexos: extrair → normalizar → chunkar → embeddar → Qdrant)
   WF-EVENTOS ← /webhook/evento (EventoN8nAspect: automações por ação — notificação, e-mail, RAG incremental)
```

### 3.2 Decisões de arquitetura (com justificativa)

**D1 — Backend permanece como gateway (frontend não fala com n8n).**
Auth por cookie httpOnly, rate-limit, CORS, persistência de `tb_chat_mensagem`/`tb_chat_conversa`,
auditoria e SSE ficam onde já funcionam. O n8n é chamado internamente (`http://n8n:5678`), rede
docker, nunca exposto ao usuário final. Rollback = trocar a flag.

**D2 — Tenancy resolvido por repasse de JWT (a única solução segura).**
O n8n recebe o JWT do usuário no header e o repassa em TODA chamada HTTP-tool ao backend.
O backend valida como qualquer request (JwtFilter → TenantFilter → TenantContext → `@Requer`).
Resultado: as 4 camadas de segurança (RBAC, DtoValidator, isolamento por empresaId, auditoria
`is_ai_action`) são preservadas **sem reimplementar nada no n8n**. É exatamente o motivo pelo qual
a Fase 2 do MCP foi descartada — aqui o problema não existe porque cada chamada é uma requisição
HTTP autenticada normal.

**D3 — Tools do n8n = endpoints REST existentes.**
Cada "tool" dos agentes é um nó **HTTP Request Tool** apontando para `http://backend:8080/api/...`.
Os 48 @Tool atuais são quase todos espelho de endpoints que JÁ existem (controllers de conta,
cartão, parceiro, categoria, etc.). Ganho: contrato documentado (SpringDoc), validação `@Valid`
do MVC volta a valer, e o `DtoValidator` continua por baixo.

**D4 — Os @Tool Java NÃO são deletados na migração.**
Ficam como caminho `CHAT_ORQUESTRADOR=interno` (fallback/rollback) até a Fase 4 estabilizar.
Só então remove-se código morto.

**D5 — n8n ganha banco Postgres próprio** (database `n8n` no postgres:16 do compose) — execuções
persistentes, sem SQLite em produção.

**D6 — Streaming**: validar na Fase 3 o modo de resposta streaming do AI Agent (n8n ≥ 2.x).
Plano B (aceitável e simples): backend mantém o SSE com estados de progresso
("Consultando suas contas…", "Registrando…") emitidos a partir de callbacks intermediários do
n8n, e o texto final chega de uma vez. Plano C: manter streaming interno apenas para respostas
sem tools.

### 3.3 Nós e integrações por workflow

| Workflow | Trigger | Nós principais | Credenciais |
|---|---|---|---|
| **WF-ROUTER** | Webhook `POST /webhook/aurea` (Header Auth `X-Webhook-Secret`) | Code (validação), AI Agent (roteador, saída estruturada), Switch, Execute Workflow ×4, Respond to Webhook | OpenAI |
| **WF-CONSULTA** | Execute Workflow Trigger | AI Agent + 8-10 HTTP Request Tools (GET /api/dashboard, /api/contas, /api/cartoes…), Postgres Chat Memory | OpenAI, Postgres(n8n), HeaderAuth backend |
| **WF-EXEC** | Execute Workflow Trigger | AI Agent (montar payload) → AI Agent REVISOR (validar) → IF aprovado → HTTP Request (POST/PUT) → Code (formatar confirmação) | OpenAI, Postgres(n8n) |
| **WF-CADASTRO** | Execute Workflow Trigger | AI Agent + HTTP Tools (/api/parceiros, /api/categorias, BrasilAPI `https://brasilapi.com.br/api/cnpj/v1/{cnpj}`) | OpenAI |
| **WF-ANALISTA** | Execute Workflow Trigger | Qdrant Vector Store (retrieval, filtro `empresaId`!), Embeddings OpenAI (`text-embedding-3-small`), AI Agent, HTTP Tool relatórios | OpenAI, Qdrant |
| **WF-DOC** | Webhook `/webhook/rag-ingest` (Header Auth) | Extract from File / Code (normalizar), Text Splitter (chunk 1000), Embeddings OpenAI, Qdrant insert (metadado `empresaId`), Respond | OpenAI, Qdrant |
| **WF-EVENTOS** | Webhook `/webhook/evento` (Header Auth) | Switch por `acao` → ramos: e-mail (SMTP), notificação (POST /api/notificacoes interno), marca RAG stale | SMTP |

> **Regra de ouro do Qdrant no n8n:** TODO retrieval e TODO insert usam o filtro/metadado
> `empresaId` — mesmo padrão do `RagService.java:107`. Um nó de vector store sem esse filtro é
> falha crítica de segurança (vazamento cross-tenant). Revisar isso é item de checklist de TODA
> mudança nos WF-ANALISTA e WF-DOC.

---

<a name="parte-4"></a>
## Parte 4 — Separação por Agentes

Cinco agentes + um revisor embutido. Modelo default `gpt-4o-mini` para todos (custo), com upgrade
pontual do EXECUTOR/REVISOR para `gpt-4o` se a taxa de erro de payload justificar (decisão de
custo do dono do projeto — medir na Fase 3 antes de subir).

Regras comuns a TODOS os prompts (incluir no topo de cada um):
```
Você faz parte da Áurea, assistente financeira do Core 4 ERP. Responda sempre em
português brasileiro, tom profissional e amigável, valores em R$ (1.234,56) e datas
em dd/MM/yyyy. NUNCA invente números: todo valor financeiro citado deve vir de uma
ferramenta chamada NESTA resposta. NUNCA exponha termos técnicos (IDs internos,
nomes de tabelas, exceções, códigos de permissão) ao usuário. Se uma ferramenta
retornar erro de permissão, explique que o usuário não tem acesso e oriente a falar
com o administrador. Hoje é {{ $now.format('dd/MM/yyyy') }}.
```

### 4.1 AGENTE ROTEADOR (WF-ROUTER) — sem tools
**Papel:** classificar a intenção e despachar para 1 agente. Nunca responde conteúdo financeiro.
**Saída estruturada:** `{"agente": "...", "resumoIntencao": "...", "entidades": {...}}`

```
Você é o roteador interno da Áurea. Sua ÚNICA função é classificar a mensagem do
usuário e escolher qual agente especializado deve atendê-la. Não responda ao usuário.

Agentes disponíveis:
- CONSULTOR: perguntas de leitura — saldos, extratos, contas a pagar/receber,
  faturas de cartão, investimentos, assinaturas, notificações. "Quanto…", "Liste…",
  "Qual o saldo…".
- EXECUTOR: ações que alteram dados — registrar/baixar/estornar conta, lançar
  compra no cartão, transferir entre contas, fechar fatura, registrar aporte.
- CADASTRADOR: criar/editar parceiros, categorias, contas correntes, cartões,
  assinaturas; consultas de CNPJ.
- ANALISTA: análises comparativas e históricas ("compare meus gastos", "como evoluiu"),
  relatórios em Excel, perguntas sobre documentos/anexos enviados.
- SMALLTALK: saudações, agradecimentos, perguntas sobre o que a Áurea sabe fazer.

Regras:
1. Uma mensagem com leitura E escrita ("paga a conta de luz e me diz quanto sobra")
   vai para EXECUTOR — ele consulta o que precisar depois de agir.
2. Extraia entidades óbvias (valores, datas, nomes de parceiro/categoria/cartão) em
   "entidades" para o próximo agente não re-perguntar.
3. Em dúvida entre CONSULTOR e ANALISTA: pergunta pontual → CONSULTOR;
   comparação/tendência/documento → ANALISTA.
4. Responda APENAS o JSON no formato combinado.
```

### 4.2 AGENTE CONSULTOR (WF-CONSULTA) — tools de leitura (~10)
Tools (HTTP GET): dashboard, contas (com filtros), contas correntes, cartões, lançamentos de
fatura, gastos por cartão/conta, categorias, parceiros, investimentos, assinaturas, notificações.

```
Você é o Consultor da Áurea: responde perguntas de LEITURA sobre a vida financeira
do usuário chamando as ferramentas de consulta. Você NÃO altera nada.

Regras:
1. SEMPRE chame a ferramenta adequada antes de citar qualquer número — mesmo que a
   resposta pareça óbvia pelo histórico. Números do histórico podem estar defasados.
2. Cartão de crédito tem lançamentos de SAÍDA (compras) e ENTRADA (estornos,
   pagamentos, cashback). Totais de fatura são LÍQUIDOS: saídas menos entradas.
   Nunca some entradas como gasto.
3. Contas "PENDENTE" são previsão (fluxo de caixa); só "BAIXADA" compõe saldo real.
   Deixe essa distinção clara quando relevante.
4. Se a consulta retornar vazio, diga claramente que não há registros no período —
   não preencha com suposições.
5. Se o usuário pedir uma AÇÃO (pagar, registrar, transferir), responda que vai
   encaminhar e devolva controle ao roteador com a flag "encaminhar: EXECUTOR".
6. Formate listas longas em tabelas Markdown compactas (máx. 15 linhas; ofereça
   "quer ver o restante?" se houver mais).
```

### 4.3 AGENTE EXECUTOR (WF-EXEC) — tools de escrita financeiras (~12)
Tools (HTTP POST/PUT): registrar/atualizar/excluir/baixar/estornar conta, lançar no cartão,
transferir, fechar fatura, transação de investimento + leitura mínima (consultarContas,
consultarCategorias, consultarParceiros, consultarCartoes) para resolver IDs.

```
Você é o Executor da Áurea: realiza operações que ALTERAM dados financeiros.
Precisão vem antes de velocidade.

Regras:
1. NUNCA execute uma escrita com dados incompletos ou ambíguos. Falta valor, data,
   conta ou parceiro? PERGUNTE. Dois cartões com nome parecido? LISTE e peça escolha.
2. Lançamento de cartão: exige parceiro e categoria. Compra/gasto → tipo SAIDA;
   estorno/pagamento/cashback → tipo ENTRADA. Na dúvida sobre o tipo, pergunte.
3. Antes de qualquer escrita, monte um resumo da operação (o quê, quanto, quando,
   onde) e envie ao Revisor. Só execute com aprovação dele.
4. Operações IRREVERSÍVEIS ou de alto valor (exclusões; estornos; transferências;
   valores acima de R$ 5.000): além do Revisor, CONFIRME com o usuário antes
   ("Confirmo a transferência de R$ X da conta A para a B?") — a menos que a
   mensagem já seja uma confirmação explícita dessa mesma operação.
5. Após executar, responda com confirmação objetiva: o que foi feito, valor, data e
   saldo/situação resultante quando a ferramenta retornar.
6. Se a ferramenta retornar erro de validação, traduza para linguagem simples e
   oriente o que falta — nunca repasse o erro técnico.
7. Categoria não informada: use a ferramenta de sugestão de categoria; se a sugestão
   vier vazia ou fraca, pergunte ao usuário. Nunca chute categoria.
```

### 4.4 AGENTE REVISOR (nó dentro do WF-EXEC) — sem tools, saída estruturada
**Papel:** gate de qualidade ANTES do POST. Recebe `{operacao, payload, mensagemOriginalUsuario}`.
**Saída:** `{"aprovado": true|false, "motivo": "...", "correcoes": {...}}`

```
Você é o Revisor de operações financeiras da Áurea. Recebe uma operação prestes a
ser executada e o pedido original do usuário. Seu papel é REPROVAR quando houver
qualquer inconsistência. Você não conversa com o usuário.

Cheque friamente:
1. O payload corresponde EXATAMENTE ao que o usuário pediu? (valor, data, sentido
   da operação, conta/cartão certo, parcelas)
2. Valor: positivo, plausível, sem erro de ordem de grandeza (R$ 50 ≠ R$ 5.000)?
   Vírgula/ponto interpretados corretamente (padrão brasileiro: 1.234,56)?
3. Data: existe, faz sentido (não é 1970 nem daqui a 10 anos sem o usuário pedir)?
4. Cartão: o tipo (SAIDA/ENTRADA) condiz com a intenção (compra × estorno)?
5. Exclusão/estorno: o usuário pediu ISSO explicitamente?
6. Campos obrigatórios presentes (parceiro e categoria em cartão; conta em baixa)?
Se reprovar, aponte o campo exato e a correção sugerida. Na dúvida, REPROVE —
falso alarme custa uma pergunta; erro executado custa dinheiro do usuário.
```

### 4.5 AGENTE CADASTRADOR (WF-CADASTRO) — tools de cadastro (~10)
Tools: registrarParceiro(s), atualizarParceiro/Tipo, registrarCategoria(s), atualizar/excluir
categoria, registrar/atualizar conta corrente, cartão, assinatura, consultarCnpj (BrasilAPI).

```
Você é o Cadastrador da Áurea: cria e mantém os cadastros-base (parceiros,
categorias, contas correntes, cartões, assinaturas).

Regras:
1. Parceiro SEMPRE exige CPF ou CNPJ válido. Se o usuário der um CNPJ, PRIMEIRO
   consulte-o na ferramenta de CNPJ e use razão social, endereço e demais dados
   retornados para preencher o cadastro — confirme com o usuário antes de salvar
   ("Encontrei: ACME LTDA, São Paulo/SP. Cadastro?"). Se a consulta falhar, siga
   com os dados informados pelo usuário.
2. Antes de criar, VERIFIQUE se já existe cadastro igual/similar (consulta por
   nome). Existindo, pergunte se é o mesmo — nunca duplique.
3. Categorias têm no máximo 2 níveis (categoria → subcategoria). Ao criar
   subcategoria, confirme qual é a categoria-pai.
4. Cadastro em lote (ex.: várias categorias de uma vez): use a ferramenta de lote
   em UMA chamada, não N chamadas individuais.
5. Exclusões: itens usados em lançamentos não podem ser excluídos — explique que
   serão desativados (deixam de aparecer, histórico preservado).
```

### 4.6 AGENTE ANALISTA (WF-ANALISTA) — RAG + relatórios (~6 tools)
Tools: retrieval Qdrant (filtro `empresaId`), gerarRelatorioExcel, consultas agregadas
(dashboard, gastos por categoria/período, DRE).

```
Você é o Analista da Áurea: responde análises comparativas, tendências e perguntas
sobre documentos enviados, e gera relatórios.

Regras:
1. O material recuperado da base de conhecimento (RAG) serve para CONTEXTO
   HISTÓRICO e conteúdo de documentos — NUNCA como fonte de números atuais.
   Qualquer valor corrente citado deve vir de uma ferramenta de consulta chamada
   NESTA resposta.
2. Comparações: explicite o critério (regime de competência × caixa; período
   exato comparado) para o usuário saber o que está vendo.
3. Relatório Excel: gere apenas quando o usuário pedir arquivo/planilha/exportação.
   Entregue o link retornado pela ferramenta — NUNCA invente ou reescreva URLs.
4. Análises devem terminar com 1-2 insights acionáveis ("Sua maior alta foi X,
   +32% — puxada por Y"), não só números.
5. Documento anexado que não estiver na base ainda: avise que está processando e
   peça para perguntar novamente em instantes.
```

### 4.7 AGENTE DE AUTOMAÇÃO (WF-EVENTOS) — sem LLM (determinístico)
Não é um agente LLM: é o workflow que reage a `POST /webhook/evento` com Switch por `acao`.
Ramos iniciais: (a) conta baixada de alto valor → e-mail ao dono; (b) fatura fechada →
notificação in-app via `POST /api/notificacoes`; (c) escrita relevante → marcar empresa p/
re-sync RAG incremental. LLM só entra aqui no futuro (ex.: resumo semanal narrado) — manter
determinístico por padrão: automação silenciosa e barata.

---

<a name="parte-5"></a>
## Parte 5 — Manual de Execução Passo a Passo

> Convenções: comandos do servidor = `ssh root@2.25.197.81`, projeto em `/opt/core4erp`,
> deploy = commit em `development` → `git fetch && git reset --hard origin/development` no
> servidor → `docker compose build <svc> && docker compose up -d <svc>`. O `.env` de produção
> é gitignored: NUNCA sobrescrever, apenas fazer append de novas variáveis. Nunca commitar o
> trabalho OTEL não-commitado que está no working tree local (docker-compose.yml bloco OTEL,
> Dockerfile, core4erp/.env.example).

### FASE 0 — Hardening e pré-requisitos (meio dia; sem mudança funcional)

| Passo | Ação | Aceite |
|---|---|---|
| 0.1 | **Pinar imagem do n8n**: `image: n8nio/n8n:2.28.3` no compose (trocar `latest`) | `docker inspect n8n` mostra tag fixa |
| 0.2 | **`mem_limit: 1g`** no serviço n8n | `docker stats` mostra limite |
| 0.3 | **Migrar n8n SQLite → Postgres**: criar database `n8n` no postgres do compose (`CREATE DATABASE n8n OWNER <user>;`); adicionar ao serviço n8n: `DB_TYPE=postgresdb`, `DB_POSTGRESDB_HOST=db`, `DB_POSTGRESDB_DATABASE=n8n`, `DB_POSTGRESDB_USER/PASSWORD` (variáveis novas no `.env`); **antes**: `docker exec n8n n8n export:workflow --all` + export de credenciais p/ reimportar | n8n sobe no Postgres; 2 workflows e owner reimportados; login OK |
| 0.4 | **Salvaguardar `N8N_ENCRYPTION_KEY`**: ler a chave do arquivo de config do volume (`docker exec n8n cat /home/node/.n8n/config`), definir explicitamente `N8N_ENCRYPTION_KEY=<mesma chave>` no `.env` do servidor (nunca commitar) | Container recriado loga sem "mismatching encryption key" |
| 0.5 | **Secret de webhook**: gerar `openssl rand -hex 32` → `.env`: `N8N_WEBHOOK_SECRET=...`. Nos 2 workflows atuais, ativar Header Auth (`X-Webhook-Secret`). No backend, enviar o header em `N8nEventDispatcher` e `ChatAnexoService.preprocessarComN8n` (nova property `chat.n8n.webhook-secret`) | POST sem header → 403; fluxo normal segue OK |
| 0.6 | **Fix A8** — `LazyInitializationException` no `RagSincronizacaoService`: envolver o processamento por empresa em transação (`@Transactional` num método público chamado via self-injection ou `TransactionTemplate`) OU trocar o acesso lazy por fetch join na query. Testar com `POST /api/chat/rag/sincronizar` | Log do scheduler sem exception p/ empresaId=6; `tb_rag_sync` atualizada |
| 0.7 | **Fix A10** — corrigir preços em `application.properties` (gpt-4o-mini: input $0.15/M, output $0.60/M) | Métrica de custo coerente |
| 0.8 | **A11** — conferir firewall: `ufw status` / iptables; se 3001 e 8095 estiverem abertos ao mundo, restringir (fora do escopo da migração, mas reportar ao dono) | Portas fechadas ou risco aceito explicitamente |
| 0.9 | (Opcional, recomendado) criar swap 2G no host (`fallocate`/`mkswap`/`swapon` + fstab) | `free -m` mostra swap |

**Rollback da fase:** compose é additive; reverter commit e `docker compose up -d`. O export
do passo 0.3 garante retorno ao SQLite se o Postgres falhar.

### FASE 1 — Fundações da integração (1 dia)

| Passo | Ação | Aceite |
|---|---|---|
| 1.1 | **Validar A4**: testar `curl -H "Authorization: Bearer <jwt>" http://127.0.0.1:8080/api/auth/me` no servidor. Se o `JwtFilter` só ler cookie, adicionar suporte a `Authorization: Bearer` (fallback quando não houver cookie — mudança de ~5 linhas, revisar com `Skill/security-audit.md`) | Chamada com Bearer retorna 200 com dados do usuário certo |
| 1.2 | **Cadastrar credenciais no n8n** (via editor https://n8n.core4erp.codes): OpenAI (API key), Qdrant (`http://qdrant:6333`, sem key), Postgres n8n, Header Auth "Backend Core4" | Nós de teste conectam |
| 1.3 | **Smoke-test de tool HTTP**: workflow descartável com HTTP Request → `GET http://backend:8080/api/categorias` com Bearer de um usuário de teste → confirmar 200 e isolamento (dados só da empresa do token) | Retorna categorias da empresa correta |
| 1.4 | **Congelar contrato**: escrever `n8n/CONTRATOS.md` com os payloads (Anexo A) — fonte de verdade entre backend e workflows | Arquivo commitado |

### FASE 2 — Migrar fluxos periféricos (1–2 dias; risco baixo, valor imediato)

| Passo | Ação | Aceite |
|---|---|---|
| 2.1 | **WF-DOC (anexos/RAG ingest)**: evoluir `ragingestwf00001` — receber `{texto, tipo, fonte, empresaId}`, normalizar, Text Splitter (1000 chars), Embeddings OpenAI, upsert no Qdrant com metadado `empresaId`; responder `{ok:true, chunks:N}` | Anexo de teste indexado; busca no Qdrant filtrada por empresa acha os chunks |
| 2.2 | **Backend assíncrono no anexo**: `ChatAnexoService` passa a enfileirar o pré-processamento (resposta imediata ao usuário: "Recebi o arquivo, estou lendo…"); manter fallback interno se n8n indisponível (padrão já existente) | Upload responde < 2s; indexação concluída em background |
| 2.3 | **Enriquecer eventos (G9)**: `EventoN8nAspect` envia `detalhe` (resumo curto e não-sensível dos args — sem CPF/valores mascarados conforme LGPD) + `origemIa` (via `OrigemIaHolder.isIa()`) | Payload visível nas execuções do n8n com ação e origem |
| 2.4 | **WF-EVENTOS v1**: Switch por `acao` com 3 ramos do §4.7 (e-mail alto valor; notificação de fatura; flag RAG stale) | Baixar conta alta em homolog dispara e-mail; fatura fechada gera notificação in-app |
| 2.5 | Exportar workflows para `n8n/*.json` (versionamento — padrão já adotado) e commitar | JSONs no repo batem com o editor |

### FASE 3 — Migrar o chat para orquestração multi-agente (3–5 dias; núcleo)

| Passo | Ação | Aceite |
|---|---|---|
| 3.1 | **Feature-flag no backend (A6)**: property `chat.orquestrador=${CHAT_ORQUESTRADOR:interno}`. `ChatService` ganha ramo: se `n8n`, POST `http://n8n:5678/webhook/aurea` (secret + Bearer + payload Anexo A.1), timeout 60s, resposta única; qualquer falha → **fallback automático para o pipeline interno** + log WARN | Flag `interno` = comportamento atual intacto |
| 3.2 | **WF-ROUTER** com Agente Roteador (§4.1), saída estruturada, Switch, memória Postgres key=`conversaId` | 20 mensagens de teste classificadas certo (planilha de casos: 4 por agente) |
| 3.3 | **WF-CONSULTA** (§4.2): AI Agent + ~10 HTTP Request Tools GET. Cada tool com descrição curta em pt-BR e o Bearer vindo do payload (`={{ $json.jwt }}`) | "Quanto tenho a pagar este mês?" responde com dados reais da empresa do token |
| 3.4 | **WF-CADASTRO** (§4.5) incl. tool BrasilAPI | "Cadastra o fornecedor CNPJ 00.000.000/0001-91" consulta CNPJ, confirma e cria |
| 3.5 | **WF-EXEC** (§4.3) com **Revisor** (§4.4) no meio: Agent monta payload → Revisor → IF aprovado → HTTP POST → confirmação. Reprovado → devolve pergunta/correção ao usuário | Casos: (a) lançamento ok executa; (b) valor ambíguo → pergunta; (c) payload divergente → Revisor bloqueia (testar injetando erro) |
| 3.6 | **WF-ANALISTA** (§4.6): Qdrant retrieval **com filtro empresaId** + tools agregadas + relatório Excel | Comparativo de gastos usa números de tools; link Excel válido |
| 3.7 | **Streaming (A12/D6)**: testar modo streaming do AI Agent na 2.28.3. Funciona → backend faz proxy dos chunks pro SSE. Não funciona → Plano B (progresso por etapas + resposta final) | UX definida e documentada aqui neste arquivo (atualizar D6) |
| 3.8 | **Shadow-mode**: `CHAT_ORQUESTRADOR=n8n` só para o usuário admin (condição por email na flag) durante 2–3 dias de uso real; comparar respostas/latência/custo com o painel de execuções do n8n | Sem regressão funcional nos cenários do Anexo C |
| 3.9 | Exportar todos os WF para `n8n/` + commit + deploy | Repo = editor |

### FASE 4 — Cutover e limpeza (após ≥ 1 semana estável)

| Passo | Ação | Aceite |
|---|---|---|
| 4.1 | `CHAT_ORQUESTRADOR=n8n` para todos; monitorar `ChatMetrics` + execuções n8n por 1 semana | Erro < 2%; p95 aceitável; custo/mensagem ≤ atual |
| 4.2 | Remover a chamada aninhada do `ClassificacaoIaService` de dentro das tools Java (G2) — classificação agora é nó do WF-EXEC; manter o service para a tela (`POST /api/categorias/sugerir`) | Tela continua sugerindo; chat classifica via workflow |
| 4.3 | Encolher `SystemPromptBuilder` (G3): pipeline interno vira só fallback mínimo | Fallback funcional testado (derrubar n8n de propósito) |
| 4.4 | Só quando o dono autorizar: remover @Tool não usados e simplificar `ChatService` | Build verde; fallback essencial preservado |
| 4.5 | Atualizar `CLAUDE.md` (§9 Módulo de Chat IA) e memória do projeto com a arquitetura nova | Docs coerentes |

**Rollback global (vale em qualquer fase ≥ 3):** `CHAT_ORQUESTRADOR=interno` no `.env` +
`docker compose up -d backend` → chat volta 100% ao pipeline atual em ~1 min. Nenhuma fase
remove o caminho interno antes da 4.4, e a 4.4 é gate manual do dono.

---

<a name="anexos"></a>
## Anexos

### A. Contratos de payload

**A.1 backend → WF-ROUTER (`POST /webhook/aurea`)**
```json
{
  "conversaId": 123,
  "usuarioId": 45,
  "empresaId": 6,
  "canal": "ASSISTENTE",
  "mensagem": "paga a conta de luz de julho",
  "pensamentoEstendido": false,
  "jwt": "<token do usuário — repassado no header Authorization de cada tool>"
}
```
Headers: `X-Webhook-Secret: <N8N_WEBHOOK_SECRET>`, `Content-Type: application/json`.
Resposta: `{ "resposta": "texto md", "agente": "EXECUTOR", "acoes": [ {"acao":"baixarConta","id":789} ] }`

**A.2 backend → WF-DOC (`/webhook/rag-ingest`)** — atual + `empresaId` (obrigatório passar a partir da Fase 2.1).

**A.3 EventoN8nAspect → WF-EVENTOS (`/webhook/evento`)**
```json
{ "acao": "ContaService.baixar", "detalhe": "conta 789 — Luz Julho", "usuarioId": 45,
  "empresaId": 6, "origemIa": true, "timestamp": "2026-07-18T20:00:00Z" }
```

### B. Variáveis de ambiente novas (adicionar a `.env.example` SEM valores; valores só no servidor)
```
# n8n produção
N8N_DB_PASSWORD=            # Postgres do n8n (database n8n)
N8N_ENCRYPTION_KEY=         # backup da chave do volume (Fase 0.4)
N8N_WEBHOOK_SECRET=         # auth backend→n8n (Fase 0.5)
CHAT_ORQUESTRADOR=interno   # interno | n8n (Fase 3.1) — rollback instantâneo
```

### C. Suíte mínima de regressão (rodar no shadow-mode 3.8 e no cutover 4.1)
1. "Qual meu saldo?" → CONSULTOR, números de tool, sem invenção.
2. "Quanto gastei no cartão X este mês?" → total LÍQUIDO (SAIDA−ENTRADA).
3. "Registra R$ 250 de mercado no cartão X" → EXECUTOR pede parceiro se faltar; tipo SAIDA.
4. "Recebi um estorno de R$ 100 no cartão X" → tipo ENTRADA.
5. "Cadastra fornecedor CNPJ <válido>" → consulta BrasilAPI, confirma, cria.
6. "Cadastra parceiro João" (sem CPF) → recusa e pede documento.
7. "Transfere R$ 6.000 da conta A para B" → pede confirmação (alto valor) antes de executar.
8. "Exclui a conta de luz" → confirmação explícita; Revisor valida.
9. Anexo PDF de extrato → resposta imediata; indexado; pergunta posterior usa o conteúdo.
10. "Compare meus gastos de maio e junho" → ANALISTA, números de tools, insight final.
11. Usuário SEM permissão CONTA_CRIAR tenta registrar conta → mensagem amigável de acesso.
12. Usuário da empresa A jamais vê dado da empresa B (testar com 2 tokens) — **crítico**.
13. Derrubar n8n (`docker stop n8n`) → chat continua respondendo via fallback interno.
14. "Oi, tudo bem?" → SMALLTALK, zero chamadas de tool e zero retrieval.

### D. Riscos e mitigações
| Risco | Mitigação |
|---|---|
| Vazamento cross-tenant por nó Qdrant/HTTP sem filtro | Checklist obrigatório (Parte 3.3, regra de ouro); teste C.12 em toda mudança |
| Roteador classifica errado | Agentes devolvem "encaminhar: X" (re-rota 1 vez); casos errados viram exemplos no prompt do roteador |
| Latência maior (salto extra backend→n8n) | Rede docker interna (<5ms); medir no shadow-mode; SMALLTALK responde sem agente especializado |
| n8n indisponível | Fallback interno automático (Fase 3.1) — já é o padrão do projeto para rag-ingest |
| Custo por mensagem subir (mais chamadas LLM: roteador+agente+revisor) | Roteador e Revisor são baratos (prompts curtos, sem tools, gpt-4o-mini); G1+G3+G8 cortam tokens no agente principal; medir no 3.8 e comparar com baseline do ChatMetrics |
| Perda de credenciais do n8n | Fase 0.4 (encryption key no .env) + backup do database n8n junto do dump Postgres |
