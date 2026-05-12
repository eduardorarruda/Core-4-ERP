import { Link } from 'react-router-dom';
import BentoCard from '../ui/BentoCard';

const LINKS = [
  { label: 'Lançamentos', path: '/contas', color: 'text-secondary' },
  { label: 'Cartões',     path: '/cartoes', color: 'text-primary' },
  { label: 'Investimentos', path: '/investimentos', color: 'text-primary' },
  { label: 'Parceiros',  path: '/parceiros', color: 'text-text-primary/80' },
];

export default function AcessoRapidoPanel({ atrasadas, carregando }) {
  const links = LINKS.map((item) =>
    item.path === '/contas' && atrasadas > 0
      ? { ...item, count: `${atrasadas} atrasada${atrasadas > 1 ? 's' : ''}` }
      : item
  );

  return (
    <BentoCard
      className="col-span-12 lg:col-span-4 animate-fade-in-up animate-stagger-6"
      loading={carregando}
      title="Acesso Rápido"
    >
      <div className="grid grid-cols-2 gap-3 mt-4">
        {links.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="p-4 bg-surface-low rounded-xl hover:bg-surface-medium transition-colors group"
          >
            <span className={`text-xs font-bold uppercase tracking-widest ${item.color}`}>{item.label}</span>
            {item.count && (
              <p className="text-[10px] text-error mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse-dot" />
                {item.count}
              </p>
            )}
          </Link>
        ))}
      </div>
    </BentoCard>
  );
}
