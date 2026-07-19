import React, { useState, useEffect, useRef, useMemo } from 'react';

function AnimatedNumber({ to, prefix = '', decimals = 0, duration = 1800 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf, start;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(eased * to);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <span>{prefix}{v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
}

function Sparkline({ data }) {
  const w = 100, h = 36;
  const min = Math.min(...data), max = Math.max(...data);
  const norm = (val) => h - 4 - ((val - min) / (max - min || 1)) * (h - 8);
  const pts = data.map((d, i) => [i * (w / (data.length - 1)), norm(d)]);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 36, marginTop: 8 }}>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity=".4" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sg)" />
      <path d={line} fill="none" stroke="var(--color-primary)" strokeWidth="1.5" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill="var(--color-primary)" />
    </svg>
  );
}

function CashflowChart({ entradas, saidas }) {
  const w = 560, h = 80, pad = 6;
  const all = [...entradas, ...saidas];
  const max = Math.max(...all) * 1.1;
  const xs = (i, n) => pad + (i / (n - 1)) * (w - pad * 2);
  const ys = (val) => h - pad - (val / max) * (h - pad * 2);
  const buildPath = (arr) => arr.map((val, i) => {
    const x = xs(i, arr.length), y = ys(val);
    if (i === 0) return `M${x},${y}`;
    const px = xs(i - 1, arr.length), py = ys(arr[i - 1]);
    const cx = px + (x - px) / 2;
    return `C${cx},${py} ${cx},${y} ${x},${y}`;
  }).join(' ');
  const pE = buildPath(entradas);
  const aE = `${pE} L${w - pad},${h - pad} L${pad},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 80 }}>
      <defs>
        <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity=".3" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
        <pattern id="gp" width="60" height="30" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 30" fill="none" stroke="color-mix(in srgb, var(--color-text-primary) 4%, transparent)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={w} height={h} fill="url(#gp)" />
      <path d={aE} fill="url(#eg)" />
      <path d={pE} fill="none" stroke="var(--color-primary)" strokeWidth="1.6" strokeLinejoin="round" />
      <path d={buildPath(saidas)} fill="none" stroke="var(--color-secondary)" strokeWidth="1.4" strokeDasharray="3 3" opacity=".7" />
    </svg>
  );
}

export function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-10 h-10 rounded-[10px] grid place-items-center overflow-hidden shrink-0 bg-primary/10 border border-primary/20">
        <div
          className="absolute inset-0 opacity-80"
          style={{ background: 'radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--color-primary) 40%, transparent), transparent 60%)' }}
        />
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none" className="relative z-[1]">
          <rect x="1" y="1" width="9" height="9" rx="2" fill="var(--color-primary)" />
          <rect x="12" y="1" width="9" height="9" rx="2" stroke="var(--color-primary)" strokeWidth="1.6" />
          <rect x="1" y="12" width="9" height="9" rx="2" stroke="var(--color-primary)" strokeWidth="1.6" />
          <rect x="12" y="12" width="9" height="9" rx="2" fill="var(--color-primary)" opacity=".4" />
        </svg>
      </div>
      <div>
        <div className="font-display font-bold tracking-tight text-base text-text-primary">
          Core <span className="text-primary">4</span> ERP
        </div>
        <div className="font-mono text-[9px] text-text-primary/30 tracking-widest uppercase">
          Enterprise Finance
        </div>
      </div>
    </div>
  );
}

export default function HeroPane() {
  const cardRef = useRef(null);
  const [now, setNow] = useState(new Date());
  const [spark, setSpark] = useState([8, 12, 9, 15, 14, 18, 22, 20, 26, 28, 32, 30, 38]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setSpark(s => [...s.slice(1), Math.max(4, s[s.length - 1] + (Math.random() - 0.4) * 8)]);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const rx = (0.5 - y) * 6;
      const ry = (x - 0.5) * 8;
      el.style.transform = `perspective(1400px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    };
    const onLeave = () => { el.style.transform = ''; };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); };
  }, []);

  const entradas = useMemo(() => [12, 18, 14, 22, 19, 28, 24, 32, 30, 38, 36, 44], []);
  const saidas = useMemo(() => [10, 14, 12, 16, 17, 22, 20, 24, 23, 28, 26, 32], []);

  const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();

  const [tickerItems, setTickerItems] = useState([
    ['USD/BRL', '…', 'up', ''], ['SELIC', '…', 'neutral', ''],
    ['CDI', '…', 'neutral', ''], ['BTC/BRL', '…', 'up', ''],
    ['IPCA', '…', 'neutral', ''], ['EUR/BRL', '…', 'up', ''],
  ]);

  // Cotações reais (AwesomeAPI/BCB). Só faz polling quando a pane está de fato
  // visível (lg+). No mobile ela é renderizada mas oculta via `hidden lg:flex`,
  // então evitamos requisições de rede desnecessárias enquanto estiver oculta.
  useEffect(() => {
    const fmt = (n, dec = 2) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    const dir = (pct) => parseFloat(pct) >= 0 ? 'up' : 'down';
    const sign = (pct) => { const v = parseFloat(pct); return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`; };

    async function fetchAll() {
      const next = (prev) => [...prev];

      try {
        const awRes = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL');
        const aw = await awRes.json();
        setTickerItems((prev) => {
          const t = next(prev);
          if (aw.USDBRL) { const pct = aw.USDBRL.pctChange; t[0] = ['USD/BRL', fmt(aw.USDBRL.bid, 4), dir(pct), sign(pct)]; }
          if (aw.EURBRL) { const pct = aw.EURBRL.pctChange; t[5] = ['EUR/BRL', fmt(aw.EURBRL.bid, 4), dir(pct), sign(pct)]; }
          if (aw.BTCBRL) { const pct = aw.BTCBRL.pctChange; const k = (Number(aw.BTCBRL.bid) / 1000).toFixed(1); t[3] = ['BTC/BRL', `R$${k}k`, dir(pct), sign(pct)]; }
          return t;
        });
      } catch (_) {}

      try {
        const r = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json');
        const [d] = await r.json();
        if (d) setTickerItems((prev) => { const t = next(prev); t[1] = ['SELIC', `${fmt(d.valor, 2)}% a.a.`, 'neutral', '']; return t; });
      } catch (_) {}

      try {
        const r = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json');
        const [d] = await r.json();
        if (d) setTickerItems((prev) => { const t = next(prev); t[2] = ['CDI', `${fmt(d.valor, 2)}% a.a.`, 'neutral', '']; return t; });
      } catch (_) {}

      try {
        const r = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/1?formato=json');
        const [d] = await r.json();
        if (d) {
          const v = parseFloat(d.valor);
          setTickerItems((prev) => { const t = next(prev); t[4] = ['IPCA', `${fmt(v, 2)}% a.m.`, v >= 0 ? 'up' : 'down', '']; return t; });
        }
      } catch (_) {}
    }

    const mq = window.matchMedia('(min-width: 1024px)');
    let intervalId = null;
    const start = () => {
      if (intervalId) return;
      fetchAll();
      intervalId = setInterval(fetchAll, 30_000);
    };
    const stop = () => { if (intervalId) { clearInterval(intervalId); intervalId = null; } };
    const onChange = (e) => { e.matches ? start() : stop(); };

    if (mq.matches) start();
    mq.addEventListener('change', onChange);
    return () => { stop(); mq.removeEventListener('change', onChange); };
  }, []);

  const allTicker = [...tickerItems, ...tickerItems];

  return (
    <aside className="flex-1 min-w-0 flex items-center justify-center overflow-hidden pl-3 pr-5 py-4">
      <div
        ref={cardRef}
        className="w-full max-w-[480px] rounded-3xl pt-[18px] px-5 pb-3.5 box-border backdrop-blur-md border border-text-primary/10 will-change-transform [transition:transform_.05s_linear]"
        style={{
          background: 'linear-gradient(160deg, color-mix(in srgb, var(--color-text-primary) 4%, transparent) 0%, color-mix(in srgb, var(--color-text-primary) 1.5%, transparent) 100%)',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        <div className="anim-in flex items-center gap-2 mb-2">
          <span className="live-dot" />
          <span className="font-mono text-[10px] tracking-widest text-text-primary/50 uppercase">
            CORE 4 · INTELLIGENCE LAYER
          </span>
        </div>

        <div className="anim-in d1 font-mono text-[11px] text-text-primary/35 tracking-wider mb-2.5">
          {date} · {time}
        </div>

        <h2 className="anim-in d2 font-display text-[22px] font-bold tracking-tight leading-tight text-text-primary mb-1.5">
          A arquiteta da sua<br /><em className="text-primary italic">liberdade financeira.</em>
        </h2>

        <p className="anim-in d3 text-xs text-text-primary/50 leading-relaxed mb-3 max-w-[380px]">
          Conciliação automática, fluxo de caixa em tempo real e relatórios que falam. Tudo em um único lugar.
        </p>

        <div className="anim-in d4 grid grid-cols-2 gap-2 mb-2.5">
          <div className="bg-text-primary/[.025] border border-text-primary/[.08] rounded-2xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[9px] text-text-primary/40 font-mono tracking-wider uppercase">Receita do mês</span>
              <span className="text-[9px] font-semibold px-1.5 py-px rounded bg-primary/[.12] text-primary font-mono">▲ 24.8%</span>
            </div>
            <div className="font-display text-lg font-bold tracking-tight text-text-primary mb-0.5">
              <AnimatedNumber prefix="R$ " to={482931} duration={1800} />
            </div>
            <div className="text-[10px] text-text-primary/40">Meta atingida em 14 dias</div>
          </div>
          <div className="bg-text-primary/[.025] border border-text-primary/[.08] rounded-2xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[9px] text-text-primary/40 font-mono tracking-wider uppercase">Saldo consolidado</span>
              <span className="text-[9px] font-semibold px-1.5 py-px rounded bg-primary/[.12] text-primary font-mono">▲ 8.2%</span>
            </div>
            <div className="font-display text-[17px] font-bold tracking-tight text-text-primary mb-0.5">
              <AnimatedNumber prefix="R$ " to={1284055} duration={2000} />
            </div>
            <Sparkline data={spark} />
          </div>
        </div>

        <div className="anim-in d5 bg-text-primary/[.02] border border-text-primary/[.06] rounded-2xl px-3 py-2.5 mb-2">
          <div className="flex justify-between items-center mb-1.5">
            <div>
              <div className="text-xs font-semibold text-text-primary/70">Fluxo de caixa · últimos 12 meses</div>
              <div className="text-[10px] text-text-primary/30 mt-0.5 font-mono">Atualizado há 3 minutos</div>
            </div>
            <div className="flex gap-3 text-[10px] text-text-primary/50 font-mono">
              <span><span className="inline-block w-2 h-2 rounded-full bg-primary mr-1" />Entradas</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-secondary mr-1" />Saídas</span>
            </div>
          </div>
          <CashflowChart entradas={entradas} saidas={saidas} />
        </div>

        <div
          className="anim-in d6 rounded-[10px] border border-text-primary/[.08] overflow-hidden h-8 flex items-center mb-2.5"
          style={{ background: 'color-mix(in srgb, var(--color-surface) 25%, transparent)' }}
        >
          <div className="shrink-0 px-2.5 font-mono text-[9px] tracking-widest uppercase text-primary border-r border-text-primary/[.08] h-full flex items-center gap-1.5 bg-primary/[.04]">
            <span className="live-dot" style={{ width: 4, height: 4 }} />
            LIVE
          </div>
          <div className="flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_4%,#000_96%,transparent)]">
            <div className="ticker-scroll flex gap-6 items-center h-8 whitespace-nowrap font-mono text-[10px] pl-4">
              {allTicker.map(([sym, val, dir, pct], i) => (
                <span key={i} className="text-text-primary/55">
                  <b className="text-text-primary/80">{sym}</b> {val}{' '}
                  <span className={dir === 'up' ? 'text-primary' : 'text-error'}>
                    {dir === 'up' ? '▲' : '▼'} {pct}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-end gap-3 text-[10px] text-text-primary/35 font-mono">
            <span className="text-primary">🛡️</span> SOC 2
            <span className="text-primary">🔒</span> LGPD
            <span className="text-primary">⏱️</span> 99.98%
          </div>
          <p className="text-[9px] text-text-primary/20 font-mono tracking-wide text-right leading-normal">
            * Valores e métricas exibidos são ilustrativos e não representam dados reais.
          </p>
        </div>
      </div>
    </aside>
  );
}
