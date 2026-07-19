import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileDown, ArrowLeft, CheckCircle2, XCircle, MinusCircle, Eye, AlertTriangle } from 'lucide-react';
import { conciliacao as api } from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import DataTable from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../hooks/useToast';
import { brl, formatDate } from '../lib/formatters';
import { exportarRelatorioConciliacaoPdf } from '../lib/pdfUtils';

const STATUS_ITEM_LABEL = {
  SUGERIDO: 'Sugerido',
  VINCULADO_MANUALMENTE: 'Manual',
  NAO_IDENTIFICADO: 'Não id.',
  IGNORADO: 'Ignorado',
  BAIXADO: 'Baixado',
};
const STATUS_ITEM_VARIANT = {
  SUGERIDO: 'warning', VINCULADO_MANUALMENTE: 'info',
  NAO_IDENTIFICADO: 'error', IGNORADO: 'neutral', BAIXADO: 'success',
};

const STATUS_CONCILIACAO_LABEL = { PENDENTE: 'Pendente', FINALIZADA: 'Finalizada', CANCELADA: 'Cancelada' };
const STATUS_CONCILIACAO_VARIANT = { PENDENTE: 'warning', FINALIZADA: 'success', CANCELADA: 'neutral' };

// Estilos dos cartões de resumo por variante — via tokens do tema (sem rgba inline).
const STAT_STYLES = {
  neutral:   { wrap: 'bg-surface-highest border-text-primary/10', text: 'text-text-primary' },
  primary:   { wrap: 'bg-primary/10 border-primary/20',           text: 'text-primary' },
  muted:     { wrap: 'bg-surface-high border-text-primary/5',     text: 'text-text-primary/40' },
  secondary: { wrap: 'bg-secondary/10 border-secondary/20',       text: 'text-secondary' },
  error:     { wrap: 'bg-error/10 border-error/20',               text: 'text-error' },
};

export default function ConciliacaoRelatorio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [rel, setRel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setErro(false);
    api.relatorio(id)
      .then((r) => { if (!cancelado) setRel(r); })
      .catch((e) => {
        if (cancelado) return;
        setErro(true);
        toast.error(e.message || 'Não foi possível carregar o relatório.');
      })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [id]);

  function exportarPDF() {
    if (!rel) return;
    setExportando(true);
    try {
      const linhas = (rel.itens ?? []).map((i) => [
        i.ofxData ? formatDate(i.ofxData) : '—',
        i.ofxMemo || i.ofxNome || '—',
        `R$ ${brl(i.ofxValor)}`,
        i.contaDescricao || '—',
        `R$ ${i.contaValor ? brl(i.contaValor) : '—'}`,
        STATUS_ITEM_LABEL[i.statusItem] ?? i.statusItem,
        i.scoreVinculacao != null ? `${i.scoreVinculacao}pts` : '—',
      ]);

      exportarRelatorioConciliacaoPdf({
        titulo: `Relatório de Conciliação #${rel.id}`,
        subtitulo: `${rel.contaCorrenteDescricao} — ${rel.contaCorrenteNumero}`,
        cabecalho: ['Data', 'Descrição OFX', 'Valor OFX', 'Conta', 'Valor Conta', 'Status', 'Score'],
        linhas,
        nomeArquivo: `Conciliacao_${rel.id}_${rel.dataInicioOfx ?? ''}.pdf`,
      });
      toast.success('Relatório em PDF gerado com sucesso.');
    } catch (e) {
      toast.error(e.message || 'Não foi possível gerar o PDF.');
    } finally {
      setExportando(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-text-primary/40">Carregando...</div>;
  }

  if (erro || !rel) {
    return (
      <div className="space-y-6">
        <PageHeader title="Relatório de Conciliação" subtitle="Conciliação bancária" />
        <EmptyState
          icon={AlertTriangle}
          title="Não foi possível abrir o relatório"
          description="O relatório pode ter sido removido ou ocorreu uma falha ao carregar. Volte e tente novamente."
          action={{ label: 'Voltar ao histórico', onClick: () => navigate('/conciliacao/historico') }}
        />
      </div>
    );
  }

  const STATS = [
    { label: 'Total', value: rel.totalTransacoes, icon: Eye, variant: 'neutral' },
    { label: 'Baixadas', value: rel.totalConciliados, icon: CheckCircle2, variant: 'primary' },
    { label: 'Ignoradas', value: rel.totalIgnorados, icon: MinusCircle, variant: 'muted' },
    { label: 'Manuais', value: rel.totalManuais, icon: Eye, variant: 'secondary' },
    { label: 'Não id.', value: rel.totalNaoIdentificados, icon: XCircle, variant: 'error' },
  ];

  const columns = [
    { key: 'ofxData', label: 'Data', render: (v) => v ? formatDate(v) : '—' },
    {
      key: 'ofxMemo', label: 'Descrição OFX',
      render: (v, row) => <span className="text-sm">{v || row.ofxNome || '—'}</span>,
    },
    {
      key: 'ofxValor', label: 'Valor OFX',
      render: (v) => <span className={v > 0 ? 'text-primary font-bold' : 'text-error font-bold'}>R$ {brl(v)}</span>,
    },
    {
      key: 'contaDescricao', label: 'Conta',
      render: (v, row) => v ? (
        <div>
          <p className="text-sm text-text-primary">{v}</p>
          {row.contaValor && <p className="text-xs text-text-primary/40">R$ {brl(row.contaValor)}</p>}
        </div>
      ) : <span className="text-text-primary/30">—</span>,
    },
    {
      key: 'statusItem', label: 'Status',
      render: (v) => <Badge variant={STATUS_ITEM_VARIANT[v] ?? 'neutral'} size="sm">{STATUS_ITEM_LABEL[v] ?? v}</Badge>,
    },
    {
      key: 'scoreVinculacao', label: 'Score',
      render: (v) => v != null ? <span className="text-xs text-text-primary/60">{v}pts</span> : '—',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Relatório de Conciliação #${rel.id}`}
        subtitle={`${rel.contaCorrenteDescricao} — ${rel.contaCorrenteNumero}`}
        actions={
          <div className="flex gap-3">
            <Button variant="secondary" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/conciliacao/historico')}>
              Voltar
            </Button>
            <Button loading={exportando} leftIcon={<FileDown className="w-4 h-4" />} onClick={exportarPDF}>
              Exportar PDF
            </Button>
          </div>
        }
      />

      {/* Cabeçalho detalhado */}
      <div className="rounded-2xl p-6 bg-surface-medium border border-text-primary/5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-5">
          {[
            { label: 'Banco', value: rel.bancoId || '—' },
            { label: 'Agência', value: rel.agencia || '—' },
            { label: 'Período OFX', value: rel.dataInicioOfx ? `${formatDate(rel.dataInicioOfx)} – ${formatDate(rel.dataFimOfx)}` : '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-text-primary/30 uppercase tracking-widest font-mono mb-1">{label}</p>
              <p className="font-bold text-text-primary font-mono">{value}</p>
            </div>
          ))}
          <div>
            <p className="text-xs text-text-primary/30 uppercase tracking-widest font-mono mb-1">Status</p>
            <Badge variant={STATUS_CONCILIACAO_VARIANT[rel.status] ?? 'neutral'} size="md">
              {STATUS_CONCILIACAO_LABEL[rel.status] ?? rel.status}
            </Badge>
          </div>
          {rel.observacao && (
            <div className="col-span-2 md:col-span-4">
              <p className="text-xs text-text-primary/30 uppercase tracking-widest font-mono mb-1">Observação</p>
              <p className="text-text-primary text-sm">{rel.observacao}</p>
            </div>
          )}
        </div>

        {/* Resumo numérico */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {STATS.map((s) => {
            const scheme = STAT_STYLES[s.variant] ?? STAT_STYLES.neutral;
            const StatIcon = s.icon;
            return (
              <div key={s.label} className={`rounded-xl p-3 text-center border ${scheme.wrap}`}>
                {StatIcon && <StatIcon className={`w-4 h-4 mx-auto mb-1.5 ${scheme.text}`} aria-hidden="true" />}
                <p className={`text-2xl font-bold font-mono ${scheme.text}`}>{s.value ?? 0}</p>
                <p className="text-xs text-text-primary/30 uppercase tracking-widest font-mono mt-1">{s.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabela detalhada */}
      <DataTable
        columns={columns}
        data={rel.itens ?? []}
        aria-label="Itens da conciliação"
      />
    </div>
  );
}
