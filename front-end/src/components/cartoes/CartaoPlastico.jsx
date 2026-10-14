import React from 'react';
import {
  motion, useMotionTemplate, useMotionValue, useReducedMotionConfig, useSpring, useTransform,
} from 'motion/react';
import { CreditCard, Nfc } from 'lucide-react';
import BrandMark from '../ui/BrandMark';
import { ProgressBar } from '../ui/Progress';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { formatarMoeda } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import { ACABAMENTOS, acabamentoDoCartao, apelidoDoCartao, bandeiraDoNome } from './cartaoVisual';
import { fracaoLimite, tomLimite } from './faturas';

/*
 * "Plástico" 3D do cartão (padrão P-9 do Fluxo): inclina com o ponteiro, com reflexo
 * especular que segue o mouse. Sem inclinação com "reduzir movimento" e em telas de toque.
 * Sempre escuro (c4-tema-escuro), nos dois temas — como um cartão de verdade.
 *
 * Props:
 * - cartao: { id, nome, limite, limiteUsado, limiteLivre, diaFechamento, diaVencimento, contaCorrenteDescricao }
 * - onSelecionar: torna o cartão clicável (botão "esticado"); selecionado: realça a borda
 * - compacto: tipografia menor (miniaturas)
 * - acoes: nó no canto superior direito (ex.: menu Editar/Excluir), acima do botão esticado
 */

function Chip() {
  return (
    <svg viewBox="0 0 40 30" className="w-10 h-auto" aria-hidden="true">
      <defs>
        <linearGradient id="c4-chip" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-invest)" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="var(--color-silver)" stopOpacity="0.85" />
          <stop offset="1" stopColor="var(--color-invest)" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="39" height="29" rx="6" fill="url(#c4-chip)" />
      <path d="M0 10h13M0 20h13M27 10h13M27 20h13M13 0v30M27 0v30M13 15h14" stroke="var(--color-surface)" strokeOpacity="0.35" strokeWidth="1" fill="none" />
    </svg>
  );
}

function MarcaBandeira({ bandeira }) {
  if (!bandeira) return <CreditCard className="w-7 h-7 text-text-primary/70" aria-hidden="true" />;
  const rotulo = <span className="sr-only">Bandeira {bandeira.nome}</span>;
  if (bandeira.id === 'mastercard') {
    return (
      <span className="inline-flex items-center">
        <svg viewBox="0 0 48 30" className="w-12 h-auto" aria-hidden="true">
          <circle cx="17" cy="15" r="13" fill="var(--color-expense)" fillOpacity="0.92" />
          <circle cx="31" cy="15" r="13" fill="var(--color-invest)" fillOpacity="0.88" />
          <path d="M24 4.2a13 13 0 0 1 0 21.6a13 13 0 0 1 0-21.6z" fill="var(--color-warning)" fillOpacity="0.9" />
        </svg>
        {rotulo}
      </span>
    );
  }
  const texto = { visa: 'VISA', elo: 'elo', amex: 'AMEX', hipercard: 'Hiper' }[bandeira.id] ?? bandeira.nome;
  return (
    <span className={cn('font-display font-extrabold c4-text-silver leading-none', bandeira.id === 'visa' ? 'text-2xl italic tracking-tight' : 'text-xl')}>
      <span aria-hidden="true">{texto}</span>
      {rotulo}
    </span>
  );
}

export default function CartaoPlastico({ cartao, onSelecionar, selecionado = false, compacto = false, acoes, className }) {
  const reduzir = useReducedMotionConfig();
  const ponteiroFino = useMediaQuery('(hover: hover) and (pointer: fine)');
  const inclina = !reduzir && ponteiroFino;

  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rotX = useSpring(useTransform(y, [0, 1], [9, -9]), { stiffness: 200, damping: 20 });
  const rotY = useSpring(useTransform(x, [0, 1], [-12, 12]), { stiffness: 200, damping: 20 });
  const bx = useTransform(x, (v) => `${Math.round(v * 100)}%`);
  const by = useTransform(y, (v) => `${Math.round(v * 100)}%`);
  const reflexo = useMotionTemplate`radial-gradient(420px circle at ${bx} ${by}, color-mix(in srgb, var(--color-silver) 26%, transparent), transparent 45%)`;

  const mover = (e) => {
    if (!inclina) return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width);
    y.set((e.clientY - r.top) / r.height);
  };
  const sair = () => { x.set(0.5); y.set(0.5); };

  const acabamento = ACABAMENTOS[acabamentoDoCartao(cartao)];
  const bandeira = bandeiraDoNome(cartao.nome);
  const fracao = fracaoLimite(cartao);
  const apelido = apelidoDoCartao(cartao.nome);

  return (
    <div className={cn('[perspective:1000px]', className)}>
      <motion.div
        onPointerMove={mover}
        onPointerLeave={sair}
        style={inclina ? { rotateX: rotX, rotateY: rotY, transformStyle: 'preserve-3d' } : undefined}
        whileTap={onSelecionar && !reduzir ? { scale: 0.98 } : undefined}
        className={cn(
          '@container c4-tema-escuro group relative isolate overflow-hidden aspect-[1.586/1] w-full rounded-3xl border',
          'shadow-[0_24px_48px_-24px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.08)]',
          selecionado ? 'border-primary/70 ring-2 ring-primary/50' : 'border-border-strong',
          'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-surface',
        )}
      >
        {/* Fundo do acabamento + linhas finas de segurança */}
        <div aria-hidden="true" className="absolute inset-0 -z-10" style={{ background: acabamento.fundo }} />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-60"
          style={{ background: 'repeating-radial-gradient(circle at 120% 130%, transparent 0 14px, color-mix(in srgb, var(--color-silver) 6%, transparent) 14px 15px)' }}
        />
        {inclina && (
          <motion.div aria-hidden="true" className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: reflexo }} />
        )}
        <BrandMark size={compacto ? 72 : 120} variant="mono" className="absolute -right-6 -bottom-8 text-text-primary/[0.07] -z-10 pointer-events-none" />

        <div className={cn('relative h-full flex flex-col justify-between', compacto ? 'p-4' : 'p-5 sm:p-6')}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {onSelecionar ? (
                <button
                  type="button"
                  onClick={() => onSelecionar(cartao)}
                  aria-pressed={selecionado}
                  className="text-left font-display font-semibold text-text-primary leading-tight truncate max-w-full outline-none after:absolute after:inset-0 after:content-[''] after:rounded-3xl"
                >
                  <span className={compacto ? 'text-base' : 'text-lg'}>{apelido}</span>
                  <span className="sr-only">: ver faturas e lançamentos deste cartão</span>
                </button>
              ) : (
                <p className={cn('font-display font-semibold text-text-primary leading-tight truncate', compacto ? 'text-base' : 'text-lg')}>{apelido}</p>
              )}
              <p className={cn('text-xs text-text-primary/65 mt-0.5 truncate', compacto ? 'hidden' : 'hidden @[22rem]:block')}>{cartao.contaCorrenteDescricao ? `Paga pela ${cartao.contaCorrenteDescricao}` : cartao.nome}</p>
            </div>
            {acoes ? <div className="relative z-10 -mr-2 -mt-2">{acoes}</div> : <Nfc className="w-6 h-6 text-text-primary/60 shrink-0" aria-hidden="true" />}
          </div>

          <div className="flex items-center gap-3">
            <Chip />
            {acoes && <Nfc className="w-5 h-5 text-text-primary/55" aria-hidden="true" />}
          </div>

          <div className="space-y-2">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-text-primary/60">Disponível</p>
                <p className={cn('font-display font-semibold tabular-nums text-text-primary valor-privado truncate', compacto ? 'text-lg' : 'text-xl sm:text-2xl')}>
                  {formatarMoeda(cartao.limiteLivre)}
                </p>
              </div>
              <MarcaBandeira bandeira={bandeira} />
            </div>
            <ProgressBar valor={fracao} tom={tomLimite(fracao)} altura={5} label={`Limite usado do ${cartao.nome}`} />
            <p className="flex justify-between gap-2 text-[0.6875rem] text-text-primary/65 tabular-nums">
              <span>Fecha dia {cartao.diaFechamento} · vence dia {cartao.diaVencimento}</span>
              <span className="valor-privado">de {formatarMoeda(cartao.limite, { casas: 0 })}</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
