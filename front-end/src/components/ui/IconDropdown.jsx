import React, { useEffect, useRef, useState } from 'react';
import {
  Tag, ShoppingCart, ShoppingBasket, Receipt, Package,
  Home, Sofa, Lightbulb, Flame, Wrench, Key,
  Car, CarFront, Bus, TrainFront, Bike, Fuel, Plane,
  Utensils, UtensilsCrossed, Pizza, Coffee,
  Heart, Pill, Stethoscope, Activity, Dumbbell,
  GraduationCap, BookOpen, Music, Gamepad2, Tv, Camera, Gift,
  Smartphone, Laptop, Monitor, Wifi, Zap,
  DollarSign, Wallet, Banknote, CreditCard, Landmark, PiggyBank,
  Building2, Calculator, TrendingUp,
  Briefcase, Shirt, Baby, Dog,
  Search, ChevronDown,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const GRUPOS = [
  {
    grupo: 'Compras',
    icones: [
      { nome: 'ShoppingCart', comp: ShoppingCart },
      { nome: 'ShoppingBasket', comp: ShoppingBasket },
      { nome: 'Receipt', comp: Receipt },
      { nome: 'Package', comp: Package },
    ],
  },
  {
    grupo: 'Habitação',
    icones: [
      { nome: 'Home', comp: Home },
      { nome: 'Sofa', comp: Sofa },
      { nome: 'Lightbulb', comp: Lightbulb },
      { nome: 'Flame', comp: Flame },
      { nome: 'Wrench', comp: Wrench },
      { nome: 'Key', comp: Key },
    ],
  },
  {
    grupo: 'Transporte',
    icones: [
      { nome: 'Car', comp: Car },
      { nome: 'CarFront', comp: CarFront },
      { nome: 'Bus', comp: Bus },
      { nome: 'TrainFront', comp: TrainFront },
      { nome: 'Bike', comp: Bike },
      { nome: 'Fuel', comp: Fuel },
      { nome: 'Plane', comp: Plane },
    ],
  },
  {
    grupo: 'Alimentação',
    icones: [
      { nome: 'Utensils', comp: Utensils },
      { nome: 'UtensilsCrossed', comp: UtensilsCrossed },
      { nome: 'Pizza', comp: Pizza },
      { nome: 'Coffee', comp: Coffee },
    ],
  },
  {
    grupo: 'Saúde',
    icones: [
      { nome: 'Heart', comp: Heart },
      { nome: 'Pill', comp: Pill },
      { nome: 'Stethoscope', comp: Stethoscope },
      { nome: 'Activity', comp: Activity },
      { nome: 'Dumbbell', comp: Dumbbell },
    ],
  },
  {
    grupo: 'Educação e Lazer',
    icones: [
      { nome: 'GraduationCap', comp: GraduationCap },
      { nome: 'BookOpen', comp: BookOpen },
      { nome: 'Music', comp: Music },
      { nome: 'Gamepad2', comp: Gamepad2 },
      { nome: 'Tv', comp: Tv },
      { nome: 'Camera', comp: Camera },
      { nome: 'Gift', comp: Gift },
    ],
  },
  {
    grupo: 'Tecnologia',
    icones: [
      { nome: 'Smartphone', comp: Smartphone },
      { nome: 'Laptop', comp: Laptop },
      { nome: 'Monitor', comp: Monitor },
      { nome: 'Wifi', comp: Wifi },
      { nome: 'Zap', comp: Zap },
    ],
  },
  {
    grupo: 'Finanças',
    icones: [
      { nome: 'DollarSign', comp: DollarSign },
      { nome: 'Wallet', comp: Wallet },
      { nome: 'Banknote', comp: Banknote },
      { nome: 'CreditCard', comp: CreditCard },
      { nome: 'Landmark', comp: Landmark },
      { nome: 'PiggyBank', comp: PiggyBank },
      { nome: 'Building2', comp: Building2 },
      { nome: 'Calculator', comp: Calculator },
      { nome: 'TrendingUp', comp: TrendingUp },
    ],
  },
  {
    grupo: 'Pessoal',
    icones: [
      { nome: 'Briefcase', comp: Briefcase },
      { nome: 'Shirt', comp: Shirt },
      { nome: 'Baby', comp: Baby },
      { nome: 'Dog', comp: Dog },
    ],
  },
];

const TODOS_ICONES = GRUPOS.flatMap((g) => g.icones);

function IconeAtual({ nome }) {
  const entry = TODOS_ICONES.find((i) => i.nome === nome);
  if (!entry) return <Tag className="w-4 h-4" />;
  const Comp = entry.comp;
  return <Comp className="w-4 h-4" />;
}

export default function IconDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtrado = busca.trim()
    ? TODOS_ICONES.filter((i) => i.nome.toLowerCase().includes(busca.toLowerCase()))
    : null;

  const base = 'w-full rounded-xl px-3 py-2.5 text-sm bg-surface border border-text-primary/10 outline-none transition-colors';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(base, 'flex items-center gap-2 text-left hover:border-text-primary/20 focus:border-primary/50')}
      >
        <span className="text-text-primary/70">
          <IconeAtual nome={value} />
        </span>
        <span className="flex-1 text-xs text-text-primary/60 font-mono">{value || 'Selecionar ícone'}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-text-primary/30 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className="absolute z-50 top-full mt-1 w-72 rounded-2xl border border-text-primary/10 shadow-2xl overflow-hidden"
          style={{ background: 'rgba(18,18,28,.98)', backdropFilter: 'blur(12px)' }}
        >
          <div className="p-3 border-b border-text-primary/8">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-primary/30" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar ícone..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg text-xs bg-surface border border-text-primary/10 text-text-primary placeholder:text-text-primary/25 outline-none focus:border-primary/40"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-64 p-3 space-y-3">
            {filtrado ? (
              filtrado.length > 0 ? (
                <div className="grid grid-cols-7 gap-1">
                  {filtrado.map(({ nome, comp: Comp }) => (
                    <button
                      key={nome}
                      type="button"
                      title={nome}
                      onClick={() => { onChange(nome); setOpen(false); setBusca(''); }}
                      className={cn(
                        'p-2 rounded-lg border transition-all hover:scale-105',
                        value === nome
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'border-text-primary/5 text-text-primary/50 hover:border-text-primary/20 hover:text-text-primary/80'
                      )}
                    >
                      <Comp className="w-4 h-4 mx-auto" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-primary/30 text-center py-4">Nenhum ícone encontrado</p>
              )
            ) : (
              GRUPOS.map(({ grupo, icones }) => (
                <div key={grupo}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-primary/30 mb-1.5">{grupo}</p>
                  <div className="grid grid-cols-7 gap-1">
                    {icones.map(({ nome, comp: Comp }) => (
                      <button
                        key={nome}
                        type="button"
                        title={nome}
                        onClick={() => { onChange(nome); setOpen(false); }}
                        className={cn(
                          'p-2 rounded-lg border transition-all hover:scale-105',
                          value === nome
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'border-text-primary/5 text-text-primary/50 hover:border-text-primary/20 hover:text-text-primary/80'
                        )}
                      >
                        <Comp className="w-4 h-4 mx-auto" />
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
