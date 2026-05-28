/**
 * Hook para verificar permissões do usuário logado.
 *
 * Uso:
 *   const pode = usePermissao();
 *   if (pode('CONTA_CRIAR')) { ... }
 *
 * Também exporta o componente <SemPermissao /> para bloquear seções inteiras.
 */
import { useAuth } from './useAuth';

export function usePermissao() {
  const { temPermissao } = useAuth();
  return temPermissao;
}
