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

export const formatPercent = (v, decimals = 1) =>
  `${Number(v ?? 0).toFixed(decimals)}%`;

export const compact = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
};

export const brlCompact = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `R$ ${(n / 1_000).toFixed(1)}k`;
  return `R$ ${brl(n)}`;
};
