import React, { useState } from 'react';
import { motion, useReducedMotionConfig } from 'motion/react';
import { Layers } from 'lucide-react';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { formatarMoeda, formatDate } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import { deChave, rotuloFatura } from './faturas';

/*
 * Compras parceladas em andamento (GET /api/cartoes/parcelamentos), cada uma com a barra
 * segmentada "k de n", quanto falta e o mês em que termina.
 *
 * Props: itens (ParcelamentoResponseDto[]), limite (quantos mostrar antes de "Ver todas", 5),
 *        mostrarCartao (nome do cartão em cada linha, true), className.
 */

const MAX_SEGMENTOS = 24;

function BarraSegmentada({ atual, total, rotulo }) {
  const reduzir = useReducedMotionConfig();
  const pagas = Math.min(atual, total);
  const segmentos = total <= MAX_SEGMENTOS;
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={pagas}
      aria-valuetext={`Parcela ${pagas} de ${total}`}
      className={cn('flex h-2 w-full', segmentos ? 'gap-[3px]' : 'rounded-full bg-text-primary/[0.08] overflow-hidden')}
    >
      {segmentos ? (
        Array.from({ length: total }, (_, i) => (
          <span key={i} className="relative flex-1 rounded-full bg-text-primary/[0.1] overflow-hidden">
            {i < pagas && (
              <motion.span
                className="absolute inset-0 rounded-full bg-primary"
                style={{ transformOrigin: 'left' }}
                initial={reduzir ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.25, delay: reduzir ? 0 : 0.04 * i }}
              />
            )}
          </span>
        ))
      ) : (
        <span className="h-full rounded-full bg-primary" style={{ width: `${(pagas / total) * 100}%` }} />
      )}
    </div>
  );
}

function Linha({ p, mostrarCartao }) {
  const fim = deChave(p.terminaEm);
  const proxima = p.proximasParcelas?.[0];
  const ultima = p.parcelasRestantes === 0;
  return (
    <li className="py-4 first:pt-0 last:pb-0 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-text-primary truncate">{p.descricao}</p>
          <p className="text-xs text-text-primary/60 truncate">
            {[p.parceiro, mostrarCartao ? p.cartao?.nome : null].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="tabular-nums font-semibold text-text-primary valor-privado">{formatarMoeda(p.valorParcela)}<span className="text-xs font-normal text-text-primary/60">/mês</span></p>
          <p className="text-xs tabular-nums text-text-primary/60">
            {Math.min(p.parcelaAtual, p.totalParcelas)} de {p.totalParcelas}
          </p>
        </div>
      </div>
      <BarraSegmentada atual={p.parcelaAtual} total={p.totalParcelas} rotulo={`Parcelas pagas de ${p.descricao}`} />
      <p className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-text-primary/65">
        <span className="valor-privado">
          {ultima ? 'Última parcela nesta fatura' : `Faltam ${formatarMoeda(p.valorRestante)} de ${formatarMoeda(p.valorTotal)}`}
        </span>
        <span>
          {proxima ? `Próxima vence ${formatDate(proxima.dataVencimento)} · ` : ''}
          {fim ? `termina em ${rotuloFatura(fim.ano, fim.mes)}` : ''}
        </span>
      </p>
    </li>
  );
}

export default function ParcelamentosLista({ itens = [], limite = 5, mostrarCartao = true, className }) {
  const [todos, setTodos] = useState(false);
  if (!itens.length) {
    return (
      <EmptyState
        compact
        icon={Layers}
        tom="neutro"
        title="Nenhuma compra parcelada em andamento"
        description="Quando você lançar uma compra em 2 ou mais parcelas, ela aparece aqui com o quanto falta pagar."
      />
    );
  }
  const ordenados = [...itens].sort((a, b) => Number(b.valorRestante) - Number(a.valorRestante));
  const visiveis = todos ? ordenados : ordenados.slice(0, limite);
  return (
    <div className={className}>
      <ul className="divide-y divide-border">
        {visiveis.map((p) => <Linha key={p.grupoParcelamento} p={p} mostrarCartao={mostrarCartao} />)}
      </ul>
      {ordenados.length > limite && (
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => setTodos((v) => !v)} aria-expanded={todos}>
          {todos ? 'Mostrar menos' : `Ver todas (${ordenados.length})`}
        </Button>
      )}
    </div>
  );
}
