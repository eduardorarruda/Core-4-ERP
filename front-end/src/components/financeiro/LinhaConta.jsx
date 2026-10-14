import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, Lock, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { formatarMoeda } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import { usePermissao } from '../../hooks/usePermissao';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { ChipCategoria } from './IconesCategoria';
import { STATUS_CONTA, estaAberta, estaBaixada, textoVencimento } from './utilsFinanceiro';

/** Selo de status com ícone + texto (nunca só cor). */
export function StatusConta({ status }) {
  const s = STATUS_CONTA[status] ?? { rotulo: status, variant: 'neutral' };
  const Icone = s.icon;
  return (
    <Badge variant={s.variant}>
      {Icone && <Icone className="w-3 h-3" aria-hidden="true" />}
      {s.rotulo}
    </Badge>
  );
}

/** Valor com sinal e ícone: saída "−R$ 10,00" (vermelho), entrada "+R$ 10,00" (verde). */
export function ValorConta({ conta, className }) {
  const receber = conta.tipo === 'RECEBER';
  const Icone = receber ? ArrowDownLeft : ArrowUpRight;
  return (
    <span className={cn('inline-flex items-center gap-1 font-semibold tabular-nums whitespace-nowrap valor-privado', receber ? 'text-income' : 'text-expense', className)}>
      <Icone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span className="sr-only">{receber ? 'A receber:' : 'A pagar:'}</span>
      {receber ? '+' : '−'}{formatarMoeda(conta.valorOriginal)}
    </span>
  );
}

/**
 * Ações de uma conta, cada uma conforme a permissão (PermissaoGuard é só UX — o backend valida).
 * "Paguei"/"Recebi" é a ação principal de uma conta em aberto.
 */
export function AcoesConta({ conta, onBaixar, onEditar, onEstornar, onExcluir }) {
  const pode = usePermissao();
  const aberta = estaAberta(conta);
  const baixada = estaBaixada(conta);
  const receber = conta.tipo === 'RECEBER';
  const nome = conta.descricao;
  const travada = Boolean(conta.conciliada);

  return (
    <div className="flex flex-wrap items-center justify-end gap-1 min-w-0 ml-auto">
      {aberta && pode('CONTA_BAIXAR') && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onBaixar(conta)}
          leftIcon={<Check className="w-4 h-4" aria-hidden="true" />}
          aria-label={`${receber ? 'Recebi' : 'Paguei'}: ${nome}`}
          className="min-h-11 sm:min-h-9"
        >
          {receber ? 'Recebi' : 'Paguei'}
        </Button>
      )}
      {aberta && !travada && pode('CONTA_EDITAR') && (
        <Button variant="ghost" size="icon-sm" onClick={() => onEditar(conta)} aria-label={`Editar ${nome}`} title="Editar">
          <Pencil className="w-4 h-4" aria-hidden="true" />
        </Button>
      )}
      {baixada && !travada && pode('CONTA_ESTORNAR') && (
        <Button variant="ghost" size="icon-sm" onClick={() => onEstornar(conta)} aria-label={`Estornar baixa de ${nome}`} title="Estornar baixa">
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
        </Button>
      )}
      {!baixada && pode('CONTA_DELETAR') && (
        <Button variant="danger-ghost" size="icon-sm" onClick={() => onExcluir(conta)} aria-label={`Excluir ${nome}`} title="Excluir">
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </Button>
      )}
      {travada && (
        <span className="w-9 h-9 grid place-items-center text-text-primary/50" title="Conciliada pelo extrato: não pode ser editada nem estornada">
          <Lock className="w-4 h-4" aria-hidden="true" />
          <span className="sr-only">Conciliada pelo extrato: não pode ser editada nem estornada</span>
        </span>
      )}
    </div>
  );
}

/**
 * Linha de conta (lista por urgência e cartão no celular): ícone da categoria, descrição com
 * parcela, "Vence em 4 dias · 10 out" e parceiro, status, valor com sinal e as ações.
 * `semCartao`: sem a moldura (quando o contêiner já é um cartão, ex.: DataTable no celular).
 */
export default function LinhaConta({ conta, onBaixar, onEditar, onEstornar, onExcluir, mostrarStatus = true, semCartao = false, className }) {
  const receber = conta.tipo === 'RECEBER';
  const aberta = estaAberta(conta);
  const detalhes = [
    aberta ? textoVencimento(conta.dataVencimento) : null,
    conta.parceiroNome,
    conta.categoriaDescricao,
  ].filter(Boolean).join(' · ');

  return (
    <div className={cn(!semCartao && 'c4-card', 'px-3 py-3 sm:px-4 flex flex-col gap-3 sm:flex-row sm:items-center', className)}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <ChipCategoria icone={conta.categoriaIcone} tom={receber ? 'income' : 'expense'} tamanho="sm" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-text-primary truncate">{conta.descricao}</span>
            {conta.totalParcelas > 1 && (
              <span className="shrink-0 text-xs text-text-primary/60 tabular-nums" title="Parcela">
                {conta.numeroParcela}/{conta.totalParcelas}
              </span>
            )}
          </p>
          <p className="text-xs text-text-primary/60 truncate">{detalhes || (conta.numeroDocumento ?? '')}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:justify-end">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
          {mostrarStatus && <StatusConta status={conta.status} />}
          <ValorConta conta={conta} />
        </div>
        <AcoesConta conta={conta} onBaixar={onBaixar} onEditar={onEditar} onEstornar={onEstornar} onExcluir={onExcluir} />
      </div>
    </div>
  );
}
