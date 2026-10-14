import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Carrega dados de forma assíncrona sem `setState` síncrono dentro de efeito (regra
 * react-hooks/set-state-in-effect do React 19). "Carregando" é DERIVADO: compara a chave e a
 * tentativa pedidas com as da última resposta. Enquanto recarrega, os dados anteriores
 * continuam na tela (sem piscar).
 *
 *   const { dados, erro, carregando, recarregar, setDados } = useCarga(
 *     () => contas.listar({ inicio: periodo.inicio, fim: periodo.fim }),
 *     [periodo.inicio, periodo.fim],
 *   );
 *
 * - fn: função que devolve uma Promise (pode mudar a cada render — fica numa ref)
 * - deps: valores serializáveis que, ao mudar, disparam nova carga
 * - opcoes.ativo (true): false pausa a carga (ex.: sem permissão) e devolve carregando=false
 * - opcoes.inicial: valor de `dados` antes da 1ª resposta (padrão null)
 *
 * Respostas fora de ordem são descartadas. `setDados` permite atualizar a lista localmente
 * após criar/editar/excluir sem recarregar.
 */
export function useCarga(fn, deps = [], { ativo = true, inicial = null } = {}) {
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });

  const chave = JSON.stringify(deps);
  const [tentativa, setTentativa] = useState(0);
  const [estado, setEstado] = useState({ chave: null, tentativa: -1, dados: inicial, erro: null });

  useEffect(() => {
    if (!ativo) return undefined;
    let vigente = true;
    Promise.resolve()
      .then(() => fnRef.current())
      .then(
        (dados) => { if (vigente) setEstado({ chave, tentativa, dados, erro: null }); },
        (erro) => { if (vigente) setEstado((e) => ({ ...e, chave, tentativa, erro })); },
      );
    return () => { vigente = false; };
  }, [chave, tentativa, ativo]);

  const recarregar = useCallback(() => setTentativa((t) => t + 1), []);
  const setDados = useCallback((atualizar) => {
    setEstado((e) => ({ ...e, dados: typeof atualizar === 'function' ? atualizar(e.dados) : atualizar }));
  }, []);

  const carregando = ativo && (estado.chave !== chave || estado.tentativa !== tentativa);
  return {
    dados: estado.dados,
    erro: carregando ? null : estado.erro,
    carregando,
    // true só na 1ª carga (sem dados ainda) — use para skeleton; nas recargas, mostre os dados
    carregandoInicial: carregando && estado.chave === null,
    recarregar,
    setDados,
  };
}

export default useCarga;
