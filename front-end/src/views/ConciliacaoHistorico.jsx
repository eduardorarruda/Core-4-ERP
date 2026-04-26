import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitMerge, FileSearch, Plus } from 'lucide-react';
import { conciliacao as api } from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../lib/formatters';

const STATUS_VARIANT = { PENDENTE: 'warning', FINALIZADA: 'success', CANCELADA: 'neutral' };
const STATUS_LABEL = { PENDENTE: 'Pendente', FINALIZADA: 'Finalizada', CANCELADA: 'Cancelada' };

export default function ConciliacaoHistorico() {
  const toast = useToast();
  const navigate = useNavigate();
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listar()
      .then(setLista)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      key: 'dataConciliacao',
      label: 'Data',
      render: (v) => v ? formatDate(v.split('T')[0]) : '—',
    },
    {
      key: 'contaCorrenteDescricao',
      label: 'Conta Corrente',
      render: (v, row) => (
        <div>
          <p className="font-medium text-text-primary">{v}</p>
          {row.contaCorrenteNumero && <p className="text-xs text-text-primary/40">{row.contaCorrenteNumero}</p>}
        </div>
      ),
    },
    {
      key: 'dataInicioOfx',
      label: 'Período OFX',
      render: (v, row) => v && row.dataFimOfx ? `${formatDate(v)} – ${formatDate(row.dataFimOfx)}` : '—',
    },
    {
      key: 'totalTransacoes',
      label: 'Transações',
      render: (v, row) => (
        <div className="text-sm">
          <span className="font-bold text-text-primary">{v}</span>
          <span className="text-text-primary/40"> total · </span>
          <span className="text-primary">{row.totalConciliados} conciliadas</span>
          {row.totalNaoIdentificados > 0 && (
            <span className="text-error"> · {row.totalNaoIdentificados} não id.</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (v) => <Badge variant={STATUS_VARIANT[v] ?? 'neutral'}>{STATUS_LABEL[v] ?? v}</Badge>,
    },
    {
      key: 'id',
      label: 'Ações',
      render: (id, row) => (
        <button
          onClick={() => navigate(row.status === 'PENDENTE' ? `/conciliacao` : `/conciliacao/${id}/relatorio`)}
          className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
        >
          <FileSearch className="w-3.5 h-3.5" />
          {row.status === 'PENDENTE' ? 'Continuar' : 'Ver relatório'}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico de Conciliações"
        subtitle="Todas as sessões de conciliação bancária"
        icon={<GitMerge className="w-5 h-5" />}
        actions={
          <button
            onClick={() => navigate('/conciliacao')}
            className="flex items-center gap-2 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> Nova Conciliação
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={lista}
        loading={loading}
        aria-label="Histórico de conciliações"
      />
    </div>
  );
}
