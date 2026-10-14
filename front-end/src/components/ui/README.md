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
Compatível com o formato antigo `{mesInicio,…}` (devolve no mesmo formato). `DateRangeModal` está **obsoleto**.

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
Ctrl/⌘+K busca · Alt+T tema · Alt+P modo privacidade (valores com `valor-privado` ficam borrados).
