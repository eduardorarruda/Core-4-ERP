# Análise Concreta de Melhoria da Resposta da IA — C4 Assistant

> Core 4 ERP — diagnóstico baseado em **código + configuração + logs de produção + histórico no banco**
> Servidor: `root@2.25.197.81` (`/opt/core4erp`, stack Docker) · Data: 2026-06-21
> Modelo atual: **OpenAI `gpt-4o-mini`**, `temperature=0.1`, `max-tokens=1024`

---

## 0. Método (de onde vêm as evidências)

- **Código** lido no repositório local: `chat/service/ChatService.java`, `SystemPromptBuilder.java`,
  `ChatMemoryService.java`, `ChatInputSanitizer.java`, `tools/{consulta,cadastro,lancamento,relatorio}`.
- **Config**: `application.properties` (linhas 47-60) e `docker-compose.yml` no servidor.
- **Logs de produção** do container `core4erp-backend-1` (`[CHAT-USAGE]`, `[CHAT-AUDIT]`, `[CHAT-TOOL-ERRO]`).
- **Banco** (`tb_chat_mensagem`, `tb_chat_auditoria`): 61 mensagens de usuário / 60 do assistente reais.

Métricas observadas nos logs:

| Métrica | Valor |
|---|---|
| promptTokens (mediana / média / máx) | **3.328 / 6.463 / 15.067** |
| completionTokens típico | 23–180 |
| Tamanho médio resposta do assistente | 219 chars (máx 474) |
| Tamanho médio pergunta do usuário | 31 chars |

A leitura crítica: gastamos **~3.300 tokens de entrada para gerar ~30–180 de saída**. O custo e a
latência são dominados pelo *input*, não pela resposta. Esse é o eixo central da otimização.

---

## 1. Achados críticos (impactam diretamente a qualidade percebida)

### 🔴 C1 — "Streaming" não faz streaming (tela em branco até a resposta inteira)
`ChatService.processarStream` (linhas 156-168) usa `.call().chatResponse()` (bloqueante) e envia a
resposta **inteira num único** `emitter.send(...)`. O endpoint se chama `/api/chat/stream` e roda na
thread `chat-stream`, mas o usuário **espera a resposta completa** (nos logs, requisições com tools
levam de 10 a 20 s) com a tela em branco e recebe tudo de uma vez.

**Impacto:** é a principal causa de "a IA parece lenta/travada". Não é qualidade do texto — é ausência
de *feedback incremental*.

**Correção:** usar `chatClient.prompt()...stream().chatResponse()` (Flux) e emitir cada chunk via SSE.
Atenção: o handoff para thread do Reactor reintroduz o problema de `SecurityContext`/request-scope que
hoje é resolvido restaurando o contexto no `streamExecutor`. Ao migrar para `.stream()`, propagar o
contexto com `spring.reactor.context-propagation=auto` + `ContextSnapshot` (Micrometer), ou capturar
`usuarioId`/`empresaId` e passá-los explicitamente às tools (eliminando dependência de ThreadLocal).
Enquanto não houver streaming real, **enviar ao menos um evento "digitando…"** no front já melhora a
percepção.

### 🔴 C2 — Tool de escrita sem idempotência → duplicação real em produção
No histórico do banco a categoria **"Compras" foi criada duas vezes seguidas** (logs `[CHAT-AUDIT]
tool=registrarCategoria descricao=Compras` às 14:36:35 **e** 14:36:44). Causa raiz confirmada:
`CategoriaService.criar` **não verifica duplicidade por nome** (diferente de `registrarParceiro`, que
barra por CPF/CNPJ e gerou `[CHAT-TOOL-ERRO]`). Sequência real:
1. Usuário: "crie a categoria de compras…" → modelo **já criou** (pulou a confirmação exigida no prompt).
2. Usuário: "Isso mesmo" → modelo **criou de novo**.

**Impacto:** dados sujos + o usuário vê "criada com sucesso" duas vezes. Mina a confiança na IA.

**Correção (defesa em profundidade, na camada de serviço — não no prompt):**
- `registrarCategoria`/`registrarParceiro`/`registrarConta`: checar existência antes de inserir e, se já
  existir, **retornar o registro existente** com uma mensagem ("Categoria 'Compras' já existe, reaproveitei")
  em vez de duplicar ou estourar exceção.
- O prompt **não é** mecanismo de integridade num modelo pequeno; a garantia tem que estar no serviço.

### 🔴 C3 — Confirmação de escrita é frágil porque depende só do prompt num modelo pequeno
O `SystemPromptBuilder` define um fluxo "resuma → peça confirmação → só execute após 'sim'". O caso C2
mostra que o `gpt-4o-mini` **não segue isso de forma confiável** (executou antes de confirmar). Confiar
a integridade transacional ao seguimento de instruções de um modelo barato é o erro arquitetural de
fundo.

**Correção:** padrão **confirm-then-commit em duas tools**. Tool 1 `prepararLancamento(...)` valida e
devolve um *resumo + tokenDeConfirmacao* (sem gravar). Tool 2 `confirmarLancamento(token)` grava. Assim
o "sim" do usuário vira um passo explícito e auditável, independente da disciplina do modelo.

---

## 2. Achados importantes (custo, latência e contexto)

### 🟠 I1 — 12 tools enviadas em **toda** requisição (~2.600 tokens fixos de overhead)
O baseline de 3.328 promptTokens para um simples "Qual meu saldo?" é dominado pelos *schemas* das 12
`@Tool` (`ConsultaTools` 7 + `LancamentoTools` 5 + `CadastroTools` 3 + `RelatorioTools`), todas com
descrições longas e exemplos. Elas são reenviadas a cada turno.

**Correção:**
- **Encurtar descrições** das tools (hoje têm parágrafos com vários exemplos "Use para…"). Cortar pela
  metade reduz centenas de tokens por request sem perder roteamento.
- Avaliar **seleção dinâmica de tools** por intenção (consulta vs. escrita vs. relatório) para não mandar
  as 12 sempre. Em Spring AI dá para montar o set de tools por request.

### 🟠 I2 — Resultados de tool voltam **inteiros** para o modelo (pico de 15.067 tokens)
O salto de 3.3k → 15k tokens acontece quando uma tool roda: o JSON completo do retorno é reinjetado no
prompt. `consultarDashboard` devolve saldo + a pagar + a receber + investimentos + cartões + **fluxo de
6 meses** + **top 5 categorias** + vencimentos — tudo para responder "qual meu saldo?".

**Correção:** retornar à IA apenas o necessário. Ou criar tools mais granulares (`consultarSaldo`,
`consultarFluxo6Meses`) ou um parâmetro de projeção no DTO retornado ao modelo. Isso corta custo e
**melhora a precisão** (menos ruído → menos alucinação de números).

### 🟠 I3 — Histórico é uma thread infinita por usuário, sem conceito de "conversa"
`ChatMemoryService.carregar` pega as **últimas 20 mensagens do usuário, globalmente**, sem fronteira de
conversa. Consequências:
- "Isso mesmo" / "pode registrar" podem se ancorar no turno errado quando assuntos se misturam.
- **As mensagens de tool-call/tool-result NÃO são persistidas** — só os textos finais USER/ASSISTANT.
  O modelo não "vê" o que já executou via ferramenta, o que contribui para reexecuções (C2).
- Truncar em 20 no meio de um fluxo de escrita pode cortar a confirmação pendente.

**Correção:** introduzir `conversa_id` (sessão), carregar histórico **da conversa atual**, e considerar
**resumo de contexto** (rolling summary) acima de N turnos em vez de corte cego. Persistir também os
passos de tool melhora a coerência multi-turno.

### 🟠 I4 — `max-tokens=1024` pode truncar respostas/tabelas silenciosamente
Hoje as respostas são curtas (média 219 chars), então não aparece nos logs — mas qualquer pedido de
"liste todas as contas a pagar do mês em tabela" pode ser cortado no meio. Subir para ~2048 e/ou tratar
`finishReason=length` com aviso/continuação.

---

## 3. Achados de qualidade textual (tom e UX)

### 🟡 Q1 — Verborragia apesar de "seja conciso"
No banco, várias respostas terminam com enchimento: *"Se precisar de mais alguma coisa, estou à
disposição…"*. O prompt pede concisão, mas sem exemplos o modelo recai no padrão tagarela.
**Correção:** adicionar **2–3 exemplos few-shot** curtos no system prompt mostrando o estilo desejado
(resposta seca, número em destaque, sem despedida). Few-shot vale mais que instrução abstrata.

### 🟡 Q2 — Loops de validação de CPF
Histórico mostra o assistente repetindo "CPF inválido, deve ter 11 dígitos" várias vezes. O prompt já
tem regra "não entre em loop", mas ela falha. **Correção:** a tool deve **normalizar** o CPF (remover
pontos/traços) e, na 2ª falha, oferecer cadastrar sem documento — lógica no serviço, não no prompt.

### 🟡 Q3 — Modelo inventava link de download (já mitigado no código)
`anexarDownload` remove links inventados (ex. `example.com`) e anexa o correto — boa defesa reativa já
implementada. Manter, mas a causa (modelo inventa URLs) reforça o ponto geral: **não confiar no modelo
para dados factuais/estruturais**.

---

## 4. O eixo central: escolha do modelo

A maioria dos defeitos de **seguir fluxo** (C2, C3, Q1, Q2) são sintomas clássicos de um modelo pequeno
(`gpt-4o-mini`) com orquestração de múltiplas tools em português. Duas frentes complementares:

1. **Tornar o sistema robusto a um modelo fraco** (recomendado e prioritário): C2/C3/I2 — mover
   integridade e confirmação para a camada de serviço. Isso melhora a qualidade **independente** do modelo
   e é o que um TCC deve defender como arquitetura correta.
2. **Testar um modelo mais forte** para a orquestração: `gpt-4o` ou `gpt-4.1-mini`/`gpt-4.1`. O custo extra
   por chamada é pequeno frente ao ganho em aderência ao fluxo de escrita. Como `OPENAI_MODEL` é
   parametrizável por env, dá para fazer um **A/B** sem mudar código — ótimo material de avaliação para o TCC.

> Recomendação: **não** resolver C2/C3 só trocando de modelo. Corrigir a arquitetura (camada de serviço)
> e, em paralelo, medir `gpt-4o-mini` vs `gpt-4.1-mini` em aderência ao fluxo.

---

## 5. Plano priorizado

| # | Ação | Esforço | Ganho | Tipo |
|---|---|---|---|---|
| 1 | **C2** — idempotência em `registrarCategoria`/`Parceiro`/`Conta` (checar existência → reaproveitar) | Baixo | Alto | Correção |
| 2 | **C1** — streaming real (`.stream()` + SSE por chunk) ou ao menos indicador "digitando" | Médio | Alto (percepção) | UX |
| 3 | **I1+I2** — encurtar descrições de tools e enxugar retorno do dashboard | Baixo | Alto (custo/precisão) | Custo |
| 4 | **C3** — confirm-then-commit em 2 tools para escrita | Médio | Alto | Arquitetura |
| 5 | **Q1** — few-shot de concisão no system prompt | Baixo | Médio | Texto |
| 6 | **I4** — `max-tokens=2048` + tratar `finishReason=length` | Baixo | Médio | Robustez |
| 7 | **I3** — `conversa_id` + persistir tool steps + resumo de contexto | Alto | Médio | Arquitetura |
| 8 | **Modelo** — A/B `gpt-4o-mini` × `gpt-4.1-mini` via `OPENAI_MODEL` | Baixo | A medir | Avaliação |
| 9 | **Observabilidade** — já há counters de tokens; criar painel Grafana de tokens/custo por dia/usuário | Baixo | Médio | Ops |

**Quick wins (1 dia):** itens 1, 3, 5 e 6 — sem migração, atacam custo, duplicação e tom de uma vez.

---

## 6. Notas de método para o TCC

- Há `[CHAT-USAGE]` logado e counters Micrometer; **falta um painel** que transforme isso em evidência
  (tokens/dia, custo estimado, p95 de latência). Isso vira capítulo de "avaliação" forte.
- A correção de C2/C3 é o argumento arquitetural central: **a integridade de uma ação acionada por LLM
  pertence à camada de serviço, não ao prompt.** É a tese defensável do trabalho.
