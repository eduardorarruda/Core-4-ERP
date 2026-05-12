import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { auth } from '../lib/api';
import { FloatingInput, FloatingPasswordInput } from '../components/ui/FormField';

/* ── Helpers ── */
function greetingFor(h) {
  if (h < 5) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/* ── AnimatedNumber ── */
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

/* ── Sparkline ── */
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

/* ── CashflowChart ── */
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

/* ── BrandMark ── */
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

/* ── HeroPane ── */
function HeroPane() {
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
        // ── Câmbio + BTC (AwesomeAPI — pública, sem chave) ──────────────────
        const awRes = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL');
        const aw = await awRes.json();

        setTickerItems((prev) => {
          const t = next(prev);
          if (aw.USDBRL) {
            const pct = aw.USDBRL.pctChange;
            t[0] = ['USD/BRL', fmt(aw.USDBRL.bid, 4), dir(pct), sign(pct)];
          }
          if (aw.EURBRL) {
            const pct = aw.EURBRL.pctChange;
            t[5] = ['EUR/BRL', fmt(aw.EURBRL.bid, 4), dir(pct), sign(pct)];
          }
          if (aw.BTCBRL) {
            const pct = aw.BTCBRL.pctChange;
            const k = (Number(aw.BTCBRL.bid) / 1000).toFixed(1);
            t[3] = ['BTC/BRL', `R$${k}k`, dir(pct), sign(pct)];
          }
          return t;
        });
      } catch (_) { /* mantém últimos valores */ }

      // ── SELIC meta (BCB SGS série 432) ───────────────────────────────────
      try {
        const r = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json');
        const [d] = await r.json();
        if (d) setTickerItems((prev) => { const t = next(prev); t[1] = ['SELIC', `${fmt(d.valor, 2)}% a.a.`, 'neutral', '']; return t; });
      } catch (_) { }

      // ── CDI anual (BCB SGS série 4389) ───────────────────────────────────
      try {
        const r = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json');
        const [d] = await r.json();
        if (d) setTickerItems((prev) => { const t = next(prev); t[2] = ['CDI', `${fmt(d.valor, 2)}% a.a.`, 'neutral', '']; return t; });
      } catch (_) { }

      // ── IPCA mensal (BCB SGS série 433) ──────────────────────────────────
      try {
        const r = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/1?formato=json');
        const [d] = await r.json();
        if (d) {
          const v = parseFloat(d.valor);
          setTickerItems((prev) => { const t = next(prev); t[4] = ['IPCA', `${fmt(v, 2)}% a.m.`, v >= 0 ? 'up' : 'down', '']; return t; });
        }
      } catch (_) { }
    }

    fetchAll();
    // Câmbio e BTC atualizam a cada 30s; taxas fixas (SELIC/CDI/IPCA) não precisam de refresh frequente
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
        {/* Eyebrow */}
        <div className="anim-in" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span className="live-dot" />
          <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '.14em', color: 'rgba(250,250,250,.5)', textTransform: 'uppercase' }}>
            CORE 4 · INTELLIGENCE LAYER
          </span>
        </div>

        {/* Clock */}
        <div className="anim-in d1" style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(250,250,250,.35)', letterSpacing: '.08em', marginBottom: 10 }}>
          {date} · {time}
        </div>

        {/* Headline */}
        <h2 className="anim-in d2" style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.2, color: '#fafafa', marginBottom: 6 }}>
          A arquiteta da sua<br /><em style={{ color: '#6EFFC0', fontStyle: 'italic' }}>liberdade financeira.</em>
        </h2>

        <p className="anim-in d3" style={{ fontSize: 12, color: 'rgba(250,250,250,.5)', lineHeight: 1.6, marginBottom: 12, maxWidth: 380 }}>
          Conciliação automática, fluxo de caixa em tempo real e relatórios que falam. Tudo em um único lugar.
        </p>

        {/* KPI Grid */}
        <div className="anim-in d4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          {/* KPI 1 */}
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
          {/* KPI 2 */}
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

        {/* Chart */}
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

        {/* Ticker */}
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

        {/* Footer strip */}
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

/* ── Main Login ── */
export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [success, setSuccess] = useState(false);
  const [now, setNow] = useState(new Date());

  // ── Recuperação de senha ──
  const [view, setView] = useState('login'); // 'login' | 'forgot-email' | 'forgot-sent'
  const [resetEmail, setResetEmail] = useState('');
  const [resetTokenDemo, setResetTokenDemo] = useState('');
  const [resetErro, setResetErro] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const spotRef = useRef(null);
  const o1Ref = useRef(null);
  const o2Ref = useRef(null);
  const o3Ref = useRef(null);

  /* Clock */
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  /* Mouse parallax */
  useEffect(() => {
    const onMove = (e) => {
      const w = window.innerWidth, h = window.innerHeight;
      const x = e.clientX, y = e.clientY;
      const dx = (x / w - 0.5) * 2, dy = (y / h - 0.5) * 2;
      if (spotRef.current) {
        spotRef.current.style.setProperty('--mx', `${x}px`);
        spotRef.current.style.setProperty('--my', `${y}px`);
      }
      if (o1Ref.current) o1Ref.current.style.transform = `translate(${dx * 30}px, ${dy * 30}px)`;
      if (o2Ref.current) o2Ref.current.style.transform = `translate(${dx * -40}px, ${dy * -40}px)`;
      if (o3Ref.current) o3Ref.current.style.transform = `translate(${dx * 22}px, ${dy * 22}px)`;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  function voltarParaLogin() {
    setView('login');
    setResetErro('');
    setResetEmail('');
    setResetTokenDemo('');
  }

  const handleEsqueciSenha = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      setResetErro('Informe um e-mail válido.');
      return;
    }
    setResetErro('');
    setResetLoading(true);
    try {
      const res = await auth.esqueciSenha(resetEmail);
      setResetTokenDemo(res.tokenDemo || '');
      setView('forgot-sent');
    } catch (err) {
      setResetErro(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e?.preventDefault?.();
    setErro('');
    if (!emailValid) { setErro('Informe um email válido.'); return; }
    setCarregando(true);
    try {
      const usuario = await auth.login(email, senha);
      sessionStorage.setItem('usuario', JSON.stringify(usuario));
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2400);
    } catch (err) {
      setErro(err.message || 'Credenciais inválidas');
    } finally {
      setCarregando(false);
    }
  };

  /* ── Inline styles ── */
  const S = {
    shell: {
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      background: '#0c0c0c',
      overflow: 'hidden',
      color: '#fafafa',
    },
    bgStage: {
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      pointerEvents: 'none',
    },
    bgGrid: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'linear-gradient(to right,rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.04) 1px,transparent 1px)',
      backgroundSize: '56px 56px',
      WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%,#000 20%,transparent 80%)',
      maskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%,#000 20%,transparent 80%)',
    },
    orb1: { position: 'absolute', width: 520, height: 520, borderRadius: '50%', background: '#6EFFC0', filter: 'blur(80px)', opacity: .25, top: -140, left: -140, willChange: 'transform' },
    orb2: { position: 'absolute', width: 620, height: 620, borderRadius: '50%', background: '#ACC7FF', filter: 'blur(80px)', opacity: .15, bottom: -180, right: -140, willChange: 'transform' },
    orb3: { position: 'absolute', width: 340, height: 340, borderRadius: '50%', background: '#FF9D6E', filter: 'blur(80px)', opacity: .10, top: '40%', left: '35%', willChange: 'transform' },
    bgSpot: {
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgba(110,255,192,.14), transparent 60%)',
      transition: 'background .12s',
    },
    bgScan: {
      position: 'absolute',
      inset: 0,
      background: 'repeating-linear-gradient(0deg,transparent 0 3px,rgba(255,255,255,.012) 3px 4px)',
      mixBlendMode: 'overlay',
    },
    formPane: {
      position: 'relative',
      zIndex: 1,
      width: '100%',
      maxWidth: 520,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '32px 48px',
      background: 'rgba(12,12,12,.6)',
      backdropFilter: 'blur(4px)',
      borderRight: '1px solid rgba(255,255,255,.05)',
    },
    formWrap: { maxWidth: 380, width: '100%', margin: '0 auto' },
    greetingChip: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 12px',
      borderRadius: 999,
      background: 'rgba(255,255,255,.05)',
      border: '1px solid rgba(255,255,255,.1)',
      fontSize: 12,
      color: 'rgba(250,250,250,.6)',
      marginBottom: 20,
    },
    submitBtn: {
      width: '100%', padding: '15px 24px', borderRadius: 14,
      background: '#6EFFC0', color: '#003824',
      fontSize: 15, fontWeight: 700, fontFamily: "'Sora', sans-serif",
      border: 'none', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      transition: 'opacity .15s, transform .1s',
      position: 'relative', overflow: 'hidden',
      marginTop: 20,
    },
    rowBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    check: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(250,250,250,.6)', cursor: 'pointer' },
    forgotLink: { fontSize: 12, color: '#6EFFC0', textDecoration: 'none', fontWeight: 500 },
    errBanner: {
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px', borderRadius: 12,
      background: 'rgba(255,180,171,.08)', border: '1px solid rgba(255,180,171,.2)',
      color: '#FFB4AB', fontSize: 13, marginTop: 12,
    },
    successOverlay: {
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(12,12,12,.92)', backdropFilter: 'blur(20px)',
      display: 'grid', placeItems: 'center',
      animation: 'fadeIn 300ms both',
    },
    successCard: {
      textAlign: 'center', padding: 40,
      animation: 'scaleSpring 500ms cubic-bezier(.34,1.56,.64,1) both',
    },
    successIcon: {
      width: 96, height: 96, borderRadius: '50%',
      background: '#6EFFC0', color: '#003824',
      display: 'grid', placeItems: 'center',
      margin: '0 auto 24px',
      boxShadow: '0 0 60px rgba(110,255,192,.4)',
    },
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes scaleSpring { from { opacity:0; transform:scale(.88) } to { opacity:1; transform:scale(1) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:none } }
        @keyframes ticker { from { transform:translateX(0) } to { transform:translateX(-50%) } }
        @keyframes pulseDot { 0%,100% { opacity:1;transform:scale(1) } 50% { opacity:.6;transform:scale(.85) } }
        @keyframes spin { to { transform:rotate(360deg) } }
        .ticker-scroll { animation: ticker 40s linear infinite; }
        .live-dot { width:6px;height:6px;border-radius:50%;background:#6EFFC0;box-shadow:0 0 8px #6EFFC0;animation:pulseDot 1.6s ease-in-out infinite;display:inline-block;flex-shrink:0; }
        .anim-in { animation: fadeUp 500ms cubic-bezier(.4,0,.2,1) both; }
        .d1 { animation-delay:50ms } .d2 { animation-delay:120ms } .d3 { animation-delay:200ms }
        .d4 { animation-delay:280ms } .d5 { animation-delay:360ms } .d6 { animation-delay:440ms }
        .field-float { position:relative; margin-bottom:12px }
        .field-float input { display:block;width:100%;padding:22px 16px 10px;background:#131313;border:1px solid rgba(250,250,250,.1);border-radius:14px;color:#fafafa;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color 200ms,box-shadow 200ms; }
        .field-float input:focus { border-color:#6EFFC0;box-shadow:0 0 0 3px rgba(110,255,192,.12); }
        .field-float label { position:absolute;left:16px;top:8px;font-size:11px;color:rgba(250,250,250,.4);font-family:'DM Sans',sans-serif;pointer-events:none;transition:color 200ms; }
        .field-float input:focus ~ label { color:#6EFFC0; }
        .field-float .field-icon { position:absolute;right:14px;top:50%;transform:translateY(-50%);color:rgba(250,250,250,.4);cursor:pointer;background:none;border:none;padding:0;display:flex;align-items:center; }
        .field-float .field-icon.valid { color:#6EFFC0; }
      `}</style>

      <div style={S.shell}>
        {/* Animated background */}
        <div style={S.bgStage}>
          <div style={S.bgGrid} />
          <div ref={o1Ref} style={S.orb1} />
          <div ref={o2Ref} style={S.orb2} />
          <div ref={o3Ref} style={S.orb3} />
          <div ref={spotRef} style={S.bgSpot} />
          <div style={S.bgScan} />
        </div>

        {/* Form pane */}
        <section style={S.formPane}>
          <BrandMark />

          <div style={S.formWrap}>

            {/* ── VIEW: Login ─────────────────────────────────────── */}
            {view === 'login' && (
              <>
                <div className="anim-in" style={S.greetingChip}>
                  <span className="live-dot" />
                  {greetingFor(now.getHours())} — pronto para entrar
                </div>

                <h1 className="anim-in d1" style={{ fontFamily: "'Sora', sans-serif", fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#fafafa', marginBottom: 8 }}>
                  Acesse seu <em style={{ color: '#6EFFC0', fontStyle: 'italic' }}>workspace</em>
                </h1>
                <p className="anim-in d2" style={{ fontSize: 14, color: 'rgba(250,250,250,.5)', marginBottom: 28 }}>
                  Entre com sua conta corporativa para continuar.
                </p>

                <form onSubmit={handleLogin}>
                  <div className="anim-in d3">
                    <FloatingInput
                      id="email"
                      label="Email corporativo"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                      validIcon={emailValid
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
                        : null
                      }
                    />
                  </div>

                  <div className="anim-in d4">
                    <FloatingPasswordInput
                      id="senha"
                      label="Senha"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </div>

                  <div style={S.rowBetween}>
                    <label style={S.check}>
                      <input type="checkbox" defaultChecked style={{ accentColor: '#6EFFC0' }} />
                      Confiar neste dispositivo
                    </label>
                    <button
                      type="button"
                      style={{ ...S.forgotLink, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      onClick={() => { setResetEmail(email); setResetErro(''); setView('forgot-email'); }}
                    >
                      Esqueci a senha
                    </button>
                  </div>

                  {erro && (
                    <div style={S.errBanner}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><circle cx="12" cy="16" r=".5" fill="currentColor" /></svg>
                      {erro}
                    </div>
                  )}

                  <div className="anim-in d5">
                    <button
                      type="submit"
                      disabled={carregando}
                      style={{ ...S.submitBtn, opacity: carregando ? .7 : 1 }}
                    >
                      {carregando
                        ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Autenticando…</>
                        : 'Entrar no Core 4'
                      }
                    </button>
                  </div>
                </form>

                <div className="anim-in d6" style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'rgba(250,250,250,.4)' }}>
                  Primeira vez no Core 4?{' '}
                  <a href="/register" style={{ color: '#6EFFC0', fontWeight: 600, textDecoration: 'none' }}>Criar conta</a>
                </div>
              </>
            )}

            {/* ── VIEW: Esqueci a senha — Passo 1: Email ──────────── */}
            {view === 'forgot-email' && (
              <div className="anim-in">
                <button type="button" onClick={voltarParaLogin} style={{ background: 'none', border: 'none', color: 'rgba(250,250,250,.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 28, padding: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                  Voltar ao login
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', background: 'rgba(110,255,192,.1)', border: '1px solid rgba(110,255,192,.2)', marginBottom: 20 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6EFFC0" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m2 7 10 6 10-6" /></svg>
                </div>

                <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: '#fafafa', marginBottom: 8 }}>
                  Recuperar acesso
                </h1>
                <p style={{ fontSize: 14, color: 'rgba(250,250,250,.5)', marginBottom: 28, lineHeight: 1.6 }}>
                  Informe o e-mail cadastrado. Enviaremos um código de verificação.
                </p>

                <form onSubmit={handleEsqueciSenha}>
                  <FloatingInput
                    id="reset-email"
                    label="E-mail cadastrado"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />

                  {resetErro && (
                    <div style={{ ...S.errBanner, marginBottom: 12 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><circle cx="12" cy="16" r=".5" fill="currentColor" /></svg>
                      {resetErro}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={resetLoading}
                    style={{ ...S.submitBtn, marginTop: 8, opacity: resetLoading ? .7 : 1 }}
                  >
                    {resetLoading
                      ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Enviando…</>
                      : 'Enviar código'
                    }
                  </button>
                </form>
              </div>
            )}

            {/* ── VIEW: Esqueci a senha — Email enviado ────────────── */}
            {view === 'forgot-sent' && (
              <div className="anim-in">
                <button type="button" onClick={voltarParaLogin} style={{ background: 'none', border: 'none', color: 'rgba(250,250,250,.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 28, padding: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                  Voltar ao login
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', background: 'rgba(110,255,192,.1)', border: '1px solid rgba(110,255,192,.2)', marginBottom: 20 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6EFFC0" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m2 7 10 6 10-6" /></svg>
                </div>

                <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: '#fafafa', marginBottom: 8 }}>
                  {resetTokenDemo ? 'Modo demonstração' : 'Verifique seu e-mail'}
                </h1>

                {/* Produção: email enviado */}
                {!resetTokenDemo && (
                  <p style={{ fontSize: 14, color: 'rgba(250,250,250,.5)', lineHeight: 1.7, marginBottom: 28 }}>
                    Enviamos um link de recuperação para{' '}
                    <strong style={{ color: '#fafafa' }}>{resetEmail}</strong>.<br />
                    Clique no link do e-mail para criar sua nova senha.<br />
                    <span style={{ fontSize: 12, color: 'rgba(250,250,250,.3)' }}>O link expira em 60 minutos.</span>
                  </p>
                )}

                {/* Demo: sem SMTP configurado */}
                {resetTokenDemo && (
                  <>
                    <p style={{ fontSize: 14, color: 'rgba(250,250,250,.5)', lineHeight: 1.7, marginBottom: 16 }}>
                      Sem SMTP configurado, o link de recuperação não foi enviado por e-mail.<br />
                      Clique no botão abaixo para redefinir sua senha diretamente.
                    </p>
                    <a
                      href={`/redefinir-senha?token=${resetTokenDemo}`}
                      style={{ ...S.submitBtn, textDecoration: 'none', marginTop: 0 }}
                    >
                      Redefinir minha senha
                    </a>
                  </>
                )}

                <button
                  type="button"
                  onClick={voltarParaLogin}
                  style={{ width: '100%', marginTop: 12, padding: '12px', borderRadius: 14, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(250,250,250,.5)', fontSize: 13, cursor: 'pointer' }}
                >
                  Voltar ao login
                </button>
              </div>
            )}

          </div>

          <footer style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(250,250,250,.25)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '.1em' }}>
            <span>© 2026 Core 4 · LGPD</span>
            <span style={{ display: 'flex', gap: 14 }}>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Termos</a>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacidade</a>
            </span>
          </footer>
        </section>

        {/* Hero pane — hidden on mobile */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', position: 'relative', zIndex: 1 }} className="hidden lg:flex">
          <HeroPane />
        </div>

        {/* Success overlay */}
        {success && (
          <div style={S.successOverlay}>
            <div style={S.successCard}>
              <div style={S.successIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', color: '#fafafa', marginBottom: 8 }}>
                Bem-vindo de volta!
              </div>
              <div style={{ color: 'rgba(250,250,250,.55)', fontSize: 14 }}>
                Redirecionando para o dashboard…
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
