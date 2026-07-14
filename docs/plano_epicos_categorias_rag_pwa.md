# Plano de Ação de Engenharia — Épicos: Subcategorias + IA, RAG Avançado, PWA

> **STATUS (2026-07-13): EXECUTADO.** Passos 1–10 implementados. Migrations V42–V44 aplicadas
> e validadas contra banco vazio (Flyway V1→V44 + JPA `validate` OK num boot real); `./gradlew build`
> compila; `npm run build` gera o PWA (`sw.js` + manifest); teste unitário do classificador passa.
> Um ciclo de dependência (ClassificacaoIaService ↔ ChatClient.Builder ↔ tools) foi detectado no boot
> e corrigido com `@Lazy`. Detalhes de arquitetura consolidados no `CLAUDE.md` (§6).
>
> **Este documento é um prompt de execução para o Claude Opus.**
> Leia-o inteiro antes de escrever qualquer linha de código. Ele foi calibrado para o
> **Core-4-ERP real** — não para um sistema genérico. Toda instrução aqui já considera o
> `CLAUDE.md` do repositório, que continua sendo a autoridade final em caso de conflito.

---

## 0. Regras Inegociáveis (leia primeiro, releia antes de cada passo)

1. **Stack real**: PostgreSQL 15+ (NÃO MySQL), Flyway, Java 21 / Spring Boot 3.3.2,
   React 19 + **JavaScript JSX** (NÃO TypeScript), Vite 6, Tailwind 4.
2. **Próxima migration livre: V42.** Nunca edite migrations existentes (V1–V41).
   `ddl-auto=validate` — todo DDL via Flyway.
3. **Multi-tenancy**: toda tabela nova de dado de negócio estende o padrão `TenantEntity`
   (`empresa_id` preenchido pelo `TenantEntityListener`). Toda query de repository filtra
   por `empresaId` vindo de `tenantCtx.getEmpresaId()` — nunca de parâmetro de request.
4. **RBAC defense-in-depth**: `@Requer("CODIGO")` no controller E no service.
   Novas permissões entram por migration (INSERT em `tb_permissao` + vínculo aos perfis
   de sistema em `tb_perfil_permissao`).
5. **Domínio em pt-BR**: entidades, DTOs, endpoints, mensagens. DTOs com sufixo
   `RequestDto`/`ResponseDto`. Nunca expor entity JPA na API.
6. **Dinheiro = `BigDecimal`** (`compareTo`, nunca `==`). Fetch `LAZY`. Sem `ORDER BY`
   em `@Query` JPQL com `Pageable`. Mensagens ao usuário sem termos técnicos.
7. **Não quebre o que existe**: `tb_categoria`, `RagService`, chat tools e a coleção
   Qdrant `core4erp_rag` (dimensão 1536 fixada) estão em produção. Mudanças são aditivas.
8. Cada passo do roadmap termina com `./gradlew build` verde (backend) e
   `npm run build` verde (frontend). Commits pequenos, um passo por commit.

---

## 1. Visão Arquitetural

### O que já existe (não reconstruir)

| Capacidade | Estado atual |
|---|---|
| Categorias | `tb_categoria` (`descricao`, `icone`, `usuario` creator, `empresa_id`) — **plana, sem hierarquia** |
| Classificação | 100% manual (usuário escolhe categoria em `tb_conta` e `tb_lancamento_cartao`) |
| RAG | `RagService` + Qdrant (`core4erp_rag`, text-embedding-3-small/1536) — indexa **documentos/anexos**, retrieval filtrado por `empresaId`, injeta bloco "MATERIAL DE REFERÊNCIA" no system prompt |
| Dados estruturados p/ IA | Function-calling (`chat/tools/consulta`, `lancamento`, `cadastro`, `gestao`, `relatorio`) — exato e ao vivo |
| PWA | Inexistente (sem manifest, sem service worker, ícone só SVG) |

### Como os épicos se encaixam

```
┌──────────────────────────── Frontend (React/Vite) ───────────────────────────┐
│  Épico 3: vite-plugin-pwa → manifest + SW (precache do shell; /api nunca     │
│  cacheada). Views de Categorias ganham árvore pai→filho (Épico 1).           │
└───────────────────────────────────┬───────────────────────────────────────────┘
                                    │ /api (cookie JWT httpOnly — NetworkOnly no SW)
┌───────────────────────────────────▼───────────────────────────────────────────┐
│                          Backend Spring Boot                                  │
│  Épico 1: tb_categoria + categoria_pai_id (self-FK, 2 níveis)                 │
│           ClassificacaoIaService — sugere categoria p/ lançamento             │
│           (ChatClient dedicado, saída estruturada, nunca cria dado sozinho)   │
│  Épico 2: RagSincronizacaoService — agrega resumos financeiros mensais por    │
│           empresa e faz UPSERT na coleção Qdrant com ID determinístico        │
│           (complementa as tools; não as substitui)                            │
└───────────────┬───────────────────────────────┬───────────────────────────────┘
                │                               │
        PostgreSQL (Flyway V42+)         Qdrant (core4erp_rag, metadado empresaId)
```

**Decisão de arquitetura do Épico 2 (importante):** o javadoc do `RagService` fixa a
filosofia do projeto — *dados estruturados são servidos por function-calling (exato,
ao vivo); RAG serve conteúdo textual*. "Vetorizar todo o banco" linha a linha seria um
antipadrão aqui (dados desatualizam, custo de embedding explode, risco de vazamento
cross-tenant). O caminho correto: vetorizar **resumos agregados** (perfil financeiro
mensal por empresa, padrões de gasto, descrições de categorias/parceiros) que dão à IA
memória de longo prazo e contexto de tendências — enquanto números exatos continuam
vindo das tools.

---

## 2. Esquemas de Banco de Dados (PostgreSQL / Flyway)

### V42 — Hierarquia de categorias

```sql
-- V42__add_categoria_pai_e_soft_delete.sql
-- Subcategorias: auto-relacionamento em tb_categoria (máx. 2 níveis, validado no service).
ALTER TABLE tb_categoria
    ADD COLUMN categoria_pai_id BIGINT REFERENCES tb_categoria(id),
    ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX idx_categoria_pai ON tb_categoria (categoria_pai_id);
CREATE INDEX idx_categoria_empresa_ativo ON tb_categoria (empresa_id, ativo);

-- Uma categoria não pode ser pai de si mesma (ciclos maiores são bloqueados no service).
ALTER TABLE tb_categoria
    ADD CONSTRAINT ck_categoria_nao_e_propria_pai CHECK (categoria_pai_id IS NULL OR categoria_pai_id <> id);
```

> Antes de aplicar: confirme se a coluna `ativo` já existe em produção (o CLAUDE.md
> menciona soft delete de categoria, mas a entity atual não tem o campo). Se existir,
> remova essa parte do script.

### V43 — Rastreio de classificação por IA

```sql
-- V43__add_classificacao_ia.sql
-- Auditoria de sugestão de categoria pela IA em contas e lançamentos de cartão.
ALTER TABLE tb_conta
    ADD COLUMN classificada_por_ia BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN confianca_ia NUMERIC(5,4);

ALTER TABLE tb_lancamento_cartao
    ADD COLUMN classificado_por_ia BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN confianca_ia NUMERIC(5,4);
```

### V44 — Estado de sincronização do RAG

```sql
-- V44__create_tb_rag_sync.sql
-- Controle incremental da vetorização: o que já foi sincronizado, por empresa e período.
CREATE TABLE tb_rag_sync (
    id            BIGSERIAL PRIMARY KEY,
    empresa_id    BIGINT      NOT NULL REFERENCES tb_empresa(id),
    tipo_resumo   VARCHAR(40) NOT NULL,          -- RESUMO_MENSAL | PERFIL_CATEGORIAS | PERFIL_PARCEIROS
    periodo       VARCHAR(7),                    -- 'YYYY-MM' (null p/ perfis sem período)
    hash_conteudo VARCHAR(64) NOT NULL,          -- SHA-256 do texto — evita re-embedding sem mudança
    doc_id        VARCHAR(80) NOT NULL,          -- id determinístico do ponto no Qdrant (permite upsert)
    sincronizado_em TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_rag_sync UNIQUE (empresa_id, tipo_resumo, periodo)
);
CREATE INDEX idx_rag_sync_empresa ON tb_rag_sync (empresa_id);
```

> Sem novas permissões RBAC nos épicos 1–2: reutilize `CATEGORIA_*` (a subcategoria é
> uma categoria) e a classificação IA roda dentro do fluxo de chat existente. Se criar
> endpoint administrativo de re-sync do RAG, gateie com `CONFIGURACAO_EDITAR`.

---

## 3. Código de Fundação

### 3.1 Épico 1 — Entity e Service (Java)

```java
// categoria/entity/Categoria.java — campos ADICIONADOS (manter os existentes)
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "categoria_pai_id")
private Categoria categoriaPai;

@Column(nullable = false)
private Boolean ativo = true;
```

```java
// categoria/service/CategoriaService.java — validação de hierarquia (2 níveis, mesmo tenant)
@Transactional
@Requer("CATEGORIA_CRIAR")
public CategoriaResponseDto criar(CriarCategoriaRequestDto dto) {
    Long empresaId = tenantCtx.getEmpresaId();
    Categoria pai = null;
    if (dto.categoriaPaiId() != null) {
        pai = categoriaRepository.findByIdAndEmpresaId(dto.categoriaPaiId(), empresaId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                "Categoria principal não encontrada."));
        if (pai.getCategoriaPai() != null) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                "Não é possível criar uma subcategoria dentro de outra subcategoria.");
        }
    }
    // ... montar entity, setar categoriaPai, salvar, converter p/ DTO
}
```

Regras que o service DEVE cobrir (escreva todas):
- 2 níveis no máximo (pai não pode ter pai) — mensagem amigável, sem jargão.
- Pai e filha sempre da mesma `empresaId` (lookup `findByIdAndEmpresaId`).
- Nome duplicado bloqueado dentro do mesmo pai (duas "Restaurante" sob "Alimentação" não;
  "Restaurante" sob pais diferentes, sim).
- Desativar pai (`ativo=false`) → desativar filhas em cascata na mesma transação.
- Excluir/desativar categoria referenciada por `tb_conta`/`tb_lancamento_cartao`
  → apenas soft delete, seguindo a regra existente do CLAUDE.md §16.
- Listagem hierárquica: **uma query** trazendo todas da empresa + montagem da árvore em
  memória (nunca N+1 iterando filhas lazy).

**Impactos colaterais obrigatórios do Épico 1 (não são opcionais):**

1. **Roll-up em relatórios e dashboard.** `RelatorioService` e `DashboardService` agrupam
   por categoria plana hoje. Decisão de produto adotada: **agregações somam a subcategoria
   no total da categoria-pai** (drill-down opcional na UI). Ou seja: um gasto em
   "Alimentação > Restaurante" conta no total de "Alimentação". Implementar via
   `COALESCE(c.categoria_pai_id, c.id)` no GROUP BY das queries de agregação — e revisar
   TODAS as queries que agrupam por `categoria_id` (relatórios DRE/fluxo de caixa,
   dashboards, painéis BI de cartão). Sem isso, gastos em subcategorias somem dos totais.
2. **Chat tools.** `CadastroTools` (cria categoria via Áurea) ganha parâmetro opcional
   `categoriaPaiId`/nome do pai, com as mesmas validações do service (a tool chama o
   service, nunca o repository direto). `ConsultaTools` passa a listar com o caminho
   completo ("Alimentação > Restaurante") para o modelo enxergar a hierarquia.
3. **Filtros das telas.** Views que filtram por categoria (`ContasFinanceiras`, `Cartoes`,
   relatórios) exibem o dropdown agrupado; filtrar pela categoria-pai inclui as filhas.

```java
// categoria/dto/CategoriaArvoreResponseDto.java
public record CategoriaArvoreResponseDto(
    Long id, String descricao, String icone, boolean ativo,
    List<CategoriaArvoreResponseDto> subcategorias) {}
```

### 3.2 Épico 1 — Classificação autônoma via IA (Java)

Dois fluxos, mesma fundação:
- **Fluxo A (chat)**: usuário lança pelo assistente sem informar categoria → a tool de
  lançamento chama o classificador e registra a sugestão (com `classificadaPorIa=true`).
- **Fluxo B (tela)**: botão "Sugerir categoria" no formulário → endpoint
  `POST /api/categorias/sugerir` com `@Requer("CATEGORIA_VISUALIZAR")` (controller E
  service) retorna a sugestão; o usuário confirma (a IA **nunca** grava sem confirmação
  fora do fluxo de chat).

```java
// categoria/service/ClassificacaoIaService.java
@Service
public class ClassificacaoIaService {

    /** Saída estruturada — Spring AI converte a resposta do modelo direto neste record. */
    public record SugestaoCategoria(Long categoriaId, String justificativa, double confianca) {}

    private final ChatClient chatClient;   // builder próprio: temperature 0.1, maxTokens curto
    private final CategoriaRepository categoriaRepository;
    private final TenantContext tenantCtx;

    public Optional<SugestaoCategoria> sugerir(String descricaoLancamento, String parceiroNome) {
        Long empresaId = tenantCtx.getEmpresaId();
        List<Categoria> ativas = categoriaRepository.findByEmpresaIdAndAtivoTrue(empresaId);
        if (ativas.isEmpty()) return Optional.empty();

        String catalogo = ativas.stream()
            .map(c -> "- id=%d: %s%s".formatted(c.getId(), c.getDescricao(),
                c.getCategoriaPai() != null ? " (sub de " + c.getCategoriaPai().getDescricao() + ")" : ""))
            .collect(Collectors.joining("\n"));

        try {
            SugestaoCategoria s = chatClient.prompt()
                .system("""
                    Você classifica lançamentos financeiros. Escolha EXATAMENTE UMA categoria
                    da lista (responda com o id numérico da lista, nunca invente um id).
                    Se nenhuma se aplicar bem, use confianca abaixo de 0.5.""")
                .user("Lançamento: \"%s\" | Parceiro: \"%s\"\nCategorias:\n%s"
                    .formatted(descricaoLancamento, parceiroNome, catalogo))
                .call()
                .entity(SugestaoCategoria.class);

            // Validação dupla: o id devolvido PRECISA existir na lista da empresa (IA não burla tenant).
            boolean valido = s != null && ativas.stream().anyMatch(c -> c.getId().equals(s.categoriaId()));
            return valido && s.confianca() >= 0.5 ? Optional.of(s) : Optional.empty();
        } catch (Exception e) {
            log.warn("[ClassificacaoIA] falha na sugestão — seguindo sem categoria. requestId={}",
                MDC.get("requestId"));
            return Optional.empty();   // classificação é opcional: nunca derruba o lançamento
        }
    }
}
```

Guardrails obrigatórios:
- O catálogo enviado ao modelo vem **só** de `findByEmpresaIdAndAtivoTrue(empresaId)`.
- O id retornado é validado contra esse mesmo catálogo (o modelo não escolhe id de fora).
- Falha da OpenAI → `Optional.empty()`, lançamento segue sem categoria (nunca 500).
- Registrar em `tb_auditoria` com `is_ai_action=true` quando aplicada via chat
  (padrão V40 já existente).

### 3.3 Épico 2 — Sincronização RAG (Java)

```java
// chat/service/RagSincronizacaoService.java
@Service
public class RagSincronizacaoService {

    private final VectorStore vectorStore;
    private final RagSyncRepository ragSyncRepository;
    private final EmpresaRepository empresaRepository;
    // ⚠️ NÃO injetar DashboardService/RelatorioService aqui: eles leem
    // tenantCtx.getEmpresaId(), e scheduler roda FORA de requisição HTTP — o
    // TenantContext estará vazio e a agregação quebraria (CLAUDE.md §14).
    // Usar queries de repository que recebem empresaId como parâmetro explícito.
    private final ContaRepository contaRepository;
    private final LancamentoCartaoRepository lancamentoCartaoRepository;

    /** Roda de madrugada; itera empresas ativas — padrão do SincronizacaoService existente. */
    @Scheduled(cron = "0 30 3 * * *", zone = "America/Sao_Paulo")
    public void sincronizarTodas() {
        for (Long empresaId : empresaRepository.findIdsAtivas()) {
            try {
                sincronizarEmpresa(empresaId);
            } catch (Exception e) {
                log.error("[RAG-Sync] falha empresaId={} — segue para a próxima", empresaId, e);
            }
        }
    }

    @Transactional
    void sincronizarEmpresa(Long empresaId) {
        YearMonth mes = YearMonth.now().minusMonths(1);
        String texto = montarResumoMensal(empresaId, mes);   // agregações SQL, sem carregar entities
        String hash = sha256(texto);
        String docId = "resumo-mensal-%d-%s".formatted(empresaId, mes);   // determinístico → upsert

        var jaSync = ragSyncRepository.findByEmpresaIdAndTipoResumoAndPeriodo(
            empresaId, "RESUMO_MENSAL", mes.toString());
        if (jaSync.isPresent() && jaSync.get().getHashConteudo().equals(hash)) return; // sem mudança

        vectorStore.delete(List.of(docId));   // upsert manual: remove ponto antigo antes
        vectorStore.add(List.of(new Document(docId, texto, Map.of(
            "empresaId", empresaId.toString(),      // MESMO metadado usado pelo RagService.recuperarContexto
            "tipo", "resumo_financeiro",
            "fonte", "sync-" + mes))));

        // persiste o estado (upsert em tb_rag_sync) — se o embedding falhar, transação reverte
    }
}
```

Exemplo do texto vetorizado (resumo — é ISSO que vira embedding, nunca linhas cruas):

```
Resumo financeiro de 2026-06 — receitas totais R$ 12.340,00; despesas R$ 9.870,50;
maior categoria de gasto: Alimentação (R$ 2.310,00, 23%); parceiro mais frequente:
Supermercado X (14 lançamentos); 3 contas venceram sem pagamento; fatura do cartão
Nubank fechou em R$ 3.420,00 (alta de 12% vs. mês anterior).
```

**Injeção no prompt**: nenhuma mudança necessária — `RagService.recuperarContexto()` já
filtra por `empresaId` e injeta o bloco "MATERIAL DE REFERÊNCIA" no system prompt. Os
resumos entram na mesma coleção com o mesmo metadado e passam a ser recuperados quando a
pergunta do usuário for semanticamente próxima ("como foi meu mês passado?", "estou
gastando mais com o quê?").

Regras:
- IDs determinísticos por (empresa, tipo, período) → re-execução faz upsert, nunca duplica.
- `hash_conteudo` evita custo de re-embedding quando nada mudou.
- Agregações via queries de projeção nos repositories, **sempre com `empresaId` como
  parâmetro explícito do método** — nunca serviços que dependem do `TenantContext`
  (vazio em scheduler) e nunca iterar entities.
- **Backfill na primeira execução:** para cada empresa, se `tb_rag_sync` não tem nenhum
  `RESUMO_MENSAL`, indexar os últimos 12 meses (ou desde o primeiro lançamento, o que for
  menor) — senão a "memória" da IA nasce com um único mês. Execuções seguintes processam
  só o mês anterior.
- LGPD: resumos não incluem CPF/CNPJ nem e-mails; nomes de parceiros são dados da
  própria empresa (ok), mas nada de dados pessoais de usuários.
- Endpoint manual de re-sync (opcional): `POST /api/chat/rag/sincronizar` com
  `@Requer("CONFIGURACAO_EDITAR")` + `exigirContaEmpresa()`.

### 3.4 Épico 3 — PWA (frontend JSX)

> O repositório é **JavaScript JSX** — onde o pedido original citava "interfaces
> TypeScript", entregue JSDoc `@typedef` nos novos módulos (padrão do projeto: sem TS).

Instalar: `npm i -D vite-plugin-pwa` (única dependência nova; workbox vem junto).

```js
// vite.config.js — ADICIONAR ao array plugins existente (não remover react/tailwind/proxy)
import { VitePWA } from 'vite-plugin-pwa';

VitePWA({
  registerType: 'prompt',            // usuário decide atualizar — evita recarga no meio de um lançamento
  includeAssets: ['favicon.svg'],
  manifest: {
    name: 'Core 4 ERP',
    short_name: 'Core4',
    description: 'Gestão financeira completa: contas, cartões, investimentos e assistente IA.',
    lang: 'pt-BR',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',     // slate-900 — casa com o tema dark default
    theme_color: '#0f172a',
    icons: [
      { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,woff2}'],   // precache do app shell
    navigateFallback: '/index.html',                   // SPA offline abre o shell
    navigateFallbackDenylist: [/^\/api\//],
    runtimeCaching: [
      {
        // REGRA DE SEGURANÇA: dado financeiro NUNCA vai para o Cache Storage.
        // NetworkOnly = sem rede, sem dado (a UI mostra estado offline).
        urlPattern: /^.*\/api\/.*/,
        handler: 'NetworkOnly',
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|gif|webp|avif)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'imagens',
          expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
    ],
  },
})
```

```jsx
// src/hooks/usePwa.js — registro + estados de atualização/offline
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useSyncExternalStore } from 'react';

const subscribe = (cb) => {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb); };
};

export function usePwa() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine);
  const { needRefresh: [precisaAtualizar], updateServiceWorker } = useRegisterSW();
  return { online, precisaAtualizar, atualizar: () => updateServiceWorker(true) };
}
```

Pontos de atenção:
- **Nunca** cachear `/api` (JWT httpOnly + dado financeiro sensível + staleness). Offline
  "básico" = shell abre, telas mostram banner "Você está offline — os dados aparecem
  quando a conexão voltar" (componente `OfflineBanner` no `ProtectedLayout`).
- Gerar `pwa-192.png`, `pwa-512.png` e a variante maskable a partir do `favicon.svg`
  existente (colocar em `front-end/public/`).
- **iOS/Safari ignora parte do manifest**: adicionar no `index.html` —
  `<link rel="apple-touch-icon" href="/pwa-192.png">` e
  `<meta name="apple-mobile-web-app-capable" content="yes">`. Sem isso, "Adicionar à
  Tela de Início" no iPhone instala com ícone quebrado.
- PWA exige **HTTPS** (exceto localhost): produção já atende via cloudflared; em dev,
  testar instalação apenas via `npm run preview` local.
- Produção é servida por **nginx** — conferir que `sw.js` e `manifest.webmanifest` são
  servidos da raiz com `Cache-Control: no-cache` para o SW (senão atualização trava).
- Testar com `npm run build && npm run preview` + Lighthouse (aba PWA instalável).

---

## 4. Roadmap de Implementação (Passos 1–10, sequencial)

Cada passo é um commit isolado, com build verde antes de avançar. Não pule a ordem —
ela garante que nada em produção quebra no meio do caminho.

| # | Entrega | Critério de aceite |
|---|---|---|
| **1** | Migration **V42** (categoria_pai_id + ativo + índices) e atualização da entity `Categoria`. Nada de lógica ainda. | `./gradlew build` verde; app sobe com `ddl-auto=validate` contra banco migrado |
| **2** | `CategoriaService`/`Controller`: criar/editar com `categoriaPaiId`, validações de hierarquia (2 níveis, mesmo tenant), soft delete em cascata, endpoint de árvore (`GET /api/categorias/arvore`) | Testes de service cobrindo: 3º nível bloqueado, pai de outra empresa bloqueado, cascata de desativação |
| **3** | **Roll-up nas agregações**: revisar TODAS as queries que agrupam por `categoria_id` (RelatorioService, DashboardService, painéis BI de cartão) para somar subcategorias no pai via `COALESCE(categoria_pai_id, id)` | Gasto em subcategoria aparece no total da categoria-pai em relatório, dashboard e BI |
| **4** | Frontend Categorias: árvore pai→filho na view (indentação/expansão), seleção de subcategoria nos formulários de conta e lançamento de cartão (dropdown agrupado); filtros das views agrupados (filtrar pelo pai inclui filhas) | Criar/editar subcategoria pela tela; lançamento aceita subcategoria; filtro por pai traz lançamentos das filhas |
| **5** | Migration **V43** (flags de classificação IA) + `ClassificacaoIaService` com saída estruturada, validação de id contra o catálogo do tenant e fallback silencioso | Teste unitário com ChatClient mockado: id inválido → empty; confiança < 0.5 → empty |
| **6** | Fluxo A: tools de lançamento do chat usam o classificador quando o usuário não informa categoria; auditoria com `is_ai_action=true`. Fluxo B: `POST /api/categorias/sugerir` + botão "Sugerir" nos formulários. Atualizar `CadastroTools`/`ConsultaTools` para hierarquia | Lançar pelo chat sem categoria → sugerida e auditada; Áurea cria subcategoria e lista com caminho completo |
| **7** | Migration **V44** (`tb_rag_sync`) + `RagSincronizacaoService` (queries com `empresaId` explícito — nunca TenantContext), backfill de 12 meses na 1ª execução, hash, doc_id determinístico, scheduler | Rodar sync 2× → nenhum ponto duplicado no Qdrant; 1ª execução gera 12 resumos por empresa com dados |
| **8** | Perfis complementares no sync (PERFIL_CATEGORIAS, PERFIL_PARCEIROS) + endpoint manual de re-sync (`@Requer("CONFIGURACAO_EDITAR")`) | Perguntar à Áurea "como foi meu mês passado?" → resposta usa o resumo do RAG |
| **9** | PWA completo: `vite-plugin-pwa`, manifest, ícones PNG + apple-touch-icon, precache do shell, `/api` NetworkOnly, `usePwa` + `OfflineBanner`, headers nginx do `sw.js` | Lighthouse instalável; nenhum `/api` no Cache Storage; offline → shell com banner; nova build → prompt de atualização |
| **10** | Passada final: `./gradlew build` + `npm run build`, teste manual dos 3 épicos, atualizar `CLAUDE.md` (migrations V42–V44, categorias hierárquicas + roll-up, PWA) e este documento com o status | Esteira de QA verde de ponta a ponta; documentação sincronizada |

### Fora de escopo (não implemente sem nova decisão)
- Vetorizar lançamentos individuais linha a linha no Qdrant (antipadrão aqui — ver §1).
- Cache offline de dados financeiros ou fila offline de escrita (background sync).
- Hierarquia com mais de 2 níveis.
- Migrar frontend para TypeScript.
