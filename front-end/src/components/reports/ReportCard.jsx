import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { gerarPDF } from '../../lib/pdfUtils';
import BentoCard from '../ui/BentoCard';
import PeriodoFilter from './PeriodoFilter';
import FormatButtons from './FormatButtons';
import ReportModal from './ReportModal';
import ReportFilters from './ReportFilters';

export default function ReportCard({
  title, description, icon: Icon,
  onGetData, onDownloadXlsx, onError,
  filterConfig = [],
}) {
  const [loading, setLoading] = useState({ online: false, pdf: false, xlsx: false });
  const [periodo, setPeriodo] = useState({
    inicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    fim: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [filterValues, setFilterValues] = useState({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  function setLoadingKey(key, value) {
    setLoading(prev => ({ ...prev, [key]: value }));
  }

  function handleFilterChange(key, value) {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  }

  function activeParams() {
    return Object.fromEntries(
      Object.entries(filterValues).filter(([, v]) => v !== undefined && v !== '' && v !== null)
    );
  }

  async function handleSelect(fmt) {
    const params = activeParams();

    if (fmt === 'online') {
      setLoadingKey('online', true);
      try {
        const dados = await onGetData(periodo.inicio, periodo.fim, params);
        setModalData(dados);
      } catch (e) {
        onError(e.message || 'Erro ao carregar relatório');
      } finally {
        setLoadingKey('online', false);
      }
    }

    if (fmt === 'pdf') {
      setLoadingKey('pdf', true);
      try {
        const dados = await onGetData(periodo.inicio, periodo.fim, params);
        gerarPDF(title, periodo, dados);
      } catch (e) {
        onError(e.message || 'Erro ao gerar PDF');
      } finally {
        setLoadingKey('pdf', false);
      }
    }

    if (fmt === 'xlsx') {
      setLoadingKey('xlsx', true);
      try {
        const blob = await onDownloadXlsx(periodo.inicio, periodo.fim, params);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/ /g, '_')}_${periodo.inicio}_${periodo.fim}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        onError(e.message || 'Erro ao gerar Excel');
      } finally {
        setLoadingKey('xlsx', false);
      }
    }
  }

  return (
    <>
      <BentoCard>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">{title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>
            </div>
          </div>

          <PeriodoFilter
            inicio={periodo.inicio}
            fim={periodo.fim}
            onChange={(field, val) => setPeriodo(p => ({ ...p, [field]: val }))}
          />

          <ReportFilters
            config={filterConfig}
            values={filterValues}
            onChange={handleFilterChange}
            open={filtersOpen}
            onToggle={() => setFiltersOpen(v => !v)}
          />

          <FormatButtons loading={loading} onSelect={handleSelect} />
        </div>
      </BentoCard>

      {modalData && (
        <ReportModal
          titulo={title}
          periodo={periodo}
          dados={modalData}
          onClose={() => setModalData(null)}
        />
      )}
    </>
  );
}
