import { useEffect, useState } from 'react';

/** Devolve `valor` só depois de `atraso` ms sem mudanças (busca enquanto digita). */
export function useValorAtrasado(valor, atraso = 300) {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setAtrasado(valor), atraso);
    return () => clearTimeout(t);
  }, [valor, atraso]);
  return atrasado;
}

export default useValorAtrasado;
