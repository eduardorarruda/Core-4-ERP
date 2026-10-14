import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import {
  PADRAO, PRESETS, lerPreferencias, lerSistema, normalizarPreferencias,
  resolverPreferencias, aplicarNoDocumento, salvarPreferencias,
} from '../components/acessibilidade/preferencias';

/**
 * Modo de acessibilidade (A11y · Design Inclusivo · Design Universal · WCAG 2.2).
 *
 * Guarda as preferências, aplica no <html> (atributos data-*), liga o MotionConfig da raiz,
 * escuta mudanças do sistema (reduzir movimento, contraste, cores forçadas), abre o painel
 * (Alt+A) e anuncia mudanças para leitores de tela. Use pelo hook `useAcessibilidade()`.
 */
export const AcessibilidadeContext = createContext(null);

const CONSULTAS_SISTEMA = ['(prefers-reduced-motion: reduce)', '(prefers-contrast: more)', '(forced-colors: active)'];

function emCampoDeTexto(alvo) {
  if (!alvo) return false;
  const tag = alvo.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || alvo.isContentEditable;
}

export function AcessibilidadeProvider({ children }) {
  const [preferencias, setPreferencias] = useState(lerPreferencias);
  const [sistema, setSistema] = useState(lerSistema);
  const [painelAberto, setPainelAberto] = useState(false);
  const [aviso, setAviso] = useState('');
  const timerAviso = useRef(null);

  const efetivo = useMemo(() => resolverPreferencias(preferencias, sistema), [preferencias, sistema]);

  useEffect(() => {
    aplicarNoDocumento(efetivo);
  }, [efetivo]);

  // Mudou no sistema operacional com o app aberto? Acompanha.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const listas = CONSULTAS_SISTEMA.map((q) => window.matchMedia(q));
    const atualizar = () => setSistema(lerSistema());
    listas.forEach((m) => m.addEventListener?.('change', atualizar));
    return () => listas.forEach((m) => m.removeEventListener?.('change', atualizar));
  }, []);

  // Outra aba mudou as preferências: sincroniza.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'core4.acessibilidade') setPreferencias(lerPreferencias());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /** Anuncia uma frase curta pela região viva (polite). */
  const anunciar = useCallback((mensagem) => {
    setAviso('');
    clearTimeout(timerAviso.current);
    // Limpa e escreve de novo: a mesma frase repetida também é lida.
    timerAviso.current = setTimeout(() => setAviso(mensagem), 60);
  }, []);
  useEffect(() => () => clearTimeout(timerAviso.current), []);

  const definir = useCallback((parcial) => {
    setPreferencias((atual) => {
      const nova = normalizarPreferencias({ ...atual, ...parcial });
      salvarPreferencias(nova);
      return nova;
    });
  }, []);

  const aplicarPreset = useCallback((id) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    definir(preset.valores);
    anunciar(`Conjunto "${preset.nome}" aplicado. Você pode ajustar cada opção abaixo.`);
  }, [definir, anunciar]);

  const restaurar = useCallback(() => {
    const limpo = { ...PADRAO };
    salvarPreferencias(limpo);
    setPreferencias(limpo);
    anunciar('Preferências de acessibilidade restauradas para o padrão.');
  }, [anunciar]);

  const abrirPainel = useCallback(() => setPainelAberto(true), []);
  const fecharPainel = useCallback(() => setPainelAberto(false), []);

  // Alt+A abre o painel. Com "atalhos" desligado, os atalhos com Alt do app param de
  // responder (captura antes dos outros ouvintes) — Ctrl/⌘+K continua (padrão do sistema).
  const atalhosLigados = preferencias.atalhos;
  useEffect(() => {
    const onKey = (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      // `code` vale em qualquer layout (no Mac, Option+A gera "å"); sem `code` (teclado
      // virtual/automação), cai para a tecla.
      const tecla = e.code || `Key${String(e.key || '').toUpperCase()}`;
      if (!atalhosLigados) {
        if (['KeyA', 'KeyT', 'KeyP'].includes(tecla)) e.stopImmediatePropagation();
        return;
      }
      if (tecla === 'KeyA' && !e.repeat && !emCampoDeTexto(e.target)) {
        e.preventDefault();
        setPainelAberto((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [atalhosLigados]);

  const valor = useMemo(() => ({
    preferencias,
    efetivo,
    sistema,
    definir,
    aplicarPreset,
    restaurar,
    anunciar,
    painelAberto,
    abrirPainel,
    fecharPainel,
    movimentoReduzido: efetivo.movimento !== 'normal',
    padroesAtivos: efetivo.padroesAtivos,
  }), [preferencias, efetivo, sistema, definir, aplicarPreset, restaurar, anunciar, painelAberto, abrirPainel, fecharPainel]);

  return (
    <AcessibilidadeContext.Provider value={valor}>
      {/* "reduzido"/"desligado"/"pausar" → nada de transform/layout animado em todo motion.* */}
      <MotionConfig reducedMotion={efetivo.movimento !== 'normal' ? 'always' : 'user'}>
        {children}
      </MotionConfig>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{aviso}</div>
    </AcessibilidadeContext.Provider>
  );
}
