import React, { useEffect, useRef } from 'react';
import { Check, Lock, Minus } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { cn } from '../../lib/utils';
import { COLUNAS, ID_NOTA_BLOQUEIO, nomeAcao } from './permissoesCatalogo';

/**
 * Caixa de marcação nativa (teclado, leitor de tela e voz funcionam igual) com visual próprio.
 * `bloqueada` = o usuário não pode conceder este acesso (regra de escalada) → cadeado visível.
 */
function Caixa({ marcada, misto = false, bloqueada, desabilitada, rotulo, onChange, comTexto }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = misto; }, [misto]);
  const inativa = bloqueada || desabilitada;
  return (
    <label
      className={cn(
        'relative inline-flex items-center gap-2 min-h-11 min-w-11 rounded-lg select-none',
        comTexto ? 'px-2.5 border text-xs font-medium whitespace-nowrap' : 'justify-center',
        comTexto && (marcada ? 'border-primary/50 bg-primary/10 text-text-primary' : 'border-border-strong text-text-primary/75'),
        inativa ? 'cursor-not-allowed' : 'cursor-pointer',
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        checked={marcada}
        disabled={inativa}
        onChange={onChange}
        aria-label={comTexto ? undefined : rotulo}
        aria-describedby={bloqueada ? ID_NOTA_BLOQUEIO : undefined}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          'grid place-items-center w-6 h-6 shrink-0 rounded-md border-2 transition-colors',
          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary',
          marcada || misto ? 'bg-primary border-primary text-on-primary' : 'border-text-primary/40 bg-surface',
          bloqueada && !marcada && 'border-dashed border-text-primary/30 bg-surface-medium text-text-primary/50',
          bloqueada && marcada && 'opacity-60',
          desabilitada && !bloqueada && 'opacity-60',
        )}
      >
        {bloqueada && !marcada ? <Lock className="w-3 h-3" /> : misto ? <Minus className="w-3.5 h-3.5" strokeWidth={3} /> : marcada ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : null}
      </span>
      {comTexto && <span>{rotulo}</span>}
    </label>
  );
}

function estadoModulo(linha, marcadas) {
  const n = linha.todas.filter((p) => marcadas.has(p.id)).length;
  return { n, todas: n === linha.todas.length, alguma: n > 0 && n < linha.todas.length };
}

/** Layout de tabela (tablet/desktop): módulos nas linhas, ações nas colunas. */
function Tabela({ matriz, marcadas, bloqueada, onToggle, onToggleModulo, somenteLeitura }) {
  return (
    <div className="rounded-2xl border border-border overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">Acessos do perfil por módulo e ação</caption>
        <thead className="bg-surface-medium/70 text-left">
          <tr>
            <th scope="col" className="px-3 py-2.5 min-w-[9.5rem] font-semibold text-text-primary/80">Módulo</th>
            <th scope="col" className="px-1 py-2.5 w-12 text-center font-semibold text-text-primary/80">Tudo</th>
            {COLUNAS.map((c) => <th key={c.acao} scope="col" className="px-1 py-2.5 w-12 text-center font-semibold text-text-primary/80">{c.nome}</th>)}
            <th scope="col" className="px-3 py-2.5 font-semibold text-text-primary/80">Outras ações</th>
          </tr>
        </thead>
        {matriz.map((g) => (
          <tbody key={g.id} className="border-t border-border">
            <tr>
              <th scope="colgroup" colSpan={COLUNAS.length + 3} className="px-3 pt-4 pb-1 text-left c4-eyebrow">{g.nome}</th>
            </tr>
            {g.modulos.map((linha) => {
              const est = estadoModulo(linha, marcadas);
              return (
                <tr key={linha.modulo} className="border-t border-border/60 hover:bg-surface-medium/40">
                  <th scope="row" className="px-3 py-1.5 text-left font-medium text-text-primary">
                    {linha.nome}
                    {linha.ajuda && <span className="block text-xs font-normal text-text-primary/60">{linha.ajuda}</span>}
                  </th>
                  <td className="px-1 text-center">
                    <Caixa
                      marcada={est.todas}
                      misto={est.alguma}
                      desabilitada={somenteLeitura}
                      rotulo={`Todos os acessos de ${linha.nome}`}
                      onChange={() => onToggleModulo(linha)}
                    />
                  </td>
                  {COLUNAS.map((c) => {
                    const p = linha.perms[c.acao];
                    if (!p) return <td key={c.acao} className="px-1 text-center text-text-primary/30"><span aria-hidden="true">—</span><span className="sr-only">Não se aplica</span></td>;
                    return (
                      <td key={c.acao} className="px-1 text-center">
                        <Caixa
                          marcada={marcadas.has(p.id)}
                          bloqueada={bloqueada(p)}
                          desabilitada={somenteLeitura}
                          rotulo={`${c.nome} em ${linha.nome}`}
                          onChange={() => onToggle(p.id)}
                        />
                      </td>
                    );
                  })}
                  <td className="px-3 py-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      {linha.extras.map((p) => (
                        <Caixa
                          key={p.id}
                          comTexto
                          marcada={marcadas.has(p.id)}
                          bloqueada={bloqueada(p)}
                          desabilitada={somenteLeitura}
                          rotulo={nomeAcao(p.acao)}
                          onChange={() => onToggle(p.id)}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}

/** Layout do celular: um cartão por módulo, cada ação numa linha. */
function Cartoes({ matriz, marcadas, bloqueada, onToggle, onToggleModulo, somenteLeitura }) {
  return (
    <div className="space-y-5">
      {matriz.map((g) => (
        <section key={g.id} aria-labelledby={`grupo-perm-${g.id}`}>
          <h3 id={`grupo-perm-${g.id}`} className="c4-eyebrow mb-2">{g.nome}</h3>
          <ul className="space-y-2">
            {g.modulos.map((linha) => {
              const est = estadoModulo(linha, marcadas);
              return (
                <li key={linha.modulo} className="rounded-2xl border border-border bg-surface p-3">
                  <fieldset>
                    <legend className="sr-only">{linha.nome}</legend>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary" aria-hidden="true">{linha.nome}</p>
                        <p className="text-xs text-text-primary/60">{est.n} de {linha.todas.length} {linha.todas.length === 1 ? "acesso" : "acessos"}</p>
                      </div>
                      <Caixa
                        marcada={est.todas}
                        misto={est.alguma}
                        desabilitada={somenteLeitura}
                        rotulo={`Todos os acessos de ${linha.nome}`}
                        onChange={() => onToggleModulo(linha)}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {linha.todas.map((p) => (
                        <Caixa
                          key={p.id}
                          comTexto
                          marcada={marcadas.has(p.id)}
                          bloqueada={bloqueada(p)}
                          desabilitada={somenteLeitura}
                          rotulo={nomeAcao(p.acao)}
                          onChange={() => onToggle(p.id)}
                        />
                      ))}
                    </div>
                  </fieldset>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * Matriz de permissões do perfil. Props: matriz (montarMatriz), marcadas (Set de ids),
 * bloqueada(p) → bool, onToggle(id), onToggleModulo(linha), somenteLeitura.
 */
export default function MatrizPermissoes(props) {
  const largo = useMediaQuery('(min-width: 768px)');
  return largo ? <Tabela {...props} /> : <Cartoes {...props} />;
}
