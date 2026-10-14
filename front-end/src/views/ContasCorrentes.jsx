import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowRightLeft, FileText, Landmark, Pencil, Plus, ShieldAlert, Trash2, Wallet } from 'lucide-react';
import { contasCorrentes as api } from '../lib/api';
import { formatarMoeda, formatDate } from '../lib/formatters';
import { cn } from '../lib/utils';
import { useCarga } from '../hooks/useCarga';
import { useConfirm } from '../hooks/useConfirm';
import { useToast } from '../hooks/useToast';
import { usePermissao } from '../hooks/usePermissao';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import Drawer from '../components/ui/Drawer';
import EmptyState from '../components/ui/EmptyState';
import AlertaErro from '../components/ui/AlertaErro';
import SkeletonCard from '../components/ui/SkeletonCard';
import KpiCard, { KpiGrid } from '../components/ui/KpiCard';
import { ProgressBar } from '../components/ui/Progress';
import { AnimatedNumber, Stagger, StaggerItem } from '../components/motion/Movimento';
import ContaBancariaForm from '../components/financeiro/ContaBancariaForm';
import TransferenciaForm from '../components/financeiro/TransferenciaForm';

function CartaoConta({ conta, total, onEditar, onExcluir }) {
  const pode = usePermissao();
  const saldo = Number(conta.saldo) || 0;
  const positivo = saldo >= 0;
  const fatia = total > 0 && positivo ? saldo / total : 0;
  return (
    <article className="c4-card relative overflow-hidden p-5 flex flex-col gap-4 h-full">
      <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', positivo ? 'bg-primary/70' : 'bg-expense/80')} />
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span aria-hidden="true" className="w-10 h-10 shrink-0 grid place-items-center rounded-xl border border-primary/25 bg-primary/[0.12] text-primary">
            <Landmark className="w-[1.125rem] h-[1.125rem]" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-text-primary truncate">{conta.descricao}</h3>
            <p className="text-xs text-text-primary/60 tabular-nums">Agência {conta.agencia} · Conta {conta.numeroConta}</p>
          </div>
        </div>
        <div className="flex shrink-0 -mr-1">
          {pode('CONTA_CORRENTE_EDITAR') && (
            <Button variant="ghost" size="icon-sm" onClick={() => onEditar(conta)} aria-label={`Editar ${conta.descricao}`} title="Editar">
              <Pencil className="w-4 h-4" aria-hidden="true" />
            </Button>
          )}
          {pode('CONTA_CORRENTE_DELETAR') && (
            <Button variant="danger-ghost" size="icon-sm" onClick={() => onExcluir(conta)} aria-label={`Excluir ${conta.descricao}`} title="Excluir">
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </header>

      <div>
        <p className="c4-eyebrow">Saldo atual</p>
        <AnimatedNumber value={saldo} format="currency" colorir className="c4-kpi block mt-1" />
      </div>

      {total > 0 && (
        <div className="space-y-1">
          <ProgressBar valor={fatia} tom={positivo ? 'primary' : 'expense'} altura={6} label={`Participação de ${conta.descricao} no saldo em contas`} />
          <p className="text-xs text-text-primary/60 tabular-nums">
            {positivo ? `${Math.round(fatia * 100)}% do saldo em contas` : 'Saldo negativo'}
          </p>
        </div>
      )}

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 text-xs text-text-primary/60">
        <span>Desde {formatDate(conta.dataSaldoInicial)}</span>
        <div className="flex items-center gap-2">
          {conta.permitirSaldoNegativo && (
            <Badge variant="warning"><ShieldAlert className="w-3 h-3" aria-hidden="true" /> Pode ficar negativa</Badge>
          )}
          {pode('RELATORIO_EXTRATO_VISUALIZAR') && (
            <Link
              to="/reports"
              className="inline-flex items-center gap-1 min-h-11 sm:min-h-0 font-medium text-primary hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" /> Extrato
              <span className="sr-only">de {conta.descricao} em Relatórios</span>
            </Link>
          )}
        </div>
      </footer>
    </article>
  );
}

export default function ContasCorrentes() {
  const toast = useToast();
  const confirmar = useConfirm();
  const pode = usePermissao();
  const [formConta, setFormConta] = useState(null); // {} = nova; objeto com id = edição
  const [formTransf, setFormTransf] = useState(null); // {} = nova; objeto com id = edição

  const contas = useCarga(() => api.listar(), [], { inicial: [] });
  const transferencias = useCarga(() => api.transferencias.listar(), [], { inicial: [] });
  const lista = contas.dados ?? [];
  const total = lista.reduce((s, c) => s + (Number(c.saldo) || 0), 0);
  const podeTransferir = pode('CONTA_CORRENTE_TRANSFERIR') && lista.length >= 2;

  const recarregarTudo = () => { contas.recarregar(); transferencias.recarregar(); };

  async function excluirConta(c) {
    const ok = await confirmar({
      title: 'Excluir conta bancária?',
      message: `"${c.descricao}" será excluída.`,
      details: ['Contas com transferências ou conciliações não podem ser excluídas — nesse caso o sistema avisa e nada muda.'],
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    try {
      await api.deletar(c.id);
      toast.success('Conta bancária excluída.');
      contas.recarregar();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function excluirTransferencia(t) {
    const ok = await confirmar({
      title: 'Excluir transferência?',
      message: `${formatarMoeda(t.valor)} de ${t.contaOrigemDescricao} para ${t.contaDestinoDescricao}. Os dois saldos voltam ao que eram antes.`,
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    try {
      await api.transferencias.deletar(t.id);
      toast.success('Transferência excluída e saldos ajustados.');
      recarregarTudo();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const colunasTransf = [
    { key: 'dataTransferencia', label: 'Data', sortable: true, render: (v) => <span className="tabular-nums">{formatDate(v)}</span> },
    {
      key: 'contaOrigemDescricao',
      label: 'De → para',
      render: (_v, t) => (
        <span className="inline-flex items-center gap-2 min-w-0">
          <span className="truncate">{t.contaOrigemDescricao}</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0 text-text-primary/50" aria-label="para" />
          <span className="truncate">{t.contaDestinoDescricao}</span>
        </span>
      ),
    },
    { key: 'valor', label: 'Valor', sortable: true, className: 'text-right', render: (v) => <span className="font-semibold tabular-nums valor-privado">{formatarMoeda(v)}</span> },
    {
      key: 'id',
      label: <span className="sr-only">Ações</span>,
      render: (_id, t) => (pode('CONTA_CORRENTE_TRANSFERIR') ? (
        <div className="flex justify-end">
          <Button variant="ghost" size="icon-sm" onClick={() => setFormTransf(t)} aria-label={`Editar transferência de ${formatarMoeda(t.valor)}`} title="Editar">
            <Pencil className="w-4 h-4" aria-hidden="true" />
          </Button>
          <Button variant="danger-ghost" size="icon-sm" onClick={() => excluirTransferencia(t)} aria-label={`Excluir transferência de ${formatarMoeda(t.valor)}`} title="Excluir">
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      ) : null),
    },
  ];

  const transfOrdenadas = [...(transferencias.dados ?? [])].sort((a, b) => String(b.dataTransferencia).localeCompare(String(a.dataTransferencia)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas bancárias"
        subtitle="Saldo de cada conta e as transferências entre elas."
        icon={Landmark}
        actions={(
          <div className="flex flex-wrap gap-2">
            {podeTransferir && (
              <Button variant="secondary" onClick={() => setFormTransf({})} leftIcon={<ArrowRightLeft className="w-4 h-4" aria-hidden="true" />}>
                Transferir
              </Button>
            )}
            {pode('CONTA_CORRENTE_CRIAR') && (
              <Button onClick={() => setFormConta({})} leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>
                Nova conta bancária
              </Button>
            )}
          </div>
        )}
      />

      {contas.erro && <AlertaErro mensagem={contas.erro.message} onTentarNovamente={contas.recarregar} />}

      {!contas.erro && (
        <KpiGrid cols={2}>
          <KpiCard
            label="Saldo em contas"
            valor={total}
            icon={Wallet}
            tom="primary"
            destaque
            colorirSinal
            loading={contas.carregandoInicial}
            ajuda="Soma do saldo atual de todas as contas bancárias. Só entram valores já pagos, recebidos ou transferidos."
          >
            {lista.length} {lista.length === 1 ? 'conta' : 'contas'}
          </KpiCard>
          <KpiCard
            label="Transferências"
            valor={transfOrdenadas.length}
            formato="numero"
            icon={ArrowRightLeft}
            loading={transferencias.carregandoInicial}
          >
            {transfOrdenadas[0] ? `Última em ${formatDate(transfOrdenadas[0].dataTransferencia)}` : 'Nenhuma ainda'}
          </KpiCard>
        </KpiGrid>
      )}

      <section aria-labelledby="titulo-contas" className="space-y-3">
        <h2 id="titulo-contas" className="font-display text-lg font-semibold">Suas contas</h2>
        {contas.carregandoInicial ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} rows={3} />)}
          </div>
        ) : lista.length === 0 && !contas.erro ? (
          <div className="c4-card">
            <EmptyState
              icon={Landmark}
              title="Nenhuma conta bancária"
              description="Cadastre a conta onde o dinheiro entra e sai. É nela que as baixas de contas e as transferências mexem no saldo."
              action={pode('CONTA_CORRENTE_CRIAR') ? { label: 'Nova conta bancária', onClick: () => setFormConta({}), icon: Plus } : undefined}
            />
          </div>
        ) : (
          <Stagger className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {lista.map((c) => (
              <StaggerItem key={c.id}>
                <CartaoConta conta={c} total={total} onEditar={setFormConta} onExcluir={excluirConta} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>

      <section aria-labelledby="titulo-transf" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="titulo-transf" className="font-display text-lg font-semibold">Transferências</h2>
            <p className="text-sm text-text-primary/65">Cada transferência tira de uma conta e põe na outra, no mesmo dia.</p>
          </div>
          {podeTransferir && (
            <Button variant="ghost" size="sm" onClick={() => setFormTransf({})} leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>
              Nova transferência
            </Button>
          )}
        </div>
        {transferencias.erro ? (
          <AlertaErro compacto mensagem={transferencias.erro.message} onTentarNovamente={transferencias.recarregar} />
        ) : (
          <DataTable
            caption="Transferências entre contas bancárias"
            columns={colunasTransf}
            data={transfOrdenadas}
            loading={transferencias.carregandoInicial}
            keyExtractor={(t) => t.id}
            emptyState={(
              <EmptyState
                compact
                icon={ArrowRightLeft}
                tom="neutro"
                title="Nenhuma transferência"
                description={lista.length < 2 ? 'Com duas contas cadastradas você pode mover dinheiro entre elas.' : 'Use "Transferir" no topo para mover dinheiro entre suas contas.'}
              />
            )}
          />
        )}
      </section>

      <Drawer
        open={Boolean(formConta)}
        onClose={() => setFormConta(null)}
        title={formConta?.id ? 'Editar conta bancária' : 'Nova conta bancária'}
      >
        {formConta && (
          <ContaBancariaForm
            key={formConta.id ?? 'nova'}
            inicial={formConta.id ? formConta : undefined}
            onCancelar={() => setFormConta(null)}
            onSalvo={() => {
              toast.success(formConta.id ? 'Conta bancária atualizada.' : 'Conta bancária criada.');
              setFormConta(null);
              contas.recarregar();
            }}
          />
        )}
      </Drawer>

      <Drawer
        open={Boolean(formTransf)}
        onClose={() => setFormTransf(null)}
        title={formTransf?.id ? 'Editar transferência' : 'Transferir entre contas'}
        description="O valor sai de uma conta e entra na outra."
      >
        {formTransf && (
          <TransferenciaForm
            key={formTransf.id ?? 'nova'}
            contas={lista}
            inicial={formTransf.id ? formTransf : undefined}
            onCancelar={() => setFormTransf(null)}
            onSalvo={() => {
              toast.success(formTransf.id ? 'Transferência atualizada.' : 'Transferência registrada.');
              setFormTransf(null);
              recarregarTudo();
            }}
          />
        )}
      </Drawer>
    </div>
  );
}
