import {
  Activity, Baby, Banknote, Bike, BookOpen, Briefcase, Building2, Bus, Calculator, Camera, Car, CarFront,
  Coffee, CreditCard, Dog, DollarSign, Dumbbell, Flame, Fuel, Gamepad2, Gift, GraduationCap, Heart, Home,
  Key, Landmark, Laptop, Lightbulb, Monitor, Music, Package, PiggyBank, Pill, Pizza, Plane, Receipt,
  Shirt, ShoppingBasket, ShoppingCart, Smartphone, Sofa, Stethoscope, Tag, TrainFront, TrendingUp, Tv,
  Utensils, UtensilsCrossed, Wallet, Wifi, Wrench, Zap,
} from 'lucide-react';

/*
 * Ícones de categoria: o nome salvo no banco é o nome do ícone lucide (ex.: "ShoppingCart").
 * Cada um tem um rótulo em português para a busca e para leitores de tela.
 */
export const GRUPOS_ICONES = [
  { grupo: 'Compras', icones: [
    ['ShoppingCart', ShoppingCart, 'Carrinho, mercado'], ['ShoppingBasket', ShoppingBasket, 'Cesta, feira'],
    ['Receipt', Receipt, 'Recibo, nota'], ['Package', Package, 'Pacote, encomenda'], ['Gift', Gift, 'Presente'],
  ] },
  { grupo: 'Casa', icones: [
    ['Home', Home, 'Casa, aluguel'], ['Sofa', Sofa, 'Móveis'], ['Lightbulb', Lightbulb, 'Luz, energia'],
    ['Flame', Flame, 'Gás'], ['Wrench', Wrench, 'Manutenção'], ['Key', Key, 'Chave, condomínio'], ['Wifi', Wifi, 'Internet'],
    ['Zap', Zap, 'Energia elétrica'],
  ] },
  { grupo: 'Transporte', icones: [
    ['Car', Car, 'Carro'], ['CarFront', CarFront, 'Veículo'], ['Fuel', Fuel, 'Combustível'], ['Bus', Bus, 'Ônibus'],
    ['TrainFront', TrainFront, 'Metrô, trem'], ['Bike', Bike, 'Bicicleta'], ['Plane', Plane, 'Viagem, avião'],
  ] },
  { grupo: 'Alimentação', icones: [
    ['Utensils', Utensils, 'Refeição'], ['UtensilsCrossed', UtensilsCrossed, 'Restaurante'], ['Pizza', Pizza, 'Lanche, delivery'],
    ['Coffee', Coffee, 'Café'],
  ] },
  { grupo: 'Saúde e bem-estar', icones: [
    ['Heart', Heart, 'Saúde'], ['Pill', Pill, 'Farmácia, remédio'], ['Stethoscope', Stethoscope, 'Médico, plano de saúde'],
    ['Activity', Activity, 'Exames'], ['Dumbbell', Dumbbell, 'Academia'],
  ] },
  { grupo: 'Educação e lazer', icones: [
    ['GraduationCap', GraduationCap, 'Escola, faculdade'], ['BookOpen', BookOpen, 'Livros, cursos'], ['Music', Music, 'Música'],
    ['Gamepad2', Gamepad2, 'Jogos'], ['Tv', Tv, 'TV, streaming'], ['Camera', Camera, 'Fotografia'],
  ] },
  { grupo: 'Tecnologia', icones: [
    ['Smartphone', Smartphone, 'Celular'], ['Laptop', Laptop, 'Notebook'], ['Monitor', Monitor, 'Computador'],
  ] },
  { grupo: 'Dinheiro', icones: [
    ['DollarSign', DollarSign, 'Dinheiro'], ['Wallet', Wallet, 'Carteira'], ['Banknote', Banknote, 'Salário, cédulas'],
    ['CreditCard', CreditCard, 'Cartão'], ['Landmark', Landmark, 'Banco, impostos'], ['PiggyBank', PiggyBank, 'Poupança'],
    ['TrendingUp', TrendingUp, 'Investimentos'], ['Calculator', Calculator, 'Contabilidade'], ['Building2', Building2, 'Empresa'],
  ] },
  { grupo: 'Pessoal', icones: [
    ['Briefcase', Briefcase, 'Trabalho'], ['Shirt', Shirt, 'Roupas'], ['Baby', Baby, 'Filhos'], ['Dog', Dog, 'Pets'],
    ['Tag', Tag, 'Geral'],
  ] },
];

const MAPA = Object.fromEntries(GRUPOS_ICONES.flatMap((g) => g.icones.map(([nome, comp, rotulo]) => [nome, { comp, rotulo }])));

/** Componente lucide do ícone salvo (nome desconhecido → Tag). */
export function iconeCategoria(nome) {
  return MAPA[nome]?.comp ?? Tag;
}

/** Rótulo em português do ícone salvo. */
export function rotuloIcone(nome) {
  return MAPA[nome]?.rotulo ?? 'Sem ícone';
}

