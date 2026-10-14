/**
 * PermissaoGuard — renderiza os children somente se o usuário
 * tiver a permissão indicada. Caso contrário, renderiza `fallback`
 * (por padrão nada, mas pode receber um botão desabilitado).
 *
 * Uso:
 *   <PermissaoGuard permissao="CONTA_CRIAR">
 *     <button onClick={...}>Novo Lançamento</button>
 *   </PermissaoGuard>
 *
 *   <PermissaoGuard permissao="CONTA_DELETAR" fallback={
 *     <button disabled title="Sem permissão">Excluir</button>
 *   }>
 *     <button onClick={deletar}>Excluir</button>
 *   </PermissaoGuard>
 */
import { usePermissao } from '../../hooks/usePermissao';

export default function PermissaoGuard({ permissao, children, fallback = null }) {
  const pode = usePermissao();
  if (!pode(permissao)) return fallback;
  return children;
}
