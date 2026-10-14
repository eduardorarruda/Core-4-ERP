import React, { useMemo, useState } from 'react';
import { CalendarCheck, Gauge, Lightbulb, Pencil, Plus, Target, Trash2, Wand2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import AlertaErro from '../components/ui/AlertaErro';
import ComoFunciona from '../components/ui/ComoFunciona';
import PermissaoGuard from '../components/ui/PermissaoGuard';
import { PageSkeleton } from '../components/ui/Skeleton';
import { ProgressRing } from '../components/ui/Progress';
import { MonthSelector } from '../components/ui/PeriodoSelector';
import { AnimatedNumber, Stagger, StaggerItem } from '../components/motion/Movimento';
import IconeCategoria from '../components/dashboard/IconeCategoria';
import BarraOrcamento, { StatusOrcamento } from '../components/dashboard/BarraOrcamento';
import OrcamentoDrawer from '../components/dashboard/OrcamentoDrawer';
import { orcamentos as orcamentosApi } from '../lib/api';
import { useMesUrl } from '../hooks/usePeriodoUrl';
import { useCarga } from '../hooks/useCarga';
import { useConfirm } from '../hooks/useConfirm';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { formatarMoeda, formatarNumero } from '../lib/formatters';
import { cn } from '../lib/utils';

/**
 * Orçamentos (rota /orcamentos, ORCAMENTO_VISUALIZAR). Limite mensal por categoria principal,
 * com barra (listrada ao estourar) e o risco do ritmo. Criar/editar numa gaveta; excluir com
 * confirmação; sugestões pela média dos últimos 3 meses. Escrita só com ORCAMENTO_EDITAR.
 */
const COMO_FUNCIONA = [
  { icon: Target, texto: 'Defina um limite por mês para cada categoria principal. Ele se repete todo mês.' },
  { icon: Gauge, texto: 'O risco na barra mostra onde o gasto deveria estar hoje. Passou dele, o selo fica "Acima do ritmo".' },
  { icon: CalendarCheck, texto: 'Contam as contas a pagar que vencem no mês e as compras no cartão (cada parcela no seu mês).' },
];

function Resumo({ dados }) {
  const pct = Number(dados.percentualTotal ?? 0);
  const ritmo = Number(dados.ritmo ?? 0);
  const restante = Number(dados.totalLimite ?? 0) - Number(dados.totalGasto ?? 0);
  const tom = pct > 100 ? 'expense' : pct > ritmo && ritmo > 0 && ritmo < 100 ? 'warning' : 'primary';
  return (
    <Card destaque>
      <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
        <ProgressRing valor={pct / 100} tom={tom} tamanho={112} espessura={10} label="Uso total do orçamento">
          <span className="font-display text-xl font-semibold">{formatarNumero(pct, 'percent', { casas: 0 })}</span>
        </ProgressRing>
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <p className="text-sm text-text-primary/70">Gasto nas categorias com limite</p>
            <p className="flex flex-wrap items-baseline gap-x-2">
              <AnimatedNumber value={dados.totalGasto} className="font-display text-3xl font-semibold" />
              <span className="text-text-primary/65 tabular-nums">de <span className="valor-privado">{formatarMoeda(dados.totalLimite)}</span></span>
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
            <span className={cn('tabular-nums', restante < 0 ? 'text-expense' : 'text-text-primary/80')}>
              {restante < 0 ? <>Passou <strong className="valor-privado">{formatarMoeda(-restante)}</strong> do total</> : <>Restam <strong className="valor-privado">{formatarMoeda(restante)}</strong></>}
            </span>
            {ritmo > 0 && ritmo < 100 && <span className="text-text-primary/70 tabular-nums">Mês {formatarNumero(ritmo, 'percent', { casas: 0 })} decorrido</span>}
            {Number(dados.gastoSemOrcamento ?? 0) > 0 && (
              <span className="text-text-primary/70 tabular-nums">Gastos sem limite: <strong className="valor-privado">{formatarMoeda(dados.gastoSemOrcamento)}</strong></span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function LinhaOrcamento({ item, onEditar, onExcluir }) {
  return (
    <article className="c4-card p-4 sm:p-5 space-y-3" aria-labelledby={`orc-${item.id}`}>
      <div className="flex items-center gap-3">
        <IconeCategoria nome={item.categoria?.icone} cor={item.status === 'ESTOURADO' ? 'var(--color-expense)' : item.status === 'ATENCAO' ? 'var(--color-warning)' : 'var(--color-primary)'} />
        <div className="min-w-0 flex-1">
          <h2 id={`orc-${item.id}`} className="font-semibold truncate">{item.categoria?.descricao}</h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusOrcamento status={item.status} />
            <span className="text-xs text-text-primary/60 tabular-nums">limite de <span className="valor-privado">{formatarMoeda(item.limite)}</span>/mês</span>
          </div>
        </div>
        <PermissaoGuard permissao="ORCAMENTO_EDITAR">
          <div className="flex shrink-0">
            <Button variant="ghost" size="icon" onClick={() => onEditar(item)} aria-label={`Editar orçamento de ${item.categoria?.descricao}`}>
              <Pencil className="w-4 h-4" aria-hidden="true" />
            </Button>
            <Button variant="danger-ghost" size="icon" onClick={() => onExcluir(item)} aria-label={`Excluir orçamento de ${item.categoria?.descricao}`}>
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </PermissaoGuard>
      </div>
      <BarraOrcamento item={item} detalhado />
    </article>
  );
}

function Sugestoes({ sugestoes, onUsar, onAjustar, criando }) {
  if (!sugestoes.length) return null;
  return (
    <Card icon={Lightbulb} title="Sugestões" subtitle="Categorias com gasto e sem limite. O valor sugerido é a média dos últimos 3 meses.">
      <ul className="divide-y divide-border">
        {sugestoes.map((s, i) => (
          <li key={s.categoria.id} className="flex flex-wrap items-center gap-3 py-3">
            <IconeCategoria nome={s.categoria.icone} tamanho="sm" cor={`var(--color-chart-${(i % 5) + 2})`} />
            <div className="min-w-0 flex-1 basis-[10rem]">
              <p className="text-sm font-medium truncate">{s.categoria.descricao}</p>
              <p className="text-xs text-text-primary/60 tabular-nums">
                Este mês <span className="valor-privado">{formatarMoeda(s.gastoMes)}</span> · média <span className="valor-privado">{formatarMoeda(s.mediaUltimos3Meses)}</span>
              </p>
            </div>
            <PermissaoGuard permissao="ORCAMENTO_EDITAR">
              <div className="flex flex-wrap gap-2 min-w-0 ml-auto">
                <Button size="sm" variant="ghost" onClick={() => onAjustar(s)}>Ajustar</Button>
                <Button size="sm" variant="secondary" loading={criando === s.categoria.id} onClick={() => onUsar(s)} leftIcon={<Wand2 className="w-4 h-4" aria-hidden="true" />}>
                  Usar {formatarMoeda(s.sugestaoLimite, { casas: 0 })}
                </Button>
              </div>
            </PermissaoGuard>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function Orcamentos() {
  const { temPermissao } = useAuth();
  const confirmar = useConfirm();
  const toast = useToast();
  const [anoMes, setAnoMes] = useMesUrl();
  const [drawer, setDrawer] = useState({ aberto: false, item: null, inicial: null, chave: 0 });
  const [criando, setCriando] = useState(null);

  const orc = useCarga(() => orcamentosApi.listar(anoMes), [anoMes]);
  const sug = useCarga(() => orcamentosApi.sugestoes(anoMes), [anoMes], { inicial: [] });
  const itens = useMemo(() => orc.dados?.itens ?? [], [orc.dados]);
  const sugestoes = useMemo(() => (sug.dados ?? []).filter((s) => Number(s.sugestaoLimite ?? 0) > 0 && Number(s.gastoMes ?? 0) > 0), [sug.dados]);
  const podeEditar = temPermissao('ORCAMENTO_EDITAR');

  const recarregar = () => { orc.recarregar(); sug.recarregar(); };
  const abrir = (item = null, inicial = null) => setDrawer((d) => ({ aberto: true, item, inicial, chave: d.chave + 1 }));
  const fechar = () => setDrawer((d) => ({ ...d, aberto: false }));

  async function excluir(item) {
    const ok = await confirmar({
      title: 'Excluir orçamento?',
      message: `O limite de ${item.categoria?.descricao} deixa de valer em todos os meses. Os gastos não mudam.`,
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    try {
      await orcamentosApi.excluir(item.id);
      toast.success('Orçamento excluído.');
      recarregar();
    } catch (e) {
      toast.error(e.message || 'Não deu para excluir. Tente de novo.');
    }
  }

  async function usarSugestao(s) {
    setCriando(s.categoria.id);
    try {
      await orcamentosApi.criar({ categoriaId: s.categoria.id, valorLimite: Number(s.sugestaoLimite) });
      toast.success(`Orçamento de ${s.categoria.descricao} criado.`);
      recarregar();
    } catch (e) {
      toast.error(e.message || 'Não deu para criar. Tente de novo.');
    } finally {
      setCriando(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Target}
        title="Orçamentos"
        subtitle="Quanto você quer gastar por categoria e como está o ritmo do mês."
        actions={
          <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
            <MonthSelector value={anoMes} onChange={setAnoMes} label="Mês do orçamento" />
            <PermissaoGuard permissao="ORCAMENTO_EDITAR">
              <Button onClick={() => abrir()} leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>Novo orçamento</Button>
            </PermissaoGuard>
          </div>
        }
      />

      {orc.carregandoInicial ? (
        <PageSkeleton kpis={1} />
      ) : orc.erro && !orc.dados ? (
        <AlertaErro mensagem={orc.erro.message || 'Não deu para carregar os orçamentos.'} onTentarNovamente={recarregar} />
      ) : (
        <div className={cn('space-y-6 transition-opacity', orc.carregando && 'opacity-70')} aria-busy={orc.carregando}>
          {itens.length === 0 ? (
            <Card>
              <EmptyState
                icon={Target}
                title="Nenhum orçamento ainda"
                description={podeEditar
                  ? 'Use o botão "Novo orçamento" acima ou aceite uma das sugestões abaixo para começar.'
                  : 'Quem administra a empresa ainda não definiu limites por categoria.'}
              />
            </Card>
          ) : (
            <>
              <Resumo dados={orc.dados} />
              <Stagger as="ul" aoRolar className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {itens.map((item) => (
                  <StaggerItem as="li" key={item.id} className="min-w-0">
                    <LinhaOrcamento item={item} onEditar={(i) => abrir(i)} onExcluir={excluir} />
                  </StaggerItem>
                ))}
              </Stagger>
            </>
          )}

          <Sugestoes
            sugestoes={sugestoes}
            criando={criando}
            onUsar={usarSugestao}
            onAjustar={(s) => abrir(null, { categoriaId: s.categoria.id, valorLimite: s.sugestaoLimite })}
          />

          <ComoFunciona titulo="Como funciona o orçamento" itens={COMO_FUNCIONA} recolhivel chave="orcamentos" />
        </div>
      )}

      {podeEditar && (
        <OrcamentoDrawer
          key={drawer.chave}
          aberto={drawer.aberto}
          onFechar={fechar}
          item={drawer.item}
          inicial={drawer.inicial}
          usadas={itens.map((i) => i.categoria?.id)}
          sugestoes={sug.dados ?? []}
          onSalvo={recarregar}
        />
      )}
    </div>
  );
}
