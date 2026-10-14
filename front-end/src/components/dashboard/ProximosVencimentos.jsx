import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, CalendarClock, CalendarDays, Check, ListChecks } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import GroupedList from '../ui/GroupedList';
import PermissaoGuard from '../ui/PermissaoGuard';
import IconeCategoria from './IconeCategoria';
import { formatarMoeda } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import { diasAte, rotuloVencimento } from './datasVisaoGeral';

/**
 * Próximos vencimentos agrupados por urgência (portado do Fluxo — contas a pagar):
 * Atrasadas · Próximos 7 dias · Até 30 dias. A pagar e a receber nunca somam juntos:
 * o total de cada grupo mostra os dois lados com sinal.
 * "Paguei"/"Recebi" abre a baixa rápida (só com CONTA_BAIXAR).
 *
 * Props: contas (ContaResponseDto[] pendentes/atrasadas), carregando, onBaixar(conta), className.
 */
const valorDe = (c) => Number(c.valorOriginal ?? 0) + Number(c.acrescimo ?? 0) - Number(c.desconto ?? 0);

function totalDoGrupo(itens) {
  return itens.reduce(
    (t, c) => (c.tipo === 'RECEBER' ? { ...t, receber: t.receber + valorDe(c) } : { ...t, pagar: t.pagar + valorDe(c) }),
    { pagar: 0, receber: 0 },
  );
}

function formatarTotal({ pagar, receber }) {
  const partes = [];
  if (pagar > 0) partes.push(`−${formatarMoeda(pagar, { sinal: 'nunca' })}`);
  if (receber > 0) partes.push(`+${formatarMoeda(receber, { sinal: 'nunca' })}`);
  return partes.join(' · ');
}

function LinhaConta({ conta, onBaixar }) {
  const receber = conta.tipo === 'RECEBER';
  const dias = diasAte(conta.dataVencimento);
  const atrasada = dias < 0 || conta.status === 'ATRASADO';
  const Seta = receber ? ArrowDownLeft : ArrowUpRight;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-2 py-2 hover:bg-text-primary/[0.03] transition-colors">
      <IconeCategoria nome={conta.categoriaIcone} tamanho="sm" cor={receber ? 'var(--color-income)' : 'var(--color-chart-2)'} />
      <div className="min-w-0 flex-1 basis-[9rem]">
        <p className="text-sm font-medium text-text-primary truncate">{conta.descricao}</p>
        <p className={cn('text-xs truncate', atrasada ? 'text-error' : 'text-text-primary/60')}>
          {receber ? 'A receber' : 'A pagar'} · {rotuloVencimento(conta.dataVencimento)}
        </p>
      </div>
      <span className={cn('ml-auto inline-flex items-center gap-1 text-sm font-semibold tabular-nums shrink-0 valor-privado', receber ? 'text-income' : 'text-expense')}>
        <Seta className="w-3.5 h-3.5" aria-hidden="true" />
        {receber ? '+' : '−'}{formatarMoeda(valorDe(conta), { sinal: 'nunca' })}
      </span>
      <PermissaoGuard permissao="CONTA_BAIXAR">
        <Button
          size="sm"
          variant="secondary"
          className="shrink-0"
          onClick={() => onBaixar(conta)}
          leftIcon={<Check className="w-4 h-4" aria-hidden="true" />}
          aria-label={`${receber ? 'Recebi' : 'Paguei'}: ${conta.descricao}`}
        >
          <span className="hidden min-[420px]:inline">{receber ? 'Recebi' : 'Paguei'}</span>
        </Button>
      </PermissaoGuard>
    </div>
  );
}

const LIMITE_INICIAL = 6;

export default function ProximosVencimentos({ contas = [], carregando = false, onBaixar, className, id }) {
  const [todos, setTodos] = useState(false);
  const grupos = useMemo(() => {
    const atrasadas = [];
    const semana = [];
    const mes = [];
    contas.forEach((c) => {
      const d = diasAte(c.dataVencimento);
      if (d < 0 || c.status === 'ATRASADO') atrasadas.push(c);
      else if (d <= 7) semana.push(c);
      else mes.push(c);
    });
    // Mostra primeiro as mais urgentes; o resto fica atrás de "Mostrar mais"
    const limite = todos ? Infinity : Math.max(LIMITE_INICIAL, atrasadas.length);
    const nSemana = Math.max(0, limite - atrasadas.length);
    const nMes = Math.max(0, nSemana - semana.length);
    const vis = { atrasadas, semana: semana.slice(0, nSemana), mes: mes.slice(0, nMes) };
    return [
      { id: 'atrasadas', titulo: 'Atrasadas', tom: 'critico', icon: AlertTriangle, itens: vis.atrasadas, total: totalDoGrupo(atrasadas) },
      { id: 'semana', titulo: 'Próximos 7 dias', tom: 'atencao', icon: CalendarClock, itens: vis.semana, total: totalDoGrupo(semana) },
      { id: 'mes', titulo: 'Até 30 dias', tom: 'info', icon: CalendarDays, itens: vis.mes, total: totalDoGrupo(mes) },
    ];
  }, [contas, todos]);
  const visiveis = grupos.reduce((n, g) => n + g.itens.length, 0);
  const ocultas = contas.length - visiveis;

  return (
    <Card
      className={className}
      loading={carregando}
      icon={ListChecks}
      title="Próximos vencimentos"
      subtitle="Contas em aberto até 30 dias, das mais urgentes para as demais"
      footer={
        <Link to="/contas" className="inline-flex items-center min-h-11 text-sm font-medium text-primary hover:underline underline-offset-4">
          Ver todas as contas a pagar e receber
        </Link>
      }
    >
      <div id={id} className="scroll-mt-24">
        {contas.length === 0 ? (
          <EmptyState compact tom="income" icon={Check} title="Nada vencendo nos próximos 30 dias" description="Quando uma conta estiver perto do vencimento, ela aparece aqui com o botão para dar baixa." />
        ) : (
          <>
            <GroupedList grupos={grupos} formatoTotal={formatarTotal} renderItem={(c) => <LinhaConta conta={c} onBaixar={onBaixar} />} />
            {(ocultas > 0 || todos) && (
              <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => setTodos((v) => !v)} aria-expanded={todos}>
                {todos ? 'Mostrar menos' : `Mostrar mais ${ocultas} ${ocultas === 1 ? 'conta' : 'contas'}`}
              </Button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
