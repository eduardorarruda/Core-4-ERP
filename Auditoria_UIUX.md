# Auditoria UI/UX, Responsividade & PWA — Core 4 ERP
### + Projeto da Central de Ajuda (Help)

> **Data:** 2026-07-18 · **Método:** 4 auditores em paralelo lendo 100% do código de `front-end/src` (27 views, 18 componentes `ui/`, layout, chat, dashboard, conciliação, reports, tema, PWA/manifest, nginx).
> **Viewport de referência mobile:** 375px (PWA standalone).
> **Papel:** Lead Product Designer / Arquiteto Front-end.

---

## Sumário Executivo

O Core 4 ERP tem **fundações excelentes** (tokens Tailwind 4, PWA com cache seguro `NetworkOnly` para `/api/`, skip-link, roteamento por permissão) e **três dívidas estruturais** que explicam quase todos os 120+ achados:

1. **Não existe componente `Button` nem `Modal` base** → cada tela recompõe botões/modais/cards com estilos inline e **300+ cores hex hardcoded**, quebrando o tema claro em ~15 telas.
2. **O app foi desenhado desktop-first com estética "micro-mono"** (`text-[8px]`–`text-[11px]`, ações `p-1.5` ≈ 26–28px) → **touch targets sistematicamente abaixo de 44px** e texto ilegível no celular — o oposto do que um PWA exige.
3. **Duplicação em massa**: módulo conciliação bancária × cartão é **~82% clonado** (~940 linhas duplicadas); GestaoOperadores/GestaoPerfis ignoram 100% do design system; 4 cópias do CSS `.field-float`; 3 cópias do `BrandMark`; 2 diálogos de confirmação divergentes.

**Bug mais grave de UX encontrado:** em GestaoOperadores/GestaoPerfis, o erro de API renderiza **atrás do overlay do modal** — o usuário clica "Convidar", o spinner some e nada acontece.
**Bug mais grave de mobile:** no chat da Áurea, excluir conversa e copiar resposta usam `opacity-0 group-hover:` — **impossíveis no touch**; o drawer do Sidebar mobile mostra **só ícones sem rótulos** (labels atrás de hover inexistente).

A **Parte 3** projeta a nova **Central de Ajuda** (`/ajuda`), com entrada no menu principal, conteúdo documentando cada tela mapeada e layout 100% responsivo.

---

# PARTE 1 — Mapeamento Exaustivo (Discovery)

## 1.1 Rotas (prova de cobertura — `src/App.jsx:204-237`)

### Públicas (4)
| Rota | View | Guard |
|---|---|---|
| `/login` | `Login.jsx` | — |
| `/register` | `Register.jsx` | — |
| `/redefinir-senha` | `RedefinirSenha.jsx` | requer `?token=` (sem token → `/login`) |
| `/aceitar-convite` | `AceitarConvite.jsx` | requer `?token=` |

### Protegidas (23 + 2 fallbacks)
| Rota | View | Guards |
|---|---|---|
| `/dashboard` | `DashboardHome.jsx` (abas → `Dashboard.jsx` + `CartaoDashboard.jsx`) | `PermissaoRoute(DASHBOARD_VISUALIZAR)` |
| `/conciliacao` | `Conciliacao.jsx` | ⚠️ **sem PermissaoRoute** |
| `/conciliacao/historico` | `ConciliacaoHistorico.jsx` | ⚠️ sem PermissaoRoute |
| `/conciliacao/:id` | `Conciliacao.jsx` (retomada) | ⚠️ sem PermissaoRoute |
| `/conciliacao/:id/relatorio` | `ConciliacaoRelatorio.jsx` | ⚠️ sem PermissaoRoute |
| `/assinaturas` | `Assinaturas.jsx` | ⚠️ sem PermissaoRoute |
| `/calendario` | `Calendario.jsx` | `PermissaoRoute(CALENDARIO_VISUALIZAR)` |
| `/reports` | `Reports.jsx` | sem PermissaoRoute (por design — guard por card) |
| `/assistente` | `Assistente.jsx` | ⚠️ sem PermissaoRoute |
| `/audit` | `Audit.jsx` | `ContaEmpresaRoute` + `PermissaoRoute(AUDITORIA_VISUALIZAR)` |
| `/parceiros` | `Parceiros.jsx` | ⚠️ sem PermissaoRoute |
| `/categorias` | `Categorias.jsx` | `PermissaoRoute(CATEGORIA_VISUALIZAR)` |
| `/contas-correntes` | `ContasCorrentes.jsx` | ⚠️ sem PermissaoRoute |
| `/contas` | `ContasFinanceiras.jsx` | ⚠️ sem PermissaoRoute |
| `/cartoes` | `Cartoes.jsx` | `PermissaoRoute(CARTAO_LANCAR)` |
| `/cartoes/dashboard` | `CartaoDashboard.jsx` | `PermissaoRoute(CARTAO_VISUALIZAR)` |
| `/cartoes/conciliacao` (+ `/historico`, `/:id`, `/:id/relatorio`) | `ConciliacaoCartao*.jsx` | `PermissaoRoute(CARTAO_CONCILIACAO_VISUALIZAR)` |
| `/investimentos` | `Investimentos.jsx` | `PermissaoRoute(INVESTIMENTO_VISUALIZAR)` |
| `/configuracoes` | `Configuracoes.jsx` | sem PermissaoRoute (por design — perfil próprio) |
| `/empresa/operadores` | `GestaoOperadores.jsx` | `ContaEmpresaRoute` + `PermissaoRoute(USUARIO_VISUALIZAR)` |
| `/empresa/perfis` | `GestaoPerfis.jsx` | `ContaEmpresaRoute` + `PermissaoRoute(CONFIGURACAO_EDITAR)` |
| `/` e `*` | `NavigateToFirstAccessible` | prioridade em `routeUtils.js` |

**Achados do mapeamento de rotas:**
- **A-R1** · 8 rotas de dados financeiros sem `PermissaoRoute` (marcadas ⚠️) — usuário sem permissão acessa a casca por URL e colhe erros de API. Backend protege os dados (defense-in-depth OK), mas a UX é ruim e inconsistente com `/categorias` etc.
- **A-R2** · CLAUDE.md documenta `/admin/planos` + `AdminRoute` — **não existem** no `App.jsx` atual (doc defasada).
- **A-R3** · `Dashboard.jsx` **não é código morto**: é a aba "Visão Geral" dentro de `DashboardHome.jsx:70`.

## 1.2 Inventário de modais, overlays e drawers (23)

| # | Modal/Overlay | Onde vive | Usado por |
|---|---|---|---|
| 1 | `ConfirmModal` | `ui/ConfirmModal.jsx` | Cartoes (×3), ContasFinanceiras (×3), ContasCorrentes, Parceiros, Categorias, Assinaturas, Investimentos |
| 2 | `_ConfirmDialog` (duplicata!) | `hooks/useConfirm.jsx` | Conciliacao, ConciliacaoCartao (finalizar/cancelar) |
| 3 | `DateRangeModal` | `ui/DateRangeModal.jsx` | CartaoDashboard |
| 4 | `ModalCriacaoRapida` (Categoria/Parceiro) | `ui/ModalCriacaoRapida.jsx` | Formulários inline de conciliação |
| 5 | `VincularContaModal` | `components/conciliacao/` | Conciliacao |
| 6 | `VincularLancamentoModal` | `components/conciliacaoCartao/` | ConciliacaoCartao |
| 7 | `ReportModal` (visualização online) | `components/reports/` | Reports |
| 8 | `ModalConvite` | inline em `GestaoOperadores.jsx:15` | GestaoOperadores |
| 9 | `ModalEditarPerfil` | inline em `GestaoOperadores.jsx:46` | GestaoOperadores |
| 10 | `ModalPerfil` (matriz de permissões) | inline em `GestaoPerfis.jsx:42` | GestaoPerfis |
| 11 | `SenhaProvisoriaModal` | inline em `App.jsx:86` | Global (senha provisória) |
| 12 | `CommandPalette` (⌘K) | `ui/CommandPalette.jsx` | Global (TopNav) |
| 13 | `IconDropdown` (popover) | `ui/IconDropdown.jsx` | ModalCriacaoRapida |
| 14 | Dropdown do avatar | inline em `TopNav.jsx:174` | Global |
| 15 | `NotificacoesPopover` | `components/layout/` | TopNav |
| 16 | Dropdown "Cartões" | `Sidebar.jsx:102` | Sidebar |
| 17 | Drawer do Sidebar mobile | `App.jsx:129-143` | Global mobile |
| 18 | `ChatSidebar` / `PainelAurea` (balão) | `components/chat/` | Global (FAB) |
| 19 | Drawer de conversas mobile | `Assistente.jsx:248` | /assistente |
| 20 | Confirmação de exclusão inline | `Assistente.jsx:283` | /assistente |
| 21 | `FormularioNovaContaInline` / `FormularioNovoLancamentoInline` | conciliação (expansível, não modal) | Conciliacao/Cartao |
| 22 | `InstalarPwaBanner` (bottom sheet) | `components/layout/` | Global |
| 23 | `PwaStatus` (faixas offline/update) | `components/layout/` | Global |

## 1.3 Componentes `ui/` (18) — inventário de uma linha

Badge · BentoCard · CategoriaOptions · CommandPalette · ConfirmModal · DataTable (com `cardView` mobile **nunca usado**) · DateRangeModal · EmptyState · ErrorBoundary · FormField (2 sistemas: utilitário + floating) · IconDropdown · ModalCriacaoRapida · PageHeader · Pagination · PeriodoSelector · PermissaoGuard · SkeletonCard · Toast.

**Nota:** o código é **JSX puro (JavaScript)** — não há TypeScript no front-end (os `@types/react` são só para o editor). Tipagem é uma recomendação futura, não um artefato existente.

---

# PARTE 2 — Auditoria de Responsividade e PWA (Prioridade Alta)

## 2.1 Achados transversais (afetam o app inteiro)

| ID | Severidade | Achado | Evidência |
|---|---|---|---|
| **T1** | 🔴 CRÍTICO | **Sidebar mobile só-ícones**: drawer aberto mantém `w-16` + labels `opacity-0 group-hover/sidebar:opacity-100` — touch não tem hover; usuário mobile navega às cegas (grupos, chevron de Cartões e nome do usuário também invisíveis) | `Sidebar.jsx:148,188,111-117,164` |
| **T2** | 🔴 CRÍTICO | **Touch targets < 44px como padrão**: ações de linha `p-1.5` + ícone `w-4`/`w-3.5` ≈ 26–28px em TODAS as listas (Contas, Parceiros, Categorias, Assinaturas, Investimentos, Cartões, Conciliação, chat); chips/toggles `py-1.5` ≈ 30px; tabs ≈ 34px | ~25 arquivos |
| **T3** | 🔴 CRÍTICO | **Microtipografia sistêmica**: `text-[8px]` (FluxoCaixaChart:29), `text-[9px]` e `text-[10px]` como padrão de labels, chips, botões e até **dados financeiros** (Cartoes.jsx:429 — limite/usado/livre a 10px) | ~30 arquivos |
| **T4** | 🟠 ALTO | **Tema claro quebrado em ~15 telas**: 300+ hex/rgba hardcoded dark (`#161616`, `rgba(255,255,255,.025)`, tooltips Recharts `#1a1a2e`) — Login/Register/RedefinirSenha/AceitarConvite, GestaoOperadores, GestaoPerfis, Calendario, Audit, CartaoDashboard, BentoCard, TopNav dropdown, IconDropdown, ModalCriacaoRapida, Pagination, SenhaProvisoriaModal | grep `#RRGGBB`: 300+ |
| **T5** | 🟠 ALTO | **Sem `env(safe-area-inset-*)` em lugar nenhum** com `apple-mobile-web-app-status-bar-style: black-translucent` ativo → TopNav sob o notch e FAB/banner PWA sob a home-bar no iOS standalone | `index.html:8` + grep vazio |
| **T6** | 🟠 ALTO | **Fontes via Google CDN** (`@import url(...)` em `index.css:1`) → bloqueia render, quebra offline do PWA; o precache `woff2` do workbox nunca casa com nada | `index.css:1` vs `vite.config.js:33` |
| **T7** | 🟡 MÉDIO | `theme_color #0f172a` (slate) ≠ superfície real `#0c0c0c`; sem `theme-color` para tema claro | `vite.config.js:24`, `index.html:9` |
| **T8** | 🟡 MÉDIO | Zero suporte a `prefers-reduced-motion` (ticker 40s, live-dots, shimmer, orbs com `blur(80px)` + `mousemove` nas telas de auth — custo de GPU em mobile) | grep: 0 ocorrências |
| **T9** | 🟡 MÉDIO | `DataTable` tem `cardView` para mobile e **nenhuma tela usa** — todas viram túnel de scroll horizontal (5–7 colunas `whitespace-nowrap`) | `DataTable.jsx:61-90` |
| **T10** | 🟡 MÉDIO | Nenhum modal tem focus trap; foco visível em apenas 6 pontos do app inteiro | ConfirmModal, DateRangeModal, CommandPalette, etc. |

## 2.2 Quebras de layout por tela (as 12 piores, com correção)

| # | Tela | Quebra em 375px | Correção |
|---|---|---|---|
| 1 | **Conciliação (bancária + cartão)** | Grid fixo `grid-cols-[90px_1fr_110px_1fr_auto]` sem breakpoint e container `overflow-hidden` sem scroll — a linha mais densa do app é **espremida/clipada** (`Conciliacao.jsx:296`, `ConciliacaoItemRow.jsx:69`, `ConciliacaoCartao.jsx:280`, `ConciliacaoCartaoItemRow.jsx:70`) | Card empilhado em `< md`: data+valor na 1ª linha, descrição na 2ª, ações na 3ª (botões ≥ 44px com rótulo) |
| 2 | **GestaoOperadores / GestaoPerfis** | Tabelas manuais dentro de `overflow: hidden` — **conteúdo cortado**, sem scroll (`GestaoOperadores.jsx:196,254`, `GestaoPerfis.jsx:244`) | Migrar para `DataTable` com `cardView` |
| 3 | **Calendário** | Células ≈ 40px com `brl()` a `text-[9px]`; dots 8px com `title` (invisível no touch); painel do dia abre **abaixo do fold** sem scroll automático (`Calendario.jsx:180-227,144,253`) | Mobile: lista de agenda por dia (não grid); ou grid só com dots + painel em bottom-sheet; `scrollIntoView` ao tocar no dia |
| 4 | **Assistente (mobile)** | Excluir conversa e Copiar resposta com `opacity-0 group-hover:` — **inacessíveis no touch** (`Assistente.jsx:295,402`) | Sempre visíveis em `< lg` (`opacity-100 lg:opacity-0 lg:group-hover:opacity-100`) |
| 5 | **KpiCards / stat-cards** | `grid-cols-2` + `text-2xl` sem `truncate` — "R$ 1.234.567,89" estoura card de ~165px (`KpiCards.jsx:34`, `CartaoDashboard.jsx:150-157`) | `text-xl sm:text-2xl` + `truncate` + `title` com valor completo |
| 6 | **FluxoCaixaChart** | Sumário `grid-cols-3` sem prefixo — 3 valores monetários em ~100px cada (`FluxoCaixaChart.jsx:59`) | `grid-cols-1 sm:grid-cols-3` |
| 7 | **Histórico de Transferências** | Tabela manual 5 colunas sem `overflow-x-auto` — cortada (`ContasFinanceiras.jsx:753-792`) | Migrar para `DataTable` |
| 8 | **PageHeader com 2 ações** | Botões "Nova Transferência" + "Nova Conta" em `shrink-0` sem wrap — estouram (`ContasFinanceiras.jsx:390-410`) | `flex-wrap` no slot actions + rótulos curtos no mobile |
| 9 | **CartaoDashboard gráficos** | Pie labels externos cortam nas bordas; `YAxis width={90}` = 24% da tela (`CartaoDashboard.jsx:295,312,403`) | Mobile: legenda em vez de label; `width={70}` + tick abreviado |
| 10 | **Register / RedefinirSenha** | Padding fixo inline `32px 48px` / card `40px` sem padding lateral no shell — card encosta na borda (`Register.jsx:99`, `RedefinirSenha.jsx:66`) | Migrar auth p/ Tailwind responsivo (como `Login.jsx:156` já faz no macro) |
| 11 | **ModalPerfil (matriz)** | Form `gridTemplateColumns: '1fr 1fr'` fixo + scroll aninhado (lista `maxHeight: 380` dentro de overlay rolável) (`GestaoPerfis.jsx:103,116,90`) | `grid-cols-1 sm:grid-cols-2`; matriz como accordion por módulo; modal fullscreen em `< sm` |
| 12 | **ReportFilters** | `grid grid-cols-2` sem prefixo — selects ~130px com labels longos (`ReportFilters.jsx:44`) | `grid-cols-1 sm:grid-cols-2` |

## 2.3 PWA — estado e correções

**✅ Acertos (manter):** `NetworkOnly` para `/api/` (dado financeiro nunca no Cache Storage — exemplar); `registerType: 'prompt'` + faixa "Atualizar agora"; captura precoce de `beforeinstallprompt`; banner dispensável 7 dias + instruções iOS; `sw.js` com `no-cache` no nginx; zoom não bloqueado no viewport.

**Correções necessárias:**
| ID | Ação |
|---|---|
| PWA-1 | **Self-host das fontes** (Sora, DM Sans, JetBrains Mono via `@fontsource/*` ou woff2 locais) — remove o `@import` bloqueante e faz o precache `woff2` funcionar offline |
| PWA-2 | `viewport-fit=cover` no viewport + `pt-[env(safe-area-inset-top)]` no TopNav, `pb-[env(safe-area-inset-bottom)]` no FAB do chat, banner PWA e composer do balão |
| PWA-3 | `theme_color` → `#0c0c0c` no manifest e `index.html`; adicionar `<meta name="theme-color" media="(prefers-color-scheme: light)" content="#fafafa">` |
| PWA-4 | Ícone maskable 192 + `screenshots`/`shortcuts` no manifest (atalhos: "Nova conta", "Falar com a Áurea") |
| PWA-5 | nginx: `Cache-Control: public, max-age=31536000, immutable` para `/assets/` (hash no nome) |
| PWA-6 | `useTheme`: respeitar `prefers-color-scheme` quando não houver escolha salva |

---

# PARTE 3 — Projeto da Central de Ajuda (Help)

## 3.1 Decisões de design

| Decisão | Escolha | Justificativa |
|---|---|---|
| **Rota** | `/ajuda` (alias `/help` → `<Navigate to="/ajuda" />`) | Domínio do projeto é pt-BR (CLAUDE.md §1); alias atende quem digitar "help" |
| **View** | `src/views/Ajuda.jsx` | Padrão `views/` — uma view por rota |
| **Conteúdo** | Data-driven em `src/content/ajudaContent.js` | Documentação separada da UI → fácil manter; reutilizável (a Áurea pode consumir o mesmo conteúdo no futuro para responder "como faço X?") |
| **Menu** | Item "Ajuda" (ícone `HelpCircle`) no **rodapé do Sidebar**, acima de "Configurações" + botão `?` no TopNav ao lado do toggle de tema | Ajuda é utilitário transversal, não fluxo de trabalho — rodapé evita inflar "Financeiro" (já com 10 itens) |
| **Permissão** | **Nenhuma** (`PermissaoRoute` não se aplica) | Ajuda deve ser acessível a todos; porém o conteúdo é **personalizado**: seções de telas que o usuário não pode acessar ficam num grupo colapsado "Outros recursos do sistema" (via `temPermissao`) |
| **Busca** | Campo de busca client-side (título + descrição + passos) + registro no `CommandPalette` (páginas e "Como faço para…") | Descoberta rápida; corrige também o gap da paleta que não lista várias rotas |

## 3.2 Estrutura de dados (`src/content/ajudaContent.js`)

```js
// Cada entrada documenta UMA tela mapeada na Parte 1. Ícones = lucide-react (mesmos do Sidebar).
export const AJUDA_SECOES = [
  {
    id: 'dashboard',
    titulo: 'Dashboard',
    rota: '/dashboard',
    permissao: 'DASHBOARD_VISUALIZAR',
    icone: 'LayoutDashboard',
    resumo: 'Visão geral das suas finanças: saldos, receitas e despesas do mês, alertas de vencimento e gráficos.',
    comoUsar: [
      'Use as abas "Visão Geral" e "Cartões" no topo para alternar entre finanças gerais e cartões de crédito.',
      'Os cartões coloridos no topo mostram saldo total, receitas, despesas e patrimônio investido.',
      'Clique nos alertas vermelhos/amarelos para ir direto às contas atrasadas ou próximas do vencimento.',
      'Ajuste o período dos gráficos com o seletor de mês/ano.',
    ],
    dicas: ['O painel "Acesso Rápido" leva você às ações mais comuns em um clique.'],
    faq: [{ p: 'Por que meu saldo aparece zerado?', r: 'O saldo considera apenas lançamentos baixados (pagos/recebidos). Contas pendentes aparecem na projeção, não no saldo.' }],
  },
  // ... uma entrada para cada tela (conteúdo completo em 3.4)
]
```

## 3.3 Layout responsivo da view

```
DESKTOP (lg+)                              MOBILE (< lg)
┌─────────────────────────────────────┐    ┌──────────────────────┐
│ PageHeader "Central de Ajuda"       │    │ PageHeader           │
├──────────┬──────────────────────────┤    │ [🔍 busca sticky]    │
│ TOC      │  [🔍 Buscar na ajuda]    │    ├──────────────────────┤
│ sticky   │  ┌────────────────────┐  │    │ ▸ Primeiros passos   │
│ (nav     │  │ Card da seção      │  │    │ ▾ Dashboard          │
│  âncora  │  │  resumo            │  │    │   resumo             │
│  por     │  │  ▸ Como usar (ol)  │  │    │   Como usar…        │
│  grupo)  │  │  ▸ Dicas           │  │    │ ▸ Lançamentos        │
│          │  │  ▸ Perguntas freq. │  │    │ ▸ Cartões            │
│          │  └────────────────────┘  │    │ …(accordion, 1 nível)│
└──────────┴──────────────────────────┘    └──────────────────────┘
```

- **Desktop:** `grid lg:grid-cols-[220px_1fr]`; TOC `sticky top-20` com âncoras (`scroll-mt-20` nas seções); conteúdo em cards `BentoCard`-like por seção, sempre com tokens (zero hex).
- **Mobile:** coluna única; busca `sticky top-14`; seções em **accordion** (`<details>`/estado) com cabeçalho de **min-h-11 (44px)**; passos numerados `text-sm` (nunca abaixo de 14px); sem scroll horizontal.
- **Grupos do TOC:** Primeiros passos · Dia a dia (Dashboard, Lançamentos, Contas Correntes, Calendário) · Cartões · Conciliação · Cadastros (Parceiros, Categorias) · Investimentos & Assinaturas · Relatórios · Áurea (IA) · Administração (Operadores, Perfis, Auditoria) · Minha conta (Configurações) · Instalar no celular (PWA).
- **Acessibilidade:** headings hierárquicos (`h1`→`h2` grupo→`h3` tela), `aria-expanded` no accordion, busca com `role="search"`, resultado "N seções encontradas" em `aria-live="polite"`.
- **Personalização:** seções cuja `permissao` falha em `temPermissao()` são agrupadas no final sob "Outros recursos" (colapsado) com aviso amigável: *"Estas telas existem no sistema, mas seu perfil atual não tem acesso a elas. Fale com o administrador da sua empresa."*

## 3.4 Conteúdo da documentação (resumo por tela — texto final para `ajudaContent.js`)

> Linguagem: amigável, zero termos técnicos (regra CLAUDE.md §7). Abaixo o resumo + pontos-chave do "como usar"; o arquivo de conteúdo expande em passos numerados.

| Seção | O que a tela faz | Guia prático (essência) |
|---|---|---|
| **Primeiros passos** | Onboarding do sistema | Criar conta → cadastrar contas correntes → categorias e parceiros → primeiro lançamento → instalar o app no celular |
| **Dashboard** | Resumo financeiro com saldos, gráficos e alertas | Abas Visão Geral/Cartões; alertas clicáveis; filtro de período |
| **Lançamentos** (`/contas`) | Contas a pagar e receber: criar, editar, baixar (marcar como paga/recebida), estornar e transferir entre contas correntes | Nova Conta → preencher vencimento/valor/categoria/parceiro; Baixar informa data e conta corrente do pagamento; Estornar desfaz uma baixa criando o movimento contrário; filtros por status/período/valor |
| **Contas Correntes** | Suas contas bancárias e o saldo de cada uma | Cadastrar banco/agência/número; o saldo é calculado automaticamente pelos lançamentos baixados — nunca é editado à mão |
| **Calendário** | Vencimentos e assinaturas dia a dia | Tocar num dia mostra o painel com as contas; dá para baixar uma conta direto do painel |
| **Cartões → Dashboard** | Indicadores dos cartões: limite usado, faturas, gastos por categoria/parceiro, parcelamentos | Filtros rápidos de período; alertas de fatura fechando em até 7 dias |
| **Cartões → Lançamentos** | Compras e estornos do cartão, fatura a fatura | Escolher o cartão → lançar compra (Saída) ou estorno (Entrada); fechar fatura gera automaticamente uma conta a pagar |
| **Cartões → Conciliação** | Conferir a fatura do banco (arquivo OFX) com o que você lançou | Baixar OFX no app do banco → enviar → vincular cada item a um lançamento existente ou criar na hora → finalizar |
| **Conciliação bancária** | Conferir o extrato da conta (OFX) com seus lançamentos | Mesmo fluxo: enviar OFX → revisar item a item (vincular/criar/ignorar) → finalizar atualiza o saldo → relatório em PDF |
| **Parceiros** | Clientes e fornecedores | Informe o CNPJ e o sistema preenche os dados automaticamente (Receita Federal); CPF/CNPJ é obrigatório |
| **Categorias** | Organização de receitas/despesas, com subcategorias | Criar categoria raiz ou subcategoria; excluir apenas desativa (histórico preservado); os relatórios somam a subcategoria dentro da categoria-mãe |
| **Investimentos** | Carteira: contas de investimento, aportes, resgates e rendimentos | Criar tipos (Renda Fixa, Ações…) → conta de investimento → registrar transações; o patrimônio soma tudo |
| **Assinaturas** | Gastos recorrentes (streaming, academia…) | Cadastrar valor/dia de vencimento (e cartão, se for no cartão); assinatura ativa gera a conta todo mês; pausar = Inativa |
| **Relatórios** | Fluxo de Caixa, DRE, Extrato, Contas em Aberto, Investimentos, Cartões, Posição, Assinaturas | Escolher período e filtros → Ver online, PDF ou Excel; cada relatório aparece conforme sua permissão |
| **Áurea (IA)** | Assistente que consulta e lança por você em linguagem natural | Balão no canto ou tela Assistente; peça "quanto gastei em mercado este mês?" ou "lança R$ 50 de padaria hoje"; anexe extratos (PDF/OFX/planilha) para análise; ela pede confirmação antes de registrar |
| **Auditoria** | Registro de tudo que aconteceu na conta da empresa | Filtrar por ação/período; eventos feitos pela IA têm selo próprio |
| **Operadores** | Convidar e gerenciar membros da empresa | Convidar por e-mail com um perfil de acesso; remover desativa (pode reativar depois) |
| **Perfis de Acesso** | O que cada perfil pode fazer no sistema | Perfis do sistema não podem ser alterados; crie perfis personalizados marcando permissões por módulo — "Visualizar" é sempre necessário para as demais ações |
| **Configurações** | Seus dados, foto e senha | Trocar senha exige mínimo de 8 caracteres com letras maiúsculas, minúsculas e número |
| **Instalar no celular** | O Core 4 funciona como aplicativo | Android/desktop: botão "Instalar" no aviso; iPhone: Compartilhar → Adicionar à Tela de Início; funciona com aviso quando você fica sem internet |

## 3.5 Integração no código (spec exata)

1. **`src/content/ajudaContent.js`** — novo; array `AJUDA_SECOES` + `AJUDA_GRUPOS` (conteúdo da 3.4).
2. **`src/views/Ajuda.jsx`** — novo; usa `PageHeader`, tokens do tema, `useAuth().temPermissao`; estado `busca` + `aberto` (accordion); zero hex hardcoded; touch targets ≥ 44px.
3. **`src/App.jsx`** — adicionar:
   ```jsx
   <Route path="/ajuda" element={<ProtectedLayout><Ajuda /></ProtectedLayout>} />
   <Route path="/help"  element={<Navigate to="/ajuda" replace />} />
   ```
4. **`src/components/layout/Sidebar.jsx`** — no bloco do rodapé (junto de Configurações, `Sidebar.jsx:208`): item `{ label: 'Ajuda', icon: HelpCircle, path: '/ajuda' }` — sem `permissao`.
5. **`src/components/layout/TopNav.jsx`** — botão `?` (`aria-label="Abrir a Central de Ajuda"`, `min-w-11 min-h-11`) navegando para `/ajuda`, ao lado do toggle de tema.
6. **`src/components/ui/CommandPalette.jsx`** — adicionar `/ajuda` em `PAGES` + entradas "Como faço para…" apontando para âncoras (`/ajuda#conciliacao` etc.).
7. **`src/lib/routeUtils.js`** — adicionar `/ajuda` ao final de `ROUTE_PRIORITY` (fallback universal: todo usuário tem acesso, elimina o caso de usuário sem nenhuma rota acessível).

---

# PARTE 4 — Consistência de UI e Design System

## 4.1 Diagnóstico

- **Tokens existem e são bons** (`index.css @theme`: superfícies, primary `#6EFFC0`, error, radius, shadows) — mas **não há componentes que os encapsulem**, então cada tela reimplementa: 300+ hex hardcoded; gradiente `#6EFFC0→#2bdb96` copiado 4× (`ContasFinanceiras.jsx:404,505,540`, `Parceiros.jsx:220`) com cor `#2bdb96` que não existe em token algum.
- **Duas linguagens visuais:** telas de auth (Login/Register/RedefinirSenha/AceitarConvite) 100% inline-style dark fixo vs telas internas em Tailwind + tokens. **Duas administrações:** GestaoOperadores/GestaoPerfis 100% inline, ignorando os 18 componentes de `ui/`.
- **Duplicações a eliminar:** `ConfirmModal` × `useConfirm._ConfirmDialog` (2 diálogos divergentes); `BrandMark` ×3; CSS `.field-float` ×4; `inputCls` redefinido em `Configuracoes.jsx:9`; catálogo de 52 ícones duplicado (`Categorias.jsx:25-86` vs `IconDropdown.jsx`); conciliação ~82% clonada (§2.2 do relatório do módulo); `Toast` legado duplicado dentro de `Toast.jsx:67-89`.
- **3 políticas de senha divergentes** exibidas ao usuário (Register: maiúsc+minúsc+número · RedefinirSenha: "número **ou** símbolo" e botão que valida só o tamanho · AceitarConvite: sem minúscula) — além de `Configuracoes` que só valida tamanho.

## 4.2 Proposta de Design System (ordem de criação)

| # | Artefato | Especificação |
|---|---|---|
| DS-1 | **`ui/Button.jsx`** | Variantes `primary` (bg-primary text-on-primary), `secondary`, `ghost`, `danger` (tokens error) · tamanhos `sm` (h-9 — só desktop-dense), `md` (h-11 = 44px, default), `icon` (min-w-11 min-h-11) · props `loading` (spinner + disabled), `leftIcon` · `focus-visible:ring-2 ring-primary` |
| DS-2 | **`ui/Modal.jsx`** (base) | Portal + overlay; `role="dialog" aria-modal aria-labelledby`; **focus trap**; Escape e clique no overlay fecham (configurável); `max-h-[85dvh] overflow-y-auto`; `< sm` vira fullscreen/bottom-sheet; refatorar ConfirmModal, DateRangeModal, ModalCriacaoRapida, ReportModal, ModalConvite, ModalEditarPerfil, ModalPerfil e SenhaProvisoriaModal por cima dele; **deletar** `_ConfirmDialog` de `useConfirm` (passa a renderizar `ConfirmModal`) |
| DS-3 | **Tokens complementares** | `--color-warning #FFD37A` + surface/border (hoje `amber-*` ad hoc); `--gradient-primary` (o `#6EFFC0→#2bdb96`); mapear tooltips Recharts a um objeto `chartTheme(theme)` derivado do ThemeContext |
| DS-4 | **Escala tipográfica mínima** | Proibir `text-[8px]`/`[9px]`/`[10px]` em conteúdo e controles; piso: `text-xs` (12px) para micro-labels decorativos, `text-sm` (14px) para dados e botões; substituição em massa guiada por grep |
| DS-5 | **`ui/FormField` unificado** | Um único sistema (manter floating só no auth se desejado); `id`/`htmlFor` obrigatórios, `aria-invalid` + `aria-describedby` no erro; exportar `PasswordRules` (checklist única de senha — **fonte única** para Register/RedefinirSenha/AceitarConvite/Configuracoes) |
| DS-6 | **`DataTable` v2** | `cardView` responsivo automático (`< md` renderiza cards) já que existe e ninguém usa; `aria-sort`; linha clicável com `tabIndex`/Enter; remover `sticky` inócuo; desabilitar sort client-side quando houver paginação server-side |
| DS-7 | **`lib/pdfUtils.js` de fato usado** + `chartTheme` | Cores/cabeçalho/rodapé de PDF centralizados (hoje duplicados nos 2 relatórios de conciliação) |
| DS-8 | **Extração da conciliação** | `UploadZone` genérica, `ItemRowBase`, `VincularModalBase`, hook `useSessaoConciliacao` — corta ~940 linhas duplicadas e faz cada fix valer para os 2 módulos |

---

# PARTE 5 — Usabilidade e Fricção (achados por severidade)

## 🔴 Corrigir imediatamente (bugs de UX)

| ID | Tela | Problema | Correção |
|---|---|---|---|
| U1 | GestaoOperadores/Perfis | **Erro de API renderiza atrás do overlay do modal** (`GestaoOperadores.jsx:146+184+19`, `GestaoPerfis.jsx:204+237+90`) — convite/salvamento falha sem feedback visível | Erro dentro do modal + toasts de sucesso/erro |
| U2 | Conciliação | **Erros engolidos**: `catch {}` em vincular/ignorar/desvincular (`ConciliacaoItemRow.jsx:37`, gêmeo cartão idem); form fecha e perde dados mesmo em falha (`:49-52`) | Toast de erro + manter form aberto em falha |
| U3 | Dashboard | Falha de API vira **"saldo R$ 0,00"** sem aviso (`Dashboard.jsx:34-36,49-51` `.catch(() => null)`) | Estado de erro com "Tentar novamente" |
| U4 | Calendário | Falha de API = calendário vazio silencioso (`Calendario.jsx:45,50-51`); >500 contas somem (size fixo) | Erro visível + paginação por mês na API |
| U5 | ChatSidebar | "Limpar conversa" não limpa a UI (`ChatSidebar.jsx:73-77`); sem confirmação; `TypingDots` existe e nunca renderiza (sem feedback entre envio e 1º token) | Resetar runtime + confirm + exibir TypingDots |
| U6 | Assistente | Exclusão de conversa otimista sem rollback (`Assistente.jsx:216-220`); sem retry em erro de stream; sem abortar stream | Rollback + botão "Tentar novamente" + AbortController |
| U7 | Audit | Busca varre só os 50 carregados; **sem paginação** apesar do `Pagination` existir (`Audit.jsx:56-57,67-73`) | Paginação server-side + busca server-side |
| U8 | CartaoDashboard | Filtros "Este mês" e "Últimos 15 dias" produzem o mesmo período (`CartaoDashboard.jsx:231-233`); erro de API mascarado como "Sem dados" | Corrigir cálculo; separar erro de vazio |
| U9 | ContasFinanceiras | Chips de status contam só a página atual — "5 Atrasadas" pode mentir (`:376,474-476`); filtro `valorMax` enviado à API mas **sem input na UI** (`:20,98,529`) | Contadores do backend; adicionar input "Valor até" |
| U10 | Login | "Confiar neste dispositivo" não faz nada (`Login.jsx:202`); Termos/Privacidade `href="#"`; delay artificial 2,4s pós-login | Ligar ou remover; links reais; delay ≤ 800ms |
| U11 | VincularContaModal | Limite silencioso de 200 contas client-side (`:15`); falha vira falso "Nenhuma conta encontrada" (`:17`) | Busca server-side + estado de erro |
| U12 | Parceiros | Submit falha em silêncio se o erro está noutra aba do form (`Parceiros.jsx:88-100,229`) | Trocar para a aba com erro + badge de erro na aba |

## 🟠 Fricção relevante

- **Sem ação em lote na conciliação** (aceitar todos os sugeridos / ignorar não-identificados) — extrato de 100 itens = 100+ toques; a maior economia de tempo disponível no produto.
- Flash de `EmptyState` sem loading em ContasCorrentes/Parceiros/Categorias/Assinaturas/Investimentos (sugere base vazia).
- `window.confirm` nativo em Operadores/Perfis; mensagens de exclusão não explicam consequências (subcategorias em cascata — `Categorias.jsx:164`; contas bloqueadas por vínculo — `ContasCorrentes.jsx:63`).
- Detalhe do cartão sem rota própria (`Cartoes.jsx` estado local) — F5/voltar/deep-link perdem o contexto.
- Exportações (PDF/Excel) sem toast de sucesso; `ReportModal` mostra período ISO cru; sem validação `inicio<=fim`.
- Ações de permissão em código cru (`FECHAR_FATURA`) na matriz de perfis; dependência automática de VISUALIZAR sem explicação (`GestaoPerfis.jsx:140,55-76`).
- `TickerBar` com **cotações falsas rotuladas "LIVE"** (`TopNav.jsx:23-32`) — remover ou ligar à API real (o `HeroPane` do login já consome AwesomeAPI/BCB — mas com `fetch` direto, violando o padrão).
- Anexo do chat sem validação client de 5MB; `.xls` aceito mas omitido da dica (`Assistente.jsx:10,453`).
- `Configuracoes` grava em `localStorage` (padrão do app é `sessionStorage`) (`Configuracoes.jsx:67`).
- `ErrorBoundary` expõe `error.message` técnico e usa classes inexistentes (`text-on-surface`) (`ErrorBoundary.jsx:23-25`).

---

# PARTE 6 — Arquitetura da Informação e Navegação

**Estado atual:** rail desktop com hover-expand (agradável no desktop, **quebrado no mobile** — T1); hambúrguer + drawer no mobile; sem bottom navigation; ⌘K com busca global de dados (ótima base).

**Propostas:**
1. **Sidebar**: expandir por **estado** (clique/foco), não por hover — `focus-within:w-56` + toggle persistido; no drawer mobile, largura plena com labels sempre visíveis (correção do T1). `aria-expanded` no dropdown Cartões; fechar drawer ao navegar.
2. **Bottom navigation no PWA mobile** (5 slots): Dashboard · Lançamentos · **Áurea (central, destacado — protagonista do produto)** · Calendário · Menu (abre o drawer). Reduz drasticamente o custo dos fluxos diários no celular; respeitar `safe-area-inset-bottom`; o FAB do chat some quando a bottom nav existe (resolve também a sobreposição do FAB com a paginação).
3. **Reagrupar "Financeiro"** (10 itens): mover "Conciliação" para junto de "Contas Correntes"; renomear "Lançamentos" (cartão) no submenu para evitar colisão com "Lançamentos" (`/contas`) — hoje há dois itens "Lançamentos" e "Dashboard" duplicados no menu (raiz e submenu Cartões), ambíguo.
4. **CommandPalette**: filtrar `PAGES`/`ACTIONS` por `temPermissao`; incluir rotas faltantes (`/audit`, `/empresa/*`, `/conciliacao`, `/assistente`, `/ajuda`); ações rápidas devem abrir o formulário (query param `?novo=1`), não só navegar.
5. **Guards**: adicionar `PermissaoRoute` às 8 rotas da A-R1 (`CONCILIACAO_VISUALIZAR`, `ASSINATURA_VISUALIZAR`, `PARCEIRO_VISUALIZAR`, `CONTA_CORRENTE_VISUALIZAR`, `CONTA_VISUALIZAR`).
6. **TopNav**: exibir o título da página também no mobile (hoje `hidden sm:block`) — é a única âncora de contexto quando a bottom nav não está ativa.

---

# PARTE 7 — Plano de Ação Front-end (fases executáveis)

> Cada fase é independente e commitável. Estimativas em dias úteis de 1 dev.

## Fase 0 — Fundações do Design System (3–4 dias)
1. `ui/Button.jsx` (DS-1) + `ui/Modal.jsx` (DS-2) + tokens warning/gradiente (DS-3).
2. Self-host de fontes (PWA-1) · safe-area (PWA-2) · theme_color (PWA-3) · manifest maskable/shortcuts (PWA-4) · nginx immutable (PWA-5).
3. Unificar confirmação: `useConfirm` renderiza `ConfirmModal`; deletar `_ConfirmDialog`.
4. `PasswordRules` única (DS-5) aplicada às 4 telas de senha.

## Fase 1 — Mobile crítico (4–5 dias)
5. **Sidebar**: expand por estado + drawer com labels (T1); `aria-expanded`; fechar ao navegar.
6. **Conciliação responsiva**: extrair `ItemRowBase` com card mobile (quebra #1) — já elimina metade da duplicação (DS-8 parcial).
7. **Chat mobile**: ações sempre visíveis `< lg` (U-Assistente); TypingDots; limpar conversa com confirm + reset (U5); FAB com safe-area.
8. **GestaoOperadores/GestaoPerfis**: migrar para `PageHeader` + `DataTable(cardView)` + `Modal` + `useToast` — corrige U1, o corte de tabela e o tema claro de uma vez.
9. **Calendário mobile**: agenda-lista `< lg` + scroll ao painel do dia (quebra #3).
10. Varredura de touch targets: `Button size=icon` (min 44px) em todas as ações de linha (T2).

## Fase 2 — Central de Ajuda (2–3 dias)
11. `src/content/ajudaContent.js` (conteúdo da Parte 3.4).
12. `src/views/Ajuda.jsx` (layout 3.3) + rota + alias `/help`.
13. Sidebar (rodapé) + botão `?` no TopNav + CommandPalette + `ROUTE_PRIORITY`.
14. QA responsivo da tela (375/768/1280, temas claro/escuro, teclado).

## Fase 3 — Consistência e fricção (5–7 dias)
15. Tema claro: substituir hex hardcoded por tokens nos 15 piores arquivos (T4) + `chartTheme()` para Recharts.
16. Tipografia: varredura `text-[8-10px]` → `text-xs`/`text-sm` (T3, DS-4).
17. Bugs U2–U4, U6–U12 (erros silenciosos, contadores, filtros, paginação do Audit).
18. `DataTable` v2 com `cardView` automático + adoção em Audit/Transferências/listas (T9, DS-6).
19. Loading states nas 5 listas com flash de EmptyState.
20. Telas de auth: migrar para Tailwind/tokens (remover 4× `.field-float`, 3× BrandMark, `<a href>` → `<Link>`).
21. TickerBar: dados reais ou remoção; ligar/remover "Confiar neste dispositivo" (U10).

## Fase 4 — Navegação avançada (3–4 dias)
22. Bottom navigation PWA (Parte 6.2).
23. `PermissaoRoute` nas 8 rotas restantes; CommandPalette filtrada por permissão + ações com `?novo=1`.
24. Detalhe do cartão com rota própria (`/cartoes/:id`).
25. Ação em lote na conciliação ("aceitar sugeridos", "ignorar não identificados").
26. Acessibilidade: focus-visible global, `prefers-reduced-motion`, `aria-sort`/linha-teclado no DataTable (T10).

---

## Apêndice — Correções pontuais rápidas (quick wins < 30min cada)

| Arquivo | Fix |
|---|---|
| `PageHeader.jsx` | Aceitar prop `icon` (5 telas já passam e ela é descartada) — ou remover das chamadas |
| `Conciliacao.jsx:238` | Datas do período com `formatDate` (hoje ISO cru); idem `ReportModal.jsx:40` |
| `Assinaturas.jsx:265,296` | `brl()` no custo diário (hoje "R$ 3.33/dia" com ponto) |
| `Cartoes.jsx:40,175` | Incluir campo `tipo` no form de edição de lançamento |
| `Cartoes.jsx` | Remover `required` nativo que mascara a validação custom |
| `Audit.jsx:199` | Exibir nome do usuário em vez de `usuarioId` cru |
| `Configuracoes.jsx:67` | `localStorage` → `sessionStorage`; remover ternário morto `:222-224` |
| `DashboardHome.jsx:20` | Aba salva em `localStorage` → `sessionStorage` |
| `ErrorBoundary.jsx:23-25` | Classes `text-on-surface` → `text-text-primary`; mensagem genérica amigável |
| Imports mortos | `Badge`/`brl` (2 views de conciliação), `useCallback` (Cartoes), `Calendar`/`PieIcon` (CartaoDashboard), `filtroBadge()`, `FILTRO_VARIANT`, `scrollToBottom` (ChatSidebar), ícones de `STATS` |
| `KpiCards.jsx:34` | Eliminar classe Tailwind interpolada `` `text-${kpi.color}` `` (frágil no JIT) |
| `Register.jsx:89` | `navigate('/dashboard')` → `getFirstAccessibleRoute` (como o Login) |
| `Register.jsx:85` | `nomeEmpresa` obrigatório quando tipo = EMPRESA |
| `AceitarConvite.jsx:117` | Mostrar e-mail e empresa do convite antes do aceite |
