import React from 'react';
import { AlertOctagon, CheckCircle2, Gauge } from 'lucide-react';
import Badge from '../ui/Badge';
import { ProgressBar } from '../ui/Progress';
import { formatarMoeda } from '../../lib/formatters';
import { cn } from '../../lib/utils';

/**
 * Peças do orçamento usadas no Início e na tela Orçamentos.
 * - <StatusOrcamento status="OK|ATENCAO|ESTOURADO" /> — selo com ícone + texto (nunca só cor)
 * - <BarraOrcamento item={OrcamentoItemResponseDto} /> — barra com mola, listras ao estourar e o
 *   risquinho do ritmo ("onde o gasto deveria estar hoje"), mais a frase "Restam R$ X" /
 *   "R$ X acima do limite".
 */
const STATUS = {
  OK: { rotulo: 'No ritmo', variante: 'success', icone: CheckCircle2, tom: 'primary' },
  ATENCAO: { rotulo: 'Acima do ritmo', variante: 'warning', icone: Gauge, tom: 'warning' },
  ESTOURADO: { rotulo: 'Estourou', variante: 'error', icone: AlertOctagon, tom: 'expense' },
};

function infoStatus(status) {
  return STATUS[status] ?? STATUS.OK;
}

export function StatusOrcamento({ status }) {
  const s = infoStatus(status);
  const Icone = s.icone;
  return (
    <Badge variant={s.variante} size="sm" className="shrink-0 gap-1">
      <Icone className="w-3.5 h-3.5" aria-hidden="true" />
      {s.rotulo}
    </Badge>
  );
}

export default function BarraOrcamento({ item, detalhado = false }) {
  const limite = Number(item.limite ?? 0);
  const gasto = Number(item.gasto ?? 0);
  const restante = Number(item.restante ?? limite - gasto);
  const ritmo = Number(item.ritmo ?? 0);
  const fracao = limite > 0 ? gasto / limite : 0;
  const s = infoStatus(item.status);
  const marca = ritmo > 0 && ritmo < 100 ? ritmo / 100 : undefined;

  return (
    <div className="space-y-1.5">
      <ProgressBar
        valor={fracao}
        tom={s.tom}
        marca={marca}
        label={`${item.categoria?.descricao ?? 'Categoria'}: ${Math.round(fracao * 100)}% do limite usado`}
        mostrarValor
      />
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs">
        <span className="text-text-primary/70 tabular-nums">
          <span className="valor-privado">{formatarMoeda(gasto)}</span> de <span className="valor-privado">{formatarMoeda(limite)}</span>
        </span>
        <span className={cn('font-medium tabular-nums', restante < 0 ? 'text-expense' : 'text-text-primary/80')}>
          {restante < 0
            ? <><span className="valor-privado">{formatarMoeda(-restante)}</span> acima do limite</>
            : <>Restam <span className="valor-privado">{formatarMoeda(restante)}</span></>}
        </span>
      </div>
      {detalhado && marca != null && (
        <p className="text-xs text-text-primary/60 tabular-nums">
          Esperado até hoje: <span className="valor-privado">{formatarMoeda(item.valorEsperadoAteHoje)}</span>
          {Number(item.projecao) > limite && gasto <= limite && (
            <> · nesse ritmo, fecha em <strong className="text-warning valor-privado">{formatarMoeda(item.projecao)}</strong></>
          )}
        </p>
      )}
    </div>
  );
}
