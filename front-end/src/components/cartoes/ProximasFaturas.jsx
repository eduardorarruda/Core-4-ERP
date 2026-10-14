import React from 'react';
import { AlertTriangle, CalendarClock, Clock } from 'lucide-react';
import { formatarMoeda, formatDate } from '../../lib/formatters';
import { cn } from '../../lib/utils';

/*
 * Próximas faturas em linha do tempo vertical (mais próxima primeiro).
 * Urgência com texto + ícone: ≤ 3 dias "vence em breve", ≤ 7 dias atenção.
 * Props: itens (ProximaFaturaDto[] do BI), alertas (AlertaFechamentoDto[]).
 */

function urgencia(dias) {
  if (dias <= 3) return { icon: AlertTriangle, classe: 'text-expense', ponto: 'bg-expense', texto: dias === 0 ? 'vence hoje' : `vence em ${dias} dia${dias === 1 ? '' : 's'}` };
  if (dias <= 7) return { icon: Clock, classe: 'text-warning', ponto: 'bg-warning', texto: `vence em ${dias} dias` };
  return { icon: CalendarClock, classe: 'text-text-primary/60', ponto: 'bg-primary', texto: `vence em ${dias} dias` };
}

export default function ProximasFaturas({ itens = [], alertas = [] }) {
  const ordenadas = [...itens].sort((a, b) => a.diasRestantes - b.diasRestantes);
  if (!ordenadas.length) {
    return <p className="text-sm text-text-primary/65">Nenhuma fatura a vencer.</p>;
  }
  return (
    <ol className="relative space-y-5 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-border-strong" aria-label="Próximas faturas">
      {ordenadas.map((f) => {
        const u = urgencia(f.diasRestantes);
        const Icone = u.icon;
        const fecha = alertas.find((a) => a.nomeCartao === f.nomeCartao);
        return (
          <li key={`${f.nomeCartao}-${f.dataVencimento}`} className="relative pl-6">
            <span aria-hidden="true" className={cn('absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full ring-4 ring-surface-low', u.ponto)} />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-text-primary leading-snug">{f.nomeCartao}</p>
                <p className={cn('flex items-center gap-1.5 text-xs', u.classe)}>
                  <Icone className="w-3.5 h-3.5" aria-hidden="true" />
                  {formatDate(f.dataVencimento)} · {u.texto}
                </p>
                {fecha && (
                  <p className="mt-1 text-xs text-warning">
                    Fecha {fecha.diasRestantes === 0 ? 'hoje' : `em ${fecha.diasRestantes} dia${fecha.diasRestantes === 1 ? '' : 's'}`}
                  </p>
                )}
              </div>
              <p className="tabular-nums font-semibold text-text-primary valor-privado shrink-0">{formatarMoeda(f.valorAcumulado)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
