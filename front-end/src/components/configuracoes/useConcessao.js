import { useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAuthContext, empresaAtivaDe } from '../../context/AuthContext';
import { podeConcederQualquer } from './perfilUtils';

/**
 * O que o usuário atual pode conceder (espelho da regra de escalada do backend — só UX).
 * Devolve { tudo, pode(codigo), faltam(codigos[]) , usuarioId, email }.
 */
export function useConcessao() {
  const { adminSistema, permissoes, usuario } = useAuth();
  const { loginState } = useAuthContext();
  const perfilNome = empresaAtivaDe(loginState)?.perfilNome;
  return useMemo(() => {
    const tudo = podeConcederQualquer({ adminSistema, perfilNome });
    const pode = (codigo) => tudo || permissoes.has(codigo);
    return {
      tudo,
      pode,
      faltam: (codigos) => (tudo ? [] : (codigos ?? []).filter((c) => !permissoes.has(c))),
      usuarioId: usuario?.id ?? null,
      email: usuario?.email ?? null,
    };
  }, [adminSistema, perfilNome, permissoes, usuario?.id, usuario?.email]);
}

export default useConcessao;
