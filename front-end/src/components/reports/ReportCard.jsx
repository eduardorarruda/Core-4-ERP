import React, { useId, useMemo, useRef, useState } from 'react';
import { useInView } from 'motion/react';
import { Eye, FileDown, FileSpreadsheet, Info } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import ReportFilters from './ReportFilters';
import ReportModal from './ReportModal';
import ReportPreview from './ReportPreview';
import { useCarga } from '../../hooks/useCarga';
import { useToast } from '../../hooks/useToast';

/**
 * Cartão de um relatório. O período vem da página (um seletor só para todos); o cartão tem
 * só os filtros próprios, a prévia e as ações: Ver (online) · PDF · Excel (este só com permissão
 * de exportar). Relatórios com `semPeriodo` ignoram o período e avisam isso.
 *
 * A prévia só carrega quando o cartão aparece na tela (8 relatórios não disparam 8 consultas de uma vez).
 */
function baixarArquivo(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ReportCard({
  title, description, icon, periodo, semPeriodo = false,
  onGetData, onDownloadXlsx, filterConfig = [], canExport = false,
}) {
  const toast = useToast();
  const idBase = `rel${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const ref = useRef(null);
  const visto = useInView(ref, { once: true, margin: '120px' });
  const [filtros, setFiltros] = useState(() => Object.fromEntries(filterConfig.filter((f) => f.padrao).map((f) => [f.key, f.padrao])));
  const [ocupado, setOcupado] = useState(null);
  const [modalDados, setModalDados] = useState(null);

  const params = useMemo(
    () => Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== '' && v !== null)),
    [filtros],
  );
  const inicio = semPeriodo ? '' : periodo.inicio;
  const fim = semPeriodo ? '' : periodo.fim;

  const previa = useCarga(() => onGetData(inicio, fim, params), [title, inicio, fim, params], { ativo: visto });

  const mudarFiltro = (chave, valor) => setFiltros((f) => ({ ...f, [chave]: valor }));

  async function executar(acao) {
    setOcupado(acao);
    try {
      if (acao === 'ver') {
        setModalDados(previa.dados && !previa.carregando ? previa.dados : await onGetData(inicio, fim, params));
      } else if (acao === 'pdf') {
        const dados = previa.dados && !previa.carregando ? previa.dados : await onGetData(inicio, fim, params);
        const { gerarPDF } = await import('../../lib/pdfUtils');
        gerarPDF(title, semPeriodo ? null : periodo, dados);
        toast.success('PDF gerado.');
      } else {
        const blob = await onDownloadXlsx(inicio, fim, params);
        baixarArquivo(blob, `${title.replace(/\s+/g, '_')}${semPeriodo ? '' : `_${inicio}_${fim}`}.xlsx`);
        toast.success('Planilha do Excel gerada.');
      }
    } catch (e) {
      toast.error(e.message || 'Não deu para gerar o relatório. Tente de novo.');
    } finally {
      setOcupado(null);
    }
  }

  return (
    <>
      <Card as="article" icon={icon} title={title} subtitle={description} className="h-full">
        <div ref={ref} className="flex flex-col gap-4 h-full">
          {semPeriodo && (
            <p className="flex items-start gap-2 text-xs text-info">
              <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
              Não depende do período: mostra a situação de hoje.
            </p>
          )}
          <ReportPreview dados={previa.dados} titulo={title} carregando={!visto || previa.carregando} erro={previa.erro} />
          <ReportFilters config={filterConfig} values={filtros} onChange={mudarFiltro} idBase={idBase} />
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            <Button onClick={() => executar('ver')} loading={ocupado === 'ver'} disabled={Boolean(ocupado)} leftIcon={<Eye className="w-4 h-4" aria-hidden="true" />} aria-label={`Ver ${title}`}>
              Ver
            </Button>
            <Button variant="secondary" onClick={() => executar('pdf')} loading={ocupado === 'pdf'} disabled={Boolean(ocupado)} leftIcon={<FileDown className="w-4 h-4" aria-hidden="true" />} aria-label={`Baixar ${title} em PDF`}>
              PDF
            </Button>
            {canExport && (
              <Button variant="secondary" onClick={() => executar('xlsx')} loading={ocupado === 'xlsx'} disabled={Boolean(ocupado)} leftIcon={<FileSpreadsheet className="w-4 h-4" aria-hidden="true" />} aria-label={`Baixar ${title} em Excel`}>
                Excel
              </Button>
            )}
          </div>
        </div>
      </Card>

      <ReportModal
        open={!!modalDados}
        titulo={title}
        periodo={semPeriodo ? null : periodo}
        dados={modalDados}
        onClose={() => setModalDados(null)}
      />
    </>
  );
}
