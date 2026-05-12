import { Link } from 'react-router-dom';
import { PieChart as PieIcon } from 'lucide-react';
import BentoCard from '../ui/BentoCard';
import { brl } from '../../lib/formatters';
import { cn } from '../../lib/utils';

const TIPO_LABEL = { RENDA_FIXA: 'Renda Fixa', RENDA_VARIAVEL: 'Renda Variável', FUNDOS: 'Fundos', CRIPTO: 'Cripto', OUTROS: 'Outros' };
const TIPO_COLOR = { RENDA_FIXA: 'text-secondary', RENDA_VARIAVEL: 'text-primary', FUNDOS: 'text-amber-400', CRIPTO: 'text-purple-400', OUTROS: 'text-text-primary/60' };

export default function CarteiraPanel({ carteira, patrimonioTotal, carregando }) {
  return (
    <BentoCard
      className="col-span-12 lg:col-span-4 animate-fade-in-up animate-stagger-4"
      loading={carregando}
      title="Carteira de Investimentos"
      headerAction={
        <Link to="/investimentos" className="text-[10px] font-bold uppercase tracking-widest text-text-primary/50 hover:text-primary transition-colors">
          Ver tudo →
        </Link>
      }
    >
      <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-0.5">Patrimônio Total</p>
          <p className="text-2xl font-bold text-text-primary font-display">R$ {brl(patrimonioTotal)}</p>
        </div>
        <PieIcon className="w-8 h-8 text-primary opacity-40" />
      </div>

      {carteira.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-text-primary/50">Nenhuma carteira cadastrada</p>
          <Link to="/investimentos" className="text-xs text-primary hover:underline mt-1 block">Cadastrar investimento</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {carteira.map((c) => {
            const pct = patrimonioTotal > 0 ? (Number(c.saldoAtual) / patrimonioTotal) * 100 : 0;
            const color = TIPO_COLOR[c.tipo] ?? 'text-text-primary/60';
            return (
              <div key={c.id} className="bg-surface-low rounded-lg px-3 py-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn('text-[9px] font-bold uppercase tracking-widest shrink-0', color)}>
                      {TIPO_LABEL[c.tipo] ?? c.tipo}
                    </span>
                    <span className="text-xs text-text-primary/80 truncate font-medium">{c.nome}</span>
                  </div>
                  <span className="text-xs font-bold text-text-primary shrink-0 ml-2">R$ {brl(c.saldoAtual)}</span>
                </div>
                <div className="h-1 w-full bg-surface-medium rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full transition-all duration-700" style={{ width: `${pct.toFixed(1)}%` }} />
                </div>
                <p className="text-[10px] text-text-primary/40 text-right">{pct.toFixed(1)}% do total</p>
              </div>
            );
          })}
        </div>
      )}
    </BentoCard>
  );
}
