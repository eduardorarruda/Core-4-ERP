import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, CreditCard, Scale, Telescope } from 'lucide-react';
import Card from '../ui/Card';
import AlertaErro from '../ui/AlertaErro';
import { AnimatedNumber } from '../motion/Movimento';
import { formatarMoeda } from '../../lib/formatters';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

/**
 * "Em aberto e projeção" (antigo painel Posição financeira, enxuto): o que ainda vai entrar e sair,
 * o cartão e para onde o saldo caminha. Saldo de hoje, composição acumulada e investimentos
 * saíram daqui (já estão nos KPIs e no painel de patrimônio).
 *
 * Dados: GET /api/dashboard/saldo-detalhado (DASHBOARD_CARTAO_VISUALIZAR — o Dashboard só monta
 * este painel com a permissão). Recarrega junto com o "Atualizar" do cabeçalho.
 *
 * Props: dados, carregando, erro, onTentarNovamente, limiteLivre (número | null), className.
 */
function Linha({ icon: Icone, rotulo, valor, tom, sinal }) {
  const cor = { income: 'text-income', expense: 'text-expense' }[tom] ?? 'text-text-primary';
  const prefixo = sinal === '+' ? '+' : sinal === '−' ? '−' : '';
  return (
    <div className="flex items-center gap-3 py-2">
      {Icone && (
        <span aria-hidden="true" className={cn('grid place-items-center w-7 h-7 rounded-lg bg-text-primary/[0.05] shrink-0', cor)}>
          <Icone className="w-3.5 h-3.5" />
        </span>
      )}
      <span className="flex-1 text-sm text-text-primary/75">{rotulo}</span>
      <span className={cn('text-sm font-semibold tabular-nums valor-privado', cor)}>
        {prefixo}{formatarMoeda(valor, { sinal: prefixo ? 'nunca' : 'auto' })}
      </span>
    </div>
  );
}

function Secao({ titulo, children }) {
  return (
    <div>
      <p className="c4-eyebrow mb-1">{titulo}</p>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

export default function SaldoDetalhadoPanel({ dados, carregando, erro, onTentarNovamente, limiteLivre = null, className }) {
  const { temPermissao } = useAuth();

  if (erro && !dados) {
    return (
      <Card className={className} icon={Telescope} title="Em aberto e projeção">
        <AlertaErro compacto mensagem="Não deu para carregar o que está em aberto." onTentarNovamente={onTentarNovamente} />
      </Card>
    );
  }

  const liquido = Number(dados?.saldoLiquidoEmAberto ?? 0);
  const previsto = Number(dados?.saldoPrevisto ?? 0);
  const comCartao = Number(dados?.saldoPrevistoComCartao ?? 0);
  const temCartao = Number(dados?.totalLancamentosCartaoAberto ?? 0) > 0 || Number(dados?.totalFaturasCartaoPendentes ?? 0) > 0 || limiteLivre != null;

  return (
    <Card
      className={className}
      loading={carregando && !dados}
      icon={Telescope}
      title="Em aberto e projeção"
      subtitle="O que ainda vai entrar e sair, e onde o saldo deve chegar"
      footer={
        <Link to="/reports" className="inline-flex items-center min-h-11 text-sm font-medium text-primary hover:underline underline-offset-4">
          Ver posição financeira completa
        </Link>
      }
    >
      <div className="space-y-5">
        <Secao titulo="Contas em aberto">
          <Linha icon={ArrowDownLeft} rotulo="A receber" valor={dados?.totalAReceber} tom="income" sinal="+" />
          <Linha icon={ArrowUpRight} rotulo="A pagar" valor={dados?.totalAPagar} tom="expense" sinal="−" />
          <Linha icon={Scale} rotulo="Diferença" valor={liquido} tom={liquido >= 0 ? 'income' : 'expense'} />
        </Secao>

        {temCartao && (
          <Secao titulo="Cartões">
            <Linha icon={CreditCard} rotulo="Fatura aberta" valor={dados?.totalLancamentosCartaoAberto} tom="expense" sinal="−" />
            {Number(dados?.totalFaturasCartaoPendentes ?? 0) > 0 && (
              <Linha icon={CreditCard} rotulo="Faturas fechadas a pagar" valor={dados?.totalFaturasCartaoPendentes} tom="expense" sinal="−" />
            )}
            {limiteLivre != null && (
              <div className="flex items-center gap-3 py-2">
                <span className="flex-1 text-sm text-text-primary/75">Limite livre</span>
                {temPermissao('CARTAO_VISUALIZAR') ? (
                  <Link to="/cartoes/dashboard" className="text-sm font-semibold tabular-nums valor-privado text-text-primary underline decoration-dotted underline-offset-4 hover:text-primary">
                    {formatarMoeda(limiteLivre)}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold tabular-nums valor-privado">{formatarMoeda(limiteLivre)}</span>
                )}
              </div>
            )}
          </Secao>
        )}

        <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-4 space-y-3">
          <div>
            <p className="text-xs text-text-primary/65">Saldo previsto (contas em dia)</p>
            <AnimatedNumber value={previsto} colorir className="font-display text-2xl font-semibold" />
          </div>
          <div className="flex items-baseline justify-between gap-3 pt-3 border-t border-primary/15">
            <span className="text-xs text-text-primary/65">Depois de pagar os cartões</span>
            <span className={cn('font-semibold tabular-nums valor-privado', comCartao < 0 ? 'text-expense' : 'text-text-primary')}>{formatarMoeda(comCartao)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
