import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, Pencil, PiggyBank, Plus, Settings2, Sprout, Trash2, TrendingUp } from 'lucide-react';
import { investimentos as api, contasCorrentes as ccApi } from '../lib/api';
import { formatarMoeda, formatDate } from '../lib/formatters';
import { corSerie } from '../lib/chartTheme';
import { cn } from '../lib/utils';
import { useCarga } from '../hooks/useCarga';
import { useConfirm } from '../hooks/useConfirm';
import { useToast } from '../hooks/useToast';
import { usePermissao } from '../hooks/usePermissao';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Drawer from '../components/ui/Drawer';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import AlertaErro from '../components/ui/AlertaErro';
import SkeletonCard from '../components/ui/SkeletonCard';
import ComoFunciona from '../components/ui/ComoFunciona';
import DonutChart from '../components/ui/DonutChart';
import KpiCard, { KpiGrid } from '../components/ui/KpiCard';
import { AnimatedNumber, Stagger, StaggerItem } from '../components/motion/Movimento';
import Pote from '../components/financeiro/Pote';
import { CarteiraForm, MovimentacaoForm, TiposInvestimento } from '../components/financeiro/InvestimentoForms';

const MOV = {
  APORTE: { rotulo: 'Aporte', icon: ArrowDownToLine },
  RESGATE: { rotulo: 'Resgate', icon: ArrowUpFromLine },
  RENDIMENTO: { rotulo: 'Rendimento', icon: Sprout },
};

function valorMov(t) {
  const v = Number(t.valor) || 0;
  if (t.tipoTransacao === 'RESGATE') return `−${formatarMoeda(v)}`;
  return v < 0 ? formatarMoeda(v) : `+${formatarMoeda(v)}`;
}

/** Linha do tempo de movimentações (mais recentes primeiro). */
function LinhaDoTempo({ itens, mostrarCarteira = false }) {
  if (!itens.length) return <p className="text-sm text-text-primary/65">Nenhuma movimentação ainda.</p>;
  return (
    <ol className="relative space-y-3 before:absolute before:left-[0.6875rem] before:top-2 before:bottom-2 before:w-px before:bg-border">
      {itens.map((t) => {
        const m = MOV[t.tipoTransacao] ?? MOV.APORTE;
        const Icone = m.icon;
        return (
          <li key={`${t.carteiraId ?? ''}-${t.id}`} className="relative flex items-start gap-3">
            <span aria-hidden="true" className={cn('relative z-[1] mt-0.5 w-6 h-6 shrink-0 grid place-items-center rounded-full border bg-surface-low',
              t.tipoTransacao === 'RESGATE' ? 'border-border-strong text-text-primary/70' : t.tipoTransacao === 'RENDIMENTO' ? 'border-income/40 text-income' : 'border-invest/40 text-invest')}>
              <Icone className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">{m.rotulo}{mostrarCarteira && t.carteiraNome ? ` · ${t.carteiraNome}` : ''}</span>
                <span className={cn('text-sm font-semibold tabular-nums valor-privado', t.tipoTransacao === 'RESGATE' ? 'text-text-primary/80' : 'text-income')}>{valorMov(t)}</span>
              </p>
              <p className="text-xs text-text-primary/60 tabular-nums">{formatDate(t.dataTransacao)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function CartaoPote({ carteira, total, cor, resumo, onAbrir }) {
  const saldo = Number(carteira.saldoAtual) || 0;
  const fatia = total > 0 ? saldo / total : 0;
  return (
    <article className="c4-card c4-card--interativo relative p-4 sm:p-5 flex items-center gap-4 h-full focus-within:ring-2 focus-within:ring-primary">
      <Pote valor={fatia} cor={cor} tamanho={76} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <h3 className="font-display font-semibold truncate">
          {/* Botão "esticado": o cartão inteiro abre o detalhe e funciona pelo teclado */}
          <button type="button" onClick={() => onAbrir(carteira)} className="text-left outline-none after:absolute after:inset-0 after:content-['']">
            {carteira.nome}
            <span className="sr-only">: ver movimentações</span>
          </button>
        </h3>
        {carteira.tipoNome && <Badge variant="neutral">{carteira.tipoNome}</Badge>}
        <AnimatedNumber value={saldo} format="currency" className="block font-display text-xl font-semibold" />
        <p className="text-xs text-text-primary/60 tabular-nums">
          {Math.round(fatia * 100)}% do patrimônio
          {resumo?.rendimento ? <> · <span className="text-income">+{formatarMoeda(resumo.rendimento)} em rendimentos</span></> : null}
        </p>
      </div>
    </article>
  );
}

export default function Investimentos() {
  const toast = useToast();
  const confirmar = useConfirm();
  const pode = usePermissao();
  const [searchParams, setSearchParams] = useSearchParams();
  const [aberta, setAberta] = useState(null);
  const [editando, setEditando] = useState(null);
  const [movimentando, setMovimentando] = useState(false);
  const [tiposAberto, setTiposAberto] = useState(false);
  const podeGerenciarTipos = pode('INVESTIMENTO_TIPO_GERENCIAR');
  const podeVerContas = pode('CONTA_CORRENTE_VISUALIZAR');
  const criando = searchParams.get('novo') != null && pode('INVESTIMENTO_CRIAR');

  const setNovo = (abrir) => setSearchParams((atual) => {
    const p = new URLSearchParams(atual);
    if (abrir) p.set('novo', '1'); else p.delete('novo');
    return p;
  }, { replace: true });

  const carteiras = useCarga(() => api.listar(), [], { inicial: [] });
  const lista = useMemo(() => [...(carteiras.dados ?? [])].sort((a, b) => Number(b.saldoAtual) - Number(a.saldoAtual)), [carteiras.dados]);
  const ids = lista.map((c) => c.id);

  // Movimentações de todas as carteiras (para a linha do tempo e os totais por carteira)
  const movs = useCarga(async () => {
    const porCarteira = await Promise.all(lista.map((c) => api.transacoes.listar(c.id)
      .then((ts) => (ts ?? []).map((t) => ({ ...t, carteiraId: c.id, carteiraNome: c.nome })))
      .catch(() => [])));
    return porCarteira.flat().sort((a, b) => String(b.dataTransacao).localeCompare(String(a.dataTransacao)) || b.id - a.id);
  }, [ids], { inicial: [], ativo: ids.length > 0 });

  const tipos = useCarga(() => api.tipos.listar(), [], { inicial: [], ativo: podeGerenciarTipos });
  const contasBancarias = useCarga(() => ccApi.listar(), [], { inicial: [], ativo: podeVerContas });

  // Sem permissão para listar tipos, oferece os tipos já usados nas carteiras
  const tiposDisponiveis = useMemo(() => {
    if (podeGerenciarTipos) return tipos.dados ?? [];
    const mapa = new Map();
    lista.forEach((c) => { if (c.tipoId) mapa.set(c.tipoId, { id: c.tipoId, nome: c.tipoNome }); });
    return [...mapa.values()];
  }, [podeGerenciarTipos, tipos.dados, lista]);

  const total = lista.reduce((s, c) => s + (Number(c.saldoAtual) || 0), 0);
  const temCarteiras = ids.length > 0;
  const todasMovs = useMemo(() => (temCarteiras ? (movs.dados ?? []) : []), [temCarteiras, movs.dados]);
  const anoAtual = String(new Date().getFullYear());
  const rendimentos = todasMovs.filter((t) => t.tipoTransacao === 'RENDIMENTO').reduce((s, t) => s + Number(t.valor), 0);
  const aportesAno = todasMovs.filter((t) => t.tipoTransacao === 'APORTE' && String(t.dataTransacao).startsWith(anoAtual)).reduce((s, t) => s + Number(t.valor), 0);

  const resumoPorCarteira = useMemo(() => {
    const r = {};
    todasMovs.forEach((t) => {
      r[t.carteiraId] ??= { rendimento: 0 };
      if (t.tipoTransacao === 'RENDIMENTO') r[t.carteiraId].rendimento += Number(t.valor);
    });
    return r;
  }, [todasMovs]);

  // Cores por tipo: o pote e a fatia da rosca do mesmo tipo têm a mesma cor
  const tiposPresentes = useMemo(() => [...new Set(lista.map((c) => c.tipoNome || 'Sem tipo'))], [lista]);
  const corDoTipo = (nome) => corSerie(Math.max(0, tiposPresentes.indexOf(nome || 'Sem tipo')));
  const fatias = tiposPresentes.map((nome, i) => ({
    id: nome,
    nome,
    valor: lista.filter((c) => (c.tipoNome || 'Sem tipo') === nome).reduce((s, c) => s + Number(c.saldoAtual), 0),
    cor: corSerie(i),
  }));

  const carteiraAberta = aberta ? lista.find((c) => c.id === aberta.id) ?? aberta : null;
  const movsAbertas = carteiraAberta ? todasMovs.filter((t) => t.carteiraId === carteiraAberta.id) : [];

  async function excluir(c) {
    const ok = await confirmar({
      title: `Excluir a carteira "${c.nome}"?`,
      message: 'Só carteiras sem movimentações podem ser excluídas.',
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    try {
      await api.deletar(c.id);
      toast.success('Carteira excluída.');
      setAberta(null);
      carteiras.recarregar();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const fecharForm = () => { setEditando(null); setNovo(false); };
  const formAberto = criando || Boolean(editando);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investimentos"
        subtitle="Seu patrimônio guardado, carteira por carteira."
        icon={PiggyBank}
        actions={(
          <div className="flex flex-wrap gap-2">
            {podeGerenciarTipos && (
              <Button variant="secondary" onClick={() => setTiposAberto(true)} leftIcon={<Settings2 className="w-4 h-4" aria-hidden="true" />}>
                Tipos
              </Button>
            )}
            {pode('INVESTIMENTO_CRIAR') && (
              <Button onClick={() => setNovo(true)} leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>Nova carteira</Button>
            )}
          </div>
        )}
      />

      {carteiras.erro && <AlertaErro mensagem={carteiras.erro.message} onTentarNovamente={carteiras.recarregar} />}

      {!carteiras.erro && (
        <KpiGrid cols={3}>
          <KpiCard label="Patrimônio" valor={total} tom="invest" icon={PiggyBank} destaque loading={carteiras.carregandoInicial}
            ajuda="Soma do saldo atual de todas as carteiras.">
            {lista.length} {lista.length === 1 ? 'carteira' : 'carteiras'}
          </KpiCard>
          <KpiCard label="Aportes no ano" valor={aportesAno} tom="invest" icon={ArrowDownToLine} loading={movs.carregandoInicial && ids.length > 0}
            ajuda="Quanto você colocou nas carteiras desde 1º de janeiro.">
            Desde 1º de janeiro de {anoAtual}
          </KpiCard>
          <KpiCard label="Rendimentos" valor={rendimentos} tom="income" icon={Sprout} colorirSinal loading={movs.carregandoInicial && ids.length > 0}
            ajuda="Soma dos rendimentos lançados em todas as carteiras (perdas entram como negativos)." />
        </KpiGrid>
      )}

      {!carteiras.erro && (carteiras.carregandoInicial ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <SkeletonCard key={i} rows={3} />)}</div>
      ) : lista.length === 0 ? (
        <div className="c4-card">
          <EmptyState
            icon={PiggyBank}
            tom="invest"
            title="Nenhuma carteira ainda"
            description="Crie uma carteira para cada objetivo ou aplicação (reserva, CDB, ações) e registre aportes, resgates e rendimentos."
            action={pode('INVESTIMENTO_CRIAR') ? { label: 'Nova carteira', onClick: () => setNovo(true), icon: Plus } : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_24rem] gap-6 items-start">
          <section aria-labelledby="titulo-potes" className="space-y-3 min-w-0">
            <h2 id="titulo-potes" className="font-display text-lg font-semibold">Carteiras</h2>
            <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lista.map((c) => (
                <StaggerItem key={c.id}>
                  <CartaoPote carteira={c} total={total} cor={corDoTipo(c.tipoNome)} resumo={resumoPorCarteira[c.id]} onAbrir={setAberta} />
                </StaggerItem>
              ))}
            </Stagger>
            <ComoFunciona
              titulo="Como ler os potes"
              recolhivel
              chave="investimentos-potes"
              itens={[
                { icon: PiggyBank, texto: 'Cada pote é uma carteira. Quanto mais cheio, maior a parte dela no seu patrimônio.' },
                { icon: ArrowDownToLine, texto: 'Aporte enche o pote; resgate esvazia; rendimento é o que a carteira ganhou sozinha.' },
                { icon: TrendingUp, texto: 'A cor do pote é a do tipo de investimento, a mesma da rosca de composição.' },
              ]}
            />
          </section>

          <div className="space-y-6">
            <section aria-labelledby="titulo-comp" className="c4-card p-4 sm:p-5 space-y-4">
              <h2 id="titulo-comp" className="font-display text-lg font-semibold">Composição por tipo</h2>
              <DonutChart titulo="Patrimônio por tipo de investimento" fatias={fatias} rotuloCentro="Patrimônio" tamanho={180} className="xl:flex-col xl:[&>*:last-child]:w-full" />
            </section>
            <section aria-labelledby="titulo-mov" className="c4-card p-4 sm:p-5 space-y-4">
              <div>
                <h2 id="titulo-mov" className="font-display text-lg font-semibold">Movimentações recentes</h2>
                <p className="text-sm text-text-primary/65">Aportes, resgates e rendimentos de todas as carteiras.</p>
              </div>
              {movs.erro ? <AlertaErro compacto mensagem={movs.erro.message} onTentarNovamente={movs.recarregar} />
                : movs.carregandoInicial ? <SkeletonCard rows={4} />
                  : <LinhaDoTempo itens={todasMovs.slice(0, 12)} mostrarCarteira />}
            </section>
          </div>
        </div>
      ))}

      {/* Detalhe da carteira */}
      <Drawer
        open={Boolean(carteiraAberta)}
        onClose={() => { setAberta(null); setMovimentando(false); }}
        title={carteiraAberta?.nome}
        description={carteiraAberta?.tipoNome}
      >
        {carteiraAberta && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface-medium/60 p-4">
              <Pote valor={total > 0 ? Number(carteiraAberta.saldoAtual) / total : 0} cor={corDoTipo(carteiraAberta.tipoNome)} tamanho={64} />
              <div>
                <p className="c4-eyebrow">Saldo da carteira</p>
                <AnimatedNumber value={Number(carteiraAberta.saldoAtual)} format="currency" className="block font-display text-2xl font-semibold" />
              </div>
            </div>

            {movimentando ? (
              <MovimentacaoForm
                carteira={carteiraAberta}
                contasBancarias={podeVerContas ? (contasBancarias.dados ?? []) : null}
                onCancelar={() => setMovimentando(false)}
                onSalvo={() => {
                  toast.success('Movimentação registrada.');
                  setMovimentando(false);
                  carteiras.recarregar();
                  movs.recarregar();
                  contasBancarias.recarregar();
                }}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {pode('INVESTIMENTO_CRIAR') && (
                  <Button onClick={() => setMovimentando(true)} leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>Nova movimentação</Button>
                )}
                {pode('INVESTIMENTO_EDITAR') && (
                  <Button variant="secondary" onClick={() => { setEditando(carteiraAberta); setAberta(null); }} leftIcon={<Pencil className="w-4 h-4" aria-hidden="true" />}>Editar</Button>
                )}
                {pode('INVESTIMENTO_DELETAR') && movsAbertas.length === 0 && (
                  <Button variant="danger-ghost" onClick={() => excluir(carteiraAberta)} leftIcon={<Trash2 className="w-4 h-4" aria-hidden="true" />}>Excluir</Button>
                )}
              </div>
            )}

            <section aria-labelledby="titulo-hist" className="space-y-3">
              <h3 id="titulo-hist" className="font-display font-semibold">Histórico</h3>
              <LinhaDoTempo itens={movsAbertas} />
            </section>
          </div>
        )}
      </Drawer>

      <Drawer open={formAberto} onClose={fecharForm} title={editando ? 'Editar carteira' : 'Nova carteira'}>
        {formAberto && (
          <CarteiraForm
            key={editando?.id ?? 'nova'}
            inicial={editando ?? undefined}
            tipos={tiposDisponiveis}
            onCancelar={fecharForm}
            onSalvo={() => {
              toast.success(editando ? 'Carteira atualizada.' : 'Carteira criada.');
              fecharForm();
              carteiras.recarregar();
            }}
          />
        )}
      </Drawer>

      {podeGerenciarTipos && (
        <Modal open={tiposAberto} onClose={() => setTiposAberto(false)} title="Tipos de investimento"
          description="Os tipos agrupam as carteiras (ex.: Renda fixa, Ações, FII)." icon={Settings2} size="sm">
          <TiposInvestimento tipos={tipos.dados ?? []} onMudou={() => { tipos.recarregar(); carteiras.recarregar(); }} />
        </Modal>
      )}
    </div>
  );
}
