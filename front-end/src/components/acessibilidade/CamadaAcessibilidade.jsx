import React, { lazy, Suspense } from 'react';
import { useAcessibilidade } from '../../hooks/useAcessibilidade';
import LinksPular from './LinksPular';
import AnunciadorRota from './AnunciadorRota';
import GuiaLeitura from './GuiaLeitura';

const PainelAcessibilidade = lazy(() => import('./PainelAcessibilidade'));

/**
 * Tudo do modo de acessibilidade que vive acima das rotas (montar UMA vez, dentro do
 * BrowserRouter): links "pular para…", anúncio de troca de página, guia de leitura e o painel.
 */
export default function CamadaAcessibilidade() {
  const { painelAberto, efetivo } = useAcessibilidade();
  const [painelUsado, setPainelUsado] = React.useState(false);
  if (painelAberto && !painelUsado) setPainelUsado(true); // baixa o painel só no 1º uso

  return (
    <>
      <LinksPular />
      <AnunciadorRota />
      {efetivo.guiaLeitura && <GuiaLeitura />}
      {painelUsado && (
        <Suspense fallback={null}>
          <PainelAcessibilidade />
        </Suspense>
      )}
    </>
  );
}
