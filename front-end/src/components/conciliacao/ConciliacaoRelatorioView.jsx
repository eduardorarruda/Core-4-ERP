import React, { useState } from 'react';
import { FileDown, FileText, ListOrdered, CircleCheckBig, Link2, EyeOff, CircleHelp, CalendarRange } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import DataTable from '../ui/DataTable';
import AlertaErro from '../ui/AlertaErro';
import { PageSkeleton } from '../ui/Skeleton';
import KpiCard, { KpiGrid } from '../ui/KpiCard';
import { useCarga } from '../../hooks/useCarga';
import { useToast } from '../../hooks/useToast';
import { formatDate, formatarMoeda } from '../../lib/formatters';
import { modoDe, rotuloStatus, nivelConfianca, STATUS_SESSAO } from './modos';
import { ConfiancaSelo, StatusItemSelo, ValorOfx } from './ItemPartes';

const ROTULO_CONFIANCA = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

function colunas(cfg) {
  return [
    { key: 'ofxData', label: 'Data', sortable: true, render: (v) => (v ? formatDate(v) : '—') },
    {
      key: 'ofxMemo',
      label: 'Descrição no extrato',
      render: (_v, row) => <span className="text-sm break-words">{cfg.descricaoOfx(row) || '—'}</span>,
    },
    { key: 'ofxValor', label: 'Valor', className: 'text-right', sortable: true, render: (v) => <ValorOfx valor={v} /> },
    {
      key: 'vinculo',
      label: cfg.vinculo.colunaRelatorio,
      render: (_v, row) => {
        const vin = cfg.vinculoDe(row);
        if (!vin.id) return <span className="text-text-primary/50">—</span>;
        return (
          <span className="block min-w-0">
            <span className="block text-sm text-text-primary break-words">{vin.descricao}</span>
            {vin.valor != null && <span className="block text-xs text-text-primary/60 tabular-nums valor-privado">{formatarMoeda(vin.valor)}</span>}
          </span>
        );
      },
    },
    { key: 'statusItem', label: 'Situação', render: (v) => <StatusItemSelo statusItem={v} cfg={cfg} /> },
    {
      key: 'scoreVinculacao',
      label: 'Confiança',
      render: (v) => (v != null ? <ConfiancaSelo score={v} compacto /> : <span className="text-text-primary/50">—</span>),
    },
  ];
}

async function exportarPdf(cfg, rel) {
  const linhas = (rel.itens ?? []).map((i) => {
    const vin = cfg.vinculoDe(i);
    const nivel = nivelConfianca(i.scoreVinculacao);
    return [
      i.ofxData ? formatDate(i.ofxData) : '—',
      cfg.descricaoOfx(i) || '—',
      formatarMoeda(i.ofxValor, { sinal: 'sempre' }),
      vin.descricao || '—',
      vin.valor != null ? formatarMoeda(vin.valor) : '—',
      rotuloStatus(i.statusItem, cfg),
      nivel ? `${ROTULO_CONFIANCA[nivel]} (${i.scoreVinculacao})` : '—',
    ];
  });
  // jsPDF (~400 kB) só é baixado quando a pessoa pede o PDF
  const { exportarRelatorioConciliacaoPdf } = await import('../../lib/pdfUtils');
  exportarRelatorioConciliacaoPdf({
    titulo: `Conciliação ${cfg.id === 'cartao' ? 'de cartão ' : ''}nº ${rel.id}`,
    subtitulo: cfg.tituloSessao(rel),
    cabecalho: ['Data', 'Descrição no extrato', 'Valor', cfg.vinculo.colunaRelatorio, 'Valor vinculado', 'Situação', 'Confiança'],
    linhas,
    nomeArquivo: `Conciliacao_${cfg.id}_${rel.id}_${rel.dataInicioOfx ?? ''}.pdf`,
  });
}

/**
 * Relatório de uma sessão de conciliação (banco ou cartão). Mesmo layout nos dois modos.
 * Props: modo ('banco' | 'cartao'), id.
 */
export default function ConciliacaoRelatorioView({ modo, id }) {
  const cfg = modoDe(modo);
  const toast = useToast();
  const [exportando, setExportando] = useState(false);
  const { dados: rel, erro, carregandoInicial, recarregar } = useCarga(() => cfg.api.relatorio(id), [cfg.id, id]);

  const trilha = [{ label: 'Conciliação', to: cfg.rotaBase }, 'Relatório'];

  async function exportar() {
    setExportando(true);
    try {
      await exportarPdf(cfg, rel);
      toast.success('PDF gerado.');
    } catch (e) {
      toast.error(e?.message || 'Não foi possível gerar o PDF.');
    } finally {
      setExportando(false);
    }
  }

  if (carregandoInicial) return <PageSkeleton kpis={4} />;

  if (erro || !rel) {
    return (
      <div className="space-y-6">
        <PageHeader title="Relatório da conciliação" breadcrumb={trilha} icon={FileText} />
        <AlertaErro
          titulo="Não deu para abrir o relatório"
          mensagem={erro?.message || 'A importação pode ter sido removida. Volte para a conciliação e tente de novo.'}
          onTentarNovamente={recarregar}
        />
      </div>
    );
  }

  const st = STATUS_SESSAO[rel.status] ?? STATUS_SESSAO.CANCELADA;
  const periodo = rel.dataInicioOfx && rel.dataFimOfx ? `${formatDate(rel.dataInicioOfx)} a ${formatDate(rel.dataFimOfx)}` : null;
  const detalhe = cfg.detalheSessao(rel);
  const rotuloBaixa = cfg.id === 'cartao' ? 'Confirmados' : 'Baixados';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Conciliação nº ${rel.id}`}
        subtitle={`${cfg.tituloSessao(rel)}${detalhe ? ` · ${detalhe}` : ''}`}
        breadcrumb={trilha}
        icon={cfg.icone}
        actions={(
          <Button loading={exportando} leftIcon={<FileDown className="w-4 h-4" aria-hidden="true" />} onClick={exportar}>
            Exportar PDF
          </Button>
        )}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-primary/70">
        <Badge variant={st.variant}>{st.label}</Badge>
        {periodo && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarRange className="w-4 h-4" aria-hidden="true" /> Extrato de {periodo}
          </span>
        )}
        {rel.dataConciliacao && <span>{rel.status === 'FINALIZADA' ? 'Concluída em' : 'Em'} {formatDate(String(rel.dataConciliacao).split('T')[0])}</span>}
      </div>
      {rel.observacao && <p className="text-sm text-text-primary/80">{rel.observacao}</p>}

      <KpiGrid cols={4}>
        <KpiCard label="Movimentos no extrato" valor={rel.totalTransacoes ?? 0} formato="numero" icon={ListOrdered} />
        <KpiCard label={rotuloBaixa} valor={rel.totalConciliados ?? 0} formato="numero" tom="income" icon={CircleCheckBig} destaque
          ajuda={cfg.id === 'cartao' ? 'Lançamentos do cartão confirmados pelo extrato.' : 'Contas baixadas na conta bancária ao finalizar.'} />
        <KpiCard label="Vinculados à mão" valor={rel.totalManuais ?? 0} formato="numero" tom="primary" icon={Link2}
          ajuda="Itens que você vinculou ou criou durante a revisão." />
        <KpiCard label="Ignorados ou sem correspondência" valor={(rel.totalIgnorados ?? 0) + (rel.totalNaoIdentificados ?? 0)} formato="numero" icon={EyeOff}
          ajuda={`${rel.totalIgnorados ?? 0} ignorados e ${rel.totalNaoIdentificados ?? 0} sem correspondência.`} />
      </KpiGrid>

      <DataTable
        caption={`Movimentos da conciliação nº ${rel.id}`}
        columns={colunas(cfg)}
        data={rel.itens ?? []}
        keyExtractor={(row) => row.id}
        emptyState={<p className="py-8 text-center text-sm text-text-primary/65"><CircleHelp className="inline w-4 h-4 mr-1" aria-hidden="true" />Nenhum movimento neste extrato.</p>}
      />
    </div>
  );
}
