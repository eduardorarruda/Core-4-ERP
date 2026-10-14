import React from 'react';
import { Teclas } from '../acessibilidade/Controles';

/**
 * Tabela de atalhos de teclado (mesma lista do painel de acessibilidade — ATALHOS em
 * components/acessibilidade/preferencias.js). Usada em Configurações e na Central de Ajuda.
 */
export default function ListaAtalhos({ atalhos, legenda = 'Atalhos de teclado' }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{legenda}</caption>
      <thead className="sr-only">
        <tr><th scope="col">Teclas</th><th scope="col">O que faz</th></tr>
      </thead>
      <tbody className="divide-y divide-border">
        {atalhos.map((a) => (
          <tr key={a.acao}>
            <td className="py-2.5 pr-4 align-top whitespace-nowrap"><Teclas teclas={a.teclas} /></td>
            <td className="py-2.5 text-text-primary/80 leading-relaxed">{a.acao}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
