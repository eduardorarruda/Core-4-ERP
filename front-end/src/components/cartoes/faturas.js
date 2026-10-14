import { MESES_ABREV } from '../../lib/constants';

/*
 * Regras de fatura do cartão usadas no front (mesma regra do backend — FaturaHelper):
 * compra com dia >= dia de fechamento entra na fatura do mês seguinte.
 * Uma fatura do mês M vence no dia de vencimento do cartão em M+1.
 */

/** Chave estável da fatura: "2026-10". */
export const chaveFatura = (ano, mes) => `${ano}-${String(mes).padStart(2, '0')}`;

/** "out/26" (curto) ou "out/2026". */
export function rotuloFatura(ano, mes, { curto = true } = {}) {
  const m = (MESES_ABREV[(Number(mes) || 1) - 1] ?? '').toLowerCase();
  return `${m}/${curto ? String(ano).slice(2) : ano}`;
}

/** "2026-11" → { ano: 2026, mes: 11 } */
export function deChave(chave) {
  const [ano, mes] = String(chave ?? '').split('-').map(Number);
  return ano && mes ? { ano, mes } : null;
}

/** Fatura em que uma compra (yyyy-MM-dd) entra, dado o dia de fechamento do cartão. */
export function faturaDaCompra(dataIso, diaFechamento) {
  if (!dataIso || !diaFechamento) return null;
  const [ano, mes, dia] = dataIso.split('-').map(Number);
  if (!ano || !mes || !dia) return null;
  if (dia >= Number(diaFechamento)) {
    return mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 };
  }
  return { ano, mes };
}

/** Data de vencimento (Date) de uma fatura: dia de vencimento no mês seguinte ao da fatura. */
export function vencimentoDaFatura(ano, mes, diaVencimento) {
  const proxAno = mes === 12 ? ano + 1 : ano;
  const proxMes = mes === 12 ? 1 : mes + 1;
  const ultimoDia = new Date(proxAno, proxMes, 0).getDate();
  return new Date(proxAno, proxMes - 1, Math.min(Number(diaVencimento) || 1, ultimoDia));
}

/** Valor com sinal do lançamento: SAÍDA soma na fatura, ENTRADA (estorno/crédito) abate. */
export const valorLiquido = (l) => (l.tipo === 'ENTRADA' ? -1 : 1) * (Number(l.valor) || 0);

/**
 * Agrupa lançamentos em faturas, da mais antiga para a mais nova.
 * Cada fatura: { chave, ano, mes, total (líquido), qtd, fechada, situacao }
 * situacao: 'fechada' | 'aberta' (a 1ª não fechada — a próxima a fechar) | 'futura'.
 */
export function agruparFaturas(lancamentos = []) {
  const mapa = new Map();
  for (const l of lancamentos) {
    const chave = chaveFatura(l.anoFatura, l.mesFatura);
    const atual = mapa.get(chave) ?? { chave, ano: l.anoFatura, mes: l.mesFatura, total: 0, qtd: 0, fechada: true };
    mapa.set(chave, {
      ...atual,
      total: atual.total + valorLiquido(l),
      qtd: atual.qtd + 1,
      fechada: atual.fechada && Boolean(l.faturaFechada),
    });
  }
  const lista = [...mapa.values()].sort((a, b) => a.ano - b.ano || a.mes - b.mes);
  const iAberta = lista.findIndex((f) => !f.fechada);
  return lista.map((f, i) => ({
    ...f,
    situacao: f.fechada ? 'fechada' : i === iAberta ? 'aberta' : 'futura',
  }));
}

/**
 * Soma líquida por categoria (maior primeiro). Agrupa o que passar de `max` em "Outras".
 * Devolve [{ nome, valor }] só com valores positivos (créditos abatem a própria categoria).
 */
export function totaisPorCategoria(lancamentos = [], max = 5) {
  const mapa = new Map();
  for (const l of lancamentos) {
    const nome = l.categoriaDescricao || 'Sem categoria';
    mapa.set(nome, (mapa.get(nome) ?? 0) + valorLiquido(l));
  }
  const ordenado = [...mapa.entries()]
    .map(([nome, valor]) => ({ nome, valor }))
    .filter((c) => c.valor > 0.004)
    .sort((a, b) => b.valor - a.valor);
  if (ordenado.length <= max) return ordenado;
  const resto = ordenado.slice(max - 1).reduce((s, c) => s + c.valor, 0);
  return [...ordenado.slice(0, max - 1), { nome: 'Outras', valor: resto, outras: true }];
}

/** Uso do limite em fração (0–1+). */
export function fracaoLimite(cartao) {
  const limite = Number(cartao?.limite) || 0;
  return limite > 0 ? (Number(cartao?.limiteUsado) || 0) / limite : 0;
}

/** Tom do uso do limite: até 70% esmeralda, até 90% atenção, acima disso alerta. */
export function tomLimite(fracao) {
  if (fracao >= 0.9) return 'expense';
  if (fracao >= 0.7) return 'warning';
  return 'primary';
}
