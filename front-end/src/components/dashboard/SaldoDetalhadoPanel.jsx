import React, { memo, useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, CreditCard, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { dashboard } from '../../lib/api';
import { brl } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import SkeletonCard from '../ui/SkeletonCard';

function ValorCard({ label, valor, tipo = 'neutro', descricao, icone: Icone }) {
  const colorMap = {
    entrada:  'text-secondary border-secondary/20 bg-secondary/5',
    saida:    'text-error border-error/20 bg-error/5',
    neutro:   'text-text-primary/80 border-text-primary/5 bg-surface',
    positivo: 'text-primary border-primary/20 bg-primary/5',
    negativo: 'text-error border-error/20 bg-error/5',
  };
  const prefixo = tipo === 'entrada' ? '+' : tipo === 'saida' ? '−' : '';
  return (
    <div className={cn('rounded-xl p-3.5 border flex flex-col gap-1', colorMap[tipo] ?? colorMap.neutro)}>
      <div className="flex items-center gap-1.5">
        {Icone && <Icone className="w-3.5 h-3.5 opacity-60" />}
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 font-body">{label}</span>
      </div>
      <span className="text-base font-bold font-display">{prefixo} R$ {brl(valor)}</span>
      {descricao && <span className="text-[10px] opacity-50">{descricao}</span>}
    </div>
  );
}

function Divider({ label }) {
  return (
    <div className="flex items-center gap-3 mt-5 mb-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40">{label}</span>
      <div className="flex-1 h-px bg-text-primary/5" />
    </div>
  );
}

const SaldoDetalhadoPanel = memo(function SaldoDetalhadoPanel() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const res = await dashboard.saldoDetalhado();
      setDados(res);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  if (carregando) return <SkeletonCard rows={5} className="h-full" />;

  if (erro) {
    return (
      <div className="bg-surface-medium rounded-2xl p-6 border border-error/20 text-error text-sm">
        Erro ao carregar saldo: {erro}
      </div>
    );
  }

  if (!dados) return null;

  const saldoPrevistoPositivo   = Number(dados.saldoPrevisto) >= 0;
  const saldoComCartaoPositivo  = Number(dados.saldoPrevistoComCartao) >= 0;
  const saldoLiquidoPositivo    = Number(dados.saldoLiquidoEmAberto) >= 0;

  return (
    <div className="bg-surface-medium rounded-2xl p-5 border border-text-primary/5 space-y-1 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-text-primary tracking-tight font-display">Posição Financeira</h2>
          <p className="text-[10px] text-text-primary/40 uppercase tracking-widest mt-0.5 font-body">Saldo e projeções</p>
        </div>
        <button
          onClick={carregar}
          aria-label="Atualizar saldo"
          className="p-2 rounded-xl text-text-primary/50 hover:text-text-primary hover:bg-surface-highest transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Saldo Principal */}
      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Saldo em Conta Hoje</p>
          <p className="text-2xl font-bold text-text-primary font-display">R$ {brl(dados.saldoContasCorrentes)}</p>
          <p className="text-[10px] text-text-primary/40 mt-0.5">Soma das contas correntes</p>
        </div>
        <Wallet className="w-9 h-9 text-primary opacity-40" />
      </div>

      {/* Composição */}
      <Divider label="Composição" />
      <div className="grid grid-cols-2 gap-2">
        <ValorCard label="Recebido" valor={dados.totalRecebido} tipo="entrada" icone={ArrowUpRight} />
        <ValorCard label="Resgates" valor={dados.totalResgatado} tipo="entrada" icone={ArrowUpRight} />
        <ValorCard label="Pago" valor={dados.totalPago} tipo="saida" icone={ArrowDownRight} />
        <ValorCard label="Aportes" valor={dados.totalAportado} tipo="saida" icone={ArrowDownRight} />
      </div>

      {/* Em aberto */}
      <Divider label="Posição em Aberto" />
      <div className="grid grid-cols-2 gap-2">
        <ValorCard label="A Receber" valor={dados.totalAReceber} tipo="entrada" icone={TrendingUp} />
        <ValorCard label="A Pagar" valor={dados.totalAPagar} tipo="saida" icone={TrendingDown} />
      </div>
      <div className={cn(
        'rounded-xl px-4 py-3 border flex items-center justify-between',
        saldoLiquidoPositivo ? 'bg-secondary/5 border-secondary/20' : 'bg-error/5 border-error/20'
      )}>
        <span className="text-xs font-bold text-text-primary/60 uppercase tracking-widest">Saldo líquido</span>
        <span className={cn('text-base font-bold font-display', saldoLiquidoPositivo ? 'text-secondary' : 'text-error')}>
          {saldoLiquidoPositivo ? '+' : ''}R$ {brl(dados.saldoLiquidoEmAberto)}
        </span>
      </div>

      {/* Cartão */}
      <Divider label="Cartão de Crédito" />
      <div className="grid grid-cols-2 gap-2">
        <ValorCard label="Fatura aberta" valor={dados.totalLancamentosCartaoAberto} tipo="saida" icone={CreditCard} />
        <ValorCard label="Faturas pendentes" valor={dados.totalFaturasCartaoPendentes} tipo="saida" icone={CreditCard} />
      </div>

      {/* Projeções */}
      <Divider label="Projeções" />
      <div className="space-y-2">
        <div className={cn('rounded-xl p-3.5 border', saldoPrevistoPositivo ? 'bg-primary/5 border-primary/20' : 'bg-error/5 border-error/20')}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary/50">Saldo Previsto</span>
            <span className={cn('text-lg font-bold font-display', saldoPrevistoPositivo ? 'text-primary' : 'text-error')}>
              R$ {brl(dados.saldoPrevisto)}
            </span>
          </div>
        </div>
        <div className={cn('rounded-xl p-3.5 border', saldoComCartaoPositivo ? 'bg-surface border-text-primary/5' : 'bg-error/10 border-error/30')}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary/50">Com Cartão</span>
            <span className={cn('text-lg font-bold font-display', saldoComCartaoPositivo ? 'text-text-primary' : 'text-error')}>
              R$ {brl(dados.saldoPrevistoComCartao)}
            </span>
          </div>
        </div>
      </div>

      {/* Patrimônio */}
      <Divider label="Investimentos" />
      <div className="bg-surface border border-text-primary/5 rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-text-primary/40">Patrimônio</span>
        <span className="text-base font-bold text-text-primary font-display">R$ {brl(dados.patrimonioInvestimentos)}</span>
      </div>
    </div>
  );
});

export default SaldoDetalhadoPanel;
