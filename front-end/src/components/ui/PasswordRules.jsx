import React from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Fonte ÚNICA da política de senha do sistema.
 * Regra oficial (alinhada ao backend): mínimo de 8 caracteres,
 * com pelo menos uma letra maiúscula, uma minúscula e um número.
 */
export const REGRAS_SENHA = [
  { id: 'tamanho',   label: 'Mínimo de 8 caracteres', testar: (s) => s.length >= 8 },
  { id: 'maiuscula', label: 'Uma letra maiúscula',    testar: (s) => /[A-Z]/.test(s) },
  { id: 'minuscula', label: 'Uma letra minúscula',    testar: (s) => /[a-z]/.test(s) },
  { id: 'numero',    label: 'Um número',              testar: (s) => /[0-9]/.test(s) },
];

/** Retorna true somente quando a senha atende a TODAS as regras. */
export function senhaValida(s) {
  return REGRAS_SENHA.every((r) => r.testar(s || ''));
}

/**
 * Checklist visual da política de senha.
 * Só é exibida quando há algo digitado, a menos que `sempreVisivel` seja true.
 */
export default function PasswordRules({ senha = '', className, sempreVisivel = false }) {
  if (!sempreVisivel && !senha) return null;

  return (
    <ul
      aria-live="polite"
      className={cn('flex flex-col gap-1 list-none m-0 p-0', className)}
    >
      {REGRAS_SENHA.map((regra) => {
        const ok = regra.testar(senha);
        return (
          <li
            key={regra.id}
            className={cn(
              'flex items-center gap-1.5 text-xs',
              ok ? 'text-primary' : 'text-text-primary/40'
            )}
          >
            {ok
              ? <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
              : <Minus className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />}
            <span>{regra.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
