import React from 'react';
import { cn } from '../../lib/utils';
import { formatarMoeda } from '../../lib/formatters';
import { Stagger, StaggerItem } from '../motion/Movimento';

/**
 * Lista agrupada com cabeçalho de seção (portado do Fluxo — contas a pagar por urgência):
 * título em caixa-alta com ícone e cor, total da seção à direita; o grupo "critico" ganha
 * fundo e borda de alerta.
 *
 *   <GroupedList
 *     grupos={[
 *       { id: 'atrasadas', titulo: 'Atrasadas', tom: 'critico', icon: AlertTriangle, total: 830.5, itens: [...] },
 *       { id: 'semana', titulo: 'Esta semana', tom: 'atencao', itens: [...] },
 *       { id: 'mes', titulo: 'Este mês', tom: 'info', itens: [...] },
 *       { id: 'depois', titulo: 'Próximas', tom: 'neutro', itens: [...] },
 *     ]}
 *     renderItem={(conta) => <LinhaConta conta={conta} />}
 *     keyItem={(conta) => conta.id}
 *   />
 *
 * Props: grupos [{ id, titulo, tom ('critico'|'atencao'|'info'|'neutro'|'sucesso'), icon, total, itens }],
 *        renderItem(item, grupo), keyItem(item), formatoTotal ((n) => string; padrão moeda),
 *        ocultarVazios (true), className,
 *        nivelTitulo (2): nível do título de cada grupo — use 3 quando a lista estiver dentro de um Card (h2).
 */
const TONS = {
  critico: { titulo: 'text-expense', caixa: 'border-expense/30 bg-expense/[0.05]' },
  atencao: { titulo: 'text-warning', caixa: '' },
  info: { titulo: 'text-info', caixa: '' },
  sucesso: { titulo: 'text-income', caixa: '' },
  neutro: { titulo: 'text-text-primary/60', caixa: '' },
};

function IconeGrupo({ icon }) {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  const Comp = icon;
  return <Comp className="w-3.5 h-3.5" aria-hidden="true" />;
}

export default function GroupedList({ grupos = [], renderItem, keyItem = (i) => i.id, formatoTotal = (n) => formatarMoeda(n), ocultarVazios = true, className, nivelTitulo = 2 }) {
  const Titulo = `h${Math.min(6, Math.max(2, Number(nivelTitulo) || 2))}`;
  const visiveis = ocultarVazios ? grupos.filter((g) => g.itens?.length) : grupos;
  return (
    <div className={cn('space-y-5', className)}>
      {visiveis.map((g) => {
        const tom = TONS[g.tom] ?? TONS.neutro;
        const idTitulo = `grupo-${g.id}`;
        return (
          <section key={g.id} aria-labelledby={idTitulo} className={cn('rounded-2xl', tom.caixa && cn('border p-2 sm:p-3', tom.caixa))}>
            <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-2 pb-2">
              <Titulo id={idTitulo} className={cn('flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] font-body', tom.titulo)}>
                <IconeGrupo icon={g.icon} />
                {g.titulo}
                <span className="ml-1 text-text-primary/65 tabular-nums">· {g.itens?.length ?? 0}</span>
              </Titulo>
              {g.total != null && (
                <span className="ml-auto text-sm font-semibold tabular-nums valor-privado">{formatoTotal(g.total)}</span>
              )}
            </header>
            <Stagger as="ul" aoRolar className="space-y-1.5">
              {(g.itens ?? []).map((item) => (
                <StaggerItem as="li" key={keyItem(item)}>{renderItem(item, g)}</StaggerItem>
              ))}
            </Stagger>
          </section>
        );
      })}
    </div>
  );
}
