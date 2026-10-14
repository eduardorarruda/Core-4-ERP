import React from 'react';
import {
  Tag, ShoppingCart, ShoppingBasket, Receipt, Package,
  Home, Sofa, Lightbulb, Flame, Wrench, Key,
  Car, CarFront, Bus, TrainFront, Bike, Fuel, Plane,
  Utensils, UtensilsCrossed, Pizza, Coffee,
  Heart, Pill, Stethoscope, Activity, Dumbbell,
  GraduationCap, BookOpen, Music, Gamepad2, Tv, Camera, Gift,
  Smartphone, Laptop, Monitor, Wifi, Zap,
  DollarSign, Wallet, Banknote, CreditCard, Landmark, PiggyBank,
  Building2, Calculator, TrendingUp, Briefcase, Shirt, Baby, Dog,
} from 'lucide-react';
import { cn } from '../../lib/utils';

/* Mesmo conjunto do seletor de ícones de categoria (ui/IconDropdown). Nome desconhecido → Tag. */
const ICONES = {
  Tag, ShoppingCart, ShoppingBasket, Receipt, Package,
  Home, Sofa, Lightbulb, Flame, Wrench, Key,
  Car, CarFront, Bus, TrainFront, Bike, Fuel, Plane,
  Utensils, UtensilsCrossed, Pizza, Coffee,
  Heart, Pill, Stethoscope, Activity, Dumbbell,
  GraduationCap, BookOpen, Music, Gamepad2, Tv, Camera, Gift,
  Smartphone, Laptop, Monitor, Wifi, Zap,
  DollarSign, Wallet, Banknote, CreditCard, Landmark, PiggyBank,
  Building2, Calculator, TrendingUp, Briefcase, Shirt, Baby, Dog,
};


/**
 * Ícone da categoria num "chip" tingido (fundo da cor a 14%, borda a 24%) — portado do Fluxo.
 * Props: nome (ícone lucide salvo), cor (CSS, padrão primária), tamanho 'sm' | 'md'.
 */
export default function IconeCategoria({ nome, cor = 'var(--color-primary)', tamanho = 'md', className }) {
  return (
    <span
      aria-hidden="true"
      className={cn('grid place-items-center shrink-0 rounded-xl border', tamanho === 'sm' ? 'w-8 h-8' : 'w-10 h-10', className)}
      style={{
        color: cor,
        background: `color-mix(in srgb, ${cor} 14%, transparent)`,
        borderColor: `color-mix(in srgb, ${cor} 24%, transparent)`,
      }}
    >
      {React.createElement(ICONES[nome] ?? Tag, { className: tamanho === 'sm' ? 'w-4 h-4' : 'w-[1.125rem] h-[1.125rem]' })}
    </span>
  );
}
