import React from 'react';

/**
 * Envolve um gráfico (Recharts/SVG) para leitores de tela: o desenho vira uma imagem com
 * descrição (`resumo`) e, se `tabela` for informada, os números ficam disponíveis numa
 * tabela invisível na tela (sr-only). O tooltip do Recharts só existe com mouse.
 *
 * tabela: { titulo, colunas: string[], linhas: (string|number)[][] }
 */
export default function GraficoAcessivel({ resumo, tabela, className, children }) {
  return (
    <>
      <div role="img" aria-label={resumo} className={className}>
        {children}
      </div>
      {tabela?.linhas?.length > 0 && (
        <table className="sr-only">
          <caption>{tabela.titulo}</caption>
          <thead>
            <tr>{tabela.colunas.map((c) => <th key={c} scope="col">{c}</th>)}</tr>
          </thead>
          <tbody>
            {tabela.linhas.map((linha, i) => (
              <tr key={i}>
                {linha.map((celula, j) => (j === 0
                  ? <th key={j} scope="row">{celula}</th>
                  : <td key={j}>{celula}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
