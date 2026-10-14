import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Lock, Pencil, Receipt, Repeat, Trash2 } from 'lucide-react';
import DataTable from '../ui/DataTable';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { formatarMoeda, formatDate } from '../../lib/formatters';
import { cn } from '../../lib/utils';

/*
 * Tabela de lançamentos de UMA fatura (tabela no desktop, cartões no celular).
 * Valor sempre com sinal + ícone (não só cor). Parcela "3 de 10" com mini barra.
 *
 * Props: lancamentos, carregando, podeEditar (CARTAO_LANCAR), onEditar(l), onExcluir(l),
 *        vazio (nó do estado vazio), rotulo (caption).
 */

export function ParcelaChip({ numero, total }) {
  if (!total || total <= 1) return null;
  const pontos = Math.min(total, 12);
  const cheios = Math.round((numero / total) * pontos);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-text-primary/70 tabular-nums" title={`Parcela ${numero} de ${total}`}>
      <span className="flex gap-[2px]" aria-hidden="true">
        {Array.from({ length: pontos }, (_, i) => (
          <span key={i} className={cn('w-1 h-2.5 rounded-full', i < cheios ? 'bg-primary' : 'bg-text-primary/15')} />
        ))}
      </span>
      <span><span className="sr-only">Parcela </span>{numero}/{total}</span>
    </span>
  );
}

function Valor({ l }) {
  const entrada = l.tipo === 'ENTRADA';
  const Icone = entrada ? ArrowDownLeft : ArrowUpRight;
  return (
    <span className={cn('inline-flex items-center gap-1 font-semibold tabular-nums valor-privado', entrada ? 'text-income' : 'text-text-primary')}>
      <Icone className={cn('w-3.5 h-3.5', entrada ? 'text-income' : 'text-expense')} aria-hidden="true" />
      <span className="sr-only">{entrada ? 'Crédito de ' : 'Compra de '}</span>
      {formatarMoeda(entrada ? Number(l.valor) : -Number(l.valor), { sinal: 'sempre' })}
    </span>
  );
}

function Selos({ l }) {
  return (
    <>
      {l.assinaturaId && <Badge variant="info"><Repeat className="w-3 h-3" aria-hidden="true" /> Assinatura</Badge>}
      {l.faturaFechada && <Badge variant="neutral"><Lock className="w-3 h-3" aria-hidden="true" /> Fatura fechada</Badge>}
    </>
  );
}

function Acoes({ l, onEditar, onExcluir }) {
  const motivo = l.faturaFechada ? ' (fatura fechada: não dá para alterar)' : '';
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon-sm" onClick={() => onEditar(l)} disabled={l.faturaFechada} aria-label={`Editar ${l.descricao}${motivo}`}>
        <Pencil className="w-4 h-4" aria-hidden="true" />
      </Button>
      <Button variant="danger-ghost" size="icon-sm" onClick={() => onExcluir(l)} disabled={l.faturaFechada} aria-label={`Excluir ${l.descricao}${motivo}`}>
        <Trash2 className="w-4 h-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

export default function LancamentosTabela({ lancamentos, carregando, podeEditar, onEditar, onExcluir, vazio, rotulo = 'Lançamentos da fatura' }) {
  const colunas = [
    {
      key: 'descricao',
      label: 'Descrição',
      sortable: true,
      render: (v, l) => (
        <div className="min-w-0">
          <p className="font-medium text-text-primary">{v}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5 text-xs text-text-primary/60">
            {l.parceiroNome && <span>{l.parceiroNome}</span>}
            <ParcelaChip numero={l.numeroParcela} total={l.totalParcelas} />
            <Selos l={l} />
          </p>
        </div>
      ),
    },
    { key: 'categoriaDescricao', label: 'Categoria', sortable: true, render: (v) => <span className="text-text-primary/80">{v}</span> },
    { key: 'dataCompra', label: 'Compra', sortable: true, render: (v) => <span className="tabular-nums text-text-primary/80">{formatDate(v)}</span> },
    { key: 'valor', label: 'Valor', sortable: true, className: 'text-right', render: (_, l) => <Valor l={l} /> },
    ...(podeEditar ? [{ key: 'id', label: <span className="sr-only">Ações</span>, className: 'text-right w-24', render: (_, l) => <Acoes l={l} onEditar={onEditar} onExcluir={onExcluir} /> }] : []),
  ];

  const cartaoMobile = (l) => (
    <div className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-text-primary">{l.descricao}</p>
          <p className="text-xs text-text-primary/60">{[l.categoriaDescricao, formatDate(l.dataCompra)].join(' · ')}</p>
        </div>
        <Valor l={l} />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-text-primary/60">
        {l.parceiroNome && <span>{l.parceiroNome}</span>}
        <ParcelaChip numero={l.numeroParcela} total={l.totalParcelas} />
        <Selos l={l} />
        {podeEditar && <div className="ml-auto"><Acoes l={l} onEditar={onEditar} onExcluir={onExcluir} /></div>}
      </div>
    </div>
  );

  return (
    <DataTable
      caption={rotulo}
      columns={colunas}
      data={lancamentos}
      loading={carregando}
      renderCard={cartaoMobile}
      emptyState={vazio ?? <EmptyState icon={Receipt} title="Nenhum lançamento nesta fatura" description="As compras aparecem aqui assim que forem lançadas ou importadas." compact />}
    />
  );
}
