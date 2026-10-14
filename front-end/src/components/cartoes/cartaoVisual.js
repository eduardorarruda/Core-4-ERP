/*
 * Identidade visual de cada cartão (o "plástico"). O backend não guarda bandeira nem cor:
 * a bandeira vem do nome ("Cartão Pessoal Master" → Mastercard) e a cor é estável por cartão.
 * Todas as cores saem de tokens (--color-*), então o modo alto contraste e o tema funcionam.
 */

const BANDEIRAS = [
  { id: 'mastercard', nome: 'Mastercard', padrao: /\bmaster(card)?\b/i },
  { id: 'visa', nome: 'Visa', padrao: /\bvisa\b/i },
  { id: 'elo', nome: 'Elo', padrao: /\belo\b/i },
  { id: 'amex', nome: 'American Express', padrao: /\b(amex|american express)\b/i },
  { id: 'hipercard', nome: 'Hipercard', padrao: /\bhiper(card)?\b/i },
];

/** { id, nome } da bandeira deduzida do nome do cartão, ou null. */
export function bandeiraDoNome(nome = '') {
  const achada = BANDEIRAS.find((b) => b.padrao.test(nome));
  return achada ? { id: achada.id, nome: achada.nome } : null;
}

/**
 * Acabamentos do plástico: esmeralda → petróleo (marca), prata escovada, oceano e ouro.
 * Sem roxo/rosa (fora da marca).
 */
export const ACABAMENTOS = {
  esmeralda: {
    rotulo: 'Esmeralda',
    fundo: `radial-gradient(130% 120% at 0% 0%, color-mix(in srgb, var(--color-primary) 46%, transparent), transparent 58%),
      radial-gradient(90% 90% at 100% 100%, color-mix(in srgb, var(--color-primary) 18%, transparent), transparent 60%),
      linear-gradient(135deg, var(--color-surface-highest), var(--color-surface) 75%)`,
    brilho: 'var(--color-primary)',
  },
  prata: {
    rotulo: 'Prata',
    fundo: `radial-gradient(120% 120% at 10% 0%, color-mix(in srgb, var(--color-silver) 42%, transparent), transparent 55%),
      repeating-linear-gradient(90deg, color-mix(in srgb, var(--color-silver) 5%, transparent) 0 1px, transparent 1px 3px),
      linear-gradient(135deg, color-mix(in srgb, var(--color-silver) 24%, var(--color-surface-high)), var(--color-surface) 80%)`,
    brilho: 'var(--color-silver)',
  },
  oceano: {
    rotulo: 'Oceano',
    fundo: `radial-gradient(130% 120% at 0% 0%, color-mix(in srgb, var(--color-secondary) 40%, transparent), transparent 58%),
      linear-gradient(135deg, color-mix(in srgb, var(--color-secondary) 14%, var(--color-surface-highest)), var(--color-surface) 78%)`,
    brilho: 'var(--color-secondary)',
  },
  ouro: {
    rotulo: 'Ouro',
    fundo: `radial-gradient(130% 120% at 0% 0%, color-mix(in srgb, var(--color-invest) 40%, transparent), transparent 58%),
      linear-gradient(135deg, color-mix(in srgb, var(--color-invest) 12%, var(--color-surface-highest)), var(--color-surface) 78%)`,
    brilho: 'var(--color-invest)',
  },
};

const ORDEM = ['esmeralda', 'prata', 'oceano', 'ouro'];

/** Acabamento estável do cartão: Master → prata, Visa → esmeralda, demais pelo id. */
export function acabamentoDoCartao(cartao) {
  const bandeira = bandeiraDoNome(cartao?.nome);
  if (bandeira?.id === 'visa') return 'esmeralda';
  if (bandeira?.id === 'mastercard') return 'prata';
  if (bandeira?.id === 'amex') return 'oceano';
  if (bandeira?.id === 'elo') return 'ouro';
  const id = Number(cartao?.id) || 0;
  return ORDEM[Math.abs(id) % ORDEM.length];
}

/** Nome curto para o plástico: tira "Cartão" e a bandeira do fim ("Cartão Pessoal Master" → "Pessoal"). */
export function apelidoDoCartao(nome = '') {
  const semPrefixo = nome.replace(/^cart[aã]o\s+(de\s+cr[eé]dito\s+)?/i, '').trim();
  const semBandeira = BANDEIRAS.reduce((t, b) => t.replace(b.padrao, ''), semPrefixo).replace(/\s{2,}/g, ' ').trim();
  return semBandeira || semPrefixo || nome;
}
