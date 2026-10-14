import React, { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, CircleCheckBig, Plus, Receipt } from 'lucide-react';
import { endOfMonth } from 'date-fns';
import { contas as api, categorias as catApi, parceiros as parApi } from '../lib/api';
import { formatarMoeda, formatDate } from '../lib/formatters';
import { useCarga } from '../hooks/useCarga';
import { useConfirm } from '../hooks/useConfirm';
import { useToast } from '../hooks/useToast';
import { usePermissao } from '../hooks/usePermissao';
import { usePeriodoUrl } from '../hooks/usePeriodoUrl';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import DataTable from '../components/ui/DataTable';
import Drawer from '../components/ui/Drawer';
import EmptyState from '../components/ui/EmptyState';
import FilterBar from '../components/ui/FilterBar';
import GroupedList from '../components/ui/GroupedList';
import AlertaErro from '../components/ui/AlertaErro';
import PeriodoSelector from '../components/ui/PeriodoSelector';
import PermissaoGuard from '../components/ui/PermissaoGuard';
import CategoriaOptions from '../components/ui/CategoriaOptions';
import { FormSelect } from '../components/ui/FormField';
import KpiCard, { KpiGrid } from '../components/ui/KpiCard';
import Tabs, { SegmentedControl } from '../components/ui/Tabs';
import ContaForm from '../components/forms/ContaForm';
import BaixaForm from '../components/forms/BaixaForm';
import LinhaConta, { AcoesConta, StatusConta, ValorConta } from '../components/financeiro/LinhaConta';
import { ChipCategoria } from '../components/financeiro/IconesCategoria';
import { agruparPorUrgencia, dataLocal, totalPorTipo } from '../components/financeiro/utilsFinanceiro';

/* Limite de linhas por consulta: cobre meses de contas sem paginar; acima disso pedimos para filtrar */
const LIMITE = 500;
const ID_ABAS = 'contas';

const ABAS = [
  { value: 'abertas', label: 'Em aberto' },
  { value: 'todas', label: 'Todas' },
];

const TIPOS = [
  { value: '', label: 'Todas' },
  { value: 'PAGAR', label: 'A pagar', icon: ArrowUpRight },
  { value: 'RECEBER', label: 'A receber', icon: ArrowDownLeft },
];

const STATUS = [
  { value: '', label: 'Todos os status' },
  { value: 'PENDENTE', label: 'Pendentes' },
  { value: 'ATRASADO', label: 'Atrasadas' },
  { value: 'PAGO', label: 'Pagas' },
  { value: 'RECEBIDO', label: 'Recebidas' },
];

/** Monta os parâmetros da API sem campos vazios. */
function params(base) {
  return Object.fromEntries(Object.entries(base).filter(([, v]) => v !== '' && v != null));
}

function combinaBusca(conta, termo) {
  if (!termo) return true;
  return [conta.descricao, conta.numeroDocumento, conta.parceiroNome, conta.categoriaDescricao]
    .some((t) => t && String(t).toLowerCase().includes(termo));
}

/** KPIs a partir das contas em aberto: a pagar e a receber até o fim do mês + atrasadas. */
function calcularKpis(abertas) {
  const hoje = new Date();
  const fimMes = endOfMonth(hoje);
  hoje.setHours(0, 0, 0, 0);
  const ateFimMes = abertas.filter((c) => dataLocal(c.dataVencimento) <= fimMes);
  const atrasadas = abertas.filter((c) => dataLocal(c.dataVencimento) < hoje);
  const mes = totalPorTipo(ateFimMes);
  const atr = totalPorTipo(atrasadas);
  return {
    pagarMes: mes.pagar,
    receberMes: mes.receber,
    qtdPagarMes: ateFimMes.filter((c) => c.tipo !== 'RECEBER').length,
    qtdReceberMes: ateFimMes.filter((c) => c.tipo === 'RECEBER').length,
    qtdAtrasadas: atrasadas.length,
    atrasadoPagar: atr.pagar,
    atrasadoReceber: atr.receber,
  };
}

export default function ContasFinanceiras() {
  const toast = useToast();
  const confirmar = useConfirm();
  const pode = usePermissao();
  const [searchParams, setSearchParams] = useSearchParams();
  const [periodo, setPeriodo] = usePeriodoUrl('mes');

  // Estado da tela na URL: aba (?ver=todas) e formulário de criação (?novo=PAGAR|RECEBER)
  const aba = searchParams.get('ver') === 'todas' ? 'todas' : 'abertas';
  const novoParam = searchParams.get('novo');
  const novoTipo = novoParam === 'RECEBER' ? 'RECEBER' : 'PAGAR';
  const criando = Boolean(novoParam) && pode('CONTA_CRIAR');

  const setParam = useCallback((chave, valor) => {
    setSearchParams((atual) => {
      const p = new URLSearchParams(atual);
      if (valor) p.set(chave, valor); else p.delete(chave);
      return p;
    }, { replace: true });
  }, [setSearchParams]);

  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('');
  const [status, setStatus] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [parceiroId, setParceiroId] = useState('');
  const [editando, setEditando] = useState(null);
  const [baixando, setBaixando] = useState(null);

  const auxiliares = useCarga(
    () => Promise.all([catApi.listar().catch(() => []), parApi.listar().catch(() => [])]),
    [],
    { inicial: [[], []] },
  );
  const [cats, pars] = auxiliares.dados ?? [[], []];

  const filtrosServidor = { tipo, categoriaId, parceiroId };

  // Em aberto: atrasadas + pendentes, sem limite de data (base dos KPIs e da lista por urgência)
  const abertas = useCarga(async () => {
    const base = { ...params(filtrosServidor), size: LIMITE, sort: 'dataVencimento,asc' };
    const [atr, pen] = await Promise.all([
      api.listar({ ...base, status: 'ATRASADO' }),
      api.listar({ ...base, status: 'PENDENTE' }),
    ]);
    return {
      itens: [...(atr.content ?? []), ...(pen.content ?? [])],
      excedeu: (atr.totalElements ?? 0) > LIMITE || (pen.totalElements ?? 0) > LIMITE,
    };
  }, [tipo, categoriaId, parceiroId]);

  // Todas: filtros completos com período de vencimento
  const todas = useCarga(
    () => api.listar({
      ...params({ ...filtrosServidor, status, vencimentoInicio: periodo.inicio, vencimentoFim: periodo.fim }),
      size: LIMITE,
      sort: 'dataVencimento,asc',
    }),
    [tipo, categoriaId, parceiroId, status, periodo.inicio, periodo.fim],
    { ativo: aba === 'todas' },
  );

  const recarregar = () => { abertas.recarregar(); if (aba === 'todas') todas.recarregar(); };

  const termo = busca.trim().toLowerCase();
  const listaAbertas = useMemo(() => (abertas.dados?.itens ?? []), [abertas.dados]);
  const kpis = useMemo(() => calcularKpis(listaAbertas), [listaAbertas]);
  const grupos = useMemo(
    () => agruparPorUrgencia(listaAbertas.filter((c) => combinaBusca(c, termo))),
    [listaAbertas, termo],
  );
  const listaTodas = useMemo(
    () => (todas.dados?.content ?? []).filter((c) => combinaBusca(c, termo)),
    [todas.dados, termo],
  );

  const filtrosAtivos = [busca, tipo, categoriaId, parceiroId, aba === 'todas' ? status : ''].filter(Boolean).length;
  const limpar = () => { setBusca(''); setTipo(''); setStatus(''); setCategoriaId(''); setParceiroId(''); };

  async function estornar(conta) {
    const ok = await confirmar({
      title: 'Estornar baixa?',
      message: `"${conta.descricao}" volta a ficar em aberto e o valor ${conta.tipo === 'RECEBER' ? 'sai da' : 'volta para a'} conta bancária usada na baixa.`,
      confirmLabel: 'Estornar baixa',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await api.estornar(conta.id);
      toast.success('Baixa estornada. A conta voltou a ficar em aberto.');
      recarregar();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function excluir(conta) {
    const ok = await confirmar({
      title: 'Excluir conta?',
      message: `"${conta.descricao}" (${formatarMoeda(conta.valorOriginal)}, vence em ${formatDate(conta.dataVencimento)}) será excluída.`,
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    try {
      await api.deletar(conta.id);
      toast.success('Conta excluída.');
      recarregar();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const acoes = {
    onBaixar: setBaixando,
    onEditar: setEditando,
    onEstornar: estornar,
    onExcluir: excluir,
  };

  const colunas = [
    {
      key: 'descricao',
      label: 'Descrição',
      sortable: true,
      render: (v, c) => (
        <div className="flex items-center gap-3 min-w-0">
          <ChipCategoria icone={c.categoriaIcone} tom={c.tipo === 'RECEBER' ? 'income' : 'expense'} tamanho="sm" />
          <div className="min-w-0">
            <p className="font-medium text-text-primary truncate max-w-[18rem]">
              {v}
              {c.totalParcelas > 1 && <span className="ml-2 text-xs text-text-primary/60 tabular-nums">{c.numeroParcela}/{c.totalParcelas}</span>}
            </p>
            <p className="text-xs text-text-primary/60 truncate max-w-[18rem]">
              {[c.parceiroNome, c.categoriaDescricao, c.numeroDocumento].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      ),
    },
    { key: 'dataVencimento', label: 'Vencimento', sortable: true, render: (v) => <span className="tabular-nums">{formatDate(v)}</span> },
    { key: 'status', label: 'Status', render: (v) => <StatusConta status={v} /> },
    { key: 'valorOriginal', label: 'Valor', sortable: true, className: 'text-right', render: (_v, c) => <ValorConta conta={c} /> },
    { key: 'id', label: <span className="sr-only">Ações</span>, render: (_id, c) => <div className="flex justify-end"><AcoesConta conta={c} {...acoes} /></div> },
  ];

  const erroAtual = aba === 'todas' ? todas.erro : abertas.erro;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas a pagar e receber"
        subtitle="O que vence, o que atrasou e o que já foi pago ou recebido."
        icon={Receipt}
        actions={(
          <PermissaoGuard permissao="CONTA_CRIAR">
            <Button onClick={() => setParam('novo', 'PAGAR')} leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>
              Nova conta
            </Button>
          </PermissaoGuard>
        )}
      />

      <KpiGrid cols={3}>
        <KpiCard
          label="A pagar"
          valor={kpis.pagarMes}
          tom="expense"
          icon={ArrowUpRight}
          loading={abertas.carregandoInicial}
          ajuda="Contas a pagar em aberto com vencimento até o último dia deste mês, incluindo as atrasadas."
        >
          {kpis.qtdPagarMes} {kpis.qtdPagarMes === 1 ? 'conta' : 'contas'} até o fim do mês
        </KpiCard>
        <KpiCard
          label="A receber"
          valor={kpis.receberMes}
          tom="income"
          icon={ArrowDownLeft}
          loading={abertas.carregandoInicial}
          ajuda="Contas a receber em aberto com vencimento até o último dia deste mês, incluindo as atrasadas."
        >
          {kpis.qtdReceberMes} {kpis.qtdReceberMes === 1 ? 'conta' : 'contas'} até o fim do mês
        </KpiCard>
        <KpiCard
          label="Atrasadas"
          valor={kpis.qtdAtrasadas}
          formato="numero"
          tom={kpis.qtdAtrasadas ? 'expense' : 'neutro'}
          icon={AlertTriangle}
          loading={abertas.carregandoInicial}
          ajuda="Contas em aberto com vencimento antes de hoje."
        >
          {kpis.qtdAtrasadas
            ? (
              <span className="tabular-nums valor-privado">
                {[kpis.atrasadoPagar ? `${formatarMoeda(kpis.atrasadoPagar)} a pagar` : null, kpis.atrasadoReceber ? `${formatarMoeda(kpis.atrasadoReceber)} a receber` : null].filter(Boolean).join(' · ')}
              </span>
            )
            : 'Nada atrasado'}
        </KpiCard>
      </KpiGrid>

      <div className="space-y-4">
        <Tabs idBase={ID_ABAS} label="Visão das contas" value={aba} onChange={(v) => setParam('ver', v === 'todas' ? 'todas' : '')} items={ABAS} />

        <FilterBar
          busca={{ value: busca, onChange: setBusca, placeholder: 'Descrição, documento, parceiro…', label: 'Buscar contas' }}
          periodo={aba === 'todas' ? (
            <PeriodoSelector value={periodo} onChange={setPeriodo} granularidade="dia" atalhos={['mes', 'mes-passado', '3m', '6m', '12m', 'ano']} label="Vencimento" />
          ) : null}
          filtrosAtivos={filtrosAtivos}
          onLimpar={limpar}
        >
          <SegmentedControl label="Tipo" items={TIPOS} value={tipo} onChange={setTipo} size="sm" />
          {aba === 'todas' && (
            <div className="md:w-44">
              <FormSelect small aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </FormSelect>
            </div>
          )}
          <div className="md:w-48">
            <FormSelect small aria-label="Categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
              <option value="">Todas as categorias</option>
              <CategoriaOptions cats={cats} />
            </FormSelect>
          </div>
          <div className="md:w-48">
            <FormSelect small aria-label="Parceiro" value={parceiroId} onChange={(e) => setParceiroId(e.target.value)}>
              <option value="">Todos os parceiros</option>
              {pars.map((p) => <option key={p.id} value={p.id}>{p.nomeFantasia || p.razaoSocial}</option>)}
            </FormSelect>
          </div>
        </FilterBar>

        <div role="tabpanel" id={Tabs.painelId(ID_ABAS, aba)} aria-labelledby={Tabs.abaId(ID_ABAS, aba)} className="space-y-3">
          {erroAtual && <AlertaErro mensagem={erroAtual.message} onTentarNovamente={recarregar} />}

          {!erroAtual && aba === 'abertas' && (
            abertas.carregandoInicial ? (
              <DataTable caption="Contas em aberto" columns={colunas} data={[]} loading />
            ) : grupos.some((g) => g.itens.length) ? (
              <>
                <p className="text-xs text-text-primary/60">Tudo o que falta pagar ou receber, sem limite de data, do mais urgente ao mais distante.</p>
                <GroupedList grupos={grupos} keyItem={(c) => c.id} renderItem={(c) => <LinhaConta conta={c} mostrarStatus={false} {...acoes} />} />
                {abertas.dados?.excedeu && (
                  <p className="text-xs text-warning" role="status">Mostrando as primeiras {LIMITE} contas de cada situação. Use os filtros para ver o restante.</p>
                )}
              </>
            ) : (
              <div className="c4-card">
                <EmptyState
                  icon={CircleCheckBig}
                  tom="income"
                  title={filtrosAtivos ? 'Nenhuma conta em aberto com esses filtros' : 'Nada em aberto'}
                  description={filtrosAtivos ? 'Mude ou limpe os filtros para ver outras contas.' : 'Tudo pago e recebido. Novas contas aparecem aqui assim que forem cadastradas.'}
                  action={filtrosAtivos ? { label: 'Limpar filtros', onClick: limpar } : undefined}
                />
              </div>
            )
          )}

          {!erroAtual && aba === 'todas' && (
            <>
              <DataTable
                caption="Contas a pagar e receber"
                columns={colunas}
                data={listaTodas}
                loading={todas.carregandoInicial}
                keyExtractor={(c) => c.id}
                renderCard={(c) => <LinhaConta conta={c} {...acoes} semCartao />}
                emptyState={(
                  <EmptyState
                    icon={Receipt}
                    title="Nenhuma conta neste período"
                    description="Mude o período de vencimento ou os filtros acima."
                    action={filtrosAtivos ? { label: 'Limpar filtros', onClick: limpar } : undefined}
                  />
                )}
              />
              {(todas.dados?.totalElements ?? 0) > LIMITE && (
                <p className="text-xs text-warning" role="status">
                  Mostrando {LIMITE} de {todas.dados.totalElements} contas. Escolha um período menor para ver todas.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <Drawer
        open={criando}
        onClose={() => setParam('novo', '')}
        title="Nova conta"
        description="Cadastre uma conta a pagar ou a receber."
      >
        {criando && (
          <ContaForm
            key={novoTipo}
            tipo={novoTipo}
            categorias={cats}
            parceiros={pars}
            onCancelar={() => setParam('novo', '')}
            onSalvo={(criadas) => {
              const n = Array.isArray(criadas) ? criadas.length : 1;
              toast.success(n > 1 ? `${n} parcelas criadas.` : 'Conta criada.');
              setParam('novo', '');
              recarregar();
            }}
          />
        )}
      </Drawer>

      <Drawer open={Boolean(editando)} onClose={() => setEditando(null)} title="Editar conta" description={editando?.descricao}>
        {editando && (
          <ContaForm
            key={editando.id}
            modo="editar"
            inicial={editando}
            categorias={cats}
            parceiros={pars}
            onCancelar={() => setEditando(null)}
            onSalvo={() => { toast.success('Conta atualizada.'); setEditando(null); recarregar(); }}
          />
        )}
      </Drawer>

      <Drawer
        open={Boolean(baixando)}
        onClose={() => setBaixando(null)}
        title={baixando?.tipo === 'RECEBER' ? 'Registrar recebimento' : 'Registrar pagamento'}
      >
        {baixando && (
          <BaixaForm
            key={baixando.id}
            conta={baixando}
            onCancelar={() => setBaixando(null)}
            onSalvo={() => {
              toast.success(baixando.tipo === 'RECEBER' ? 'Recebimento registrado.' : 'Pagamento registrado.');
              setBaixando(null);
              recarregar();
            }}
          />
        )}
      </Drawer>
    </div>
  );
}
