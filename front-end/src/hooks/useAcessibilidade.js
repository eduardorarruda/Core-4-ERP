import { useContext } from 'react';
import { useReducedMotionConfig } from 'motion/react';
import { AcessibilidadeContext } from '../context/AcessibilidadeContext';
import { PADRAO, resolverPreferencias } from '../components/acessibilidade/preferencias';

const NOOP = () => {};
// Fora do provider (testes, Storybook): tudo no padrão, nada quebra.
const FORA_DO_PROVIDER = Object.freeze({
  preferencias: PADRAO,
  efetivo: resolverPreferencias(PADRAO, { menosMovimento: false, maisContraste: false, coresForcadas: false }),
  sistema: { menosMovimento: false, maisContraste: false, coresForcadas: false },
  definir: NOOP,
  aplicarPreset: NOOP,
  restaurar: NOOP,
  anunciar: NOOP,
  painelAberto: false,
  abrirPainel: NOOP,
  fecharPainel: NOOP,
  movimentoReduzido: false,
  padroesAtivos: false,
});

/**
 * Preferências de acessibilidade do usuário.
 *
 *   const { preferencias, efetivo, definir, abrirPainel, anunciar, movimentoReduzido, padroesAtivos } = useAcessibilidade();
 *
 * - preferencias: o que o usuário escolheu (pode ter "sistema")
 * - efetivo: o valor resolvido (contraste 'alto'|'padrao', movimento 'normal'|'reduzido'|'desligado', …)
 * - definir({ chave: valor }): muda e salva
 * - abrirPainel(): abre o painel "Acessibilidade" (o mesmo do Alt+A)
 * - anunciar('Texto'): fala uma frase curta no leitor de tela (aria-live polite)
 */
export function useAcessibilidade() {
  return useContext(AcessibilidadeContext) ?? FORA_DO_PROVIDER;
}

/**
 * true quando NÃO se deve animar: "reduzir movimento" do sistema OU do painel do Core 4.
 * Use no lugar de `useReducedMotion` do motion (que só olha o sistema).
 */
export function useMovimentoReduzido() {
  return Boolean(useReducedMotionConfig());
}

export default useAcessibilidade;
