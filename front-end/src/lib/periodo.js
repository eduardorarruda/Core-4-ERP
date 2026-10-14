import {
  addDays, endOfMonth, endOfYear, format, isValid, parseISO,
  startOfMonth, startOfYear, subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

/*
 * Período do Core 4: sempre `{ inicio: 'yyyy-MM-dd', fim: 'yyyy-MM-dd' }` (datas locais, inclusive).
 * Usado pelo PeriodoSelector, pelo hook usePeriodoUrl e para montar parâmetros de API.
 */

const ISO = 'yyyy-MM-dd';
export const paraIso = (data) => format(data, ISO);
export const deIso = (texto) => {
  if (!texto) return null;
  const d = parseISO(texto);
  return isValid(d) ? d : null;
};

/** Atalhos disponíveis (ids estáveis — use estes nas telas). */
export const ATALHOS = {
  hoje: { rotulo: 'Hoje', calcular: (h) => [h, h] },
  '7d': { rotulo: 'Últimos 7 dias', calcular: (h) => [addDays(h, -6), h] },
  '30d': { rotulo: 'Últimos 30 dias', calcular: (h) => [addDays(h, -29), h] },
  '90d': { rotulo: 'Últimos 90 dias', calcular: (h) => [addDays(h, -89), h] },
  mes: { rotulo: 'Este mês', calcular: (h) => [startOfMonth(h), endOfMonth(h)] },
  'mes-passado': { rotulo: 'Mês passado', calcular: (h) => { const m = subMonths(h, 1); return [startOfMonth(m), endOfMonth(m)]; } },
  '3m': { rotulo: 'Últimos 3 meses', calcular: (h) => [startOfMonth(subMonths(h, 2)), endOfMonth(h)] },
  '6m': { rotulo: 'Últimos 6 meses', calcular: (h) => [startOfMonth(subMonths(h, 5)), endOfMonth(h)] },
  '12m': { rotulo: 'Últimos 12 meses', calcular: (h) => [startOfMonth(subMonths(h, 11)), endOfMonth(h)] },
  ano: { rotulo: 'Este ano', calcular: (h) => [startOfYear(h), endOfYear(h)] },
};

export const ATALHOS_PADRAO = ['mes', '3m', '6m', '12m', 'ano'];

/** Período de um atalho, relativo a `hoje` (padrão: agora). */
export function periodoDoAtalho(id, hoje = new Date()) {
  const atalho = ATALHOS[id];
  if (!atalho) return null;
  const [inicio, fim] = atalho.calcular(hoje);
  return { inicio: paraIso(inicio), fim: paraIso(fim) };
}

/** Id do atalho que gera exatamente este período (ou null = personalizado). */
export function atalhoDoPeriodo(periodo, ids = Object.keys(ATALHOS), hoje = new Date()) {
  if (!periodo?.inicio || !periodo?.fim) return null;
  return ids.find((id) => {
    const p = periodoDoAtalho(id, hoje);
    return p && p.inicio === periodo.inicio && p.fim === periodo.fim;
  }) ?? null;
}

/** Para APIs que recebem mês/ano (dashboard de cartões): { mesInicio, anoInicio, mesFim, anoFim }. */
export function paraMesAno(periodo) {
  const ini = deIso(periodo?.inicio);
  const fim = deIso(periodo?.fim);
  if (!ini || !fim) return {};
  return {
    mesInicio: ini.getMonth() + 1,
    anoInicio: ini.getFullYear(),
    mesFim: fim.getMonth() + 1,
    anoFim: fim.getFullYear(),
  };
}

/** Inverso de paraMesAno: mês inteiro do início ao fim. */
export function deMesAno({ mesInicio, anoInicio, mesFim, anoFim } = {}) {
  if (!mesInicio || !anoInicio || !mesFim || !anoFim) return null;
  return {
    inicio: paraIso(new Date(anoInicio, mesInicio - 1, 1)),
    fim: paraIso(endOfMonth(new Date(anoFim, mesFim - 1, 1))),
  };
}

const mesCurto = (d) => format(d, 'MMM/yyyy', { locale: ptBR }).replace('.', '');

/**
 * Texto do período para botões e títulos.
 * Atalho conhecido → "Últimos 3 meses"; mês único → "outubro de 2026";
 * meses inteiros → "ago/2026 – out/2026"; datas → "01/08/2026 – 15/10/2026".
 */
export function rotuloPeriodo(periodo, { ids, granularidade = 'dia' } = {}) {
  const ini = deIso(periodo?.inicio);
  const fim = deIso(periodo?.fim);
  if (!ini || !fim) return 'Escolher período';
  const atalho = atalhoDoPeriodo(periodo, ids);
  if (atalho) return ATALHOS[atalho].rotulo;

  const mesesInteiros = paraIso(startOfMonth(ini)) === periodo.inicio && paraIso(endOfMonth(fim)) === periodo.fim;
  if (mesesInteiros || granularidade === 'mes') {
    if (ini.getMonth() === fim.getMonth() && ini.getFullYear() === fim.getFullYear()) {
      return format(ini, "MMMM 'de' yyyy", { locale: ptBR });
    }
    return `${mesCurto(ini)} – ${mesCurto(fim)}`;
  }
  if (periodo.inicio === periodo.fim) return format(ini, 'dd/MM/yyyy');
  return `${format(ini, 'dd/MM/yyyy')} – ${format(fim, 'dd/MM/yyyy')}`;
}

/** Valida um período. Devolve a mensagem de erro (pt-BR) ou null. */
export function validarPeriodo(periodo) {
  const ini = deIso(periodo?.inicio);
  const fim = deIso(periodo?.fim);
  if (!ini) return 'Informe a data de início.';
  if (!fim) return 'Informe a data de fim.';
  if (ini > fim) return 'A data de início precisa ser antes da data de fim.';
  return null;
}

/** Mês (yyyy-MM) → período do mês inteiro. Útil para telas mensais (MonthSelector). */
export function periodoDoMes(anoMes) {
  const d = deIso(`${anoMes}-01`);
  if (!d) return null;
  return { inicio: paraIso(startOfMonth(d)), fim: paraIso(endOfMonth(d)) };
}

/** Mês atual em yyyy-MM. */
export const mesAtual = (hoje = new Date()) => format(hoje, 'yyyy-MM');

/** Soma `n` meses a um yyyy-MM. */
export function somarMeses(anoMes, n) {
  const d = deIso(`${anoMes}-01`);
  if (!d) return mesAtual();
  return format(subMonths(d, -n), 'yyyy-MM');
}

/** "outubro de 2026" */
export function rotuloMes(anoMes) {
  const d = deIso(`${anoMes}-01`);
  return d ? format(d, "MMMM 'de' yyyy", { locale: ptBR }) : '';
}
