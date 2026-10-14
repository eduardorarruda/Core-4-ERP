import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery';

function AnimatedNumber({ to, prefix = '', decimals = 0, duration = 1800 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf, start;
    const step = (ts) => {
      if (!start) start = ts;
      const p = duration > 0 ? Math.min(1, (ts - start) / duration) : 1;
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


/** Relógio isolado: só ele re-renderiza a cada segundo, não o painel inteiro. */
function Relogio() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="anim-in d1 font-mono text-xs text-text-primary/70 tracking-wider mb-2.5 first-letter:uppercase">
      {date} · <time>{time}</time>
    </div>
  );
}

const fmtNumero = (n, dec = 2) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const direcao = (pct) => (parseFloat(pct) >= 0 ? 'up' : 'down');
const sinal = (pct) => { const v = parseFloat(pct); return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`; };

/** Busca JSON público; em falha devolve null (o item fica com "…" e tenta de novo no próximo ciclo). */
async function buscarJson(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch (err) {
    if (import.meta.env.DEV) console.warn('Cotação indisponível:', url, err);
    return null;
  }
}

const SERIES_BCB = [
  { indice: 1, sigla: 'SELIC', serie: 432, sufixo: '% a.a.' },
  { indice: 2, sigla: 'CDI', serie: 4389, sufixo: '% a.a.' },
  { indice: 4, sigla: 'IPCA', serie: 433, sufixo: '% a.m.' },
];

export default function HeroPane() {
  const cardRef = useRef(null);
  const reduzirMovimento = usePrefersReducedMotion();
  const [spark, setSpark] = useState([8, 12, 9, 15, 14, 18, 22, 20, 26, 28, 32, 30, 38]);

  useEffect(() => {
    if (reduzirMovimento) return undefined;
    const id = setInterval(() => {
      setSpark(s => [...s.slice(1), Math.max(4, s[s.length - 1] + (Math.random() - 0.4) * 8)]);
    }, 2200);
    return () => clearInterval(id);
  }, [reduzirMovimento]);

  // Inclinação 3D do cartão seguindo o mouse: 1 atualização por quadro; desligada com
  // "reduzir movimento"
  useEffect(() => {
    const el = cardRef.current;
    if (!el || reduzirMovimento) return undefined;
    let quadro = 0;
    let ultimo = null;
    const aplicar = () => {
      quadro = 0;
      if (!ultimo) return;
      const r = el.getBoundingClientRect();
      const x = (ultimo.x - r.left) / r.width;
      const y = (ultimo.y - r.top) / r.height;
      el.style.transform = `perspective(1400px) rotateX(${(0.5 - y) * 6}deg) rotateY(${(x - 0.5) * 8}deg)`;
    };
    const onMove = (e) => {
      ultimo = { x: e.clientX, y: e.clientY };
      if (!quadro) quadro = requestAnimationFrame(aplicar);
    };
    const onLeave = () => {
      ultimo = null;
      if (quadro) { cancelAnimationFrame(quadro); quadro = 0; }
      el.style.transform = '';
    };
    el.addEventListener('mousemove', onMove, { passive: true });
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      if (quadro) cancelAnimationFrame(quadro);
    };
  }, [reduzirMovimento]);

  const entradas = useMemo(() => [12, 18, 14, 22, 19, 28, 24, 32, 30, 38, 36, 44], []);
  const saidas = useMemo(() => [10, 14, 12, 16, 17, 22, 20, 24, 23, 28, 26, 32], []);

  const [tickerItems, setTickerItems] = useState([
    ['USD/BRL', '…', 'up', ''], ['SELIC', '…', 'neutral', ''],
    ['CDI', '…', 'neutral', ''], ['BTC/BRL', '…', 'up', ''],
    ['IPCA', '…', 'neutral', ''], ['EUR/BRL', '…', 'up', ''],
  ]);

  // Cotações reais (AwesomeAPI/BCB). Só faz polling quando a pane está de fato
  // visível (lg+) e a aba está em primeiro plano.
  useEffect(() => {
    const atualizarItem = (indice, item) => setTickerItems((prev) => prev.map((v, i) => (i === indice ? item : v)));

    async function fetchAll() {
      const aw = await buscarJson('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL');
      if (aw?.USDBRL) atualizarItem(0, ['USD/BRL', fmtNumero(aw.USDBRL.bid, 4), direcao(aw.USDBRL.pctChange), sinal(aw.USDBRL.pctChange)]);
      if (aw?.EURBRL) atualizarItem(5, ['EUR/BRL', fmtNumero(aw.EURBRL.bid, 4), direcao(aw.EURBRL.pctChange), sinal(aw.EURBRL.pctChange)]);
      if (aw?.BTCBRL) {
        const k = (Number(aw.BTCBRL.bid) / 1000).toFixed(1);
        atualizarItem(3, ['BTC/BRL', `R$${k}k`, direcao(aw.BTCBRL.pctChange), sinal(aw.BTCBRL.pctChange)]);
      }
      await Promise.all(SERIES_BCB.map(async ({ indice, sigla, serie, sufixo }) => {
        const dados = await buscarJson(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados/ultimos/1?formato=json`);
        const d = Array.isArray(dados) ? dados[0] : null;
        if (!d) return;
        const v = parseFloat(d.valor);
        const dir = sigla === 'IPCA' ? (v >= 0 ? 'up' : 'down') : 'neutral';
        atualizarItem(indice, [sigla, `${fmtNumero(v, 2)}${sufixo}`, dir, '']);
      }));
    }

    const mq = window.matchMedia('(min-width: 1024px)');
    let intervalId = null;
    const start = () => {
      if (intervalId || document.hidden || !mq.matches) return;
      fetchAll();
      intervalId = setInterval(fetchAll, 30_000);
    };
    const stop = () => { if (intervalId) { clearInterval(intervalId); intervalId = null; } };
    const reavaliar = () => { if (mq.matches && !document.hidden) start(); else stop(); };

    reavaliar();
    mq.addEventListener('change', reavaliar);
    document.addEventListener('visibilitychange', reavaliar);
    return () => {
      stop();
      mq.removeEventListener('change', reavaliar);
      document.removeEventListener('visibilitychange', reavaliar);
    };
  }, []);

  // Com "reduzir movimento" a faixa não rola: mostra uma única cópia dos itens
  const allTicker = reduzirMovimento ? tickerItems : [...tickerItems, ...tickerItems];

  return (
    <aside aria-label="Prévia ilustrativa do painel" className="flex-1 min-w-0 flex items-center justify-center overflow-hidden pl-3 pr-5 py-4">
      <div
        ref={cardRef}
        className="w-full max-w-[480px] rounded-3xl pt-[18px] px-5 pb-3.5 box-border backdrop-blur-md border border-text-primary/10 will-change-transform [transition:transform_.05s_linear]"
        style={{
          background: 'linear-gradient(160deg, color-mix(in srgb, var(--color-text-primary) 4%, transparent) 0%, color-mix(in srgb, var(--color-text-primary) 1.5%, transparent) 100%)',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        <div className="anim-in flex items-center gap-2 mb-2">
          <span className="live-dot" aria-hidden="true" />
          <span className="font-mono text-xs tracking-wider text-text-primary/70 uppercase">
            Visão geral · exemplo
          </span>
        </div>

        <Relogio />

        <h2 className="anim-in d2 font-display text-[22px] font-bold tracking-tight leading-tight text-text-primary mb-1.5">
          Contas, cartões e bancos<br /><em className="text-primary italic">no mesmo painel.</em>
        </h2>

        <p className="anim-in d3 text-xs text-text-primary/70 leading-relaxed mb-3 max-w-[380px]">
          Importe o extrato, concilie os lançamentos e acompanhe o fluxo de caixa sem planilhas paralelas.
        </p>

        <div className="anim-in d4 grid grid-cols-2 gap-2 mb-2.5">
          <div className="bg-text-primary/[.025] border border-text-primary/[.08] rounded-2xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="text-xs text-text-primary/70 font-mono tracking-wide uppercase">Receita do mês</span>
              <span className="text-xs font-semibold px-1.5 py-px rounded bg-primary/[.12] text-primary font-mono">▲ 24,8%</span>
            </div>
            <div className="font-display text-lg font-bold tracking-tight text-text-primary mb-0.5">
              <AnimatedNumber prefix="R$ " to={482931} duration={reduzirMovimento ? 0 : 1800} />
            </div>
            <div className="text-xs text-text-primary/70">Meta atingida em 14 dias</div>
          </div>
          <div className="bg-text-primary/[.025] border border-text-primary/[.08] rounded-2xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="text-xs text-text-primary/70 font-mono tracking-wide uppercase">Saldo consolidado</span>
              <span className="text-xs font-semibold px-1.5 py-px rounded bg-primary/[.12] text-primary font-mono">▲ 8,2%</span>
            </div>
            <div className="font-display text-[17px] font-bold tracking-tight text-text-primary mb-0.5">
              <AnimatedNumber prefix="R$ " to={1284055} duration={reduzirMovimento ? 0 : 2000} />
            </div>
            <Sparkline data={spark} />
          </div>
        </div>

        <div className="anim-in d5 bg-text-primary/[.02] border border-text-primary/[.06] rounded-2xl px-3 py-2.5 mb-2">
          <div className="flex justify-between items-center mb-1.5 gap-2">
            <div>
              <div className="text-xs font-semibold text-text-primary/80">Fluxo de caixa · últimos 12 meses</div>
            </div>
            <div className="flex gap-3 text-xs text-text-primary/70 font-mono">
              <span><span className="inline-block w-2 h-2 rounded-full bg-primary mr-1" aria-hidden="true" />Entradas</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-secondary mr-1" aria-hidden="true" />Saídas</span>
            </div>
          </div>
          <div role="img" aria-label="Gráfico ilustrativo: entradas crescendo acima das saídas ao longo de 12 meses">
            <CashflowChart entradas={entradas} saidas={saidas} />
          </div>
        </div>

        <div
          className="anim-in d6 rounded-[10px] border border-text-primary/[.08] overflow-hidden h-8 flex items-center mb-2.5"
          style={{ background: 'color-mix(in srgb, var(--color-surface) 25%, transparent)' }}
        >
          <div className="shrink-0 px-2.5 font-mono text-xs tracking-wider uppercase text-primary border-r border-text-primary/[.08] h-full flex items-center gap-1.5 bg-primary/[.04]">
            <span className="live-dot" style={{ width: 4, height: 4 }} aria-hidden="true" />
            Cotações
          </div>
          <div className="flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_4%,#000_96%,transparent)]">
            <ul className={`${reduzirMovimento ? '' : 'ticker-scroll'} flex gap-6 items-center h-8 whitespace-nowrap font-mono text-xs pl-4`} aria-label="Cotações do dia (AwesomeAPI e Banco Central)">
              {allTicker.map(([sym, val, dir, pct], i) => (
                <li key={i} className="text-text-primary/70" aria-hidden={i >= tickerItems.length ? 'true' : undefined}>
                  <b className="text-text-primary/90">{sym}</b> {val}{' '}
                  {dir !== 'neutral' && (
                    <span className={dir === 'up' ? 'text-primary' : 'text-error'}>
                      {dir === 'up' ? '▲' : '▼'} {pct}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-xs text-text-primary/60 tracking-wide text-right leading-normal">
          Valores do painel são ilustrativos. As cotações são reais e públicas.
        </p>
      </div>
    </aside>
  );
}
