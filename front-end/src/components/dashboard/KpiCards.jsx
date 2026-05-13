import AnimatedKPI from './AnimatedKPI';

export default function KpiCards({ kpis, carregando }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, i) => (
        <div
          key={kpi.label}
          className={`anim-in d${i + 1} rounded-[18px] p-5 flex flex-col gap-3 relative overflow-hidden`}
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(250,250,250,0.08)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 1px 3px rgba(0,0,0,.3), 0 8px 32px rgba(0,0,0,.2)',
          }}
        >
          <div className="absolute -right-3 -top-3 opacity-[0.06]" aria-hidden>
            <kpi.icon className="w-20 h-20" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary/50 font-mono">
              {kpi.label}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700,
              padding: '2px 7px', borderRadius: 4,
              background: kpi.chipOk ? 'rgba(110,255,192,.12)' : 'rgba(255,180,171,.12)',
              color: kpi.chipOk ? '#6EFFC0' : '#FFB4AB',
              fontFamily: 'monospace', letterSpacing: '.05em',
            }}>
              {carregando ? '···' : kpi.chip}
            </span>
          </div>
          <p className={`text-2xl font-bold font-display text-${kpi.color} leading-none`}>
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
