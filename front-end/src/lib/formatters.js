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

