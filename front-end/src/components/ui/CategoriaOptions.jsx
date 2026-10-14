import React from 'react';

/**
 * Opções de <select> de categorias agrupadas por hierarquia: categorias principais viram
 * <optgroup> quando têm subcategorias, com uma opção "(geral)" para a própria principal.
 * Categorias inativas são omitidas. Uso: <select>...<CategoriaOptions cats={cats} />...</select>
 */
export default function CategoriaOptions({ cats = [] }) {
  const ativas = cats.filter((c) => c.ativo !== false);
  const raizes = ativas.filter((c) => !c.categoriaPaiId);
  const subsPorPai = ativas.reduce((acc, c) => {
    if (c.categoriaPaiId) (acc[c.categoriaPaiId] ||= []).push(c);
    return acc;
  }, {});

  return (
    <>
      {raizes.map((r) => {
        const filhas = subsPorPai[r.id] || [];
        if (filhas.length === 0) {
          return <option key={r.id} value={r.id}>{r.descricao}</option>;
        }
        return (
          <optgroup key={r.id} label={r.descricao}>
            <option value={r.id}>{r.descricao} (geral)</option>
            {filhas.map((s) => (
              <option key={s.id} value={s.id}>{r.descricao} › {s.descricao}</option>
            ))}
          </optgroup>
        );
      })}
    </>
  );
}
