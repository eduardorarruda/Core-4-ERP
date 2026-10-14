/*
 * Preferências de acessibilidade do Core 4 — lógica pura (sem React).
 *
 * As escolhas viram atributos `data-*` no <html>; o CSS (index.css, seção "Modo de
 * acessibilidade") faz o resto. Assim TODAS as telas mudam juntas, sem cada uma precisar
 * saber dos modos — desde que usem os tokens (veja components/ui/README.md › Acessibilidade).
 *
 * Gravado em localStorage (`core4.acessibilidade`). O padrão de cada opção segue o sistema
 * operacional (prefers-reduced-motion, prefers-contrast, forced-colors).
 */
import { MotionGlobalConfig } from 'motion/react';

export const CHAVE_PREFERENCIAS = 'core4.acessibilidade';

export const TAMANHOS_TEXTO = [100, 112.5, 125, 150, 175];
export const CONTRASTES = ['sistema', 'padrao', 'alto'];
export const MOVIMENTOS = ['sistema', 'reduzido', 'desligado'];
export const FONTES = ['padrao', 'legibilidade', 'dislexia'];
export const VISOES_COR = ['padrao', 'protanopia', 'deuteranopia', 'tritanopia', 'monocromia'];

/** Valores de fábrica (tudo "segue o sistema"). */
export const PADRAO = Object.freeze({
  tamanhoTexto: 100,
  contraste: 'sistema',
  movimento: 'sistema',
  fonte: 'padrao',
  espacamento: false,
  sublinharLinks: false,
  focoDestacado: false,
  alvosAmplos: false,
  visaoCor: 'padrao',
  padroesGraficos: false,
  leituraSimplificada: false,
  guiaLeitura: false,
  cursorGrande: false,
  pausarAnimacoes: false,
  atalhos: true,
});

const BOOLEANOS = [
  'espacamento', 'sublinharLinks', 'focoDestacado', 'alvosAmplos', 'padroesGraficos',
  'leituraSimplificada', 'guiaLeitura', 'cursorGrande', 'pausarAnimacoes', 'atalhos',
];

/** Conjuntos prontos (um clique). O usuário pode ajustar depois. */
export const PRESETS = Object.freeze([
  {
    id: 'baixa-visao',
    nome: 'Baixa visão',
    descricao: 'Texto 150%, alto contraste, fonte Atkinson, foco bem visível e alvos maiores.',
    valores: { tamanhoTexto: 150, contraste: 'alto', fonte: 'legibilidade', focoDestacado: true, alvosAmplos: true, sublinharLinks: true, cursorGrande: true },
  },
  {
    id: 'dislexia',
    nome: 'Dislexia',
    descricao: 'Fonte Lexend, espaçamento ampliado, leitura simplificada e guia de leitura.',
    valores: { fonte: 'dislexia', espacamento: true, leituraSimplificada: true, guiaLeitura: true, tamanhoTexto: 112.5 },
  },
  {
    id: 'movimento',
    nome: 'Sensibilidade a movimento',
    descricao: 'Desliga animações, pausa o que se move e tira o fundo animado.',
    valores: { movimento: 'desligado', pausarAnimacoes: true, leituraSimplificada: true },
  },
  {
    id: 'daltonismo',
    nome: 'Daltonismo',
    descricao: 'Paleta segura para deuteranopia e protanopia, com padrões nos gráficos.',
    valores: { visaoCor: 'deuteranopia', padroesGraficos: true },
  },
  {
    id: 'teclado',
    nome: 'Uso com teclado',
    descricao: 'Foco bem visível, links sublinhados e alvos maiores.',
    valores: { focoDestacado: true, sublinharLinks: true, alvosAmplos: true },
  },
]);

const umDe = (lista, valor, padrao) => (lista.includes(valor) ? valor : padrao);

/** Valida o que veio do storage (nunca confie em dado salvo). */
export function normalizarPreferencias(bruto) {
  const p = bruto && typeof bruto === 'object' ? bruto : {};
  const saida = {
    tamanhoTexto: umDe(TAMANHOS_TEXTO, Number(p.tamanhoTexto), PADRAO.tamanhoTexto),
    contraste: umDe(CONTRASTES, p.contraste, PADRAO.contraste),
    movimento: umDe(MOVIMENTOS, p.movimento, PADRAO.movimento),
    fonte: umDe(FONTES, p.fonte, PADRAO.fonte),
    visaoCor: umDe(VISOES_COR, p.visaoCor, PADRAO.visaoCor),
  };
  BOOLEANOS.forEach((k) => {
    saida[k] = typeof p[k] === 'boolean' ? p[k] : PADRAO[k];
  });
  return saida;
}

export function lerPreferencias() {
  try {
    const salvo = localStorage.getItem(CHAVE_PREFERENCIAS);
    return normalizarPreferencias(salvo ? JSON.parse(salvo) : null);
  } catch {
    return { ...PADRAO };
  }
}

export function salvarPreferencias(prefs) {
  try {
    localStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify(prefs));
  } catch { /* storage bloqueado (aba anônima): vale só nesta sessão */ }
}

function consulta(media) {
  try {
    return typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(media).matches : false;
  } catch {
    return false;
  }
}

/** Estado do sistema operacional que influencia os padrões. */
export function lerSistema() {
  return {
    menosMovimento: consulta('(prefers-reduced-motion: reduce)'),
    maisContraste: consulta('(prefers-contrast: more)'),
    coresForcadas: consulta('(forced-colors: active)'),
  };
}

/** Resolve "sistema" para o valor efetivo. */
export function resolverPreferencias(prefs, sistema = lerSistema()) {
  const contraste = prefs.contraste === 'sistema' ? (sistema.maisContraste ? 'alto' : 'padrao') : prefs.contraste;
  const movimentoBase = prefs.movimento === 'sistema' ? (sistema.menosMovimento ? 'reduzido' : 'normal') : prefs.movimento;
  const movimento = prefs.pausarAnimacoes && movimentoBase === 'normal' ? 'reduzido' : movimentoBase;
  return {
    ...prefs,
    contraste,
    movimento,
    padroesAtivos: prefs.padroesGraficos || prefs.visaoCor !== 'padrao',
    coresForcadas: sistema.coresForcadas,
  };
}

// Fontes de leitura: baixadas só quando escolhidas (não pesam para quem não usa).
const FONTES_CARREGADAS = new Set();
function carregarFonte(fonte) {
  if (fonte === 'padrao' || FONTES_CARREGADAS.has(fonte)) return;
  FONTES_CARREGADAS.add(fonte);
  const carga = fonte === 'legibilidade'
    ? import('@fontsource-variable/atkinson-hyperlegible-next')
    : import('@fontsource-variable/lexend');
  carga.catch(() => FONTES_CARREGADAS.delete(fonte)); // sem rede: cai na fonte de reserva do CSS
}

function marcar(raiz, nome, valor) {
  if (valor === null || valor === undefined || valor === false) raiz.removeAttribute(nome);
  else raiz.setAttribute(nome, valor === true ? '' : String(valor));
}

/**
 * Aplica as preferências (já resolvidas) no <html>. Chamado antes do 1º render (main.jsx)
 * e a cada mudança. Idempotente.
 */
export function aplicarNoDocumento(efetivo) {
  if (typeof document === 'undefined') return;
  const raiz = document.documentElement;
  marcar(raiz, 'data-texto', efetivo.tamanhoTexto === 100 ? null : String(efetivo.tamanhoTexto).replace('.', '_'));
  marcar(raiz, 'data-contraste', efetivo.contraste === 'alto' ? 'alto' : null);
  marcar(raiz, 'data-movimento', efetivo.movimento === 'normal' ? null : efetivo.movimento);
  marcar(raiz, 'data-fonte', efetivo.fonte === 'padrao' ? null : efetivo.fonte);
  marcar(raiz, 'data-espacamento', efetivo.espacamento ? 'amplo' : null);
  marcar(raiz, 'data-sublinhar-links', efetivo.sublinharLinks);
  marcar(raiz, 'data-foco', efetivo.focoDestacado ? 'destacado' : null);
  marcar(raiz, 'data-alvos', efetivo.alvosAmplos ? 'amplos' : null);
  marcar(raiz, 'data-daltonismo', efetivo.visaoCor === 'padrao' ? null : efetivo.visaoCor);
  marcar(raiz, 'data-padroes', efetivo.padroesAtivos);
  marcar(raiz, 'data-leitura', efetivo.leituraSimplificada ? 'simplificada' : null);
  marcar(raiz, 'data-cursor', efetivo.cursorGrande ? 'grande' : null);
  marcar(raiz, 'data-pausar', efetivo.pausarAnimacoes);
  carregarFonte(efetivo.fonte);

  // Movimento "desligado" ou "pausar tudo": toda animação do motion pula direto pro fim
  // (inclui count-up de KPI, molas de modal e animações disparadas por atualização de dados).
  MotionGlobalConfig.instantAnimations = efetivo.movimento === 'desligado' || efetivo.pausarAnimacoes;
}

/** Leitura síncrona para código fora do React (ex.: props de gráfico). */
export function movimentoReduzidoAgora() {
  if (typeof document === 'undefined') return false;
  return document.documentElement.hasAttribute('data-movimento') || consulta('(prefers-reduced-motion: reduce)');
}

/** Bootstrap: aplica o que estiver salvo antes do React pintar a tela. */
export function aplicarPreferenciasSalvas() {
  const prefs = lerPreferencias();
  aplicarNoDocumento(resolverPreferencias(prefs));
  return prefs;
}

/** Lista de atalhos de teclado do app (mostrada no painel e na declaração). */
export const ATALHOS = Object.freeze([
  { teclas: ['Alt', 'A'], acao: 'Abrir as opções de acessibilidade' },
  { teclas: ['Ctrl', 'K'], acao: 'Buscar telas, contas e parceiros (⌘ K no Mac)' },
  { teclas: ['Alt', 'T'], acao: 'Alternar tema claro e escuro' },
  { teclas: ['Alt', 'P'], acao: 'Esconder ou mostrar valores (modo privacidade)' },
  { teclas: ['Tab'], acao: 'Ir para o próximo controle (Shift + Tab volta)' },
  { teclas: ['Esc'], acao: 'Fechar janela, menu ou painel aberto' },
  { teclas: ['↑', '↓'], acao: 'Mover entre opções de listas, menus e busca' },
]);
