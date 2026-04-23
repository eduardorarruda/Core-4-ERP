import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import BentoCard from '../ui/BentoCard';
import PeriodoFilter from './PeriodoFilter';
import DownloadButton from './DownloadButton';

export default function ReportCard({ title, description, icon: Icon, onGenerate, onError }) {
  const [loading, setLoading] = useState(false);
  const [periodo, setPeriodo] = useState({
    inicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    fim: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  function handlePeriodoChange(field, value) {
    setPeriodo(p => ({ ...p, [field]: value }));
  }

  async function handleDownload() {
    setLoading(true);
    try {
      const blob = await onGenerate(periodo.inicio, periodo.fim);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/ /g, '_')}_${periodo.inicio}_${periodo.fim}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      onError(e.message || 'Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  }

  return (
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
          onChange={handlePeriodoChange}
        />

        <DownloadButton loading={loading} onClick={handleDownload} />
      </div>
    </BentoCard>
  );
}
