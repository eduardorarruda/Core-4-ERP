import { formatarNumero } from '../../lib/formatters';
import { diasAte } from './datasVisaoGeral';

/**
 * Cálculos do Calendário. Os totais saem SEPARADOS por lado — a pagar e a receber nunca somam
 * juntos (antes o dia mostrava pagar + receber num número só).
 */
export const valorConta = (c) => Number(c.valorOriginal ?? 0) + Number(c.acrescimo ?? 0) - Number(c.desconto ?? 0);
export const emAberto = (c) => c.status === 'PENDENTE' || c.status === 'ATRASADO';
export const atrasada = (c) => c.status === 'ATRASADO' || (c.status === 'PENDENTE' && diasAte(c.dataVencimento) < 0);

/** { pagar, receber, pago, recebido, atrasadas } das contas informadas. */
export function totaisDasContas(contas) {
  return contas.reduce((t, c) => {
    const v = valorConta(c);
    if (emAberto(c)) {
      return c.tipo === 'RECEBER'
        ? { ...t, receber: t.receber + v, atrasadas: t.atrasadas + (atrasada(c) ? 1 : 0) }
        : { ...t, pagar: t.pagar + v, atrasadas: t.atrasadas + (atrasada(c) ? 1 : 0) };
    }
    return c.tipo === 'RECEBER' ? { ...t, recebido: t.recebido + v } : { ...t, pago: t.pago + v };
  }, { pagar: 0, receber: 0, pago: 0, recebido: 0, atrasadas: 0 });
}


/** Valor curto para a célula/cabeçalho do dia: inteiro até R$ 999, compacto acima ("R$ 9,8 mil"). */
export function valorCurto(v) {
  const n = Math.abs(Number(v ?? 0));
  return n < 1000 ? formatarNumero(n, 'currency', { casas: 0 }) : formatarNumero(n, 'compact');
}
