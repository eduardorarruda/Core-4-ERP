/**
 * Datas da Visão geral (fuso local do navegador; datas da API vêm como 'yyyy-MM-dd').
 */
const MS_DIA = 86400000;
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const pad = (n) => String(n).padStart(2, '0');

/** Date local (meia-noite) a partir de 'yyyy-MM-dd'. */
export function deIsoLocal(iso) {
  if (!iso) return null;
  const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, d);
}

/** 'yyyy-MM-dd' de um Date local. */
export function paraIsoLocal(data) {
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;
}

export function hojeLocal() {
  const h = new Date();
  return new Date(h.getFullYear(), h.getMonth(), h.getDate());
}

/** Dias de hoje até a data (negativo = já passou). */
export function diasAte(iso) {
  const alvo = deIsoLocal(iso);
  if (!alvo) return 0;
  return Math.round((alvo - hojeLocal()) / MS_DIA);
}

/** "12 out" */
export function diaMesCurto(iso) {
  const d = deIsoLocal(iso);
  return d ? `${d.getDate()} ${MESES_CURTOS[d.getMonth()]}` : '';
}

/** "Venceu há 3 dias · 12 out" | "Vence hoje" | "Vence amanhã" | "Vence em 4 dias · 18 out" */
export function rotuloVencimento(iso) {
  const d = diasAte(iso);
  if (d === 0) return 'Vence hoje';
  if (d === 1) return `Vence amanhã · ${diaMesCurto(iso)}`;
  if (d === -1) return `Venceu ontem · ${diaMesCurto(iso)}`;
  if (d < 0) return `Venceu há ${-d} dias · ${diaMesCurto(iso)}`;
  return `Vence em ${d} dias · ${diaMesCurto(iso)}`;
}

/** Próxima data (a partir de hoje) em que cai o dia `dia` do mês, respeitando meses curtos. */
export function proximaDataDoDia(dia) {
  const hoje = hojeLocal();
  const noMes = (ano, mes) => new Date(ano, mes, Math.min(dia, new Date(ano, mes + 1, 0).getDate()));
  const neste = noMes(hoje.getFullYear(), hoje.getMonth());
  return neste >= hoje ? neste : noMes(hoje.getFullYear(), hoje.getMonth() + 1);
}

export { MESES_CURTOS };
