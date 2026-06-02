# CLAUDE.md — Core 4 ERP

Guia de contexto para IAs assistindo no desenvolvimento. Leia antes de qualquer tarefa.

---

> **Regra de ouro antes de planejar ou executar qualquer tarefa:**
> Consulte a pasta `Skill/` e verifique se existe algum guia aplicável ao que será feito.
> Leia o arquivo relevante antes de começar — ele contém padrões, checklist e armadilhas específicas para aquela categoria de trabalho.

### Skills disponíveis em `Skill/`

| Arquivo | Quando usar |
|---|---|
| `security-audit.md` | Qualquer mudança em auth, CORS, JWT, permissões, filtros de segurança, dados sensíveis |
| `Code Revew.md` | Ao revisar um PR ou avaliar qualidade geral de código |
| `architecture-review.md` | Ao propor novos módulos, refatorações estruturais ou mudanças de pacote |
| `api-contract-review.md` | Ao criar ou modificar endpoints REST, DTOs, paginação ou respostas de erro |
| `jpa-patterns.md` | Ao escrever queries JPA, repositórios, relacionamentos ou migrations |
| `spring-boot-patterns.md` | Ao criar services, controllers, configurações Spring ou beans |
| `concurrency-review.md` | Ao tocar em cache (Caffeine), schedulers, filas (LinkedBlockingQueue) ou operações assíncronas |
| `performance-smell-detection.md` | Ao trabalhar em dashboard, relatórios, conciliação ou qualquer query sobre grandes volumes |
| `design-patterns.md` | Ao propor abstrações, refatorar lógica complexa ou introduzir novos padrões |
| `solid-principles.md` | Ao revisar ou projetar services e classes com múltiplas responsabilidades |
| `clean-code.md` | Ao revisar nomenclatura, legibilidade ou estrutura de métodos |
| `logging-patterns.md` | Ao adicionar logs, MDC, observabilidade ou rastreamento de erros |
| `maven-dependency-audit.md` | Ao adicionar, atualizar ou remover dependências do `build.gradle` |
| `SKILL_swagger.md` | Ao documentar endpoints com SpringDoc/OpenAPI |
| `SKILL_VERCEL.md` | Ao configurar ou ajustar deploy no Vercel |

---

## 1. Visão Geral do Projeto

Sistema ERP de gestão financeira pessoal full-stack. Permite controle de contas a pagar/receber, conciliação bancária e de cartão (OFX), investimentos, assinaturas recorrentes, relatórios e um assistente de IA integrado.

**Domínio:** Português Brasileiro. Todas as entidades, DTOs, endpoints, variáveis e mensagens ao usuário devem ser em pt-BR.

---

## 2. Stack Tecnológica

### Backend
| Componente | Tecnologia | Versão |
|---|---|---|
| Linguagem | Java | 21 |
| Framework | Spring Boot | 3.3.2 |
| Build | Gradle | 8.10.2 |
| ORM | Spring Data JPA + Hibernate | via Boot 3.3.2 |
| Banco de Dados | PostgreSQL | 15+ |
| Migrations | Flyway | via Boot 3.3.2 |
| Autenticação | JWT (JJWT) | 0.12.6 |
| IA | Spring AI + Google Gemini | 2.0 Flash |
| Docs API | SpringDoc OpenAPI | 2.6.0 |
| Rate Limiting | Bucket4j | 8.7.0 |
| Cache | Caffeine | via Boot |
| Relatórios Excel | Apache POI | 5.3.0 |
| Métricas | Micrometer + Prometheus | via Boot |

### Frontend
| Componente | Tecnologia | Versão |
|---|---|---|
| Linguagem | JavaScript (JSX) | ES2022+ |
| Framework | React | 19.0.0 |
| Build | Vite | 6.2.0 |
| Estilização | Tailwind CSS | 4.1.14 |
| Roteamento | React Router DOM | 7.13.2 |
| Ícones | Lucide React | latest |
| Animações | Motion | latest |
| Gráficos | Recharts | 3.8.1 |
| PDF | jsPDF + jspdf-autotable | 4.2.1 / 5.0.7 |
| Datas | date-fns | 4.1.0 |
| Chat UI | @assistant-ui/react | 0.12.25 |

### Infraestrutura
- Docker + Docker Compose (multi-stage builds)
- Nginx (serve SPA + proxy `/api/` → backend)
- Observabilidade: Prometheus, Grafana, Loki, Promtail

### Comandos rápidos
```bash
# Backend
cd core4erp && ./gradlew bootRun

# Frontend
cd front-end && npm install && npm run dev

# Stack completa
docker-compose up --build
```

**Branch base:** `main` · branches de feature a partir de `main`
**Skill files:** `Skill/` — guides de review (security-audit, Code Review, architecture-review, etc.)

---

## 3. Arquitetura e Estrutura de Pastas

### Backend: `core4erp/src/main/java/br/com/core4erp/`

Cada módulo de domínio segue a mesma estrutura interna:
```
<modulo>/
  controller/   → @RestController, recebe requisições HTTP
  dto/          → objetos de transferência (request/response separados)
  entity/       → @Entity JPA, mapeada para tabela do banco
  repository/   → @Repository, extends JpaRepository
  service/      → @Service, lógica de negócio
  enums/        → enumerações do domínio (quando aplicável)
```

**Módulos de domínio existentes:**
`auth`, `usuario`, `empresa`, `categoria`, `parceiro`, `conta`, `contaCorrente`, `cartaoCredito`, `investimento`, `assinatura`, `conciliacao`, `conciliacaoCartao`, `notificacao`, `chat`, `relatorio`, `dashboard`

**Infraestrutura transversal:**
```
config/
  auditing/   → JPA Auditing (createdBy, createdDate, etc.)
  env/        → carregamento de variáveis de ambiente
  security/   → JwtService, JwtFilter, SecurityConfig, RateLimitFilter
  tenant/     → TenantContext, TenantFilter
  rbac/       → Requer, PermissaoAspect, PermissaoCalculadora
  web/        → DataSource, configuração multi-datasource
enums/        → enumerações globais
exception/    → GlobalExceptionHandler + modelos de erro
utils/        → CNPJ, telefone, contexto de requisição
observabilidade/ → logging estruturado + métricas Prometheus
```

### Frontend: `front-end/src/`
```
views/        → páginas completas (uma por rota)
components/   → componentes reutilizáveis, agrupados por domínio
  ui/         → componentes genéricos (DataTable, Toast, Modal, PermissaoGuard, etc.)
  layout/     → Sidebar, TopNav
  dashboard/  → painéis do dashboard
  conciliacao/ e conciliacaoCartao/ → fluxos de conciliação
  chat/       → interface do assistente IA
  reports/    → filtros e cards de relatório
hooks/        → custom hooks React
context/      → React Context (Theme, Auth)
lib/          → utilitários puros (api.js, formatters.js, pdfUtils.js, permissaoMessages.js)
```

**Arquivos-chave do frontend:**
```
src/hooks/useAuth.js         — hook central: temPermissao(), adminSistema, senhaProvisoria, logout
src/lib/api.js               — fetch com credentials:include; getLoginState() com try-catch
src/lib/routeUtils.js        — ROUTE_PRIORITY + getFirstAccessibleRoute(temPermissao)
src/App.jsx                  — AdminRoute, PermissaoRoute, ContaEmpresaRoute, NavigateToFirstAccessible, ProtectedLayout
src/components/layout/
  Sidebar.jsx                — itens com {permissao: 'CODIGO', empresaOnly: true} filtrados
  TopNav.jsx                 — mostra "Admin Sistema" se adminSistema=true
src/components/ui/
  PermissaoGuard.jsx         — renderização condicional (UX); validação real está no backend
```

---

## 4. Multi-Tenancy (Regra Inegociável)

O projeto possui **dois níveis** de multi-tenancy: isolamento por usuário (dado financeiro) e isolamento por empresa (RBAC).

### Nível 1 — Dados financeiros (por empresa)

**Todo dado financeiro pertence a uma empresa.** Membros da mesma empresa compartilham acesso aos dados (controlado por permissões RBAC).

- Todas as entidades financeiras estendem `TenantEntity` que possui `empresaId` (preenchido automaticamente pelo `TenantEntityListener` no `@PrePersist`).
- **Toda query de repository DEVE filtrar por `empresaId`** — nunca retorne dados sem esse filtro.
- O `empresaId` é obtido do `TenantContext`, nunca aceito como parâmetro de request.
- Padrão de extração no service:
  ```java
  Long empresaId = tenantCtx.getEmpresaId();
  return repo.findAllByEmpresaId(empresaId, pageable);
  ```
- O campo `usuario` nas entidades financeiras é o **creator/audit**, não o filtro de acesso.
- Para PESSOA_FISICA: cada usuário tem sua própria empresa (criada em V22), então `empresaId` continua sendo único por usuário solo.
- Violar este padrão é uma falha crítica de segurança (vazamento cross-tenant entre membros de empresas diferentes).

### Nível 2 — Empresas e RBAC (TenantContext)

```
JWT (httpOnly cookie)
  → JwtFilter (extrai email)
  → TenantFilter (@Order=3)
       ├─ adminSistema=true  → popula TenantContext, sem validação de perfil
       └─ usuário regular    → findByUsuario_EmailAndEmpresaId
                                 ├─ ue == null  → HTTP 403 (cross-tenant)
                                 └─ ue inativo  → HTTP 401
                              → PermissaoCalculadora (perfil + diretas − revogadas)
                              → popula TenantContext (request-scoped)
  → PermissaoAspect (@Requer intercepta métodos de service E controller)
       └─ verifica isPopulado() antes de exigirPermissao()
```

**Arquivos-chave do sistema de permissões:**
```
config/tenant/
  TenantContext.java          — state request-scoped: usuarioId, empresaId, permissoes, adminSistema, tipoConta
  TenantFilter.java           — popula TenantContext; rejeita cross-tenant e usuários inativos
config/rbac/
  Requer.java                 — anotação @Requer("PERMISSAO_CODIGO")
  PermissaoAspect.java        — intercepta @Requer com @Before; verifica isPopulado()
  PermissaoCalculadora.java   — perfil base + concessões diretas − revogações (1 passagem)
empresa/
  entity/PerfilAcesso.java    — perfis: PROPRIETARIO, ADMIN, FINANCEIRO, OPERADOR, VISUALIZADOR
  entity/Permissao.java       — código, módulo, ação
  entity/UsuarioEmpresa.java  — vínculo usuário ↔ empresa com perfil e ativo flag
  entity/UsuarioEmpresaPermissao.java — permissão direta: revogada=false (concede) ou =true (revoga)
  service/UsuarioPermissaoService.java — CRUD de permissões; valida escalada de privilégio
  service/OperadorService.java         — gestão de membros da empresa
  service/ConviteService.java          — convite e aceite de novos operadores
```

**Códigos de permissão (tb_permissao, V19 + V30 + V31):**
```
CONTA_VISUALIZAR/CRIAR/EDITAR/DELETAR/BAIXAR/ESTORNAR
CONTA_CORRENTE_VISUALIZAR/CRIAR/EDITAR/DELETAR/TRANSFERIR
CARTAO_VISUALIZAR/CRIAR/EDITAR/DELETAR/LANCAR/FECHAR_FATURA
CARTAO_CONCILIACAO_VISUALIZAR/IMPORTAR/VINCULAR   ← V30 (tela /cartoes/conciliacao)
CATEGORIA_VISUALIZAR/CRIAR/EDITAR/DELETAR
PARCEIRO_VISUALIZAR/CRIAR/EDITAR/DELETAR
INVESTIMENTO_VISUALIZAR/CRIAR/EDITAR/DELETAR
INVESTIMENTO_TIPO_GERENCIAR                       ← V31 (gerenciar tipos de investimento)
ASSINATURA_VISUALIZAR/CRIAR/EDITAR/DELETAR
CONCILIACAO_VISUALIZAR/IMPORTAR/VINCULAR           (conciliação bancária)
RELATORIO_EXPORTAR                                 (legado V19 — não usado por @Requer)
RELATORIO_FLUXO_CAIXA_VISUALIZAR/EXPORTAR         ← V31
RELATORIO_CONTAS_ABERTAS_VISUALIZAR/EXPORTAR      ← V31
RELATORIO_EXTRATO_VISUALIZAR/EXPORTAR             ← V31
RELATORIO_DRE_VISUALIZAR/EXPORTAR                 ← V31
RELATORIO_INVESTIMENTOS_VISUALIZAR/EXPORTAR       ← V31
RELATORIO_CARTOES_VISUALIZAR/EXPORTAR             ← V31
RELATORIO_POSICAO_FINANCEIRA_VISUALIZAR/EXPORTAR  ← V31
RELATORIO_ASSINATURAS_VISUALIZAR/EXPORTAR         ← V31
USUARIO_VISUALIZAR/CONVIDAR/EDITAR/REMOVER
AUDITORIA_VISUALIZAR
CONFIGURACAO_EDITAR
CALENDARIO_VISUALIZAR                              ← V30 (tela /calendario)
DASHBOARD_VISUALIZAR                               ← V31 (GET /api/dashboard)
DASHBOARD_CARTAO_VISUALIZAR                        ← V31 (GET /api/dashboard/saldo-detalhado)
```

**Mapeamento tela → permissão (frontend):**
```
/dashboard                  → PermissaoRoute("DASHBOARD_VISUALIZAR"); SaldoDetalhadoPanel usa PermissaoGuard("DASHBOARD_CARTAO_VISUALIZAR")
/cartoes/dashboard          → CARTAO_VISUALIZAR
/cartoes (lançamentos)      → CARTAO_LANCAR
/cartoes/conciliacao        → CARTAO_CONCILIACAO_VISUALIZAR
/categorias                 → CATEGORIA_VISUALIZAR  (PermissaoRoute)
/investimentos              → INVESTIMENTO_VISUALIZAR (PermissaoRoute)
/reports                    → sem PermissaoRoute; cada card usa PermissaoGuard(RELATORIO_*_VISUALIZAR)
                              botão Excel visível só com RELATORIO_*_EXPORTAR
/calendario                 → CALENDARIO_VISUALIZAR
/audit                      → AUDITORIA_VISUALIZAR  (PermissaoRoute + ContaEmpresaRoute)
/empresa/operadores         → USUARIO_VISUALIZAR    (PermissaoRoute + ContaEmpresaRoute)
/empresa/perfis             → CONFIGURACAO_EDITAR   (PermissaoRoute + ContaEmpresaRoute)
/admin/planos               → AdminRoute (adminSistema)
```

**Regra de dependência VISUALIZAR em Perfis (GestaoPerfis.jsx):**
- Ao habilitar qualquer ação que não seja VISUALIZAR em um módulo → VISUALIZAR desse módulo é adicionado automaticamente.
- Ao desabilitar VISUALIZAR de um módulo → todas as outras ações do módulo são também removidas.
- Implementado em `togglePermissao()` no `ModalPerfil`.

**Métodos de TenantContext usados nos services:**
- `temPermissao(String codigo)` → boolean; verificação sem exceção
- `exigirPermissao(String codigo)` → lança `AcessoNegadoException` se não tiver (admin bypass)
- `isPopulado()` → `empresaId != null`; verificado pelo `PermissaoAspect` antes de checar permissão
- `exigirContaEmpresa()` → lança exceção se `tipoConta == "PESSOA_FISICA"`; protege operações que exigem conta empresarial
- `exigirAdminSistema()` → lança exceção se não for admin do sistema

**Regras de aplicação:**
- **Defense-in-depth**: `@Requer` deve estar no controller **e** na service.
- **TenantContext** é `@Scope(REQUEST)` — nunca compartilhado entre requisições.
- **Cache de permissões**: Caffeine cache com chave `Objects.hash(email, empresaId)` (hex). Invalidar **antes** de persistir mudanças.
- **adminSistema bypass**: `exigirPermissao()` retorna imediatamente se `adminSistema=true`.
- **PROPRIETARIO** nunca pode ter permissões alteradas individualmente.
- **Escalada de privilégio**: admin não pode conceder permissão que ele mesmo não possui (validado em `UsuarioPermissaoService.validarEscaladaDePrivilegio()`).

**Rotas frontend:**
- `/admin/planos` → `AdminRoute`
- `/empresa/operadores` → `PermissaoRoute("USUARIO_VISUALIZAR")`
- `/empresa/perfis` → `PermissaoRoute("CONFIGURACAO_EDITAR")`
- `/audit` → `PermissaoRoute("AUDITORIA_VISUALIZAR")` (não AdminRoute)
- `/calendario` → `PermissaoRoute("CALENDARIO_VISUALIZAR")`
- `/categorias` → `PermissaoRoute("CATEGORIA_VISUALIZAR")`
- `/investimentos` → `PermissaoRoute("INVESTIMENTO_VISUALIZAR")`
- `/cartoes/dashboard` → `PermissaoRoute("CARTAO_VISUALIZAR")`
- `/cartoes` → `PermissaoRoute("CARTAO_LANCAR")`
- `/cartoes/conciliacao` e sub-rotas → `PermissaoRoute("CARTAO_CONCILIACAO_VISUALIZAR")`
- `/reports` → sem PermissaoRoute; PermissaoGuard por card (RELATORIO_*_VISUALIZAR / EXPORTAR)
- `/dashboard` → `PermissaoRoute("DASHBOARD_VISUALIZAR")`; SaldoDetalhadoPanel gateado por DASHBOARD_CARTAO_VISUALIZAR

**Operadores — reativação:**
- `PATCH /api/empresa/operadores/{usuarioId}/reativar` — requer `USUARIO_EDITAR`
- `OperadorService.reativar()` usa `findByUsuarioIdAndEmpresaId()` (sem filtro ativo) para encontrar inativos
- Frontend: botão "Reativar" aparece para operadores com `ativo=false`; botão "Remover" para `ativo=true`

---

## 5. Autenticação e Segurança

- JWT armazenado em **HttpOnly cookie** (não no localStorage) — imune a XSS.
- Algoritmo: HS256. Segredo via variável de ambiente `SECRET_KEY` (mínimo 64 caracteres).
- Rate limiting via Bucket4j: 10 tentativas por IP por minuto em `/api/auth/login`.
  - `RateLimitFilter.shouldNotFilter()` retorna `false` para `/api/auth/login` — o rate limit **já está ativo**.
- Login com lockout após tentativas falhas (`V7__add_login_lockout.sql`).
- Password reset via token com validade (gerenciado por `V12__add_reset_token.sql`).
- CORS configurado via `CORS_ORIGINS` no `.env`.
- **Nunca expor o `usuarioId` em URLs públicas** — use sempre o JWT como fonte da identidade.
- `X-Empresa-Id` header: para usuários regulares é validado via `findByUsuario_EmailAndEmpresaId` (HTTP 403 se não pertencer); para `adminSistema` sem validação de membership, mas logado em `DEBUG`.

---

## 6. Banco de Dados

### Convenções de Nomenclatura (SQL)
- Tabelas: `tb_<nome_no_singular>` (ex: `tb_conta`, `tb_parceiro`)
- PKs: `id` (serial/bigserial)
- FKs: `<entidade>_id` (ex: `usuario_id`, `categoria_id`)
- Colunas de auditoria JPA: `created_by`, `created_date`, `last_modified_by`, `last_modified_date`
- Snake_case para todos os nomes de colunas

### Entidades Principais
```
tb_usuario              → âncora central de multi-tenancy
tb_empresa              → empresas (multi-tenancy RBAC)
tb_categoria            → categorias de receita/despesa
tb_parceiro             → fornecedores e clientes
tb_conta                → contas a pagar/receber
tb_conta_corrente       → contas bancárias
tb_cartao_credito       → cartões de crédito
tb_lancamento_cartao    → lançamentos por fatura
tb_fatura_cartao        → faturas do cartão
tb_conta_investimento + tb_transacao_investimento
tb_assinatura           → assinaturas recorrentes
tb_conciliacao          → conciliação bancária (OFX)
tb_conciliacao_cartao   → conciliação de cartão (OFX)
tb_notificacao
tb_transferencia        → transferências entre contas correntes
tb_perfil_acesso, tb_permissao, tb_perfil_permissao → RBAC
tb_usuario_empresa, tb_usuario_empresa_permissao    → vínculo usuário ↔ empresa
tb_auditoria
tb_plano, tb_pagamento_mock
tb_convite
```

### Flyway — Regras Obrigatórias
- **Nunca altere uma migration já commitada.** Crie sempre uma nova versão.
- `spring.jpa.hibernate.ddl-auto=validate` — DDL gerenciado exclusivamente pelo Flyway.
- Ao adicionar coluna NOT NULL em tabela existente, forneça DEFAULT ou faça em 2 migrations.
- Descrição no nome do arquivo deve ser legível: `V30__add_campo_observacao_conta.sql`
- **Próxima migration disponível: V36** (V35 já existe).

**Sequência de migrations:**
```
V1      initial_schema
V4      consolidated_schema  (V2 e V3 foram consolidadas aqui)
V5      create_tb_assinatura
V6      create_tb_conciliacao
V7      add_login_lockout
V8      add_assinatura_cartao
V9      business_rules
V10     investimento_tipo_nullable
V11     conta_corrente_saldo_config
V12     add_reset_token
V13     alter_telefone_to_varchar
V14     create_tb_transferencia
V15     fix_tb_transferencia_audit_columns
V16     add_acct_id_cartao
V17     create_tb_conciliacao_cartao
V18     create_tb_empresa
V19     create_tb_perfil_acesso  (tb_permissao, tb_perfil_permissao)
V20     create_tb_usuario_empresa
V21     create_tb_auditoria
V22     migrate_usuario_to_empresa
V23     add_empresa_id_to_all_tables
V24     create_tb_usuario_empresa_permissao
V25     add_tipo_conta_e_admin_sistema
V26     create_tb_plano
V27     create_tb_convite
V28     create_tb_pagamento_mock
V29     fix_tipo_conta_to_varchar
V30     add_calendario_e_cartao_conciliacao_permissions
V31     add_relatorio_investimento_dashboard_permissions
V32     add_empresa_id_to_perfil_acesso
V33     add_empresa_id_to_tipo_investimento
V34     add_audit_columns_to_tipo_investimento
V35     fix_conta_corrente_unique_numero_por_empresa
```

Banco de log (`db/migration-log/`) tem migrations separadas para `tb_log_geral` e `tb_log_performance`.

---

## 7. Convenções de Código — Backend (Java)

### Nomenclatura
- Classes: `PascalCase`
- Métodos e variáveis: `camelCase`
- Constantes: `UPPER_SNAKE_CASE`
- Pacotes: `lowercase` sem separadores
- DTOs de entrada: sufixo `RequestDto` (ex: `CriarContaRequestDto`)
- DTOs de saída: sufixo `ResponseDto` (ex: `ContaResponseDto`)
- Entities: nome do domínio sem sufixo (ex: `Conta`, `Parceiro`)
- DTOs simples sem direção clara: sufixo `Dto` (ex: `EmpresaResumoDto`)

### Endpoints REST
- Base path: `/api/<modulo>` (ex: `/api/contas`, `/api/parceiros`)
- Verbos HTTP semânticos: GET (leitura), POST (criação), PUT (atualização completa), DELETE (remoção)
- Respostas de sucesso: `ResponseEntity<T>` com status adequado (200, 201, 204)
- IDs de recurso na URL: `/api/contas/{id}`

### Tratamento de Erros
- `GlobalExceptionHandler` (`@RestControllerAdvice`) centraliza todos os erros.
- Nunca lance exceções genéricas — use `ResponseStatusException` ou crie exceções de domínio específicas.
- Resposta de erro padrão: `{ "status": 4xx, "mensagem": "...", "timestamp": "..." }`
- Validações de entrada: use Bean Validation (`@NotNull`, `@NotBlank`, `@NotEmpty`, `@Valid`) nos DTOs. Use `@NotEmpty` para `Collection` e `Set` — `@NotNull` não impede coleções vazias.

### Mensagens ao Usuário — Regra de Clareza

**Toda mensagem exibida ao usuário final deve ser amigável, clara e livre de termos técnicos.**

- Escreva como se o usuário não tivesse conhecimento técnico algum.
- Descreva **o que aconteceu** e, quando possível, **o que o usuário pode fazer**.
- Nunca exponha: códigos de permissão, nomes de exceções Java, stack traces, nomes de tabelas/colunas, chaves de constraint ou qualquer artefato interno do sistema.

```
❌ "Permissão necessária: INVESTIMENTO_CRIAR"
✅ "Você não tem permissão para criar investimentos. Solicite acesso ao administrador."

❌ "DataIntegrityViolationException: duplicate key value violates unique constraint"
✅ "Já existe um registro com esses dados. Verifique as informações e tente novamente."

❌ "EntityNotFoundException: Conta não encontrada: 42"
✅ "Registro não encontrado. Ele pode ter sido removido."

❌ "Operação viola restrições de integridade — verifique se o registro está em uso"
✅ "Não é possível remover este item pois ele está sendo usado em outro lugar."
```

Esta regra se aplica a:
- Mensagens retornadas pelo `GlobalExceptionHandler` (campo `mensagem`)
- Toasts, alertas e textos de erro no frontend
- Validações de formulário (Bean Validation `message =`)
- Respostas de erro de qualquer endpoint REST

**No frontend:** use `front-end/src/lib/permissaoMessages.js` como referência de padrão. Mensagens de permissão negada já são traduzidas automaticamente em `api.js`.

### JPA / Hibernate
- Fetch type padrão: `LAZY`. Nunca use `EAGER` sem justificativa explícita.
- Relacionamentos bidirecionais: gerencie o lado owner da relação.
- Projections para queries de leitura que não precisam da entidade completa.
- Queries nativas apenas quando JPQL for insuficiente.
- **N+1 query**: nunca iterar sobre coleções lazy dentro de um loop — usar `JOIN FETCH` ou `@EntityGraph` na query pai.

### @Transactional
- Colocar `@Transactional` no **service**, nunca no controller ou repository.
- Operações de leitura: `@Transactional(readOnly = true)` — evita flush desnecessário.
- Operações que envolvem múltiplas escritas (ex: transferência, baixa de conta) DEVEM ser `@Transactional` para garantir atomicidade.
- Propagação padrão (`REQUIRED`) é suficiente para 99% dos casos — não alterar sem necessidade clara.
- Lançar exceções unchecked (`RuntimeException`) dentro de `@Transactional` faz rollback automático; checked exceptions **não** fazem rollback por padrão.

### Padrões recorrentes

**Controller com @Requer (defense-in-depth):**
```java
@GetMapping
@Requer("CONTA_VISUALIZAR")
public ResponseEntity<Page<ContaResponseDto>> listar(...) {
    return ResponseEntity.ok(contaService.listarComFiltros(...));
}
```

**Service com @Requer (segunda camada):**
```java
@Requer("USUARIO_VISUALIZAR")
public Page<OperadorResponseDto> listar(Pageable pageable) {
    tenantCtx.exigirContaEmpresa();
    return usuarioEmpresaRepository.findByEmpresaId(tenantCtx.getEmpresaId(), pageable).map(this::toDto);
}
```

**Invalidação de cache (antes de persistir):**
```java
invalidarCache(ue.getUsuario().getEmail());  // ANTES
permissaoUsuarioRepository.save(registro);
```

**`substituirTodas` gera revogações automáticas para permissões de perfil:**
- Após deletar as diretas existentes, para cada permissão do perfil do usuário que NÃO esteja no conjunto desejado (idsConcedidos), cria automaticamente uma revogação (revogada=true).
- Garante que "Somente Deletar" de fato remove CRIAR/EDITAR do perfil, sem depender do frontend enviar revogações explícitas.
- Itens explícitos do DTO têm prioridade sobre revogações automáticas (LinkedHashMap com chave por permissaoId).

**Log sem email em plaintext (LGPD):**
```java
log.info("Convite criado — empresaId={} emailHash={}", empresaId, hashEmail(dto.email()));

private String hashEmail(String email) {
    return email == null ? "null" : Integer.toHexString(email.hashCode());
}
```

---

## 8. Convenções de Código — Frontend (React/JSX)

### Nomenclatura
- Componentes e arquivos de componente: `PascalCase` (ex: `ContaForm.jsx`)
- Hooks customizados: prefixo `use` + `camelCase` (ex: `useToast.jsx`)
- Funções e variáveis: `camelCase`
- Constantes: `UPPER_SNAKE_CASE` em `lib/constants.js`
- Views (páginas): `PascalCase`, uma por arquivo em `views/`

### Padrões de Componentes
- Componentes funcionais com hooks — sem class components.
- Props desestruturadas na assinatura da função.
- Estado local com `useState`; estado compartilhado via Context ou prop drilling explícito.
- Efeitos colaterais em `useEffect` com array de dependências correto.
- `temPermissao()` usa `useCallback` com deps `[loginState, permissoes]` — sem stale closure.

### Chamadas de API
- **Sempre use `lib/api.js`** — nunca `fetch` direto nos componentes.
- `api.js` inclui `credentials: 'include'` para envio do cookie JWT.
- Base URL via `VITE_API_URL` (default: `http://localhost:8080`).
- `getLoginState()` trata JSON corrompido com `try-catch` retornando `null`.
- Trate erros de API no nível do componente/hook que faz a chamada.

### Formatação
- Valores monetários: use `formatters.js` → `formatCurrency(valor)` — sempre BRL (R$).
- Datas: use `formatters.js` com `date-fns` — formato padrão `dd/MM/yyyy`.
- Nunca formate dinheiro ou datas inline com lógica manual.

### Estilização
- Tailwind CSS classes diretamente no JSX.
- Sem CSS modules ou styled-components.
- Tema claro/escuro gerenciado por `ThemeContext` — use `useTheme()` para classes condicionais.
- Componentes genéricos de UI ficam em `components/ui/` — reutilize antes de criar novos.

### Estado e permissões
- **sessionStorage** para estado do usuário (`loginState`) — limpa ao fechar aba.
- Permissões vêm do `sessionStorage` → para sincronização em tempo real, fazer polling de `/api/auth/me`.
- `PermissaoGuard` é apenas UX — a validação real está sempre no backend.

---

## 9. Módulo de Chat IA

O assistente usa **Spring AI com Google Gemini 2.0 Flash** e um padrão de **tools** (function calling).

### Estrutura de Tools
```
chat/tools/
  consulta/   → tools de leitura (saldos, lançamentos, categorias)
  lancamento/ → tools de escrita (criar conta, parceiro, etc.)
  relatorio/  → tools de geração de relatório
```

- Cada tool é um `@Component` com métodos anotados com `@Tool`.
- Tools de escrita devem revalidar o `usuarioId` do contexto de segurança.
- Cache de histórico de conversa via Caffeine (em memória, por sessão).
- Métricas de uso do chat em `chat/metrics/`.

---

## 10. Módulo de Observabilidade

- `PerformanceMetricsFilter` — filtro mais externo; gera `requestId`; grava `tb_log_performance` por requisição.
- `DatabaseLogAppender` (Logback) — enfileira logs em `LinkedBlockingQueue(1000)`; drena em batch a cada 500ms.
- `LogQueueConsumer` — consome a fila e persiste em `tb_log_geral` com `saveAll()`.
- MDC propagado: `requestId`, `usuarioId`, `empresaId`, `ipAddress`, `httpMethod`, `endpoint`.

---

## 11. Fluxos de Negócio Críticos

### Conciliação Bancária (OFX)
1. Upload do arquivo OFX → parse → salvar em `tb_conciliacao` com status `PENDENTE`.
2. Usuário vincula cada item OFX a uma conta existente ou cria nova inline.
3. Após vinculação: status → `CONCILIADO`, saldo da conta corrente é atualizado.
4. Itens não reconhecidos podem ser ignorados (status `IGNORADO`).

### Fluxo de Cartão de Crédito
- `tb_cartaoCredito` → tem N `tb_faturaCartao` → cada fatura tem N `tb_lancamentoCartao`.
- Fatura fecha no dia configurado no cartão, gera débito em `tb_conta`.
- Conciliação de cartão (`tb_conciliacaoCartao`) segue o mesmo padrão da bancária.

### Transferências entre Contas
- Uma transferência gera dois lançamentos: débito na origem, crédito no destino.
- Ambos vinculados pelo `transferencia_id`.
- Deletar transferência deve deletar ambos os lançamentos atomicamente (`@Transactional`).

### Assinaturas Recorrentes
- Cada assinatura tem `diaVencimento` e pode estar vinculada a um cartão de crédito.
- Geração de contas recorrentes é responsabilidade do service de assinatura.

### Relatórios (`relatorio/`)
- `RelatorioService` agrega dados financeiros (contas, categorias, parceiros) por período.
- `ExcelRelatorioService` gera arquivo `.xlsx` via Apache POI — retorna `byte[]` no controller com `Content-Disposition: attachment`.
- Toda query de relatório DEVE filtrar por `empresaId` (via `tenantCtx.getEmpresaId()`) e pelo intervalo de datas (`data_competencia` ou `data_pagamento` — especificar qual).

### Dashboard (`dashboard/`)
- `DashboardService` fornece saldo total, saldo por conta corrente, receitas/despesas do mês e projeção de vencimentos.
- Queries são read-only (`@Transactional(readOnly = true)`) e agregadas — não carregam entidades completas.
- `SaldoDetalhadoResponseDto` detalha o saldo por categoria/conta.
- Performance crítica: qualquer nova agregação de dashboard deve ser testada com volume de dados real antes de ir para produção.

---

## 12. Variáveis de Ambiente

Todas definidas no `.env` (root). Nunca hardcode valores de configuração no código.

| Variável | Uso |
|---|---|
| `DB_URL` | JDBC URL do PostgreSQL |
| `DB_USERNAME` / `DB_PASSWORD` | Credenciais do banco |
| `DB_POOL_SIZE` | Tamanho do pool HikariCP (default: 3) |
| `SECRET_KEY` | Chave HMAC-SHA256 para JWT (mínimo 64 caracteres) |
| `TOKEN_EXPIRATION` | Validade do JWT em ms (default: 7 dias) |
| `CORS_ORIGINS` | Origins permitidas pelo CORS |
| `GEMINI_API_KEY` | Chave da API Google Gemini |
| `MAIL_ENABLED` | Liga/desliga envio de email |
| `MAIL_HOST/PORT/USERNAME/PASSWORD/FROM` | Config SMTP |
| `VITE_API_URL` | Base URL do backend (frontend) |
| `TRUSTED_PROXY=true` | Ativa leitura de `X-Forwarded-For` no `RateLimitFilter` — só em deploy atrás de proxy confiável |
| `security.cookie.same-site` | `None` (cross-domain) ou `Strict` (same-domain) — default `None` |

---

## 13. Armadilhas Conhecidas

### Lombok/NetBeans — falsos positivos no IDE

O language server do NetBeans não consegue processar Lombok. Todos os erros do tipo abaixo são **FALSOS POSITIVOS** — Maven/Gradle compila corretamente:

```
"cannot find symbol: method getEmpresaId()"        ← gerado por @Getter
"variable not initialized in the default constructor" ← gerado por @RequiredArgsConstructor
"Can't initialize javac processor: Lombok NoClassDefFoundError"
```

**Nunca refatorar código correto por causa dessas mensagens.** Se houver dúvida, rodar `./gradlew build` para confirmar.

### Cache key de permissões

A chave usa `Objects.hash(email, empresaId)` formatado como hex. **Não** usar `email + ":" + empresaId` — emails com `:` causam colisão de chave.

### TenantContext.isPopulado()

Retorna `empresaId != null`. O `PermissaoAspect` verifica `isPopulado() || isAdminSistema()` antes de checar permissão. Serviços chamados fora de requisições HTTP (schedulers, testes) podem não ter contexto populado.

### RateLimitFilter já cobre /api/auth/login

`shouldNotFilter()` retorna `false` para `/api/auth/login` — o rate limit **já está ativo**. O RateLimitFilter usa Bucket4j com 10 tentativas por IP por minuto.

### Hibernate 6 + `@Query` com ORDER BY + Pageable com sort

Hibernate 6 (Spring Boot 3.3.x) **não permite** `ORDER BY` hardcoded em `@Query` JPQL quando o método também recebe `Pageable` com sort — lança `QueryException` → HTTP 500.

**Regra:** nunca colocar `ORDER BY` dentro de `@Query` JPQL quando o método aceita `Pageable`. Usar `@PageableDefault(sort = "campo", direction = Sort.Direction.DESC)` no controller como fallback de ordenação.

```java
// ❌ ERRADO — quebra quando Pageable tem sort
@Query("SELECT a FROM Auditoria a WHERE ... ORDER BY a.dataHora DESC")
Page<Auditoria> filtrar(..., Pageable pageable);

// ✅ CORRETO — ordenação via Pageable
@Query("SELECT a FROM Auditoria a WHERE ...")
Page<Auditoria> filtrar(..., Pageable pageable);

// No controller:
@PageableDefault(size = 20, sort = "dataHora", direction = Sort.Direction.DESC)
// ⚠️ Nunca usar "timestamp" como sort field — é palavra reservada HQL (ver armadilha abaixo)
```

### Perfis de acesso — isolamento por empresa (V32)

Após a migration V32, `tb_perfil_acesso` tem campo `empresa_id` (nullable):
- `empresa_id IS NULL` → perfil do sistema (global, imutável via API)
- `empresa_id IS NOT NULL` → perfil customizado da empresa (visível e editável somente por ela)

**Regra:** ao criar, atualizar ou deletar um `PerfilAcesso`, sempre verificar ownership: se `empresaId == null` → throw "Perfil do sistema não pode ser alterado"; se `empresaId != tenantCtx.getEmpresaId()` → throw `AcessoNegadoException`. A lógica `protegido` no DTO passou a ser `empresaId == null` (não mais por nome).

### Permissões em sessão ativa — polling frontend

O backend já invalida o cache Caffeine em mudanças individuais de permissão (explicitamente, antes de persistir) e tem TTL de 30s. O frontend **não faz refresh automático** de permissões — armazena em `sessionStorage` desde o login.

**Solução implementada:** `useAuth.js` faz polling de `GET /api/auth/me/permissoes` a cada 30s e atualiza o `sessionStorage` via `setLoginState()`, disparando `auth-change` para re-render. O endpoint retorna as permissões calculadas pelo `TenantContext` (já corrigidas pelo TenantFilter a cada request).

### Hibernate 6 — campo `timestamp` como palavra reservada HQL

Campos de entidade JPA com nome `timestamp` conflitam com a gramática HQL do Hibernate 6 (`TIMESTAMP` é um tipo/função em JPQL). Quando Spring Data JPA acrescenta dinamicamente `ORDER BY a.timestamp DESC` à query (via Pageable sort), o parser HQL falha → HTTP 500.

**Regra:** nunca nomear campos de entidade com palavras reservadas HQL (`timestamp`, `value`, `key`, `type`, `entry`, `index`). Renomear o campo Java e mapear a coluna explicitamente com `@Column(name = "timestamp")`.

```java
// ❌ ERRADO — timestamp é palavra reservada HQL
private LocalDateTime timestamp;

// ✅ CORRETO — nome Java neutro, coluna mapeada explicitamente
@Column(name = "timestamp", nullable = false)
private LocalDateTime dataHora;
```

Atualizar também `@PageableDefault(sort = "dataHora")` no controller e as referências `a.dataHora` no `@Query`.

### N+1 query com coleções JPA

Iterar sobre uma lista de entidades e acessar uma coleção lazy em cada uma dispara N queries adicionais. Sintoma: logs cheios de `SELECT ... WHERE id = ?` repetidos. Solução: usar `JOIN FETCH` na query ou `@EntityGraph`. Nunca usar `FetchType.EAGER` como atalho — piora o problema em outros contextos.

### Isolamento por empresa — dados financeiros usam empresaId, não usuarioId

**Contexto:** após a migration V22 (`migrate_usuario_to_empresa`), cada usuário tem sua própria empresa. Empresas multi-usuário compartilham dados entre membros.

**Regra:** queries de listagem/busca de dados financeiros devem filtrar por `tenantCtx.getEmpresaId()`, não por `securityCtx.getUsuarioId()`.

- `findAllByEmpresaId(empresaId)` — listagem compartilhada pela empresa
- `findByIdAndEmpresaId(id, empresaId)` — lookup com controle de acesso

O campo `usuario` nas entidades (Conta, Categoria, etc.) permanece como creator/audit — não como filtro de acesso.

**Padrão de serviço após migração:**
```java
Long eid = tenantCtx.getEmpresaId();
return repo.findAllByEmpresaId(eid, pageable);
```

**Scheduler (SincronizacaoService):** itera `empresaRepository.findIdsAtivas()` — não mais `usuarioRepository.findAllIds()`.

### Roteamento inteligente pós-login — getFirstAccessibleRoute

`PermissaoRoute` e `AdminRoute` redirecionam para `<NavigateToFirstAccessible />` em vez de hardcodar `/dashboard`. Isso evita loop infinito quando o usuário não tem `DASHBOARD_VISUALIZAR`.

`getFirstAccessibleRoute(temPermissao)` está em `src/lib/routeUtils.js` — use ao precisar calcular a rota inicial após login ou ao redirecionar por falta de permissão.

O login em `Login.jsx` calcula a rota a partir das permissões retornadas na resposta, antes de navegar.

### ContaEmpresaRoute — restrição de funcionalidades para PESSOA_FISICA

As rotas `/audit`, `/empresa/operadores`, `/empresa/perfis` são envoltas por `<ContaEmpresaRoute>` em `App.jsx`. Se `tipoConta === 'PESSOA_FISICA'`, redireciona para primeira rota acessível.

No backend: `tenantCtx.exigirContaEmpresa()` foi adicionado a `AuditoriaQueryService.filtrar()` e `PerfilAcessoService.listar()` — defense-in-depth.

### BigDecimal — nunca comparar com ==

`BigDecimal.ZERO == new BigDecimal("0")` é `false` em Java. Sempre usar `compareTo()`:
```java
if (valor.compareTo(BigDecimal.ZERO) > 0) { ... }  // correto
if (valor == BigDecimal.ZERO) { ... }               // ERRADO — nunca funciona
if (valor.equals(new BigDecimal("0.00"))) { ... }   // ERRADO — escala diferente falha
```

---

## 14. O Que Nunca Fazer

- Nunca retornar dados de outro usuário (violar multi-tenancy).
- Nunca alterar arquivos de migration Flyway já existentes.
- Nunca armazenar o JWT em localStorage — apenas HttpOnly cookie.
- Nunca usar `ddl-auto=create` ou `update` — somente `validate`.
- Nunca fazer chamadas `fetch` diretas no frontend — sempre usar `lib/api.js`.
- Nunca aceitar `usuarioId` como parâmetro de request — extrair sempre do JWT.
- Nunca commitar secrets (`.env` está no `.gitignore`).
- Nunca adicionar dependências sem verificar se já existe algo equivalente na stack.
- Nunca refatorar código correto por causa de falsos positivos do Lombok no IDE.
- Nunca usar `email + ":" + empresaId` como chave de cache de permissões.
- Nunca comparar `BigDecimal` com `==` ou `.equals()` sem verificar escala — usar `.compareTo()`.
- Nunca iterar sobre coleção lazy JPA dentro de loop — usar `JOIN FETCH` ou `@EntityGraph`.
- Nunca usar `float`/`double` para cálculos financeiros — sempre `BigDecimal`.
- Nunca colocar `ORDER BY` em `@Query` JPQL quando o método aceita `Pageable` com sort — Hibernate 6 lança `QueryException`. Usar `@PageableDefault` no controller.
- Nunca editar ou deletar um `PerfilAcesso` com `empresaId == null` via API — são perfis do sistema, imutáveis.
- Nunca exibir ao usuário mensagens técnicas — códigos de permissão, nomes de exceção, nomes de tabela/constraint, stack traces. Toda notificação visível ao usuário deve ser clara e compreensível por qualquer pessoa sem conhecimento técnico (ver seção 7 → "Mensagens ao Usuário").

---

## 15. Restrições de Banco de Dados

### Campos imutáveis após criação
- `tb_conta`: `data_vencimento`, `data_competencia` e `valor` originais não devem ser alterados após baixa — estorno gera novo registro.
- `tb_transferencia`: imutável após criação. Cancelar = deletar **ambos** os lançamentos atomicamente (`@Transactional`). Nunca deletar só um lado.
- `tb_lancamento_cartao`: imutável após fatura fechada (`status = FECHADA`). Qualquer ajuste exige estorno + novo lançamento.
- `tb_usuario_empresa`: `perfil` PROPRIETARIO não pode ser alterado por nenhuma operação de permissão.

### Campos calculados — nunca persistir diretamente
- **Saldo de conta corrente** é derivado da soma de transações. Nunca fazer `UPDATE tb_conta_corrente SET saldo = X` diretamente — atualizar sempre pelo service após operação.
- **Total de fatura** (`tb_fatura_cartao.valor_total`) é a soma dos `tb_lancamento_cartao`. Recalcular ao adicionar/remover lançamento.
- **Permissões efetivas** são calculadas por `PermissaoCalculadora` em runtime — nunca cachear permissões resolvidas no banco.

### Soft delete obrigatório
As entidades abaixo **nunca recebem DELETE físico** se estiverem referenciadas por registros financeiros:
- `tb_categoria`: setar `ativo = false`. Bloquear exclusão se existir `tb_conta` referenciando.
- `tb_parceiro`: setar `ativo = false`. Bloquear exclusão se existir `tb_conta` referenciando.
- `tb_conta_corrente`: bloquear exclusão se existir `tb_transferencia` ou `tb_conciliacao` vinculada.
- `tb_cartao_credito`: bloquear exclusão se existir fatura em aberto (`status != PAGA`).
- `tb_usuario_empresa`: setar `ativo = false` via `OperadorService.remover()` — nunca DELETE físico.

### Auditoria
- Toda alteração de permissão, remoção de operador ou aceite de convite gera registro em `tb_auditoria`.
- Essas operações DEVEM passar pelo service layer — nunca fazer UPDATE/DELETE direto nas tabelas auditadas.
- `tb_auditoria` é append-only: nunca UPDATE ou DELETE nessa tabela.

### Timezone e tipos monetários
- Datas armazenadas em UTC no banco; exibição em `America/Sao_Paulo`.
- Valores monetários: `NUMERIC(15,2)` no banco, `BigDecimal` em Java. **Nunca `float` ou `double`** para dinheiro.
- Porcentagens: `NUMERIC(10,6)` para precisão em cálculos de juros e desconto.

---

## 16. Regras de Cálculo

### Saldo de conta corrente
```
saldo_atual = Σ(entradas confirmadas) − Σ(saídas confirmadas)
```
- Apenas lançamentos com status `BAIXADA`/`CONCILIADO` entram no saldo.
- Contas `PENDENTE` aparecem no fluxo de caixa projetado, não no saldo atual.

### Total de fatura de cartão
```
total_fatura = Σ(valor de tb_lancamento_cartao onde fatura_id = X)
```
- Recalcular e persistir em `tb_fatura_cartao.valor_total` sempre que um lançamento for adicionado ou removido.
- Fatura fechada gera automaticamente um registro em `tb_conta` (despesa a pagar).

### Arredondamento
| Tipo | Casas decimais | Método |
|---|---|---|
| Moeda (BRL) | 2 | `RoundingMode.HALF_UP` |
| Quantidade | 4 | `RoundingMode.HALF_UP` |
| Percentual | 6 | `RoundingMode.HALF_UP` |

- Rateio de centavos em transferências: a diferença vai sempre para o primeiro lançamento da lista.
- **Nunca usar `float`/`double` em qualquer cálculo financeiro** — sempre `BigDecimal`.

### Transferências entre contas
```
lançamento_débito.valor  = valor_transferencia  (tipo = SAÍDA na conta origem)
lançamento_crédito.valor = valor_transferencia  (tipo = ENTRADA na conta destino)
```
- Ambos gerados na mesma transação, vinculados pelo mesmo `transferencia_id`.

---

## 17. Fluxo de Estados dos Documentos

### Conta a Pagar / Receber (`tb_conta.status`)
```
PENDENTE → BAIXADA
         → VENCIDA  (automático via scheduler quando data_vencimento < hoje)
BAIXADA  → ESTORNADA (gera nova conta PENDENTE com valor negativo)
VENCIDA  → BAIXADA   (baixa tardia ainda é permitida)
```
- Apenas `PENDENTE` e `VENCIDA` podem ser editadas.
- `BAIXADA` é imutável — ajustes exigem estorno via `ContaService.estornar()`.
- `ESTORNADA` é terminal — não pode ser reativada.

### Fatura de Cartão (`tb_fatura_cartao.status`)
```
ABERTA → FECHADA (ao atingir dia de fechamento ou manualmente)
FECHADA → PAGA   (ao registrar pagamento da fatura)
```
- `ABERTA`: aceita novos lançamentos.
- `FECHADA`: lançamentos bloqueados; gera `tb_conta` de despesa automaticamente.
- `PAGA`: terminal. Estorno recria fatura com status `ABERTA`.
- Nunca fazer transição direta `ABERTA → PAGA`.

### Conciliação Bancária e de Cartão (`status`)
```
PENDENTE → CONCILIADO  (usuário vincula o item OFX a uma conta existente)
PENDENTE → IGNORADO    (usuário descarta o item)
CONCILIADO → PENDENTE  (desvincular — remove a vinculação mas mantém o registro)
```
- `IGNORADO` pode ser reaberto para `PENDENTE`.
- Vincular um item `PENDENTE` a uma conta atualiza o saldo da conta corrente.

### Assinatura Recorrente (`tb_assinatura.status`)
```
ATIVA   → INATIVA   (pausar sem cancelar)
ATIVA   → CANCELADA (encerramento definitivo)
INATIVA → ATIVA     (reativar)
CANCELADA           (terminal — não pode ser reativada)
```
- Somente assinaturas `ATIVA` geram contas recorrentes no vencimento.

---

## 18. Integridade Referencial e Regras Cruzadas

### O que não pode ser excluído se tiver dependentes
| Entidade | Bloqueante | Alternativa |
|---|---|---|
| `tb_categoria` | `tb_conta` referenciando | Setar `ativo = false` |
| `tb_parceiro` | `tb_conta` referenciando | Setar `ativo = false` |
| `tb_conta_corrente` | `tb_transferencia` ou `tb_conciliacao` | Não excluir |
| `tb_cartao_credito` | Fatura com `status != PAGA` | Fechar/pagar fatura antes |
| `tb_usuario_empresa` | (sempre) | `ativo = false` via service |

### Propagação de mudanças
- Alterar `valor` ou `data_vencimento` de uma conta **não** propaga retroativamente para conciliações já realizadas.
- Alterar `dia_fechamento` de um cartão afeta apenas faturas futuras — faturas já criadas não são recalculadas.
- Alterar `diaVencimento` de uma assinatura afeta apenas a próxima geração — contas já geradas permanecem.

### Dependências entre módulos
- **Não baixar** uma conta sem que o `empresaId` da conta bata com o do TenantContext.
- **Não fechar fatura** sem verificar que todos os lançamentos pertencem à mesma fatura.
- **Não conciliar** item OFX já vinculado (`status = CONCILIADO`) — verificar antes de vincular.
- **Não criar transferência** com conta corrente origem = destino.
- Toda operação de escrita em dados financeiros deve validar que a entidade-mãe pertence ao mesmo `empresaId`.

---

## 19. Regras Legais e de Formatação (Contexto Brasileiro)

### CNPJ e CPF em Parceiros
- Validação obrigatória com dígito verificador — nunca aceitar apenas formato `XX.XXX.XXX/XXXX-XX`.
- CNPJ/CPF são únicos **por empresa** (`empresa_id`), não globalmente — duas empresas diferentes podem cadastrar o mesmo CNPJ.
- Armazenar apenas dígitos (sem máscara) no banco; formatar na exibição via `formatters.js`.

### Formatação de dados sensíveis (LGPD)
- Emails **nunca** em logs em plaintext — usar `hashEmail(email)` (veja padrão na seção 7).
- CPF/CNPJ em logs: exibir apenas últimos 4 dígitos ou hash.
- `tb_auditoria` registra ação e entidade, nunca o valor completo de dados pessoais.

### Moeda e localização
- Sistema opera exclusivamente em **BRL (Real Brasileiro)**.
- Separador decimal: vírgula (`,`); separador de milhar: ponto (`.`) na exibição (ex: `R$ 1.234,56`).
- Datas exibidas no formato `dd/MM/yyyy` (padrão pt-BR) — nunca `MM/dd/yyyy`.
- `date-fns` com `pt-BR` locale para formatação e parse de datas no frontend.

### Competência vs. Caixa
- O sistema suporta **ambos os regimes**: `data_competencia` (quando a obrigação ocorreu) e `data_pagamento` (quando o caixa movimentou).
- Relatórios financeiros DEVEM especificar qual campo estão usando como base — nunca misturar os dois na mesma query.
- `data_competencia` nunca deve ser inferida de `created_at` — são campos independentes.

---

## 20. Integrações Externas — Autenticação e HTTP Client

O sistema possui três integrações externas ativas:

| Integração | Mecanismo | Credencial |
|---|---|---|
| Google Gemini (IA) | API Key no header | `GEMINI_API_KEY` no `.env` |
| SMTP (email) | SMTP auth (user/pass) | `MAIL_USERNAME` / `MAIL_PASSWORD` no `.env` |
| OFX (conciliação) | Parse local de arquivo | Sem chamada HTTP externa |

### HTTP Client
- Integração com Gemini é gerenciada pelo **Spring AI** (`spring-ai-google-gemini-spring-boot-starter`) — não fazer chamadas HTTP diretas ao endpoint do Gemini.
- Para chamadas HTTP externas fora do Spring AI: usar `WebClient` (reativo) ou `RestClient` (Spring 6+) — **nunca** `HttpURLConnection` ou `RestTemplate` em código novo.
- Todo `WebClient` deve ter timeout explícito configurado:
  ```java
  WebClient.builder()
      .clientConnector(new ReactorClientHttpConnector(
          HttpClient.create()
              .responseTimeout(Duration.ofSeconds(10))
      ))
      .build();
  ```

### Política de retry e falha graciosa
- Chamadas ao Gemini: Spring AI gerencia retry interno. Se o modelo retornar erro, propagar como `ServiceUnavailableException` — nunca deixar virar 500 genérico.
- SMTP: Spring Mail usa `JavaMailSender`; `MAIL_ENABLED=false` desabilita envio sem quebrar o fluxo (feature flag).
- Circuit breaker: não implementado formalmente — se necessário, adicionar Resilience4j antes de qualquer outro mecanismo.

### Segurança em trânsito
- TLS 1.2+ obrigatório — **nunca** desabilitar verificação de certificado.
- Secrets de integração **sempre** via variáveis de ambiente — nunca hardcoded ou em `application.properties` versionado.
- `X-Request-ID` propagado nas chamadas de saída quando disponível no MDC.

---

## 21. Contratos de API — Padrões de Resposta e DTOs

### Envelope de resposta
O projeto **não usa envelope genérico** — cada endpoint retorna `ResponseEntity<T>` com o tipo específico:
- Sucesso com corpo: `ResponseEntity.ok(dto)` (200) ou `ResponseEntity.status(201).body(dto)`
- Sucesso sem corpo: `ResponseEntity.noContent().build()` (204)
- Erro: gerenciado pelo `GlobalExceptionHandler`; estrutura padrão:
  ```json
  {
    "status": 404,
    "mensagem": "Conta não encontrada",
    "timestamp": "2026-06-01T10:00:00Z"
  }
  ```

### DTOs — Regras obrigatórias
- **Nunca expor entidades JPA diretamente** na API — sempre converter para DTO.
- DTO de entrada: sufixo `RequestDto` (ex: `CriarContaRequestDto`).
- DTO de saída: sufixo `ResponseDto` (ex: `ContaResponseDto`).
- DTOs intermediários sem direção: sufixo `Dto` (ex: `EmpresaResumoDto`).
- Campos sensíveis (`senha`, `token`, `resetToken`) **jamais** incluídos em responses.
- Validação com Bean Validation (`@Valid`, `@NotNull`, `@NotBlank`, `@NotEmpty`, `@Positive`) nos DTOs de entrada. Use `@NotEmpty` para `Set<>` e `List<>` — `@NotNull` não impede coleções vazias.
- Usar Java Records para DTOs simples quando não há lógica de transformação.

### Paginação
- Padrão: offset-based via `Pageable` do Spring Data.
- Resposta paginada: `Page<T>` serializado com `content`, `totalElements`, `totalPages`, `number`, `size`.
- Tamanho default de página: 20. Máximo: 100 (validar no controller).

### Versionamento de contrato
- Versão atual não usa prefixo `/v1/` — path base é `/api/<modulo>`.
- Mudanças breaking exigem nova migration Flyway + deprecação explícita do campo antigo por pelo menos uma release antes de remover.

---

## 22. Agentes de IA — Diretrizes Específicas

### Configuração do modelo
- Modelo: **Google Gemini 2.0 Flash** via Spring AI.
- Configuração em `application.properties` referenciando `GEMINI_API_KEY` do `.env`.
- Temperatura e parâmetros de geração configurados no `ChatClient` — não hardcoded por chamada.

### Gerenciamento de contexto
- Histórico de conversa armazenado em **Caffeine cache** (em memória, por `sessionId`).
- Cache expira após inatividade — ao expirar, nova conversa começa sem histórico anterior.
- System prompt: estático, definido no `ChatClient` builder — descreve capacidades e restrições do assistente.
- User prompt: dinâmico, inclui mensagem do usuário + resultado das tools invocadas.
- **Nunca incluir dados de outros usuários no contexto** — sempre filtrar por `usuarioId` antes de passar dados ao modelo.

### Tools (Function Calling)
- Cada tool é um `@Component` Spring com métodos `@Tool` — Spring AI injeta automaticamente no `ChatClient`.
- Tools de **leitura** (`consulta/`): obtêm `empresaId` do `TenantContext`, filtram dados financeiros por ele.
- Tools de **escrita** (`lancamento/`): validam `usuarioId` do `SecurityContext` **dentro da tool**, nunca confiam no parâmetro recebido do modelo.
- Schema de tools é gerado automaticamente pelo Spring AI a partir da assinatura do método — manter parâmetros tipados e documentados com Javadoc (Spring AI usa como descrição).
- Resultado de tools deve ser validado antes de repassar ao agente — se retornar null ou lista vazia, retornar mensagem descritiva, não null cru.

### Segurança e contenção
- O assistente **não tem permissão para deletar dados** — tools de escrita são limitadas a criar e atualizar.
- Output do modelo não deve ser retornado diretamente ao usuário sem sanitização de XSS (frontend já usa React que escapa por padrão).
- Custo por requisição: configurar `maxTokens` no `ChatClient` para evitar respostas excessivamente longas.
- Logar apenas `sessionId` e latência — **nunca** logar o conteúdo das mensagens do usuário (dados financeiros pessoais).

### Fallback
- Se o modelo retornar JSON malformado em tool calls: logar erro com `requestId`, retornar HTTP 502 com mensagem genérica ao usuário.
- Se Gemini estiver indisponível: retornar HTTP 503 com `Retry-After` — não tentar fallback para outro modelo sem decisão explícita de arquitetura.

---

## 23. Checklist de PR para Integrações Novas

Antes de abrir PR que adiciona ou modifica uma integração externa:

**Autenticação e Credenciais**
- [ ] Credenciais via variável de ambiente — nenhum secret no código ou `application.properties` versionado
- [ ] `.env.example` atualizado com a nova variável (sem valor real)

**HTTP e Resiliência**
- [ ] Timeout explícito configurado (conexão e leitura separados)
- [ ] Retry com backoff implementado para erros 5xx e 429
- [ ] Falha da integração converte para erro de domínio antes de subir ao controller

**DTOs e Contratos**
- [ ] DTO de request e response definidos e validados com Bean Validation
- [ ] Entidade JPA nunca exposta diretamente na resposta
- [ ] Campos sensíveis ausentes no response DTO

**Observabilidade**
- [ ] Logs de saída (URL, método) e resposta (status, latência) implementados
- [ ] Nenhum dado sensível (senha, token, CPF) nos logs
- [ ] `requestId` do MDC propagado na chamada de saída

**Testes**
- [ ] Caminho feliz testado com mock do cliente HTTP
- [ ] Cenários de falha cobertos: timeout, 429, 5xx, payload inválido
- [ ] Nenhuma chamada real a serviços externos em testes unitários

> **Nota sobre cobertura atual:** O projeto possui apenas `Core4erpApplicationTests.java` (context load). Não há testes unitários ou de integração implementados. Novas integrações não precisam ter cobertura completa no primeiro PR, mas devem ao menos ter o caminho feliz coberto com mock.

**Multi-Tenancy**
- [ ] Dados retornados pela integração filtrados por `empresaId` antes de persistir
- [ ] Tool de IA (se aplicável) valida `usuarioId` do `SecurityContext` internamente

---

## 24. Como Rodar Localmente

```bash
# Pré-requisitos: Java 21, Node 20, PostgreSQL 15+, arquivo .env configurado

# Backend
cd core4erp
./gradlew bootRun

# Frontend
cd front-end
npm install
npm run dev
# Acesse: http://localhost:5173

# Stack completa com Docker
docker-compose up --build
```

**Portas padrão:**
- Backend: `8080`
- Frontend (dev): `5173`
- PostgreSQL: `5432`
- Grafana: `3001`
