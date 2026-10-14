# Core 4 — guia rápido do design system

Escuro por padrão, tema claro de primeira classe. **Use os tokens, nunca hex solto.** Cada arquivo tem
JSDoc com todas as props; aqui vai o mínimo para usar certo.

## Tokens (src/index.css)

| Papel | Classe Tailwind |
|---|---|
| Superfícies em camadas | `bg-surface` · `bg-surface-low` · `bg-surface-medium` · `bg-surface-high` · `bg-surface-highest` |
| Texto | `text-text-primary` (+ opacidade: `/80` corpo, `/65` apoio, `/50` dica) |
| Bordas 1px | `border-border` (sutil) · `border-border-strong` (controles) |
| Marca | `text-primary` · `bg-gradient-primary` · `text-on-primary` · `text-silver` |
| Significado fixo | `text-income` (entrou) · `text-expense` (saiu) · `text-invest` (investido) · `text-warning` · `text-error` · `text-info` |
| Gráficos | `var(--color-chart-1..6)`, `--color-chart-grid`, `--color-chart-axis` (use `lib/chartTheme.js`) |
| Sombras | `shadow-[var(--shadow-card)]` · `shadow-elevated` · `shadow-[var(--shadow-primary)]` · `--shadow-glow` |
| Raios | `rounded-lg` 8 · `rounded-xl` 12 · `rounded-2xl` 16 (cartões) · `rounded-3xl` 24 |

Classes prontas: `c4-card` (+ `c4-card--destaque`, `c4-card--interativo`), `c4-glass` (só overlays/nav),
`c4-eyebrow` (rótulo pequeno), `c4-kpi` (número grande), `c4-text-silver` / `c4-text-emerald`, `c4-hairline`,
`c4-kbd`, `tabular-nums`, `valor-privado` (borrado no modo privacidade **Alt+P**), `shimmer-bg`.

Fontes: `font-display` (Sora — títulos e números grandes), corpo DM Sans (padrão), `font-mono` (códigos).

## Regras de tela (todas)

1. `PageHeader` com UMA ação primária à direita.
2. Uma barra de filtros (`FilterBar`) com UM `PeriodoSelector` (nunca dois filtros de data).
3. Conteúdo em `Card`/`BentoCard`, KPIs com `KpiGrid` + `KpiCard`.
4. Estados: carregando → skeleton (`PageSkeleton`, `SkeletonCard`, `DataTable loading`); vazio → `EmptyState`; erro → `AlertaErro`.
5. Exclusão sempre com `useConfirm()` (ConfirmModal). Formulários com `FormField`. Botões só `Button`.
6. Movimento: `components/motion` (respeita "reduzir movimento"). Nada de animação > 300 ms na UI comum.
7. Dados: `useCarga(fn, deps)` (hooks/useCarga.js) evita `setState` síncrono em efeito (regra do React 19).

## Marca

```jsx
import BrandMark from '../components/ui/BrandMark';   // símbolo SVG — size, variant 'color'|'mono', title
import BrandLogo from '../components/ui/BrandLogo';   // símbolo + "Core4" — size 'sm'|'md'|'lg', tagline, variant 'auto'|'dark', somenteSimbolo
<BrandLogo size="lg" tagline />
```
Nome em texto: **Core 4** (com espaço). Arquivos estáticos: `public/brand/core4-mark.svg` (e `-light`), `public/favicon.svg`.

## Primitivos

### Button
```jsx
<Button>Salvar</Button>
<Button variant="secondary" leftIcon={<Download className="w-4 h-4" aria-hidden />}>Exportar</Button>
<Button variant="danger" loading={salvando}>Excluir</Button>
<Button variant="ghost" size="icon" aria-label="Editar"><Pencil className="w-4 h-4" /></Button>
```
`variant`: primary · secondary · ghost · danger · danger-ghost · link. `size`: xs · sm · md (44px) · lg · icon (44) · icon-sm (36 visual/44 toque). `fullWidth`, `loading`.

### Card / BentoCard
```jsx
<Card title="Despesas por categoria" subtitle="Por vencimento, 5 maiores" icon={PieChart}
      actions={<Button size="sm" variant="ghost">Ver tudo</Button>} footer={<Link …>Relatório</Link>}>
  …
</Card>
<Card destaque />  <Card onClick={abrir} />  <Card padding="none" />  <Card loading />
```
Também: `eyebrow`, `accentColor` (fio lateral), `accentChip` ("▲ 12%"), `interactive`, `as`.

### KpiCard / KpiGrid / Delta  (`ui/KpiCard.jsx`)
```jsx
<KpiGrid cols={4}>
  <KpiCard label="Saldo em contas" valor={57256.47} icon={Wallet} destaque />
  <KpiCard label="Entradas do mês" valor={12000} anterior={10500} tom="income" icon={ArrowDownLeft} />
  <KpiCard label="Saídas do mês" valor={9000} anterior={9800} tom="expense" inverterDelta />
  <KpiCard label="Resultado" valor={3000} colorirSinal ajuda="Entradas menos saídas no mês." />
</KpiGrid>
```
`formato`: moeda · numero · percentual · compacto · fn. `tom`: income · expense · invest · primary · neutro.
`tendencia` (% pronto) no lugar de `anterior`; `contexto` ("vs. mês anterior"); `sparkline` (nó); `loading`.
`<Delta atual anterior inverter />` ou `<Delta variacao={12.5} />` avulso. `StatCard` = alias.

### PeriodoSelector (o ÚNICO filtro de período) + MonthSelector
```jsx
import PeriodoSelector, { MonthSelector } from '../components/ui/PeriodoSelector';
import { usePeriodoUrl, useMesUrl } from '../hooks/usePeriodoUrl';
import { paraMesAno } from '../lib/periodo';

const [periodo, setPeriodo] = usePeriodoUrl('3m');   // URL: ?de=2026-08-01&ate=2026-10-31
<PeriodoSelector value={periodo} onChange={setPeriodo}
  granularidade="mes"                               // 'mes' (meses inteiros) | 'dia' (datas)
  atalhos={['mes', '3m', '6m', '12m', 'ano']}       // hoje, 7d, 30d, 90d, mes, mes-passado, 3m, 6m, 12m, ano
  label="Período" align="start" />
api.resumo(paraMesAno(periodo));                    // { mesInicio, anoInicio, mesFim, anoFim }

const [mes, setMes] = useMesUrl();                  // ?mes=2026-10  (telas mensais)
<MonthSelector value={mes} onChange={setMes} />
```
`lib/periodo.js`: `periodoDoAtalho(id)`, `atalhoDoPeriodo(p)`, `paraMesAno(p)`, `deMesAno(m)`, `rotuloPeriodo(p)`,
`validarPeriodo(p)`, `periodoDoMes('2026-10')`, `somarMeses`, `rotuloMes`, `paraIso`, `deIso`.
Compatível com o formato antigo `{mesInicio,…}` (devolve no mesmo formato).

### FilterBar
```jsx
<FilterBar busca={{ value: q, onChange: setQ, placeholder: 'Buscar por descrição' }}
  periodo={<PeriodoSelector value={periodo} onChange={setPeriodo} />}
  filtrosAtivos={n} onLimpar={limpar} acoes={<Button variant="secondary">Exportar</Button>}>
  <FormSelect …/>   {/* extras: inline no desktop, numa folha no celular */}
</FilterBar>
```

### Tabs / Tabs.Links / SegmentedControl  (`ui/Tabs.jsx`)
```jsx
<Tabs value={aba} onChange={setAba} label="Operadores" idBase="op"
  items={[{ value: 'ativos', label: 'Ativos', badge: 3 }, { value: 'pendentes', label: 'Pendentes' }]} />
<div role="tabpanel" id={Tabs.painelId('op', aba)} aria-labelledby={Tabs.abaId('op', aba)}>…</div>

<Tabs.Links label="Cartões" items={[{ to: '/cartoes/dashboard', label: 'Visão geral' }, { to: '/cartoes', label: 'Faturas e lançamentos', end: true }]} />
<SegmentedControl value={v} onChange={setV} label="Visão" size="sm" items={[{ value: 'mes', label: 'Mês' }, { value: 'ano', label: 'Ano' }]} />
```
Filtre os itens por permissão antes de passar (não mostre aba que o usuário não abre).

### PageHeader
```jsx
<PageHeader title="Cartões" subtitle="Faturas, limites e lançamentos do cartão." icon={CreditCard}
  actions={<Button leftIcon={<Plus …/>}>Novo lançamento</Button>} breadcrumb={[{ label: 'Cartões', to: '/cartoes' }, 'Fatura']}>
  <Tabs.Links … />   {/* children: logo abaixo do cabeçalho */}
</PageHeader>
```
`description` = alias de `subtitle`; `eyebrow` opcional.

### FormField + campos  (`ui/FormField.jsx`)
```jsx
<FormField label="Descrição" required error={erros.descricao} help="Aparece no extrato">
  <FormInput value={…} onChange={…} />
</FormField>
<FormSelect>…</FormSelect>  <TextareaField />  <PasswordInput />  <FloatingInput /> (telas públicas)
```
Liga label/aria automaticamente. Classes soltas: `inputCls`, `inputSmCls`, `labelCls`.

### DataTable
```jsx
<DataTable caption="Contas a pagar" columns={[{ key: 'descricao', label: 'Descrição', sortable: true },
  { key: 'valor', label: 'Valor', className: 'text-right', render: (v) => formatarMoeda(v) }]}
  data={linhas} loading={carregando} onRowClick={abrir} renderCard={(l) => <LinhaMobile l={l} />}
  emptyState={<EmptyState … />} serverSort={false} />
```
Tabela em `md+`, cartões no celular.

### GroupedList (lista por urgência)
```jsx
<GroupedList grupos={[{ id: 'atrasadas', titulo: 'Atrasadas', tom: 'critico', icon: AlertTriangle, total, itens }]}
  renderItem={(c) => <LinhaConta c={c} />} keyItem={(c) => c.id} />
```
`tom`: critico · atencao · info · sucesso · neutro.

### EmptyState · ComoFunciona · AlertaErro
```jsx
<EmptyState icon={Receipt} title="Nenhuma conta neste período"
  description="As contas aparecem aqui assim que você cadastrar ou importar um extrato."
  action={{ label: 'Nova conta', onClick: abrir, icon: Plus }} dica="Dica: use a Áurea para lançar por conversa." />
<ComoFunciona titulo="Como funciona a conciliação" recolhivel chave="conciliacao"
  itens={[{ icon: Upload, texto: 'Importe o OFX do banco.' }, …]} />
<AlertaErro mensagem={erro.message} onTentarNovamente={recarregar} />
```

### Progresso e rosca
```jsx
import { ProgressBar, ProgressRing } from '../components/ui/Progress';
<ProgressBar valor={gasto / limite} marca={diaHoje / diasMes} tom={gasto > limite ? 'expense' : 'primary'} label="Uso do orçamento" mostrarValor />
<ProgressRing valor={0.72} tom="invest" tamanho={72} label="Limite usado">72%</ProgressRing>
<DonutChart titulo="Despesas por categoria" fatias={[{ id, nome, valor, cor? }]} rotuloCentro="Total do mês" />
```

### Gráficos (Recharts)  — `lib/chartTheme.js` + `ui/ChartTooltip.jsx`
```jsx
import { gradeProps, eixoXProps, eixoYProps, tooltipProps, areaProps, barraProps, CORES_GRAFICO, corSerie, formatarEixoMoeda } from '../lib/chartTheme';
import ChartTooltip, { GradienteArea, BrilhoLinha, PontoFinal } from '../components/ui/ChartTooltip';
<GraficoAcessivel resumo="Entradas subiram 12% em 6 meses" tabela={{ titulo, colunas, linhas }}>
  <ResponsiveContainer height={260}><AreaChart data={dados}>
    <defs><GradienteArea id="gEnt" cor={CORES_GRAFICO.entrada} /><BrilhoLinha id="brilho" /></defs>
    <CartesianGrid {...gradeProps} /><XAxis dataKey="mes" {...eixoXProps} /><YAxis {...eixoYProps} tickFormatter={formatarEixoMoeda} />
    <Tooltip {...tooltipProps} content={<ChartTooltip formato="currency" />} />
    <Area dataKey="entradas" stroke={CORES_GRAFICO.entrada} fill="url(#gEnt)" filter="url(#brilho)" {...areaProps}
          animationDuration={1300} dot={<PontoFinal total={dados.length} cor={CORES_GRAFICO.entrada} />} />
  </AreaChart></ResponsiveContainer>
</GraficoAcessivel>
```

### Sobreposições
```jsx
<Modal open onClose title description icon size="sm|md|lg|xl">…<Modal.Footer>…</Modal.Footer></Modal>
<Drawer open onClose title side="right|left|bottom" size="sm|md|lg" footer={<Button>Salvar</Button>}>…</Drawer>
const confirmar = useConfirm(); if (await confirmar({ title: 'Excluir conta?', message: '…', confirmLabel: 'Excluir' })) …
const toast = useToast(); toast.success('Conta salva.'); toast.error(msg);
toast.info('Item arquivado.', { action: { label: 'Desfazer', onClick: desfazer, icon: Undo2 }, onClose: confirmar }); // 10 s, pausa no hover/foco
// Aviso com estado próprio (ex.: conciliação soma itens ignorados): <CartaoAviso … /> de ui/Toast.jsx
<Tooltip conteudo="Exportar em Excel"><Button size="icon" aria-label="Exportar">…</Button></Tooltip>
```

### Outros
`Avatar` (nome, src, size) · `Badge` (variant success|primary|warning|error|info|neutral|income|expense|invest, dot) ·
`Pagination` (page, totalPages, totalElements, onChange) · `Skeleton` / `PageSkeleton` / `SkeletonCard` ·
`CommandPalette` (lê `lib/navigation.js`) · `PermissaoGuard` · `GraficoAcessivel`.

## Movimento (`components/motion`)
```jsx
import { FadeIn, Stagger, StaggerItem, AnimatedNumber, Revelar, PopPresence, IndicatorGroup, LayoutIndicator, Brotar } from '../components/motion/Movimento';
<Stagger className="grid gap-4" aoRolar>{itens.map((i) => <StaggerItem key={i.id}>…</StaggerItem>)}</Stagger>
<AnimatedNumber value={1234.5} format="currency" colorir />   // conta ao entrar na tela; sr-only com o valor final
```
Presets em `motion/presets.js` (DURACAO, MOLA, STAGGER, variantes de página/modal/drawer/toast).
A transição de rota já é feita pelo layout (não envolva a página em outra transição).

## Navegação (`lib/navigation.js`)
Fonte única: Sidebar, BottomNav, CommandPalette, trilha da TopNav e `document.title`. Tela nova = item em `NAV`
+ rota no `App.jsx`. Ações rápidas da busca (`NAV_ACOES`) só aparecem com `ativa: true` — ligue quando a tela
de destino ler `?novo=` e abrir o formulário.

## Atalhos
Ctrl/⌘+K busca · Alt+T tema · Alt+P modo privacidade (valores com `valor-privado` ficam borrados) · Alt+A acessibilidade.

## Acessibilidade (modo A11y · WCAG 2.2 AA)

O painel **Acessibilidade** (botão na TopNav, login, busca ou **Alt+A**) grava preferências em `localStorage`
(`core4.acessibilidade`) e as aplica como atributos no `<html>`. O CSS (`index.css › MODO DE ACESSIBILIDADE`)
faz o resto — **a tela só acompanha se usar tokens**. Declaração pública: `/acessibilidade`.

| Atributo no `<html>` | Efeito |
|---|---|
| `data-texto="112_5\|125\|150\|175"` | escala a raiz (tudo em `rem` cresce) |
| `data-contraste="alto"` | tokens AAA, superfícies sólidas, `text-text-primary/NN` vira 100%, sem vidro |
| `data-movimento="reduzido\|desligado"`, `data-pausar` | CSS sem animação; `MotionConfig reducedMotion="always"`; "desligado/pausar" = motion instantâneo |
| `data-fonte="legibilidade\|dislexia"` | Atkinson Hyperlegible / Lexend (carregadas sob demanda) |
| `data-espacamento="amplo"` | WCAG 1.4.12 (linha 1.5, letra .12em, palavra .16em, parágrafo 2em) |
| `data-daltonismo="protanopia\|deuteranopia\|tritanopia\|monocromia"` | troca `--color-chart-*`, `income/expense/invest` |
| `data-padroes` | texturas nas séries de gráfico |
| `data-leitura="simplificada"` | some `.c4-backdrop`, `[data-decorativo]`, auras e brilhos |
| `data-sublinhar-links`, `data-foco="destacado"`, `data-alvos="amplos"`, `data-cursor="grande"` | links sublinhados, foco preto/amarelo, alvos 48px, cursor grande |

**APIs**
```jsx
import { useAcessibilidade, useMovimentoReduzido } from '../hooks/useAcessibilidade';
const { efetivo, abrirPainel, anunciar, padroesAtivos } = useAcessibilidade();
const reduzir = useMovimentoReduzido();   // use NO LUGAR de useReducedMotion (que só olha o sistema)
anunciar('Conta salva.');                  // fala no leitor de tela (aria-live polite)

import { usePadroesGrafico, CORES_GRAFICO } from '../lib/chartTheme';
const padroes = usePadroesGrafico();       // ou usePadroesGrafico([CORES_GRAFICO.entrada, CORES_GRAFICO.saida])
<BarChart><defs>{padroes.defs}</defs>
  <Bar dataKey="a" fill={padroes.preencher(0)} /><Bar dataKey="b" fill={padroes.preencher(1)} /></BarChart>
<span style={padroes.estiloAmostra(0)} />   // amostra da legenda HTML com a mesma textura
```
`areaProps`/`barraProps`/`pizzaProps` já desligam a animação do Recharts com movimento reduzido — espalhe-os.
`DonutChart` já usa padrões. `KpiGrid` perde colunas com texto grande (não corta valores).

**Regras para TODAS as telas**
1. Só tokens: cores (`text-*`, `bg-*`, `var(--color-*)`), raios, fontes; nada de hex/rgba nem `px` em fonte (use `text-sm`, `rem`).
   Texto de apoio no mínimo `text-text-primary/65` (abaixo disso só placeholder/ícone decorativo). Campos: `border-border-control`.
2. Animação só com `motion/react` + `components/motion` (e `useMovimentoReduzido`). Nada de `animate-*` infinito novo.
3. Gráficos: `--color-chart-*` via `chartTheme`, `GraficoAcessivel` (resumo + tabela), legenda com texto, `usePadroesGrafico`
   quando houver séries lado a lado. Entrada/saída com sinal (+/−) e ícone, nunca só cor.
4. Status = texto + ícone. Ícone decorativo `aria-hidden`. Ilustração/brilho decorativo: `data-decorativo` (some na leitura simplificada).
5. Um `<h1>` por tela (o `PageHeader`); depois `h2` (títulos de `Card`/`BentoCard`), `h3`… sem pular nível.
   `GroupedList` usa `h2` (passe `nivelTitulo={3}` dentro de um Card). Rótulo de KPI não é título.
6. Alvos ≥ 44px no toque (o CSS já garante mínimo 24px e 44px em `pointer: coarse`; `data-alvo-compacto` só com justificativa).
7. Formulário: rótulo visível (`FormField`), ajuda/erro por `aria-describedby`, `autocomplete` certo, sem limite de tempo,
   sem bloquear colar; não pedir de novo o que já foi digitado no mesmo fluxo (3.3.7).
8. Nada só no hover; tudo por teclado; `Modal`/`Drawer` (foco preso, Esc, foco volta). Arrastar sempre com alternativa de clique (2.5.7).
9. Reflow: 320px de largura e texto 175–200% sem rolagem lateral. Evite `truncate`/`whitespace-nowrap` em texto essencial
   e larguras mínimas fixas (`min-w-[12rem]` → `min-w-[min(12rem,100%)]`). Tabela `sr-only` sempre dentro de `<div className="sr-only">`.
10. Linguagem simples; erro diz o que fazer. Toast de erro não some sozinho.

Shell (já pronto, não repetir nas telas): links "Pular para…", landmarks (header/nav/main/footer), anúncio
"Página X carregada" + foco no `<h1>` ao trocar de rota, rodapé com Ajuda/Acessibilidade/Privacidade/Termos.
