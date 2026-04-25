import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, CreditCard, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { dashboard } from '../../lib/api';

const brl = (v) =>
  Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function ValorCard({ label, valor, tipo = 'neutro', descricao, icone: Icone }) {
  const colorMap = {
    entrada:  'text-secondary border-secondary/20 bg-secondary/5',
    saida:    'text-error border-error/20 bg-error/5',
    neutro:   'text-zinc-300 border-white/5 bg-surface',
    positivo: 'text-primary border-primary/20 bg-primary/5',
    negativo: 'text-error border-error/20 bg-error/5',
  };

  const prefixo = tipo === 'entrada' ? '+' : tipo === 'saida' ? '−' : '';
  const colorClass = colorMap[tipo] || colorMap.neutro;

  return (
    <div className={cn('rounded-xl p-4 border flex flex-col gap-1', colorClass)}>
      <div className="flex items-center gap-1.5">
        {Icone && <Icone className="w-3.5 h-3.5 opacity-60" />}
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</span>
      </div>
      <span className="text-lg font-bold">{prefixo} R$ {brl(valor)}</span>
      {descricao && <span className="text-[10px] opacity-50">{descricao}</span>}
    </div>
  );
}

function Divider({ label }) {
  return (
    <div className="flex items-center gap-3 mt-6 mb-4">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{label}</span>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  );
}

export default function SaldoDetalhadoPanel() {
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

  if (carregando) {
    return (
      <div className="bg-surface-medium rounded-2xl p-6 border border-white/5 animate-pulse">
        <div className="h-4 bg-surface-highest rounded w-1/3 mb-6" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-surface-highest rounded-xl" />)}
        </div>
      </div>
    );
  }

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
    <div className="bg-surface-medium rounded-2xl p-6 border border-white/5 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Posição Financeira</h2>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
            Visão detalhada do saldo e projeções
          </p>
        </div>
        <button
          onClick={carregar}
          className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
          title="Atualizar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Saldo Principal */}
      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
            Saldo em Conta Hoje
          </p>
          <p className="text-3xl font-bold text-white">
            R$ {brl(dados.saldoContasCorrentes)}
          </p>
          <p className="text-[10px] text-zinc-500 mt-1">
            Soma de todas as contas correntes
          </p>
        </div>
        <Wallet className="w-10 h-10 text-primary opacity-40" />
      </div>

      {/* Composição do saldo */}
      <Divider label="Composição do Saldo Atual" />
      <div className="grid grid-cols-2 gap-3">
        <ValorCard
          label="Contas Recebidas"
          valor={dados.totalRecebido}
          tipo="entrada"
          descricao="Contas a receber quitadas"
          icone={ArrowUpRight}
        />
        <ValorCard
          label="Resgates"
          valor={dados.totalResgatado}
          tipo="entrada"
          descricao="Retiradas de investimentos"
          icone={ArrowUpRight}
        />
        <ValorCard
          label="Contas Pagas"
          valor={dados.totalPago}
          tipo="saida"
          descricao="Contas a pagar quitadas"
          icone={ArrowDownRight}
        />
        <ValorCard
          label="Aportes"
          valor={dados.totalAportado}
          tipo="saida"
          descricao="Enviados a investimentos"
          icone={ArrowDownRight}
        />
      </div>

      {/* Em aberto */}
      <Divider label="Posição em Aberto" />
      <div className="grid grid-cols-2 gap-3">
        <ValorCard
          label="A Receber"
          valor={dados.totalAReceber}
          tipo="entrada"
          descricao="Pendente + Atrasado"
          icone={TrendingUp}
        />
        <ValorCard
          label="A Pagar"
          valor={dados.totalAPagar}
          tipo="saida"
          descricao="Pendente + Atrasado"
          icone={TrendingDown}
        />
      </div>
      <div className={cn(
        'rounded-xl px-4 py-3 border flex items-center justify-between',
        saldoLiquidoPositivo ? 'bg-secondary/5 border-secondary/20' : 'bg-error/5 border-error/20'
      )}>
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
          Saldo líquido em aberto
        </span>
        <span className={cn('text-lg font-bold', saldoLiquidoPositivo ? 'text-secondary' : 'text-error')}>
          {saldoLiquidoPositivo ? '+' : ''} R$ {brl(dados.saldoLiquidoEmAberto)}
        </span>
      </div>

      {/* Cartão de Crédito */}
      <Divider label="Cartão de Crédito" />
      <div className="grid grid-cols-2 gap-3">
        <ValorCard
          label="Lançamentos (fatura aberta)"
          valor={dados.totalLancamentosCartaoAberto}
          tipo="saida"
          descricao="Ainda não viraram conta"
          icone={CreditCard}
        />
        <ValorCard
          label="Faturas Pendentes"
          valor={dados.totalFaturasCartaoPendentes}
          tipo="saida"
          descricao="Faturas fechadas não pagas"
          icone={CreditCard}
        />
      </div>

      {/* Projeções */}
      <Divider label="Projeções Futuras" />
      <div className="space-y-3">
        <div className={cn(
          'rounded-xl p-4 border',
          saldoPrevistoPositivo ? 'bg-primary/5 border-primary/20' : 'bg-error/5 border-error/20'
        )}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Saldo Previsto
            </span>
            <span className={cn('text-xl font-bold', saldoPrevistoPositivo ? 'text-primary' : 'text-error')}>
              R$ {brl(dados.saldoPrevisto)}
            </span>
          </div>
          <p className="text-[10px] text-zinc-600">
            = Saldo hoje (R$ {brl(dados.saldoContasCorrentes)})
            + A receber (R$ {brl(dados.totalAReceber)})
            − A pagar (R$ {brl(dados.totalAPagar)})
          </p>
        </div>

        <div className={cn(
          'rounded-xl p-4 border',
          saldoComCartaoPositivo ? 'bg-surface border-white/5' : 'bg-error/10 border-error/30'
        )}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Saldo Previsto com Cartão
            </span>
            <span className={cn('text-xl font-bold', saldoComCartaoPositivo ? 'text-white' : 'text-error')}>
              R$ {brl(dados.saldoPrevistoComCartao)}
            </span>
          </div>
          <p className="text-[10px] text-zinc-600">
            = Saldo previsto (R$ {brl(dados.saldoPrevisto)})
            − Cartão aberto (R$ {brl(dados.totalLancamentosCartaoAberto)})
          </p>
        </div>
      </div>

      {/* Patrimônio */}
      <Divider label="Investimentos" />
      <div className="bg-surface border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          Patrimônio em Investimentos
        </span>
        <span className="text-lg font-bold text-white">
          R$ {brl(dados.patrimonioInvestimentos)}
        </span>
      </div>
    </div>
  );
}
