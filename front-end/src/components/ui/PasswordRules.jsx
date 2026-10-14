import React from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { REGRAS_SENHA } from '../../lib/senha';

/**
 * Checklist visual da política de senha (regras em lib/senha.js).
 * Só é exibida quando há algo digitado, a menos que `sempreVisivel` seja true.
 */
export default function PasswordRules({ senha = '', className, sempreVisivel = false, id }) {
  if (!sempreVisivel && !senha) return null;

  return (
    <ul
      id={id}
      aria-label="Requisitos da senha"
      className={cn('flex flex-col gap-1 list-none m-0 p-0', className)}
    >
      {REGRAS_SENHA.map((regra) => {
        const ok = regra.testar(senha);
        return (
          <li
            key={regra.id}
            className={cn(
              'flex items-center gap-1.5 text-xs',
              ok ? 'text-primary' : 'text-text-primary/70'
            )}
          >
            {ok
              ? <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
              : <Minus className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />}
            <span>{regra.label}</span>
            <span className="sr-only">{ok ? ' — atendido' : ' — pendente'}</span>
          </li>
        );
      })}
    </ul>
  );
}
