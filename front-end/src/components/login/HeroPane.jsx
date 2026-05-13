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
          <stop offset="0%" stopColor="#6EFFC0" stopOpacity=".4" />
          <stop offset="100%" stopColor="#6EFFC0" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sg)" />
      <path d={line} fill="none" stroke="#6EFFC0" strokeWidth="1.5" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill="#6EFFC0" />
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
          <stop offset="0%" stopColor="#6EFFC0" stopOpacity=".3" />
          <stop offset="100%" stopColor="#6EFFC0" stopOpacity="0" />
        </linearGradient>
        <pattern id="gp" width="60" height="30" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 30" fill="none" stroke="rgba(250,250,250,.04)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={w} height={h} fill="url(#gp)" />
      <path d={aE} fill="url(#eg)" />
      <path d={pE} fill="none" stroke="#6EFFC0" strokeWidth="1.6" strokeLinejoin="round" />
      <path d={buildPath(saidas)} fill="none" stroke="#ACC7FF" strokeWidth="1.4" strokeDasharray="3 3" opacity=".7" />
    </svg>
  );
}

function BrandMark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,rgba(110,255,192,.16),rgba(110,255,192,.04))', border: '1px solid rgba(110,255,192,.22)', display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 20%,rgba(110,255,192,.4),transparent 60%)', opacity: .8 }} />
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none" style={{ position: 'relative', zIndex: 1 }}>
          <rect x="1" y="1" width="9" height="9" rx="2" fill="#6EFFC0" />
          <rect x="12" y="1" width="9" height="9" rx="2" stroke="#6EFFC0" strokeWidth="1.6" />
          <rect x="1" y="12" width="9" height="9" rx="2" stroke="#6EFFC0" strokeWidth="1.6" />
          <rect x="12" y="12" width="9" height="9" rx="2" fill="#6EFFC0" opacity=".4" />
        </svg>
      </div>
      <div>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, letterSpacing: '-0.02em', fontSize: 16, color: '#fafafa' }}>
          Core <span style={{ color: '#6EFFC0' }}>4</span> ERP
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(250,250,250,.3)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
          Enterprise Finance
        </div>
      </div>
    </div>
  );
}

export { BrandMark };

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

    fetchAll();
    const id = setInterval(fetchAll, 30_000);
    return () => clearInterval(id);
  }, []);

  const allTicker = [...tickerItems, ...tickerItems];

  const cardStyle = {
    width: '100%',
    maxWidth: 480,
    background: 'linear-gradient(160deg, rgba(255,255,255,.04) 0%, rgba(255,255,255,.015) 100%)',
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 24,
    padding: '18px 20px 14px',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 40px 80px -40px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.06)',
    transition: 'transform .05s linear',
    willChange: 'transform',
    boxSizing: 'border-box',
  };

  return (
    <aside style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 20px 16px 12px', overflow: 'hidden' }}>
      <div ref={cardRef} style={cardStyle}>
        <div className="anim-in" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span className="live-dot" />
          <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '.14em', color: 'rgba(250,250,250,.5)', textTransform: 'uppercase' }}>
            CORE 4 · INTELLIGENCE LAYER
          </span>
        </div>

        <div className="anim-in d1" style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(250,250,250,.35)', letterSpacing: '.08em', marginBottom: 10 }}>
          {date} · {time}
        </div>

        <h2 className="anim-in d2" style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.2, color: '#fafafa', marginBottom: 6 }}>
          A arquiteta da sua<br /><em style={{ color: '#6EFFC0', fontStyle: 'italic' }}>liberdade financeira.</em>
        </h2>

        <p className="anim-in d3" style={{ fontSize: 12, color: 'rgba(250,250,250,.5)', lineHeight: 1.6, marginBottom: 12, maxWidth: 380 }}>
          Conciliação automática, fluxo de caixa em tempo real e relatórios que falam. Tudo em um único lugar.
        </p>

        <div className="anim-in d4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(250,250,250,.08)', borderRadius: 14, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 9, color: 'rgba(250,250,250,.4)', fontFamily: 'monospace', letterSpacing: '.1em', textTransform: 'uppercase' }}>Receita do mês</span>
              <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 4, background: 'rgba(110,255,192,.12)', color: '#6EFFC0', fontFamily: 'monospace' }}>▲ 24.8%</span>
            </div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: '-0.025em', color: '#fafafa', marginBottom: 2 }}>
              <AnimatedNumber prefix="R$ " to={482931} duration={1800} />
            </div>
            <div style={{ fontSize: 10, color: 'rgba(250,250,250,.4)' }}>Meta atingida em 14 dias</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(250,250,250,.08)', borderRadius: 14, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 9, color: 'rgba(250,250,250,.4)', fontFamily: 'monospace', letterSpacing: '.1em', textTransform: 'uppercase' }}>Saldo consolidado</span>
              <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 4, background: 'rgba(110,255,192,.12)', color: '#6EFFC0', fontFamily: 'monospace' }}>▲ 8.2%</span>
            </div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 700, letterSpacing: '-0.025em', color: '#fafafa', marginBottom: 2 }}>
              <AnimatedNumber prefix="R$ " to={1284055} duration={2000} />
            </div>
            <Sparkline data={spark} />
          </div>
        </div>

        <div className="anim-in d5" style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(250,250,250,.06)', borderRadius: 14, padding: '10px 12px', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(250,250,250,.7)' }}>Fluxo de caixa · últimos 12 meses</div>
              <div style={{ fontSize: 10, color: 'rgba(250,250,250,.3)', marginTop: 2, fontFamily: 'monospace' }}>Atualizado há 3 minutos</div>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'rgba(250,250,250,.5)', fontFamily: 'monospace' }}>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#6EFFC0', marginRight: 4 }} />Entradas</span>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#ACC7FF', marginRight: 4 }} />Saídas</span>
            </div>
          </div>
          <CashflowChart entradas={entradas} saidas={saidas} />
        </div>

        <div className="anim-in d6" style={{ borderRadius: 10, background: 'rgba(0,0,0,.25)', border: '1px solid rgba(250,250,250,.08)', overflow: 'hidden', height: 32, display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ flexShrink: 0, padding: '0 10px', fontFamily: 'monospace', fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6EFFC0', borderRight: '1px solid rgba(250,250,250,.08)', height: '100%', display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(110,255,192,.04)' }}>
            <span className="live-dot" style={{ width: 4, height: 4 }} />
            LIVE
          </div>
          <div style={{ flex: 1, overflow: 'hidden', WebkitMaskImage: 'linear-gradient(to right,transparent,#000 4%,#000 96%,transparent)' }}>
            <div className="ticker-scroll" style={{ display: 'flex', gap: 24, alignItems: 'center', height: 32, whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 10, paddingLeft: 16 }}>
              {allTicker.map(([sym, val, dir, pct], i) => (
                <span key={i} style={{ color: 'rgba(250,250,250,.55)' }}>
                  <b style={{ color: 'rgba(250,250,250,.8)' }}>{sym}</b> {val}{' '}
                  <span style={{ color: dir === 'up' ? '#6EFFC0' : '#FFB4AB' }}>
                    {dir === 'up' ? '▲' : '▼'} {pct}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, fontSize: 10, color: 'rgba(250,250,250,.35)', fontFamily: 'monospace' }}>
            <span style={{ color: '#6EFFC0' }}>🛡️</span> SOC 2
            <span style={{ color: '#6EFFC0' }}>🔒</span> LGPD
            <span style={{ color: '#6EFFC0' }}>⏱️</span> 99.98%
          </div>
          <p style={{ fontSize: 9, color: 'rgba(250,250,250,.2)', fontFamily: 'monospace', letterSpacing: '.06em', textAlign: 'right', lineHeight: 1.5 }}>
            * Valores e métricas exibidos são ilustrativos e não representam dados reais.
          </p>
        </div>
      </div>
    </aside>
  );
}
