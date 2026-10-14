import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarClock, CheckCircle2, CreditCard, PauseCircle, Pencil, PlayCircle, Plus, Receipt, Repeat, Trash2, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { assinaturas as api, categorias as catApi, parceiros as parApi, cartoes as cartoesApi } from '../lib/api';
import { formatarMoeda } from '../lib/formatters';
import { cn } from '../lib/utils';
import { useCarga } from '../hooks/useCarga';
import { useConfirm } from '../hooks/useConfirm';
import { useToast } from '../hooks/useToast';
import { usePermissao } from '../hooks/usePermissao';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Drawer from '../components/ui/Drawer';
import EmptyState from '../components/ui/EmptyState';
import AlertaErro from '../components/ui/AlertaErro';
import SkeletonCard from '../components/ui/SkeletonCard';
import KpiCard, { KpiGrid } from '../components/ui/KpiCard';
import Tabs from '../components/ui/Tabs';
import { Stagger, StaggerItem } from '../components/motion/Movimento';
import AssinaturaForm from '../components/financeiro/AssinaturaForm';
import { cobrancasProximas, proximaCobranca } from '../components/financeiro/utilsFinanceiro';

const ID_ABAS = 'assinaturas';

/** "no cartão Nubank" — sem repetir a palavra quando o nome já começa com "Cartão". */
const noCartao = (nome) => (/^cart[ãa]o\b/i.test(nome) ? `no ${nome}` : `no cartão ${nome}`);

function StatusAssinatura({ ativa }) {
  return ativa
    ? <Badge variant="success"><CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Ativa</Badge>
    : <Badge variant="neutral"><PauseCircle className="w-3 h-3" aria-hidden="true" /> Pausada</Badge>;
}

function CartaoAssinatura({ a, onEditar, onAlternar, onExcluir }) {
  const pode = usePermissao();
  const proxima = a.ativa ? proximaCobranca(a.diaVencimento) : null;
  const ondePaga = a.cartaoCreditoNome ? noCartao(a.cartaoCreditoNome) : 'por conta a pagar';
  const IconeOnde = a.cartaoCreditoNome ? CreditCard : Receipt;
  return (
    <article className={cn('c4-card p-4 sm:p-5 flex flex-col gap-3 h-full', !a.ativa && 'opacity-80')}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display font-semibold text-text-primary truncate">{a.descricao}</h3>
          <p className="text-xs text-text-primary/60 truncate">{[a.categoriaDescricao, a.parceiroNome].filter(Boolean).join(' · ')}</p>
        </div>
        <StatusAssinatura ativa={a.ativa} />
      </header>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p>
          <span className="font-display text-2xl font-semibold tabular-nums valor-privado">{formatarMoeda(a.valor)}</span>
          <span className="text-sm text-text-primary/60"> /mês</span>
        </p>
        <p className="text-sm text-text-primary/65 tabular-nums valor-privado">{formatarMoeda(Number(a.valor) * 12)} /ano</p>
      </div>
      <p className="flex items-center gap-2 text-sm text-text-primary/75">
        <IconeOnde className="w-4 h-4 shrink-0 text-text-primary/50" aria-hidden="true" />
        <span>Dia {a.diaVencimento} · {ondePaga}</span>
      </p>
      {proxima && (
        <p className="text-xs text-text-primary/60">Próxima cobrança: {format(proxima, "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
      )}
      {pode('ASSINATURA_EDITAR') || pode('ASSINATURA_DELETAR') ? (
        <footer className="mt-auto pt-1 flex flex-wrap items-center gap-1 border-t border-border">
          {pode('ASSINATURA_EDITAR') && (
            <>
              <Button variant="ghost" size="sm" className="min-h-11" onClick={() => onAlternar(a)}
                leftIcon={a.ativa ? <PauseCircle className="w-4 h-4" aria-hidden="true" /> : <PlayCircle className="w-4 h-4" aria-hidden="true" />}
                aria-label={`${a.ativa ? 'Pausar' : 'Reativar'} ${a.descricao}`}>
                {a.ativa ? 'Pausar' : 'Reativar'}
              </Button>
              <Button variant="ghost" size="sm" className="min-h-11" onClick={() => onEditar(a)} leftIcon={<Pencil className="w-4 h-4" aria-hidden="true" />} aria-label={`Editar ${a.descricao}`}>
                Editar
              </Button>
            </>
          )}
          {pode('ASSINATURA_DELETAR') && (
            <Button variant="danger-ghost" size="icon-sm" className="ml-auto" onClick={() => onExcluir(a)} aria-label={`Excluir ${a.descricao}`} title="Excluir">
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </Button>
          )}
        </footer>
      ) : null}
    </article>
  );
}

/** Linha do tempo dos próximos 30 dias, agrupada por dia. */
function Proximos30({ cobrancas }) {
  const porDia = useMemo(() => {
    const mapa = new Map();
    cobrancas.forEach((c) => {
      const chave = format(c.data, 'yyyy-MM-dd');
      if (!mapa.has(chave)) mapa.set(chave, { data: c.data, itens: [] });
      mapa.get(chave).itens.push(c.assinatura);
    });
    return [...mapa.values()];
  }, [cobrancas]);

  if (!porDia.length) {
    return <p className="text-sm text-text-primary/65">Nenhuma cobrança nos próximos 30 dias.</p>;
  }
  return (
    <ol className="relative space-y-3 before:absolute before:left-[1.375rem] before:top-2 before:bottom-2 before:w-px before:bg-border">
      {porDia.map(({ data, itens }) => {
        const total = itens.reduce((s, a) => s + Number(a.valor), 0);
        return (
          <li key={data.toISOString()} className="relative flex gap-3">
            <span className="relative z-[1] w-11 shrink-0 rounded-xl border border-border-strong bg-surface-medium text-center py-1.5">
              <span className="block font-display text-lg font-semibold leading-none tabular-nums">{format(data, 'd')}</span>
              <span className="block text-[0.6875rem] uppercase text-text-primary/60">{format(data, 'MMM', { locale: ptBR })}</span>
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="flex flex-wrap items-center justify-between gap-x-2 text-xs text-text-primary/60">
                <span className="first-letter:uppercase">{format(data, 'EEEE', { locale: ptBR })}</span>
                <span className="tabular-nums valor-privado">{formatarMoeda(total)}</span>
              </p>
              <ul className="mt-1 space-y-1">
                {itens.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-x-2 text-sm">
                    <span className="truncate">
                      {a.descricao}
                      {a.cartaoCreditoNome && <span className="text-text-primary/55"> · no cartão</span>}
                    </span>
                    <span className="ml-auto shrink-0 tabular-nums text-expense valor-privado">−{formatarMoeda(a.valor)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function Assinaturas() {
  const toast = useToast();
  const confirmar = useConfirm();
  const pode = usePermissao();
  const [searchParams, setSearchParams] = useSearchParams();
  const [aba, setAba] = useState('ativas');
  const [editando, setEditando] = useState(null);
  const podeVerCartoes = pode('CARTAO_VISUALIZAR');
  const criando = searchParams.get('novo') != null && pode('ASSINATURA_CRIAR');

  const setNovo = (abrir) => setSearchParams((atual) => {
    const p = new URLSearchParams(atual);
    if (abrir) p.set('novo', '1'); else p.delete('novo');
    return p;
  }, { replace: true });

  const lista = useCarga(() => api.listar(), [], { inicial: [] });
  const aux = useCarga(() => Promise.all([
    catApi.listar().catch(() => []),
    parApi.listar().catch(() => []),
    podeVerCartoes ? cartoesApi.listar().catch(() => []) : Promise.resolve(null),
  ]), [podeVerCartoes], { inicial: [[], [], null] });
  const [cats, pars, cartoes] = aux.dados ?? [[], [], null];

  const todas = useMemo(() => lista.dados ?? [], [lista.dados]);
  const ativas = useMemo(() => todas.filter((a) => a.ativa).sort((a, b) => Number(b.valor) - Number(a.valor)), [todas]);
  const pausadas = useMemo(() => todas.filter((a) => !a.ativa), [todas]);
  const mensal = ativas.reduce((s, a) => s + Number(a.valor), 0);
  const proximas = useMemo(() => cobrancasProximas(todas, 30), [todas]);
  const total30 = proximas.reduce((s, c) => s + Number(c.assinatura.valor), 0);
  const visiveis = aba === 'ativas' ? ativas : pausadas;

  async function alternar(a) {
    try {
      await api.atualizar(a.id, {
        descricao: a.descricao,
        valor: Number(a.valor),
        diaVencimento: a.diaVencimento,
        ativa: !a.ativa,
        categoriaId: a.categoriaId,
        parceiroId: a.parceiroId ?? null,
        cartaoCreditoId: a.cartaoCreditoId ?? null,
      });
      toast.success(a.ativa ? `${a.descricao} pausada.` : `${a.descricao} reativada.`);
      lista.recarregar();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function excluir(a) {
    const ok = await confirmar({
      title: 'Excluir assinatura?',
      message: `"${a.descricao}" deixa de gerar cobranças. Contas já geradas por ela continuam onde estão.`,
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    try {
      await api.deletar(a.id);
      toast.success('Assinatura excluída.');
      lista.recarregar();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const fecharForm = () => { setEditando(null); setNovo(false); };
  const formAberto = criando || Boolean(editando);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assinaturas"
        subtitle="Gastos que se repetem todo mês: quanto custam e quando cobram."
        icon={Repeat}
        actions={pode('ASSINATURA_CRIAR') ? (
          <Button onClick={() => setNovo(true)} leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>Nova assinatura</Button>
        ) : null}
      />

      {lista.erro && <AlertaErro mensagem={lista.erro.message} onTentarNovamente={lista.recarregar} />}

      {!lista.erro && (
        <KpiGrid cols={3}>
          <KpiCard label="Por mês" valor={mensal} tom="expense" icon={Wallet} destaque loading={lista.carregandoInicial}
            ajuda="Soma das assinaturas ativas. Pausadas não entram.">
            <span className="tabular-nums valor-privado">{formatarMoeda(mensal * 12)} por ano</span>
          </KpiCard>
          <KpiCard label="Em 30 dias" valor={total30} tom="expense" icon={CalendarClock} loading={lista.carregandoInicial}
            ajuda="Quanto as assinaturas ativas vão cobrar a partir de hoje até daqui a 30 dias.">
            {proximas.length} {proximas.length === 1 ? 'cobrança' : 'cobranças'}
          </KpiCard>
          <KpiCard label="Ativas" valor={ativas.length} formato="numero" icon={CheckCircle2} tom="primary" loading={lista.carregandoInicial}>
            {pausadas.length} {pausadas.length === 1 ? 'pausada' : 'pausadas'}
          </KpiCard>
        </KpiGrid>
      )}

      {!lista.erro && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem] gap-6 items-start">
          <section aria-labelledby="titulo-lista" className="space-y-4 min-w-0">
            <h2 id="titulo-lista" className="sr-only">Suas assinaturas</h2>
            <Tabs idBase={ID_ABAS} label="Situação" value={aba} onChange={setAba}
              items={[{ value: 'ativas', label: 'Ativas', badge: ativas.length }, { value: 'pausadas', label: 'Pausadas', badge: pausadas.length }]} />
            <div role="tabpanel" id={Tabs.painelId(ID_ABAS, aba)} aria-labelledby={Tabs.abaId(ID_ABAS, aba)}>
              {lista.carregandoInicial ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[0, 1, 2, 3].map((i) => <SkeletonCard key={i} rows={3} />)}</div>
              ) : visiveis.length === 0 ? (
                <div className="c4-card">
                  <EmptyState
                    icon={Repeat}
                    tom="neutro"
                    title={aba === 'ativas' ? 'Nenhuma assinatura ativa' : 'Nenhuma assinatura pausada'}
                    description={aba === 'ativas'
                      ? 'Cadastre streaming, internet, academia… para ver quanto custam por mês e por ano.'
                      : 'Assinaturas pausadas aparecem aqui e não geram cobranças.'}
                    action={aba === 'ativas' && pode('ASSINATURA_CRIAR') ? { label: 'Nova assinatura', onClick: () => setNovo(true), icon: Plus } : undefined}
                  />
                </div>
              ) : (
                <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visiveis.map((a) => (
                    <StaggerItem key={a.id}>
                      <CartaoAssinatura a={a} onEditar={setEditando} onAlternar={alternar} onExcluir={excluir} />
                    </StaggerItem>
                  ))}
                </Stagger>
              )}
            </div>
          </section>

          <section aria-labelledby="titulo-30" className="c4-card p-4 sm:p-5 space-y-4 xl:sticky xl:top-4">
            <div>
              <h2 id="titulo-30" className="font-display text-lg font-semibold">Próximos 30 dias</h2>
              <p className="text-sm text-text-primary/65">Cobranças previstas das assinaturas ativas.</p>
            </div>
            {lista.carregandoInicial ? <SkeletonCard rows={4} /> : <Proximos30 cobrancas={proximas} />}
          </section>
        </div>
      )}

      <Drawer open={formAberto} onClose={fecharForm} title={editando ? 'Editar assinatura' : 'Nova assinatura'}>
        {formAberto && (
          <AssinaturaForm
            key={editando?.id ?? 'nova'}
            inicial={editando ?? undefined}
            categorias={cats}
            parceiros={pars}
            cartoes={cartoes}
            onCancelar={fecharForm}
            onSalvo={() => {
              toast.success(editando ? 'Assinatura atualizada.' : 'Assinatura criada.');
              fecharForm();
              lista.recarregar();
            }}
          />
        )}
      </Drawer>
    </div>
  );
}
