import React, { useId } from 'react';
import { Check, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import { nomePerfil } from './perfilUtils';

/**
 * Escolha de perfil em cartões (rádio nativo). Perfis com acessos que o usuário atual não tem
 * aparecem travados, com o motivo escrito (regra de escalada de privilégio).
 * Props: perfis, valor (id), onChange(id), faltam(perfil) → string[] de códigos que faltam, legenda, erro.
 */
export default function SeletorPerfil({ perfis, valor, onChange, faltam, legenda = 'Perfil de acesso', erro }) {
  const nome = useId();
  const erroId = useId();
  return (
    <fieldset aria-describedby={erro ? erroId : undefined} aria-invalid={erro ? true : undefined}>
      <legend className="text-sm font-medium text-text-primary mb-2">
        {legenda} <span className="text-error" aria-hidden="true">*</span>
      </legend>
      <div className="space-y-2">
        {perfis.map((p) => {
          const id = `${nome}-${p.id}`;
          const marcado = String(valor) === String(p.id);
          const travado = (faltam?.(p) ?? []).length > 0;
          const n = p.permissoes?.length ?? 0;
          return (
            <div key={p.id} className="relative">
              <input
                type="radio"
                id={id}
                name={nome}
                value={p.id}
                checked={marcado}
                disabled={travado}
                onChange={() => onChange(p.id)}
                aria-describedby={`${id}-desc`}
                className="peer absolute inset-0 w-full h-full opacity-0 m-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <label
                htmlFor={id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-xl border transition-colors',
                  'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary',
                  marcado ? 'border-primary bg-primary/10' : 'border-border-strong bg-surface',
                  travado ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-0.5 grid place-items-center w-5 h-5 shrink-0 rounded-full border-2',
                    marcado ? 'border-primary bg-primary text-on-primary' : 'border-text-primary/40',
                  )}
                >
                  {marcado ? <Check className="w-3 h-3" strokeWidth={3} /> : travado ? <Lock className="w-2.5 h-2.5 text-text-primary/50" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    {nomePerfil(p.nome)}
                    <span className="ml-auto text-xs font-normal text-text-primary/60 tabular-nums">{n} acessos</span>
                  </span>
                  <span id={`${id}-desc`} className="block mt-0.5 text-xs text-text-primary/70 leading-relaxed">
                    {travado
                      ? 'Indisponível: este perfil tem acessos que você não tem. Só quem tem esses acessos pode atribuí-lo.'
                      : p.descricao || 'Perfil criado pela empresa.'}
                  </span>
                </span>
              </label>
            </div>
          );
        })}
      </div>
      {erro && <p id={erroId} role="alert" className="mt-2 text-sm text-error">{erro}</p>}
    </fieldset>
  );
}
