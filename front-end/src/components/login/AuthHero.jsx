import React, { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CreditCard, GitMerge, Sparkles } from 'lucide-react';
import BrandLogo from '../ui/BrandLogo';
import { AnimatedNumber, FadeIn, Stagger, StaggerItem } from '../motion/Movimento';

/**
 * Painel da marca nas telas públicas (login, cadastro, convite, redefinir senha).
 * Sempre escuro (fiel à logo). O "painel" ilustrativo é rotulado como EXEMPLO — nenhum
 * número aqui é dado real, nem selo/métrica de marketing.
 */

// Curva ilustrativa (12 pontos) — desenhada em SVG, sem dados reais
const PONTOS = [38, 44, 41, 52, 49, 58, 55, 63, 60, 70, 74, 82];
const LARGURA = 360;
const ALTURA = 110;

function caminho(pontos) {
  const passo = LARGURA / (pontos.length - 1);
  const y = (v) => ALTURA - (v / 100) * ALTURA;
  return pontos.reduce((d, v, i) => {
    if (i === 0) return `M0 ${y(v)}`;
    const x0 = (i - 1) * passo;
    const x1 = i * passo;
    const cx = (x0 + x1) / 2;
    return `${d} C${cx} ${y(pontos[i - 1])} ${cx} ${y(v)} ${x1} ${y(v)}`;
  }, '');
}

const RECURSOS = [
  { icon: GitMerge, titulo: 'Conciliação por OFX', texto: 'Importe o extrato e confira item a item.' },
  { icon: CreditCard, titulo: 'Cartões e faturas', texto: 'Parcelas, limite e fechamento em dia.' },
  { icon: Sparkles, titulo: 'Áurea', texto: 'Pergunte e lance por conversa.' },
];

function GraficoExemplo() {
  const reduzir = useReducedMotion();
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const linha = caminho(PONTOS);
  const area = `${linha} L${LARGURA} ${ALTURA} L0 ${ALTURA} Z`;
  const ultimoY = ALTURA - (PONTOS[PONTOS.length - 1] / 100) * ALTURA;

  return (
    <svg viewBox={`0 -8 ${LARGURA} ${ALTURA + 16}`} className="w-full h-28 overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-primary)" stopOpacity="0.32" />
          <stop offset="1" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-brilho`} x="-10%" y="-40%" width="120%" height="180%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={LARGURA} y1={ALTURA * f} y2={ALTURA * f} stroke="var(--color-chart-grid)" strokeDasharray="3 5" />
      ))}
      <motion.path
        d={area}
        fill={`url(#${id}-area)`}
        initial={reduzir ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.9 }}
      />
      <motion.path
        d={linha}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        filter={`url(#${id}-brilho)`}
        initial={reduzir ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: [0.65, 0, 0.35, 1], delay: 0.3 }}
      />
      <circle cx={LARGURA} cy={ultimoY} r="9" fill="var(--color-primary)" className="c4-pulso" style={{ animationDelay: '1.7s', transformOrigin: `${LARGURA}px ${ultimoY}px` }} />
      <motion.circle
        cx={LARGURA}
        cy={ultimoY}
        r="4"
        fill="var(--color-primary)"
        stroke="var(--color-surface-low)"
        strokeWidth="2"
        initial={reduzir ? false : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 1.6 }}
      />
    </svg>
  );
}

export default function AuthHero({ titulo, subtitulo }) {
  return (
    <div className="c4-tema-escuro relative h-full w-full overflow-hidden bg-surface flex flex-col justify-between p-10 xl:p-14">
      {/* Atmosfera: brilho petróleo + fios esmeralda dos cantos (como na arte da logo) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 w-[42rem] h-[42rem] rounded-full opacity-60" style={{ background: 'radial-gradient(closest-side, rgba(20,226,156,0.18), transparent)' }} />
        <div className="absolute -bottom-56 -right-40 w-[46rem] h-[46rem] rounded-full opacity-60" style={{ background: 'radial-gradient(closest-side, rgba(27,74,80,0.55), transparent)' }} />
        <div className="c4-backdrop__grao" />
        <svg className="absolute left-0 top-0 w-64 h-64 text-primary opacity-40" viewBox="0 0 200 200" fill="none">
          <path d="M200 0 L70 130 Q55 145 35 145 L0 145" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
        <svg className="absolute right-0 bottom-0 w-64 h-64 text-primary opacity-40" viewBox="0 0 200 200" fill="none">
          <path d="M0 200 L130 70 Q145 55 165 55 L200 55" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      <FadeIn className="relative">
        <BrandLogo size="lg" tagline variant="dark" />
      </FadeIn>

      <div className="relative max-w-xl">
        <FadeIn delay={0.08}>
          <h2 className="font-display text-[2.6rem] xl:text-5xl font-semibold leading-[1.08] tracking-[-0.03em] text-balance">
            {titulo ?? (<>Seu dinheiro, <span className="c4-text-emerald">claro</span> e conciliado.</>)}
          </h2>
          <p className="mt-4 text-base text-text-primary/70 leading-relaxed max-w-md">
            {subtitulo ?? 'Contas, cartões, extratos e relatórios num só lugar — para você ou para a sua empresa.'}
          </p>
        </FadeIn>

        {/* Painel ilustrativo — claramente marcado como exemplo */}
        <FadeIn delay={0.18} className="mt-9">
          <div className="c4-card c4-card--destaque p-5 max-w-md">
            <div className="flex items-center justify-between gap-3">
              <p className="c4-eyebrow">Fluxo de caixa</p>
              <span className="rounded-full border border-border-strong px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-text-primary/60">
                Exemplo
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-primary/55">Entradas</p>
                <AnimatedNumber value={18450} privado={false} className="c4-kpi block text-[1.5rem] text-income" />
              </div>
              <div>
                <p className="text-xs text-text-primary/55">Saídas</p>
                <AnimatedNumber value={11230} privado={false} className="c4-kpi block text-[1.5rem]" />
              </div>
            </div>
            <div className="mt-4"><GraficoExemplo /></div>
            <p className="mt-1 text-[0.6875rem] text-text-primary/45">Valores ilustrativos.</p>
          </div>
        </FadeIn>
      </div>

      <Stagger as="ul" delay={0.35} className="relative grid grid-cols-3 gap-4 max-w-2xl">
        {RECURSOS.map(({ icon: Icone, titulo: t, texto }) => (
          <StaggerItem as="li" key={t} className="flex flex-col gap-2">
            <span aria-hidden="true" className="grid place-items-center w-9 h-9 rounded-xl bg-primary/[0.1] border border-primary/20 text-primary">
              <Icone className="w-4 h-4" />
            </span>
            <span className="text-sm font-semibold">{t}</span>
            <span className="text-xs text-text-primary/60 leading-relaxed">{texto}</span>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
