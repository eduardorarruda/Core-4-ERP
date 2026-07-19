# BUILD-GUIDE — Montagem e validação dos 5 workflows com AI Agent

> **Escopo honesto.** Os 5 workflows de IA (WF-ROUTER, WF-CONSULTA, WF-EXEC, WF-CADASTRO,
> WF-ANALISTA) são complexos (AI Agent + tools + memória + saída estruturada) e **precisam ser
> finalizados e validados na UI do n8n** (https://n8n.core4erp.codes) **com a credencial OpenAI
> ativa** — o que só é possível após o owner do n8n logar e cadastrar as credenciais (Fase 1, itens
> A7/1.2 do plano). Este guia é o passo a passo para montá-los; ele **não** foi importado/executado
> aqui, então nada abaixo está "testado".
>
> Os JSONs prontos entregues no repo são os **de partida, de nós padrão** (mais fáceis de acertar):
> `rag-ingest-workflow.json` (WF-DOC) e `evento-workflow.json` (WF-EVENTOS). Para os 5 de IA, montar
> pela UI seguindo este guia é mais confiável que importar JSON frágil de AI Agent (os `typeVersion`
> dos nós LangChain variam por build e um número errado quebra a importação inteira).

- **Alvo:** n8n **2.28.3**.
- **Contratos de payload:** [`CONTRATOS.md`](./CONTRATOS.md).
- **Mapa tool → endpoint:** [`TOOLS_ENDPOINTS.md`](./TOOLS_ENDPOINTS.md).
- **Modelo padrão de todos os agentes:** `gpt-4o-mini`, `temperature = 0.1`.

---

## 0. Pré-requisitos (bloqueiam a validação)

| Item | Onde | Sem isso… |
|---|---|---|
| **Owner account do n8n** logado | https://n8n.core4erp.codes | não dá para cadastrar credencial nem salvar workflow |
| **Credencial OpenAI** (`OpenAI Core4`) | Credentials → OpenAI | nenhum AI Agent / Embeddings roda |
| **Credencial Qdrant** (`Qdrant Core4`, `http://qdrant:6333`, sem API key) | Credentials → Qdrant | WF-ANALISTA e WF-DOC não recuperam/inserem |
| **Credencial Postgres** (`Postgres n8n`) | Credentials → Postgres | sem memória de conversa |
| **Credencial Header Auth** (`N8N Webhook Secret`, header `X-Webhook-Secret` = `N8N_WEBHOOK_SECRET`) | Credentials → Header Auth | webhooks ficam abertos (A1/A5) |
| **Credencial SMTP** (`SMTP Core4`) | Credentials → SMTP | WF-EVENTOS não envia e-mail |
| **Backend aceita `Authorization: Bearer`** | validar A4 (passo 1.1 do plano) | nenhuma tool autentica |

> **Nenhuma credencial, nenhuma chave real, vai para o repositório.** Tudo vive no n8n (criptografado
> pela `N8N_ENCRYPTION_KEY`) e no `.env` do servidor. Nos JSONs usamos **credenciais nomeadas**
> (placeholders).

---

## 1. Padrões comuns a TODOS os agentes

### 1.1 Prefixo obrigatório do system prompt (colar no topo de cada agente)

```
Você faz parte da Áurea, assistente financeira do Core 4 ERP. Responda sempre em
português brasileiro, tom profissional e amigável, valores em R$ (1.234,56) e datas
em dd/MM/yyyy. NUNCA invente números: todo valor financeiro citado deve vir de uma
ferramenta chamada NESTA resposta. NUNCA exponha termos técnicos (IDs internos,
nomes de tabelas, exceções, códigos de permissão) ao usuário. Se uma ferramenta
retornar erro de permissão, explique que o usuário não tem acesso e oriente a falar
com o administrador. Hoje é {{ $now.format('dd/MM/yyyy') }}.
```

### 1.2 Como o JWT é repassado em cada tool (regra central de tenancy)

Cada **HTTP Request Tool** que chama o backend deve enviar o header:

```
Authorization: Bearer {{ $json.jwt }}
```

O `jwt` chega no payload do WF-ROUTER (Contrato 1) e é propagado aos sub-workflows via **Execute
Workflow** (passe o item inteiro adiante). Dentro de um HTTP Request Tool, referencie o campo com
`{{ $json.jwt }}` (ou `{{ $('WF-ROUTER Trigger').item.json.jwt }}` se precisar cruzar nós). Também
envie sempre:

```
X-Webhook-Secret: {{ $credentials }}   ← só nos webhooks de entrada, não nas tools
Content-Type: application/json
```

> **Sem o Bearer correto, a tool não autentica** e o backend responde 401/403. É esse repasse que
> preserva RBAC (`@Requer`), `DtoValidator`, isolamento por `empresaId` e auditoria — o n8n não
> reimplementa nada disso.

### 1.3 Memória de conversa (onde aplicável)

Nó **Postgres Chat Memory** com:
- Credencial: `Postgres n8n`
- **Session Key:** `={{ $json.conversaId }}`
- Context window: ~20 mensagens (equivalente ao backend atual).

Aplicar em: WF-CONSULTA, WF-EXEC, WF-CADASTRO, WF-ANALISTA. O **WF-ROUTER** pode ler a memória para
contexto de roteamento, mas o roteador em si não precisa persistir.

### 1.4 Estrutura de uma HTTP Request Tool (exemplo `consultarContas`)

```
Nó: HTTP Request Tool
  Nome/Descrição (p/ o LLM): "consultarContas — lista contas a pagar/receber. Filtros
     opcionais: tipo (PAGAR|RECEBER), status (PENDENTE|PAGO|RECEBIDO|ATRASADO)."
  Method: GET
  URL: http://backend:8080/api/contas
  Query params: tipo={{ $fromAI('tipo') }}, status={{ $fromAI('status') }}
  Headers: Authorization = Bearer {{ $json.jwt }}
```

Para tools **por nome** (ex.: "excluir cartão Nubank"), o agente encadeia: primeiro a tool GET de
listagem (resolve o ID pelo nome), depois a tool PUT/DELETE `/{id}` — ver
[`TOOLS_ENDPOINTS.md`](./TOOLS_ENDPOINTS.md) (marcadas "resolver ID → …").

---

## 2. WF-ROUTER (`POST /webhook/aurea`)

**Gatilho:** Webhook `POST /webhook/aurea`, **Authentication: Header Auth** (`N8N Webhook Secret`),
Respond via "Respond to Webhook".

**Nós:**
1. **Webhook** (Header Auth) → recebe Contrato 1.
2. **Code — validar payload** (garante `conversaId`, `empresaId`, `jwt`, `mensagem` presentes).
3. **AI Agent — ROTEADOR** (`gpt-4o-mini`, **sem tools**, **Output Parser estruturado**).
   - Saída: `{"agente": "...", "resumoIntencao": "...", "entidades": {...}}`.
4. **Switch** por `agente`: 5 saídas (CONSULTOR, EXECUTOR, CADASTRADOR, ANALISTA, SMALLTALK).
5. **Execute Workflow ×4** (um por sub-workflow), passando o item inteiro (inclui `jwt`,
   `conversaId`, `empresaId`, `resumoIntencao`, `entidades`).
6. **SMALLTALK:** ramo direto — um AI Agent leve (ou o próprio roteador) responde sem tool/RAG.
7. **Respond to Webhook** → devolve `{resposta, agente, acoes}` (Contrato 1, resposta).

**Re-roteamento:** se um sub-workflow devolver `encaminhar: EXECUTOR` (ver §4.2 regra 5 / §4.7 do
plano), o WF-ROUTER re-despacha **uma vez** para o agente indicado.

**System prompt (EXATO — §4.1 do plano; colar após o prefixo comum §1.1):**
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

---

## 3. WF-CONSULTA (Execute Workflow) — somente leitura

**Gatilho:** Execute Workflow Trigger.
**Nós:** AI Agent (`gpt-4o-mini`) + Postgres Chat Memory (key=`conversaId`) + as **HTTP Request Tools
de leitura** (TOOLS_ENDPOINTS #1–#13):
dashboard, contas correntes, categorias, cartões, investimentos, notificações, assinaturas,
parceiros, contas (com filtros), lançamentos de cartão, gastos por cartão, tipos de investimento.
Cada tool com `Authorization: Bearer {{ $json.jwt }}`.

**System prompt (EXATO — §4.2):**
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

---

## 4. WF-EXEC (Execute Workflow) — escrita financeira, com Revisor

**Gatilho:** Execute Workflow Trigger.
**Fluxo:** AI Agent EXECUTOR (monta o payload) → **AI Agent REVISOR** (valida) → **IF** `aprovado` →
HTTP Request (POST/PUT/PATCH/DELETE) → Code (formata confirmação). Reprovado → devolve
pergunta/correção ao usuário (sem executar).

**Tools do EXECUTOR** (TOOLS_ENDPOINTS #14–#24 + leitura mínima #3/#4/#8/#9 para resolver IDs):
registrar/atualizar/excluir/baixar/estornar conta, lançar/atualizar/excluir no cartão, transferir,
fechar fatura, transação de investimento. **Atenção às divergências** documentadas em
TOOLS_ENDPOINTS: `baixarConta` = `PATCH /api/contas/{id}/baixa`; `estornarConta` =
`DELETE /api/contas/{id}/baixa`.

**Classificação de categoria (G2):** quando `categoriaId` vier nulo, use um nó de classificação
(chamada única a `POST /api/categorias/sugerir`) **antes** de montar o payload — sai de "dentro" da
tool, vira nó explícito do fluxo.

**System prompt EXECUTOR (EXATO — §4.3):**
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

**AI Agent REVISOR** (`gpt-4o-mini`, **sem tools**, saída estruturada
`{"aprovado": true|false, "motivo": "...", "correcoes": {...}}`). Recebe
`{operacao, payload, mensagemOriginalUsuario}`.

**System prompt REVISOR (EXATO — §4.4):**
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

---

## 5. WF-CADASTRO (Execute Workflow) — cadastros-base + CNPJ

**Gatilho:** Execute Workflow Trigger.
**Tools** (TOOLS_ENDPOINTS #25–#47 + leituras de verificação): parceiros (unitário e **lote via
Split/Loop**), categorias (unitário e lote), contas correntes, cartões, assinaturas, tipos de
investimento, carteiras de investimento, e **consultarCnpj** — preferir o proxy backend
`GET /api/parceiros/cnpj/{cnpj}` (auditado); BrasilAPI direta (`https://brasilapi.com.br/api/cnpj/v1/{cnpj}`)
como plano B.

**System prompt (EXATO — §4.5):**
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

> Nota: como o backend **não tem endpoint de lote**, a "ferramenta de lote" (§ regra 4) é implementada
> no n8n como um nó Split/Loop que chama o POST unitário N vezes — o agente enxerga uma tool só.

---

## 6. WF-ANALISTA (Execute Workflow) — RAG + relatórios

**Gatilho:** Execute Workflow Trigger.
**Nós:**
- **Qdrant Vector Store (retrieval)** — coleção `core4erp_rag`, Embeddings `text-embedding-3-small`,
  **FILTRO `empresaId` = `{{ $json.empresaId }}` OBRIGATÓRIO** (regra de ouro §3.3 — sem ele =
  vazamento cross-tenant; item de checklist de TODA mudança neste workflow).
- **AI Agent** (`gpt-4o-mini`) com a Vector Store como *tool de retrieval* + HTTP Tools agregadas
  (dashboard, `/api/relatorios/*/dados`, gastos por cartão) + **gerarRelatorioExcel** (escolher entre
  os 8 endpoints de export conforme a intenção — ver TOOLS_ENDPOINTS #48).

**System prompt (EXATO — §4.6):**
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

---

## 7. O que precisa de credencial e o que trava a validação

| Recurso | Credencial nomeada | Bloqueia |
|---|---|---|
| Todos os AI Agent + Embeddings | `OpenAI Core4` | validação inteira (sem OpenAI nada roda) |
| Retrieval/insert Qdrant | `Qdrant Core4` | WF-ANALISTA, WF-DOC |
| Memória de conversa | `Postgres n8n` | contexto multi-turno |
| Webhooks de entrada | `N8N Webhook Secret` (Header Auth) | segurança A1/A5 |
| E-mail | `SMTP Core4` | WF-EVENTOS ramo alto valor |
| Tools → backend | header `Authorization: Bearer {{ $json.jwt }}` (não é credencial n8n) | toda leitura/escrita |

> **A validação só fecha após o owner do n8n logar e cadastrar a credencial OpenAI** (e as demais).
> Até lá, o esqueleto pode ser montado e salvo, mas nenhum AI Agent executa.

---

## 8. Suíte de regressão (Anexo C do plano) — checklist de aceite

Rodar no shadow-mode (`CHAT_ORQUESTRADOR=n8n` só para o admin, Fase 3.8) e no cutover (Fase 4.1).

- [ ] 1. "Qual meu saldo?" → **CONSULTOR**, números de tool, sem invenção.
- [ ] 2. "Quanto gastei no cartão X este mês?" → total **LÍQUIDO** (SAÍDA − ENTRADA).
- [ ] 3. "Registra R$ 250 de mercado no cartão X" → **EXECUTOR** pede parceiro se faltar; tipo SAIDA.
- [ ] 4. "Recebi um estorno de R$ 100 no cartão X" → tipo **ENTRADA**.
- [ ] 5. "Cadastra fornecedor CNPJ <válido>" → consulta CNPJ, confirma, cria.
- [ ] 6. "Cadastra parceiro João" (sem CPF) → **recusa** e pede documento.
- [ ] 7. "Transfere R$ 6.000 da conta A para B" → **pede confirmação** (alto valor) antes de executar.
- [ ] 8. "Exclui a conta de luz" → **confirmação explícita**; Revisor valida.
- [ ] 9. Anexo PDF de extrato → resposta imediata; indexado (WF-DOC); pergunta posterior usa o conteúdo.
- [ ] 10. "Compare meus gastos de maio e junho" → **ANALISTA**, números de tools, insight final.
- [ ] 11. Usuário SEM permissão `CONTA_CRIAR` tenta registrar conta → mensagem amigável de acesso.
- [ ] 12. **CRÍTICO** — usuário da empresa A jamais vê dado da empresa B (testar com 2 tokens/JWT).
- [ ] 13. Derrubar n8n (`docker stop n8n`) → chat continua respondendo via **fallback interno**.
- [ ] 14. "Oi, tudo bem?" → **SMALLTALK**, zero chamadas de tool e zero retrieval.

**Checklist anti cross-tenant (rodar em TODA mudança de WF-ANALISTA/WF-DOC):** todo nó Qdrant
(retrieval e insert) tem filtro/metadado `empresaId`? Toda HTTP Tool envia o `Authorization: Bearer`
do usuário certo? Se qualquer resposta for "não", **não** subir.
