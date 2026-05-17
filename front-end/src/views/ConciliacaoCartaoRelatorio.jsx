import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileDown, ArrowLeft, CheckCircle2, XCircle, MinusCircle, Eye } from 'lucide-react';
import { conciliacaoCartao as api } from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import { useToast } from '../hooks/useToast';
import { brl, formatDate } from '../lib/formatters';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PRIMARY = [110, 255, 192];
const ON_PRIMARY = [0, 56, 36];

const STATUS_ITEM_LABEL = {
  SUGERIDO: 'Sugerido', VINCULADO_MANUALMENTE: 'Manual',
  NAO_IDENTIFICADO: 'Não id.', IGNORADO: 'Ignorado', BAIXADO: 'Confirmado',
};
const STATUS_ITEM_VARIANT = {
  SUGERIDO: 'warning', VINCULADO_MANUALMENTE: 'info',
  NAO_IDENTIFICADO: 'error', IGNORADO: 'neutral', BAIXADO: 'success',
};

export default function ConciliacaoCartaoRelatorio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [rel, setRel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.relatorio(id)
      .then(setRel)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  function exportarPDF() {
    if (!rel) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFillColor(...PRIMARY);
    doc.rect(0, 0, 297, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...ON_PRIMARY);
    doc.text(`Relatório de Conciliação de Cartão #${rel.id}`, 10, 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(rel.cartaoCreditoNome, 200, 13);

    const linhas = (rel.itens ?? []).map((i) => [
      i.ofxData ? formatDate(i.ofxData) : '—',
      i.ofxMemo || '—',
      `R$ ${brl(i.ofxValor)}`,
      i.lancamentoDescricao || '—',
      `R$ ${i.lancamentoValor ? brl(i.lancamentoValor) : '—'}`,
      STATUS_ITEM_LABEL[i.statusItem] ?? i.statusItem,
      i.scoreVinculacao != null ? `${i.scoreVinculacao}pts` : '—',
    ]);

    autoTable(doc, {
      head: [['Data', 'Descrição OFX', 'Valor OFX', 'Lançamento', 'Valor Lanç.', 'Status', 'Score']],
      body: linhas,
      startY: 25,
      styles: { fontSize: 8, cellPadding: 3, textColor: [60, 60, 60] },
      headStyles: { fillColor: PRIMARY, textColor: ON_PRIMARY, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 248, 248] },
    });

    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Core 4 ERP — Gerado em ${new Date().toLocaleString('pt-BR')}`, 10, 205);
      doc.text(`Página ${i} de ${pages}`, 260, 205);
    }

    doc.save(`ConciliacaoCartao_${rel.id}_${rel.dataInicioOfx ?? ''}.pdf`);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-text-primary/40">Carregando...</div>;
  }
  if (!rel) return null;

  const STATUS_VARIANT = { PENDENTE: 'warning', FINALIZADA: 'success', CANCELADA: 'neutral' };

  const STATS = [
    { label: 'Total', value: rel.totalTransacoes, icon: Eye, color: 'text-text-primary' },
    { label: 'Confirmados', value: rel.totalConciliados, icon: CheckCircle2, color: 'text-primary' },
    { label: 'Ignorados', value: rel.totalIgnorados, icon: MinusCircle, color: 'text-text-primary/40' },
    { label: 'Manuais', value: rel.totalManuais, icon: Eye, color: 'text-secondary' },
    { label: 'Não id.', value: rel.totalNaoIdentificados, icon: XCircle, color: 'text-error' },
  ];

  const columns = [
    { key: 'ofxData', label: 'Data', render: (v) => v ? formatDate(v) : '—' },
    { key: 'ofxMemo', label: 'Descrição OFX', render: (v) => <span className="text-sm">{v || '—'}</span> },
    {
      key: 'ofxValor', label: 'Valor OFX',
      render: (v) => <span className={v > 0 ? 'text-primary font-bold' : 'text-error font-bold'}>R$ {brl(v)}</span>,
    },
    {
      key: 'lancamentoDescricao', label: 'Lançamento',
      render: (v, row) => v ? (
        <div>
          <p className="text-sm text-text-primary">{v}</p>
          {row.lancamentoValor && <p className="text-xs text-text-primary/40">R$ {brl(row.lancamentoValor)}</p>}
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
        title={`Relatório de Conciliação de Cartão #${rel.id}`}
        subtitle={rel.cartaoCreditoNome}
        actions={
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/cartoes/conciliacao/historico')}
              className="flex items-center gap-2 border border-text-primary/10 text-text-primary/60 hover:text-text-primary font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <button
              onClick={exportarPDF}
              className="flex items-center gap-2 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
            >
              <FileDown className="w-4 h-4" /> Exportar PDF
            </button>
          </div>
        }
      />

      <div className="rounded-[18px] p-6" style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(250,250,250,.07)', backdropFilter: 'blur(8px)', boxShadow: '0 1px 3px rgba(0,0,0,.3),0 8px 32px rgba(0,0,0,.2)' }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-5">
          {[
            { label: 'Cartão', value: rel.cartaoCreditoNome },
            { label: 'Período OFX', value: rel.dataInicioOfx ? `${formatDate(rel.dataInicioOfx)} – ${formatDate(rel.dataFimOfx)}` : '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] text-text-primary/30 uppercase tracking-widest font-mono mb-1">{label}</p>
              <p className="font-bold text-text-primary font-mono">{value}</p>
            </div>
          ))}
          <div>
            <p className="text-[10px] text-text-primary/30 uppercase tracking-widest font-mono mb-1">Status</p>
            <Badge variant={STATUS_VARIANT[rel.status] ?? 'neutral'} size="md">{rel.status}</Badge>
          </div>
          {rel.observacao && (
            <div className="col-span-2 md:col-span-4">
              <p className="text-[10px] text-text-primary/30 uppercase tracking-widest font-mono mb-1">Observação</p>
              <p className="text-text-primary text-sm">{rel.observacao}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {STATS.map((s) => {
            const colorMap = {
              'text-primary': { bg: 'rgba(110,255,192,.07)', border: 'rgba(110,255,192,.2)', val: '#6EFFC0' },
              'text-secondary': { bg: 'rgba(172,199,255,.07)', border: 'rgba(172,199,255,.2)', val: '#ACC7FF' },
              'text-error': { bg: 'rgba(255,180,171,.07)', border: 'rgba(255,180,171,.2)', val: '#FFB4AB' },
              'text-text-primary': { bg: 'rgba(255,255,255,.04)', border: 'rgba(250,250,250,.08)', val: null },
              'text-text-primary/40': { bg: 'rgba(255,255,255,.02)', border: 'rgba(250,250,250,.05)', val: null },
            };
            const scheme = colorMap[s.color] ?? colorMap['text-text-primary'];
            return (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: scheme.bg, border: `1px solid ${scheme.border}` }}>
                <p className={`text-2xl font-bold font-mono ${s.color}`} style={scheme.val ? { color: scheme.val } : {}}>{s.value ?? 0}</p>
                <p className="text-[10px] text-text-primary/30 uppercase tracking-widest font-mono mt-1">{s.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rel.itens ?? []}
        aria-label="Itens da conciliação de cartão"
      />
    </div>
  );
}
