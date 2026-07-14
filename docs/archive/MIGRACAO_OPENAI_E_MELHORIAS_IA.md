# Migração da IA (Gemini → OpenAI) e Evolução da Arquitetura de IA

> **Documento de arquitetura** — Core 4 ERP
> Autor: planejamento técnico assistido
> Data: 2026-06-20
> Status: proposta para execução

---

## 1. Resumo executivo

O Core 4 ERP integra um assistente financeiro ("C4 Assistant") via **Spring AI 1.1.4**, hoje usando
**Google Gemini** (`gemini-2.0-flash`). Como todo o código de orquestração e as ferramentas (`@Tool`)
são escritos contra a abstração `ChatClient` do Spring AI, **a troca de provedor é majoritariamente
configuração** — não exige reescrever a lógica do chat.

Este documento define dois blocos de trabalho:

- **Bloco A — Migração para OpenAI (`gpt-4o-mini`)**: trocar dependência, properties e variável de
  ambiente. Baixo risco, alto valor imediato.
- **Bloco B — Melhorias arquiteturais**: corrigir o bug de propagação de contexto no streaming,
  controlar custo (teto de tokens + rate limit por usuário), persistir histórico, observar custo,
  endurecer segurança e cobrir o módulo com testes.

**Modelo escolhido:** `gpt-4o-mini` — o mais econômico da OpenAI com suporte **estável e comprovado** a
*function calling*, *streaming* e ao parâmetro `temperature` (usado hoje = `0.1`). O modelo fica
**parametrizável por variável de ambiente** para permitir experimentar opções mais baratas no futuro
sem mudar código.

> ⚠️ **Confirmar preços/nomes de modelos na página oficial de pricing da OpenAI antes de fechar.**
> Modelos das famílias "reasoning"/`o*`/`gpt-5*` frequentemente **não aceitam `temperature`** e usam
> `max_completion_tokens` em vez de `max_tokens`; por isso `gpt-4o-mini` é a escolha de menor risco
> para a migração.

---

## 2. Diagnóstico da integração atual

### 2.1 Componentes

| Camada | Arquivo | Papel |
|---|---|---|
| Build | `core4erp/build.gradle` | Starter `spring-ai-starter-model-google-genai`, BOM `1.1.4` |
| Config | `core4erp/src/main/resources/application.properties` | `spring.ai.google.genai.*` |
| Auto-config (vazio) | `chat/config/ChatAiConfig.java` | Ponto de extensão futuro |
| API | `chat/controller/ChatController.java` | `POST /api/chat`, `POST /api/chat/stream` (SSE), `DELETE /historico`, download `.xlsx` |
| Orquestração | `chat/service/ChatService.java` | Monta mensagens, histórico (Caffeine por e-mail), `call()` e `stream()` |
| Prompt | `chat/service/SystemPromptBuilder.java` | System prompt com contexto do usuário |
| Sanitização | `chat/service/ChatInputSanitizer.java` | Blocklist de substrings + truncamento 4000 chars |
| Tools (read) | `chat/tools/consulta/ConsultaTools.java` | 7 consultas read-only |
| Tools (write) | `chat/tools/lancamento/LancamentoTools.java` | 5 operações de escrita |
| Tools (report) | `chat/tools/relatorio/RelatorioTools.java` + `RelatorioExcelService.java` | Geração de Excel |
| Métricas | `chat/metrics/ChatMetrics.java` | Counters/Timer/Gauge Micrometer |
| Front | `front-end/src/hooks/useChatRuntime.js`, `components/chat/ChatSidebar.jsx` | `@assistant-ui/react` consumindo SSE |

### 2.2 Achados (priorizados)

**🔴 Crítico — propagação de contexto de segurança no streaming.**
`SecurityContextUtils` é `@RequestScope` e lê `SecurityContextHolder` (ThreadLocal). No
`ChatService.processarStream(...)`, as tools são executadas em threads do Reactor (via `.subscribe()`),
fora da thread da request — onde nem o bean request-scoped nem o ThreadLocal de segurança existem.
Resultado: tools chamadas durante o **streaming** que dependem do usuário/tenant tendem a falhar ou
quebrar o isolamento multi-tenant. O caminho síncrono `call()` não sofre disso. **Precisa ser tratado
junto com a migração**, pois o OpenAI exercita o mesmo caminho de streaming + tools.

**🟠 Importante**
- **Histórico volátil e não-escalável** — `Caffeine` em memória, chaveado só por e-mail; perde tudo no
  restart e não funciona com múltiplas instâncias (deploy é Dockerizado). Sem conceito de "conversa".
- **Sem teto de custo** — nenhum `max-tokens` configurado; conversa longa pode estourar tokens (e
  conta). Rate limit é **por IP**, não por usuário (`RateLimitFilter`).
- **Custo/tokens não observados** — uso só é logado (`[CHAT-USAGE]`), não vira métrica nem é persistido.
- **Defesa contra prompt injection ingênua** — blocklist de substrings em inglês é trivialmente
  contornável e degrada UX (substitui a mensagem inteira). A defesa real é a autorização na camada de
  serviço (que já existe via tenant/empresa).
- **Sem resiliência** — sem timeout/retry explícito na chamada ao modelo.

**🟡 Menor**
- Auditoria das tools de escrita é só `log.info`, não persistida.
- SSE envia tokens crus; token com `\n` pode bagunçar o framing.
- Botões de sugestão no `ChatSidebar.jsx` são decorativos (`/* just visual for now */`).
- Zero testes automatizados do módulo chat.
- Apenas `DownloadToolUI` usa tool-UI; respostas estruturadas pouco exploradas.

---

## 3. Bloco A — Migração Gemini → OpenAI

### A.1 Dependência (`core4erp/build.gradle`)

Substituir o starter do provedor (o BOM `spring-ai-bom:1.1.4` permanece):

```diff
 	// Spring AI
 	implementation platform('org.springframework.ai:spring-ai-bom:1.1.4')
-	implementation 'org.springframework.ai:spring-ai-starter-model-google-genai'
+	implementation 'org.springframework.ai:spring-ai-starter-model-openai'
```

### A.2 Properties (`core4erp/src/main/resources/application.properties`)

```diff
 # Spring AI
-spring.ai.google.genai.api-key=${GEMINI_API_KEY}
-spring.ai.google.genai.chat.options.model=gemini-2.0-flash
-spring.ai.google.genai.chat.options.temperature=0.1
+spring.ai.openai.api-key=${OPENAI_API_KEY}
+spring.ai.openai.chat.options.model=${OPENAI_MODEL:gpt-4o-mini}
+spring.ai.openai.chat.options.temperature=0.1
+# Teto de tokens da resposta — controle de custo (ver Bloco B.2)
+spring.ai.openai.chat.options.max-tokens=1024
```

### A.3 Variáveis de ambiente

**`core4erp/.env.example`** e **`.env.example`** (raiz):

```diff
-# ── AI Chat — Google Gemini ──────────────────────────────
-GEMINI_API_KEY=your-key-here
+# ── AI Chat — OpenAI ─────────────────────────────────────
+OPENAI_API_KEY=your-key-here
+# Modelo (padrão gpt-4o-mini — mais econômico com tools+streaming)
+OPENAI_MODEL=gpt-4o-mini
```

**`docker-compose.yml`** (serviço `backend`, bloco `environment`):

```diff
-      GEMINI_API_KEY: ${GEMINI_API_KEY}
+      OPENAI_API_KEY: ${OPENAI_API_KEY}
+      OPENAI_MODEL: ${OPENAI_MODEL:-gpt-4o-mini}
```

### A.4 Documentação

**`README.md`** — atualizar a linha da tabela de variáveis e a descrição do módulo `chat/`:

```diff
-| `GEMINI_API_KEY` | Chave da API Google Gemini (Chat IA) | — |
+| `OPENAI_API_KEY` | Chave da API OpenAI (Chat IA) | — |
+| `OPENAI_MODEL` | Modelo OpenAI do Chat IA | `gpt-4o-mini` |
...
-│   │   ├── chat/              # Chat IA (Gemini 2.0 Flash + tools)
+│   │   ├── chat/              # Chat IA (OpenAI gpt-4o-mini + tools)
```

### A.5 Código Java

**Nenhuma mudança obrigatória.** `ChatClient.Builder` é injetado e auto-configurado pelo starter;
`ChatService`, as `@Tool` e o `SystemPromptBuilder` são agnósticos ao provedor.
`response.getMetadata().getUsage()` (log `[CHAT-USAGE]`) continua funcionando — o OpenAI também
popula `Usage`.

### A.6 Validação da migração

1. `OPENAI_API_KEY` válida no `.env`.
2. `./gradlew clean build` compila sem o starter antigo.
3. Subir a app e testar **as duas rotas**:
   - `POST /api/chat` (síncrono) com pergunta read-only ("Qual meu saldo?") → aciona `consultarDashboard`.
   - `POST /api/chat/stream` (SSE) → resposta tokenizada chega no front.
4. Testar **uma operação de escrita ponta-a-ponta** ("registre uma conta a pagar de R$100 amanhã") —
   exercita `consultarCategorias` + `registrarConta` + confirmação. **Atenção:** este teste no caminho
   de streaming é o que valida (ou expõe) o bug 🔴 — ver Bloco B.1.
5. Conferir no log `[CHAT-USAGE]` que `Usage` (prompt/completion tokens) vem preenchido.

---

## 4. Bloco B — Melhorias arquiteturais

### B.1 🔴 Corrigir propagação de contexto no streaming

**Problema:** tools no streaming rodam em thread do Reactor sem `SecurityContext`/request scope.

**Como aplicar (escolher 1):**

- **Opção recomendada — capturar identidade antes do hand-off assíncrono.**
  Hoje `ChatService` já captura `email`/`usuario` na thread da servlet. Estender isso para que as tools
  **não dependam** de `SecurityContextHolder`/`@RequestScope`: injetar o `usuarioId`/`empresaId`
  resolvidos no momento da request e propagá-los explicitamente (ex.: via um objeto de contexto passado
  às tools ou um `ThreadLocal` reidratado dentro do callback do Reactor com
  `contextWrite`/`Hooks.onEachOperator`, ou `ReactorContextHolder`).
- **Alternativa pragmática (TCC):** propagar o `SecurityContext` para as threads do Reactor com
  `SecurityReactorContextConfiguration` / `ContextSnapshot` (Micrometer Context Propagation, já
  disponível no ecossistema Spring Boot 3.3). Habilitar
  `spring.reactor.context-propagation=auto` e registrar o `ThreadLocalAccessor` de segurança.

**Critério de aceite:** uma operação de escrita pedida via `/api/chat/stream` executa a tool com o
tenant/usuário correto e registra auditoria com o e-mail certo.

### B.2 🟠 Teto de custo: `max-tokens` + rate limit por usuário

- `max-tokens` já incluído em A.2 (`1024`). Ajustar conforme tamanho típico das respostas.
- **Rate limit por usuário (não por IP):** em `RateLimitFilter`, para `/api/chat`, derivar a chave do
  bucket do **e-mail autenticado** (já disponível no `SecurityContext` na thread da request) em vez do
  IP. Manter fallback por IP para rotas não autenticadas.
- Opcional: cota diária de mensagens por usuário para teto de custo previsível.

### B.3 🟠 Histórico persistente e escalável

- Substituir o `Caffeine` por persistência (tabela `chat_mensagem` com `usuario_id`, `empresa_id`,
  `role`, `conteudo`, `criado_em`) via Flyway (próxima migration livre, ex.: `V37`).
- Carregar as últimas N mensagens (`chat.historico.max-mensagens=20`) por usuário/conversa.
- Benefício: sobrevive a restart, funciona com múltiplas instâncias, habilita histórico no front.
- Alternativa de menor esforço: manter Caffeine como cache, mas com fonte de verdade no banco.

### B.4 🟠 Observabilidade de custo

- Em `ChatMetrics`, adicionar counters de tokens: `chat.tokens.prompt`, `chat.tokens.completion`,
  `chat.tokens.total`, alimentados a partir de `response.getMetadata().getUsage()`.
- Opcional: counter de custo estimado (tokens × preço do modelo) por `OPENAI_MODEL`.
- Painel Grafana: tokens/dia, custo/dia, custo por usuário.

### B.5 🟠 Resiliência

- Configurar timeout e retry do Spring AI:
  ```properties
  spring.ai.retry.max-attempts=2
  spring.ai.retry.on-client-errors=false
  # timeout via RestClient/WebClient customizer se necessário
  ```
- Mensagem amigável no front quando o provedor falha (o `useChatRuntime.js` já trata `!response.ok`).

### B.6 🟡 Endurecer segurança de input

- Remover/relaxar o blocklist ingênuo do `ChatInputSanitizer` (não substituir a mensagem inteira).
- Manter o truncamento de tamanho.
- Confiar na **autorização da camada de serviço** (tenant/empresa) como defesa real contra tool misuse —
  reforçar que toda tool de escrita passa pelos serviços que filtram por `empresaId`.

### B.7 🟡 Auditoria persistente das tools de escrita

- Persistir os eventos `[CHAT-AUDIT]` (hoje só `log.info`) em tabela de auditoria, reaproveitando a
  infraestrutura de auditoria existente (ver `project_multitenancy` / módulo de auditoria).

### B.8 🟡 Testes automatizados

- Unitários: `ChatInputSanitizer`, `SystemPromptBuilder`, `extrairDownloadUrl`, poda de histórico.
- Tools: cada `@Tool` com mock do serviço de domínio (validação de enums, defaults de parcelas, etc.).
- Integração: `ChatController` com `ChatClient` mockado, cobrindo `call()` e `stream()`.

### B.9 🟡 UX

- Ativar os botões de sugestão do `ChatSidebar.jsx` (hoje decorativos) para preencher/enviar o composer.
- Avaliar tool-UIs estruturadas além do download (ex.: cartões de resumo do dashboard).

---

## 5. Ordem de execução (fases)

| Fase | Conteúdo | Risco | Bloqueia produção? |
|---|---|---|---|
| **1** | Bloco A (migração) + A.6 validação | Baixo | — |
| **2** | B.1 (contexto streaming) + B.2 (max-tokens já em A; rate limit por usuário) | Médio | **Sim** — escrita via streaming |
| **3** | B.4 (observabilidade custo) + B.5 (resiliência) | Baixo | — |
| **4** | B.3 (histórico persistente) | Médio | — |
| **5** | B.6, B.7, B.8, B.9 | Baixo | — |

> Fase 1 e 2 devem sair juntas para produção: migrar sem corrigir B.1 mantém o risco de escrita via
> streaming.

---

## 6. Riscos e rollback

- **Rollback da migração:** reverter `build.gradle` + `application.properties` + env para o starter
  Gemini. Sem migrations destrutivas na Fase 1, o rollback é limpo.
- **Diferença de comportamento de tools:** OpenAI e Gemini podem chamar tools de forma ligeiramente
  diferente. Mitigação: as descrições das `@Tool` já são detalhadas; validar o fluxo de escrita
  (categoria → confirmação → registro) após a troca.
- **Custo:** sem `max-tokens` e rate limit por usuário, há risco de conta inesperada — por isso B.2 é
  Fase 2.
- **`temperature` em modelos futuros:** se trocar para família `o*`/`gpt-5*`, revisar `temperature`/
  `max_completion_tokens`. `OPENAI_MODEL` parametrizado facilita testes A/B.

---

## 7. Checklist de aceite

- [ ] App sobe com `OPENAI_API_KEY` e responde em `/api/chat` e `/api/chat/stream`.
- [ ] Operação de escrita via streaming executa com tenant/usuário corretos (B.1).
- [ ] `max-tokens` ativo; rate limit aplicado por usuário (B.2).
- [ ] Métricas de tokens visíveis no Grafana (B.4).
- [ ] `.env.example` (ambos), `docker-compose.yml` e `README.md` atualizados.
- [ ] Testes do módulo chat passando (B.8).
- [ ] Nenhuma referência remanescente a `GEMINI`/`google.genai` no código/config/docs.

---

## 8. Code review do próprio plano

Revisão crítica para garantir que nada ficou de fora:

1. **Cobertura da migração — OK.** Os 4 pontos onde "Gemini"/`google.genai` aparecem no repositório
   (`build.gradle`, `application.properties`, `.env.example` ×2, `docker-compose.yml`, `README.md`)
   estão todos no Bloco A. ✅ Verificar com `grep -ri "gemini\|google.genai" .` ao final (item do
   checklist §7).

2. **Dependência transitiva.** ⚠️ Confirmar o nome exato do artefato
   `spring-ai-starter-model-openai` na versão do BOM `1.1.4` (nomes de starters mudaram entre as
   milestones do Spring AI 1.x). Validar no Maven Central / docs do Spring AI antes de buildar — risco
   de typo no artefato.

3. **`max-tokens` vs nome do parâmetro.** ⚠️ Para `gpt-4o-mini`, `spring.ai.openai.chat.options.max-tokens`
   é o correto. Se no futuro migrar para `gpt-5*`/`o*`, o parâmetro vira `max-completion-tokens` e
   `temperature` pode não ser aceito — já sinalizado em §1 e §6, mas reforço aqui como pegadinha real.

4. **B.1 é o calcanhar de Aquiles.** O plano corretamente marca a propagação de contexto no streaming
   como bloqueante. ✅ Porém o plano oferece duas abordagens sem fechar uma — **decisão técnica fica
   pendente**: validar primeiro se o bug se manifesta de fato (teste A.6 passo 4) antes de investir na
   solução mais pesada. Se a única tool de escrita comum for via `call()` no front, o impacto prático
   pode ser menor — checar qual rota o front usa (o `useChatRuntime.js` usa **`/stream`**, então o bug
   **é** exercitado). Confirmado: B.1 é necessário.

5. **Histórico (B.3) e migration.** ✅ **Confirmado:** última migration é `V36`, logo `V37` é o próximo
   número livre — sem colisão.

6. **Rate limit por usuário (B.2).** ✅ Viável: o e-mail está no `SecurityContext` na thread da request
   (o `RateLimitFilter` roda na cadeia de filtros, antes do hand-off assíncrono). Sem dependência do
   bug de B.1.

7. **Observabilidade (B.4).** ✅ `getUsage()` já é logado hoje, então a fonte de dados existe; só falta
   virar métrica.

8. **Frontend.** ✅ A migração não exige mudança no front — o contrato SSE (`/api/chat/stream`, eventos
   `data:`) é preservado. B.9 é melhoria opcional, não bloqueante.

9. **Gaps identificados na revisão (verificados):**
   - ✅ **Sem CI** — não existe `.github/` no repositório; nenhum pipeline referencia `GEMINI_API_KEY`.
   - ⚠️ **Secrets de produção:** atualizar a env var no host/compose `.env` **real** do deploy
     (Cloudflare/servidor), não só no `.env.example`. Único ponto fora do repositório.
   - ✅ **Referências a Gemini confirmadas (6 arquivos):** `build.gradle`, `application.properties`,
     `.env.example` (raiz e `core4erp/`), `docker-compose.yml`, `README.md` — todos cobertos no Bloco A.
     `README.md` também serve à documentação do TCC; revisar a escrita acadêmica para refletir OpenAI.

10. **Conclusão da revisão:** o plano cobre migração + todas as melhorias acordadas. Após verificação,
    resta **um único item externo ao repositório**: trocar o secret no ambiente de produção. O único
    ponto a confirmar tecnicamente antes de buildar é (a) o nome exato do artefato
    `spring-ai-starter-model-openai` no BOM `1.1.4`. Nenhum altera a estratégia.
