import AnimatedKPI from './AnimatedKPI';
import { brl } from '../../lib/formatters';

// Mapa explícito: o JIT do Tailwind 4 não gera classes a partir de string
// interpolada (`text-${cor}`), então listamos as classes estáticas usadas.
const COR_VALOR = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  error: 'text-error',
};

export default function KpiCards({ kpis, carregando }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, i) => (
        <div
          key={kpi.label}
          className="anim-in d1 rounded-[18px] p-5 flex flex-col gap-3 relative overflow-hidden bg-surface-low border border-text-primary/10 shadow-lg"
          style={{ animationDelay: `${(i + 1) * 60}ms` }}
        >
          <div className="absolute -right-3 -top-3 opacity-[0.06]" aria-hidden>
            <kpi.icon className="w-20 h-20" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-text-primary/50 font-mono truncate">
              {kpi.label}
            </span>
            <span
              className={`shrink-0 text-xs font-bold font-mono tracking-wide px-2 py-0.5 rounded ${
                kpi.chipOk ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error'
              }`}
            >
              {carregando ? '···' : kpi.chip}
            </span>
          </div>
          <p
            title={`R$ ${brl(kpi.value)}`}
            className={`text-xl sm:text-2xl font-bold font-display leading-none truncate ${COR_VALOR[kpi.color] ?? 'text-text-primary'}`}
          >
            {carregando ? (
              <span className="inline-block w-32 h-7 rounded-lg bg-surface-highest animate-pulse" />
            ) : (
              <AnimatedKPI to={kpi.value} />
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
