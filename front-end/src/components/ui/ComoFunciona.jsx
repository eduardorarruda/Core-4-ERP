import React, { useState } from 'react';
import { ChevronDown, Lightbulb } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Revelar } from '../motion/Movimento';

/**
 * Cartão "Como funciona" / "Como ler": até 4 linhas de ícone + frase explicando a tela.
 * Pode ser recolhível (lembra a escolha por tela no navegador).
 *
 *   <ComoFunciona
 *     titulo="Como funciona a conciliação"
 *     itens={[
 *       { icon: Upload, texto: 'Importe o extrato OFX do seu banco.' },
 *       { icon: Link2, texto: 'Confira as sugestões e vincule cada item a uma conta.' },
 *       { icon: CheckCircle2, texto: 'Itens vinculados atualizam o saldo da conta bancária.' },
 *     ]}
 *     recolhivel chave="conciliacao"
 *   />
 *
 * Props: titulo, itens [{ icon, texto }], recolhivel (false), chave (id p/ lembrar), className.
 */
const lerFechado = (chave) => {
  if (!chave) return false;
  try { return localStorage.getItem(`c4_como_${chave}`) === '0'; } catch { return false; }
};

export default function ComoFunciona({ titulo = 'Como funciona', itens = [], recolhivel = false, chave, className }) {
  const [aberto, setAberto] = useState(() => !lerFechado(chave));
  const alternar = () => {
    setAberto((v) => {
      try { if (chave) localStorage.setItem(`c4_como_${chave}`, v ? '0' : '1'); } catch { /* sem storage */ }
      return !v;
    });
  };
  const idCorpo = `como-${chave ?? 'tela'}`;

  const lista = (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-1">
      {itens.map((item, i) => {
        const Icone = item.icon;
        return (
          <li key={i} className="flex items-start gap-3">
            <span aria-hidden="true" className="grid place-items-center w-8 h-8 shrink-0 rounded-lg bg-primary/[0.1] text-primary border border-primary/20">
              {Icone ? <Icone className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
            </span>
            <p className="text-sm text-text-primary/75 leading-relaxed pt-1">{item.texto}</p>
          </li>
        );
      })}
    </ul>
  );

  return (
    <section className={cn('c4-card px-4 py-3.5 sm:px-5', className)} aria-label={titulo}>
      {recolhivel ? (
        <button
          type="button"
          onClick={alternar}
          aria-expanded={aberto}
          aria-controls={idCorpo}
          className="w-full flex items-center gap-2.5 min-h-9 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Lightbulb className="w-4 h-4 text-invest shrink-0" aria-hidden="true" />
          <span className="flex-1 text-sm font-semibold">{titulo}</span>
          <ChevronDown className={cn('w-4 h-4 text-text-primary/50 transition-transform', aberto && 'rotate-180')} aria-hidden="true" />
        </button>
      ) : (
        <h2 className="flex items-center gap-2.5 text-sm font-semibold font-body tracking-normal mb-2">
          <Lightbulb className="w-4 h-4 text-invest shrink-0" aria-hidden="true" />
          {titulo}
        </h2>
      )}
      {recolhivel ? (
        <Revelar aberto={aberto} id={idCorpo}><div className="pt-3 pb-1">{lista}</div></Revelar>
      ) : lista}
    </section>
  );
}
