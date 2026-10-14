import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CalendarRange, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { endOfMonth } from 'date-fns';
import { cn } from '../../lib/utils';
import { MESES_COMPLETOS } from '../../lib/constants';
import {
  ATALHOS, ATALHOS_PADRAO, atalhoDoPeriodo, deIso, deMesAno, mesAtual, paraIso, paraMesAno,
  rotuloMes, rotuloPeriodo, somarMeses, validarPeriodo,
} from '../../lib/periodo';
import { PopPresence } from '../motion/Movimento';
import Button from './Button';

/**
 * O ÚNICO filtro de período do Core 4 (um por tela). Botão-gatilho que abre um painel com
 * atalhos e o intervalo personalizado no mesmo lugar.
 *
 *   const [periodo, setPeriodo] = usePeriodoUrl('3m');     // estado na URL (?de=&ate=)
 *   <PeriodoSelector value={periodo} onChange={setPeriodo}
 *     granularidade="mes" atalhos={['mes', '3m', '6m', '12m', 'ano']} label="Período" />
 *
 * Props:
 * - value: { inicio: 'yyyy-MM-dd', fim: 'yyyy-MM-dd' }
 * - onChange(periodo)
 * - granularidade: 'mes' (escolhe meses inteiros) | 'dia' (datas exatas). Padrão 'dia'.
 * - atalhos: ids de lib/periodo.js (hoje, 7d, 30d, 90d, mes, mes-passado, 3m, 6m, 12m, ano)
 * - label: rótulo acessível (padrão "Período")
 * - align: 'start' | 'end' — lado em que o painel abre
 *
 * Compatibilidade: se `value` vier no formato antigo { mesInicio, anoInicio, mesFim, anoFim },
 * o componente entende e devolve `onChange` NO MESMO formato antigo (com inicio/fim juntos).
 */
export default function PeriodoSelector({
  value,
  onChange,
  granularidade: granularidadeProp = 'dia',
  atalhos = ATALHOS_PADRAO,
  label = 'Período',
  align = 'start',
  className,
}) {
  const legado = value && value.inicio == null && value.mesInicio != null;
  const periodo = legado ? deMesAno(value) : value;
  const granularidade = legado ? 'mes' : granularidadeProp;
  const [aberto, setAberto] = useState(false);
  const raizRef = useRef(null);
  const gatilhoRef = useRef(null);
  const painelId = useId();

  const emitir = (novo) => {
    onChange?.(legado ? { ...paraMesAno(novo), ...novo } : novo);
  };

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => { if (raizRef.current && !raizRef.current.contains(e.target)) setAberto(false); };
    const esc = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setAberto(false);
      gatilhoRef.current?.focus();
    };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto]);

  const atalhoAtivo = atalhoDoPeriodo(periodo, atalhos);
  const texto = rotuloPeriodo(periodo, { ids: atalhos, granularidade });

  return (
    <div ref={raizRef} className={cn('relative inline-block', className)}>
      <button
        ref={gatilhoRef}
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-controls={aberto ? painelId : undefined}
        aria-label={`${label}: ${texto}`}
        className={cn(
          'group inline-flex items-center gap-2 min-h-11 pl-3 pr-2.5 rounded-xl text-sm font-medium',
          'bg-surface-medium/70 border border-border-strong text-text-primary',
          'hover:bg-surface-high hover:border-text-primary/[0.22] transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          aberto && 'border-primary/50 bg-surface-high'
        )}
      >
        <CalendarRange className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
        <span className="whitespace-nowrap first-letter:uppercase">{texto}</span>
        <ChevronDown className={cn('w-4 h-4 text-text-primary/50 transition-transform', aberto && 'rotate-180')} aria-hidden="true" />
      </button>

      <PopPresence
        aberto={aberto}
        origem={align === 'end' ? 'top right' : 'top left'}
        id={painelId}
        role="dialog"
        aria-label={`Escolher ${label.toLowerCase()}`}
        className={cn(
          'z-50 mt-2 rounded-2xl border border-border-strong bg-surface-low/95 backdrop-blur-xl shadow-elevated',
          'max-sm:fixed max-sm:inset-x-3 max-sm:bottom-3 max-sm:top-auto',
          'sm:absolute sm:w-[34rem]',
          align === 'end' ? 'sm:right-0' : 'sm:left-0'
        )}
      >
        <PainelPeriodo
          periodo={periodo}
          atalhos={atalhos}
          atalhoAtivo={atalhoAtivo}
          granularidade={granularidade}
          onEscolher={(novo) => { emitir(novo); setAberto(false); gatilhoRef.current?.focus(); }}
        />
      </PopPresence>
    </div>
  );
}

function PainelPeriodo({ periodo, atalhos, atalhoAtivo, granularidade, onEscolher }) {
  const primeiroRef = useRef(null);
  useEffect(() => { primeiroRef.current?.focus({ preventScroll: true }); }, []);

  return (
    <div className="grid sm:grid-cols-[12rem_1fr]">
      <div className="p-2 sm:border-r border-b sm:border-b-0 border-border">
        <p className="c4-eyebrow px-2.5 pt-1.5 pb-2">Atalhos</p>
        <ul className="grid grid-cols-2 sm:grid-cols-1 gap-0.5">
          {atalhos.filter((id) => ATALHOS[id]).map((id, i) => {
            const ativo = id === atalhoAtivo;
            return (
              <li key={id}>
                <button
                  ref={i === 0 ? primeiroRef : undefined}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => {
                    const [ini, fim] = ATALHOS[id].calcular(new Date());
                    onEscolher({ inicio: paraIso(ini), fim: paraIso(fim) });
                  }}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 min-h-10 px-2.5 rounded-lg text-sm text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    ativo ? 'bg-primary/12 text-primary font-semibold' : 'text-text-primary/80 hover:bg-text-primary/[0.06] hover:text-text-primary'
                  )}
                >
                  {ATALHOS[id].rotulo}
                  {ativo && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <IntervaloPersonalizado periodo={periodo} granularidade={granularidade} onAplicar={onEscolher} />
    </div>
  );
}

const CAMPO = cn(
  'w-full min-h-11 rounded-xl px-3 text-sm bg-surface border border-border-strong text-text-primary outline-none',
  'focus-visible:ring-2 focus-visible:ring-primary transition-colors [color-scheme:inherit]'
);

function anosDisponiveis() {
  const ano = new Date().getFullYear();
  return Array.from({ length: 8 }, (_, i) => ano + 1 - i);
}

function IntervaloPersonalizado({ periodo, granularidade, onAplicar }) {
  const id = useId();
  const [inicio, setInicio] = useState(periodo?.inicio ?? '');
  const [fim, setFim] = useState(periodo?.fim ?? '');
  const [erro, setErro] = useState(null);
  const porMes = granularidade === 'mes';

  const aplicar = (e) => {
    e.preventDefault();
    let candidato = { inicio, fim };
    if (porMes) {
      const ini = deIso(inicio);
      const f = deIso(fim);
      if (ini && f) candidato = { inicio: paraIso(new Date(ini.getFullYear(), ini.getMonth(), 1)), fim: paraIso(endOfMonth(f)) };
    }
    const problema = validarPeriodo(candidato);
    setErro(problema);
    if (!problema) onAplicar(candidato);
  };

  return (
    <form onSubmit={aplicar} className="p-4 space-y-3" noValidate>
      <p className="c4-eyebrow">Personalizado</p>
      {porMes ? (
        <div className="grid grid-cols-1 gap-3">
          <SeletorMesAno id={`${id}-ini`} rotulo="De" valor={inicio} onMudar={setInicio} />
          <SeletorMesAno id={`${id}-fim`} rotulo="Até" valor={fim} onMudar={setFim} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor={`${id}-ini`} className="text-xs font-medium text-text-primary/70">De</label>
            <input id={`${id}-ini`} type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className={CAMPO} aria-invalid={erro ? true : undefined} aria-describedby={erro ? `${id}-erro` : undefined} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${id}-fim`} className="text-xs font-medium text-text-primary/70">Até</label>
            <input id={`${id}-fim`} type="date" value={fim} min={inicio || undefined} onChange={(e) => setFim(e.target.value)} className={CAMPO} aria-invalid={erro ? true : undefined} aria-describedby={erro ? `${id}-erro` : undefined} />
          </div>
        </div>
      )}
      {erro && <p id={`${id}-erro`} role="alert" className="text-xs text-error">{erro}</p>}
      <div className="flex justify-end pt-1">
        <Button type="submit" size="sm">Aplicar período</Button>
      </div>
    </form>
  );
}

function SeletorMesAno({ id, rotulo, valor, onMudar }) {
  const d = deIso(valor) ?? new Date();
  const mes = d.getMonth();
  const ano = d.getFullYear();
  const mudar = (novoMes, novoAno) => onMudar(paraIso(new Date(novoAno, novoMes, 1)));
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-xs font-medium text-text-primary/70 mb-1.5">{rotulo}</legend>
      <div className="grid grid-cols-[1fr_6.5rem] gap-2">
        <select id={`${id}-mes`} aria-label={`${rotulo}: mês`} value={mes} onChange={(e) => mudar(Number(e.target.value), ano)} className={CAMPO}>
          {MESES_COMPLETOS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        <select id={`${id}-ano`} aria-label={`${rotulo}: ano`} value={ano} onChange={(e) => mudar(mes, Number(e.target.value))} className={CAMPO}>
          {anosDisponiveis().map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
    </fieldset>
  );
}

/**
 * Seletor de mês para telas mensais (Calendário, Orçamentos, Insights): ‹ outubro de 2026 › + "Hoje".
 * O rótulo desliza na direção da navegação (portado do Fluxo — SeletorDeMes).
 *
 *   const [mes, setMes] = useMesUrl();             // ?mes=2026-10
 *   <MonthSelector value={mes} onChange={setMes} />
 *
 * Props: value 'yyyy-MM', onChange(yyyy-MM), min/max 'yyyy-MM' (opcionais), label.
 */
export function MonthSelector({ value, onChange, min, max, label = 'Mês', className }) {
  const reduzir = useReducedMotion();
  const [direcao, setDirecao] = useState(0);
  const atual = value ?? mesAtual();
  const ehHoje = atual === mesAtual();
  const podeVoltar = !min || atual > min;
  const podeAvancar = !max || atual < max;

  const ir = (n) => {
    setDirecao(n);
    onChange?.(somarMeses(atual, n));
  };
  const hoje = () => {
    setDirecao(atual < mesAtual() ? 1 : -1);
    onChange?.(mesAtual());
  };

  return (
    <div className={cn('inline-flex items-center gap-2', className)} role="group" aria-label={label}>
      <div className="inline-flex items-center rounded-xl bg-surface-medium/70 border border-border-strong">
        <button
          type="button"
          onClick={() => ir(-1)}
          disabled={!podeVoltar}
          aria-label="Mês anterior"
          className="w-11 h-11 grid place-items-center rounded-l-xl text-text-primary/70 hover:text-text-primary hover:bg-text-primary/[0.06] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        </button>
        <span className="relative w-40 h-11 overflow-hidden grid place-items-center" aria-live="polite">
          <AnimatePresence mode="popLayout" initial={false} custom={direcao}>
            <motion.span
              key={atual}
              className="absolute text-sm font-semibold capitalize whitespace-nowrap"
              initial={reduzir ? { opacity: 0 } : { opacity: 0, y: direcao >= 0 ? 14 : -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduzir ? { opacity: 0 } : { opacity: 0, y: direcao >= 0 ? -14 : 14 }}
              transition={{ type: 'spring', stiffness: 500, damping: 36 }}
            >
              {rotuloMes(atual)}
            </motion.span>
          </AnimatePresence>
        </span>
        <button
          type="button"
          onClick={() => ir(1)}
          disabled={!podeAvancar}
          aria-label="Próximo mês"
          className="w-11 h-11 grid place-items-center rounded-r-xl text-text-primary/70 hover:text-text-primary hover:bg-text-primary/[0.06] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      {!ehHoje && (
        <Button variant="ghost" size="sm" onClick={hoje} aria-label="Voltar para o mês atual">
          Hoje
        </Button>
      )}
    </div>
  );
}
