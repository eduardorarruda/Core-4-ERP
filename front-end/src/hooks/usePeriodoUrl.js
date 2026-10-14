import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { deIso, mesAtual, periodoDoAtalho, periodoDoMes, validarPeriodo } from '../lib/periodo';

/**
 * Período guardado na URL (`?de=2026-08-01&ate=2026-10-31`): sobrevive a recarregar,
 * voltar e compartilhar o link. Sem parâmetros (ou inválidos) usa o `padrao`.
 *
 *   const [periodo, setPeriodo] = usePeriodoUrl('3m');           // id de atalho
 *   const [periodo, setPeriodo] = usePeriodoUrl({ inicio, fim }); // período fixo
 *   <PeriodoSelector value={periodo} onChange={setPeriodo} />
 *
 * Outros parâmetros da URL são preservados. A troca usa `replace` (não enche o histórico).
 */
export function usePeriodoUrl(padrao = 'mes', { chaveInicio = 'de', chaveFim = 'ate' } = {}) {
  const [params, setParams] = useSearchParams();
  const de = params.get(chaveInicio);
  const ate = params.get(chaveFim);
  const base = typeof padrao === 'string' ? (periodoDoAtalho(padrao) ?? periodoDoAtalho('mes')) : padrao;
  const baseInicio = base?.inicio;
  const baseFim = base?.fim;

  // Identidade estável: telas usam `periodo` como dependência de efeitos de carga
  const periodo = useMemo(() => {
    const daUrl = { inicio: de, fim: ate };
    if (de && ate && deIso(de) && deIso(ate) && !validarPeriodo(daUrl)) return daUrl;
    return { inicio: baseInicio, fim: baseFim };
  }, [de, ate, baseInicio, baseFim]);

  const setPeriodo = useCallback((novo) => {
    setParams((atual) => {
      const proximo = new URLSearchParams(atual);
      if (novo?.inicio && novo?.fim) {
        proximo.set(chaveInicio, novo.inicio);
        proximo.set(chaveFim, novo.fim);
      } else {
        proximo.delete(chaveInicio);
        proximo.delete(chaveFim);
      }
      return proximo;
    }, { replace: true });
  }, [setParams, chaveInicio, chaveFim]);

  return [periodo, setPeriodo];
}

/**
 * Mês guardado na URL (`?mes=2026-10`) para telas mensais (Calendário, Orçamentos, Insights).
 * Devolve [anoMes, setAnoMes, periodoDoMes].
 */
export function useMesUrl(chave = 'mes') {
  const [params, setParams] = useSearchParams();
  const bruto = params.get(chave);
  const anoMes = bruto && /^\d{4}-\d{2}$/.test(bruto) && periodoDoMes(bruto) ? bruto : mesAtual();

  const setAnoMes = useCallback((novo) => {
    setParams((atual) => {
      const proximo = new URLSearchParams(atual);
      if (novo && novo !== mesAtual()) proximo.set(chave, novo);
      else proximo.delete(chave);
      return proximo;
    }, { replace: true });
  }, [setParams, chave]);

  return [anoMes, setAnoMes, periodoDoMes(anoMes)];
}

export default usePeriodoUrl;
