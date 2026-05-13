import BentoCard from '../ui/BentoCard';
import { brl } from '../../lib/formatters';
import { cn } from '../../lib/utils';

export default function ResultadoMesPanel({ receitasMes, despesasMes, saldo, carregando }) {
  const total = receitasMes + despesasMes || 1;

  return (
    <BentoCard
      className="col-span-12 lg:col-span-6 animate-fade-in-up animate-stagger-3"
      loading={carregando}
      title="Resultado do Mês Atual"
    >
      <div className="space-y-8 mt-4">
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-text-primary/50">
            <span>Receitas Recebidas</span>
            <span className="text-secondary">R$ {brl(receitasMes)}</span>
          </div>
          <div className="h-3 w-full bg-surface-low rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary rounded-full transition-all duration-1000"
              style={{ width: `${Math.min((receitasMes / total) * 100, 100)}%` }}
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-text-primary/50">
            <span>Despesas Pagas</span>
            <span className="text-error">R$ {brl(despesasMes)}</span>
          </div>
          <div className="h-3 w-full bg-surface-low rounded-full overflow-hidden">
            <div
              className="h-full bg-error rounded-full transition-all duration-1000"
              style={{ width: `${Math.min((despesasMes / total) * 100, 100)}%` }}
            />
          </div>
        </div>
        <div className="pt-4 border-t border-text-primary/5">
          <p className="text-[10px] text-text-primary/50 uppercase font-bold tracking-widest">Saldo Total (Contas Correntes)</p>
          <p className={cn('text-3xl font-bold font-display', saldo >= 0 ? 'text-primary' : 'text-error')}>
            R$ {brl(saldo)}
          </p>
        </div>
      </div>
    </BentoCard>
  );
}
