export const brl = (v) =>
  Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatDate = (d) => {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d + 'T00:00:00') : new Date(d);
  return date.toLocaleDateString('pt-BR');
};

export const formatDateTime = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

// ── Formatadores Intl (pt-BR) reaproveitados por AnimatedNumber/KpiCard/gráficos ──
const cacheFormatadores = new Map();

function obterFormatador(chave, opcoes) {
  if (!cacheFormatadores.has(chave)) cacheFormatadores.set(chave, new Intl.NumberFormat('pt-BR', opcoes));
  return cacheFormatadores.get(chave);
}

/**
 * Formata um número no padrão brasileiro.
 * formato: 'currency' (R$ 1.234,56) | 'percent' (12,5% — recebe 12.5, não 0.125)
 *        | 'number' (1.234) | 'compact' (R$ 1,2 mil)
 */
export function formatarNumero(valor, formato = 'number', { casas, moeda = 'BRL' } = {}) {
  const n = Number(valor ?? 0);
  const v = Number.isFinite(n) ? n : 0;
  // Negativo com o sinal de menos tipográfico (−R$ 21,00), não o hífen do Intl
  const menos = v < 0 ? '\u2212' : '';
  if (formato === 'currency') {
    const c = casas ?? 2;
    return menos + obterFormatador(`cur-${moeda}-${c}`, { style: 'currency', currency: moeda, minimumFractionDigits: c, maximumFractionDigits: c }).format(Math.abs(v));
  }
  if (formato === 'compact') {
    return menos + obterFormatador(`cmp-${moeda}`, { style: 'currency', currency: moeda, notation: 'compact', maximumFractionDigits: 1 }).format(Math.abs(v));
  }
  if (formato === 'percent') {
    const c = casas ?? 1;
    return obterFormatador(`pct-${c}`, { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: c }).format(v / 100);
  }
  const c = casas ?? 0;
  return obterFormatador(`num-${c}`, { minimumFractionDigits: c, maximumFractionDigits: c }).format(v);
}


/**
 * Moeda (R$) com sinal tipográfico correto: "R$ 1.234,56", "−R$ 21,00".
 * opcoes.sinal: 'auto' (padrão: só o menos) | 'sempre' (+R$ 10,00 / −R$ 10,00) | 'nunca' (valor absoluto)
 */
export function formatarMoeda(valor, { sinal = 'auto', casas } = {}) {
  const n = Number(valor ?? 0);
  const abs = formatarNumero(Math.abs(n), 'currency', { casas });
  if (sinal === 'nunca' || n === 0) return abs;
  if (n < 0) return `−${abs}`;
  return sinal === 'sempre' ? `+${abs}` : abs;
}

/** "Eduardo Ribeiro Arruda" → "ER" (avatares). */
export function iniciais(nome) {
  if (!nome) return '?';
  return nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}
