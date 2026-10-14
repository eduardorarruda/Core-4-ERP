import React from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Repeat } from 'lucide-react';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import { AnimatedNumber } from '../motion/Movimento';
import { formatarMoeda } from '../../lib/formatters';
import { paraIsoLocal, proximaDataDoDia, rotuloVencimento } from './datasVisaoGeral';

/**
 * Assinaturas no Início: custo mensal + as 3 maiores (com o próximo vencimento e o cartão, uma vez).
 * Só aparece com ASSINATURA_VISUALIZAR (o Dashboard decide).
 *
 * Props: assinaturas (ativas), carregando, className.
 */
export default function AssinaturasPanel({ assinaturas = [], carregando = false, className }) {
  const ordenadas = [...assinaturas].sort((a, b) => Number(b.valor) - Number(a.valor));
  const total = ordenadas.reduce((s, a) => s + Number(a.valor ?? 0), 0);
  const top = ordenadas.slice(0, 3);
  const resto = ordenadas.length - top.length;

  return (
    <Card
      className={className}
      loading={carregando}
      icon={Repeat}
      title="Assinaturas"
      subtitle={`${ordenadas.length} ${ordenadas.length === 1 ? 'ativa' : 'ativas'}`}
      actions={
        <Link to="/assinaturas" className="text-sm font-medium text-primary hover:underline underline-offset-4 min-h-11 inline-flex items-center">
          Gerenciar
        </Link>
      }
    >
      {ordenadas.length === 0 ? (
        <EmptyState compact icon={Repeat} title="Nenhuma assinatura ativa" description="Cadastre serviços recorrentes em Assinaturas para ver o custo mensal aqui." />
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-text-primary/65">Custo por mês</p>
            <AnimatedNumber value={total} className="font-display text-2xl font-semibold" />
          </div>
          <ul className="divide-y divide-border">
            {top.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{a.descricao}</p>
                  <p className="text-xs text-text-primary/60 truncate flex items-center gap-1">
                    {rotuloVencimento(paraIsoLocal(proximaDataDoDia(a.diaVencimento)))}
                    {a.cartaoCreditoNome && (
                      <>
                        <span aria-hidden="true">·</span>
                        <CreditCard className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">no {a.cartaoCreditoNome}</span>
                      </>
                    )}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-expense valor-privado shrink-0">−{formatarMoeda(a.valor, { sinal: 'nunca' })}</span>
              </li>
            ))}
          </ul>
          {resto > 0 && <p className="text-xs text-text-primary/60">e mais {resto} {resto === 1 ? 'assinatura' : 'assinaturas'}</p>}
        </div>
      )}
    </Card>
  );
}
