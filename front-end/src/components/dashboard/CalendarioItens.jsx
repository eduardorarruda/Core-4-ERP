import React from 'react';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Check, CheckCircle2, Clock, CreditCard, Repeat } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import PermissaoGuard from '../ui/PermissaoGuard';
import { formatarMoeda } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import { atrasada, emAberto, valorConta } from './calendarioCalculos';

/** Itens do Calendário: conta (a pagar/receber, com "Paguei"/"Recebi") e assinatura. */
function statusDaConta(c) {
  if (atrasada(c)) return { rotulo: 'Atrasada', variante: 'error', Icone: AlertTriangle };
  if (c.status === 'PAGO') return { rotulo: 'Paga', variante: 'success', Icone: CheckCircle2 };
  if (c.status === 'RECEBIDO') return { rotulo: 'Recebida', variante: 'success', Icone: CheckCircle2 };
  return { rotulo: 'Em aberto', variante: 'warning', Icone: Clock };
}

export function ContaItem({ conta, onBaixar }) {
  const receber = conta.tipo === 'RECEBER';
  const s = statusDaConta(conta);
  const Seta = receber ? ArrowDownLeft : ArrowUpRight;
  const late = atrasada(conta);
  return (
    <div className={cn('rounded-xl border p-3 space-y-2.5', late ? 'border-error/35 bg-error/[0.05]' : 'border-border bg-surface-medium/40')}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className={cn('grid place-items-center w-8 h-8 rounded-lg shrink-0', receber ? 'bg-income/[0.12] text-income' : 'bg-expense/[0.12] text-expense')}>
          <Seta className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary truncate">{conta.descricao}</p>
          <p className="text-xs text-text-primary/60 truncate">
            {receber ? 'A receber' : 'A pagar'}
            {conta.parceiroNome ? ` · ${conta.parceiroNome}` : ''}
            {conta.categoriaDescricao ? ` · ${conta.categoriaDescricao}` : ''}
          </p>
        </div>
        <span className={cn('text-sm font-semibold tabular-nums shrink-0 valor-privado', receber ? 'text-income' : 'text-expense')}>
          {receber ? '+' : '−'}{formatarMoeda(valorConta(conta), { sinal: 'nunca' })}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Badge variant={s.variante} size="sm" className="gap-1">
          <s.Icone className="w-3.5 h-3.5" aria-hidden="true" />
          {s.rotulo}
        </Badge>
        {emAberto(conta) && (
          <PermissaoGuard permissao="CONTA_BAIXAR">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onBaixar(conta)}
              leftIcon={<Check className="w-4 h-4" aria-hidden="true" />}
              aria-label={`${receber ? 'Recebi' : 'Paguei'}: ${conta.descricao}`}
            >
              {receber ? 'Recebi' : 'Paguei'}
            </Button>
          </PermissaoGuard>
        )}
      </div>
    </div>
  );
}

export function AssinaturaItem({ assinatura: a }) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong p-3 flex items-center gap-3">
      <span aria-hidden="true" className="grid place-items-center w-8 h-8 rounded-lg shrink-0 bg-primary/[0.1] text-primary">
        <Repeat className="w-4 h-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary truncate">{a.descricao}</p>
        <p className="text-xs text-text-primary/60 truncate flex items-center gap-1">
          Assinatura
          {a.cartaoCreditoNome && (
            <>
              <span aria-hidden="true">·</span>
              <CreditCard className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span className="truncate">no {a.cartaoCreditoNome}</span>
            </>
          )}
        </p>
      </div>
      <span className="text-sm font-medium tabular-nums text-text-primary/80 shrink-0 valor-privado">{formatarMoeda(a.valor)}</span>
    </div>
  );
}
