import React, { useEffect, useState } from 'react';
import {
  Tag, Plus, Pencil, Trash2, Loader2,
  ShoppingCart, Home, Car, Utensils, Heart, Zap, Wifi,
  GraduationCap, Plane, Music, Gift, Coffee, Dumbbell, Shirt,
  Briefcase, TrendingUp, DollarSign, Landmark, CreditCard, Wallet,
  Sofa, Lightbulb, Flame, Wrench, Key,
  Bus, Fuel, CarFront, TrainFront, Bike,
  Pizza, ShoppingBasket, UtensilsCrossed,
  Pill, Stethoscope, Activity,
  Gamepad2, Tv, BookOpen, Camera,
  Smartphone, Laptop, Monitor,
  Building2, PiggyBank, Receipt, Banknote, Calculator,
  Baby, Dog, Package,
} from 'lucide-react';
import { categorias as api } from '../lib/api';
import ConfirmModal from '../components/ui/ConfirmModal';
import FormField, { inputCls, labelCls } from '../components/ui/FormField';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';
import PermissaoGuard from '../components/ui/PermissaoGuard';

const ICONES = [
  // Compras e consumo
  { nome: 'ShoppingCart', componente: ShoppingCart },
  { nome: 'ShoppingBasket', componente: ShoppingBasket },
  { nome: 'Receipt', componente: Receipt },
  { nome: 'Package', componente: Package },
  // Habitação e moradia
  { nome: 'Home', componente: Home },
  { nome: 'Sofa', componente: Sofa },
  { nome: 'Lightbulb', componente: Lightbulb },
  { nome: 'Flame', componente: Flame },
  { nome: 'Wrench', componente: Wrench },
  { nome: 'Key', componente: Key },
  // Transporte
  { nome: 'Car', componente: Car },
  { nome: 'CarFront', componente: CarFront },
  { nome: 'Bus', componente: Bus },
  { nome: 'TrainFront', componente: TrainFront },
  { nome: 'Bike', componente: Bike },
  { nome: 'Fuel', componente: Fuel },
  { nome: 'Plane', componente: Plane },
  // Alimentação
  { nome: 'Utensils', componente: Utensils },
  { nome: 'UtensilsCrossed', componente: UtensilsCrossed },
  { nome: 'Pizza', componente: Pizza },
  { nome: 'Coffee', componente: Coffee },
  // Saúde e bem-estar
  { nome: 'Heart', componente: Heart },
  { nome: 'Pill', componente: Pill },
  { nome: 'Stethoscope', componente: Stethoscope },
  { nome: 'Activity', componente: Activity },
  { nome: 'Dumbbell', componente: Dumbbell },
  // Educação e lazer
  { nome: 'GraduationCap', componente: GraduationCap },
  { nome: 'BookOpen', componente: BookOpen },
  { nome: 'Music', componente: Music },
  { nome: 'Gamepad2', componente: Gamepad2 },
  { nome: 'Tv', componente: Tv },
  { nome: 'Camera', componente: Camera },
  { nome: 'Gift', componente: Gift },
  // Tecnologia
  { nome: 'Smartphone', componente: Smartphone },
  { nome: 'Laptop', componente: Laptop },
  { nome: 'Monitor', componente: Monitor },
  { nome: 'Wifi', componente: Wifi },
  { nome: 'Zap', componente: Zap },
  // Finanças
  { nome: 'DollarSign', componente: DollarSign },
  { nome: 'Wallet', componente: Wallet },
  { nome: 'Banknote', componente: Banknote },
  { nome: 'CreditCard', componente: CreditCard },
  { nome: 'Landmark', componente: Landmark },
  { nome: 'PiggyBank', componente: PiggyBank },
  { nome: 'Building2', componente: Building2 },
  { nome: 'Calculator', componente: Calculator },
  { nome: 'TrendingUp', componente: TrendingUp },
  // Trabalho e pessoal
  { nome: 'Briefcase', componente: Briefcase },
  { nome: 'Shirt', componente: Shirt },
  { nome: 'Baby', componente: Baby },
  { nome: 'Dog', componente: Dog },
];

function IconeCategoria({ nome, className = 'w-5 h-5' }) {
  const entry = ICONES.find((i) => i.nome === nome);
  if (!entry) return <Tag className={className} />;
  const Icone = entry.componente;
  return <Icone className={className} />;
}

const empty = { descricao: '', icone: '' };

export default function Categorias() {
  const toast = useToast();
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try { setLista(await api.listar()); }
    catch (e) { toast.error(e.message); }
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      if (editId) await api.atualizar(editId, form);
      else await api.criar(form);
      setForm(empty);
      setEditId(null);
      toast.success(editId ? 'Categoria atualizada!' : 'Categoria criada!');
      await carregar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSalvando(false);
    }
  }

  function deletar(id) {
    setConfirmAction({
      title: 'Excluir categoria',
      message: 'Tem certeza que deseja excluir esta categoria?',
      confirmLabel: 'Excluir',
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await api.deletar(id);
          await carregar();
          toast.success('Categoria excluída!');
        } catch (e) {
          toast.error(e.message);
        }
      },
    });
  }

  function editar(c) { setForm({ descricao: c.descricao, icone: c.icone || '' }); setEditId(c.id); }

  const PreviewIcon = ICONES.find((i) => i.nome === form.icone)?.componente ?? null;

  return (
    <div className="space-y-6">
      <PageHeader title="Categorias" subtitle="Organização dos seus lançamentos" />

      <form
        onSubmit={salvar}
        className="rounded-[18px] p-6 space-y-5 anim-in"
        style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(250,250,250,.07)', backdropFilter: 'blur(8px)', boxShadow: '0 1px 3px rgba(0,0,0,.3),0 8px 32px rgba(0,0,0,.2)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary/50">
            {editId ? 'Editar' : 'Nova'} Categoria
          </h2>
          {PreviewIcon && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
              <PreviewIcon className="w-4 h-4 text-primary" />
              <span className="text-xs text-primary font-bold">{form.descricao || 'Preview'}</span>
            </div>
          )}
        </div>

        <div className="space-y-1 max-w-sm">
          <label className={labelCls}>Descrição *</label>
          <input
            className={inputCls}
            value={form.descricao}
            onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
            required
            placeholder="Ex: Alimentação"
          />
        </div>

        <div className="space-y-3">
          <label className={labelCls}>Ícone</label>
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {ICONES.map(({ nome, componente: Icone }) => (
              <button
                key={nome}
                type="button"
                onClick={() => setForm((f) => ({ ...f, icone: nome }))}
                title={nome}
                aria-label={nome}
                className={cn(
                  'p-3 rounded-xl border transition-all hover:scale-105',
                  form.icone === nome
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-surface border-text-primary/5 text-text-primary/50 hover:border-text-primary/20 hover:text-text-primary/80'
                )}
              >
                <Icone className="w-5 h-5 mx-auto" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={salvando}
            className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {salvando ? 'Gravando...' : editId ? 'Salvar' : 'Criar'}
          </button>
          {editId && (
            <button
              type="button"
              onClick={() => { setForm(empty); setEditId(null); }}
              className="px-6 py-2.5 rounded-xl border border-text-primary/10 text-text-primary/60 hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {lista.length === 0 ? (
        <EmptyState icon={Tag} title="Nenhuma categoria" description="Crie categorias para organizar seus lançamentos financeiros." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {lista.map((c, i) => {
            const entry = ICONES.find((ic) => ic.nome === c.icone);
            const Icone = entry ? entry.componente : Tag;
            return (
              <div
                key={c.id}
                className={`anim-in d${Math.min(i + 1, 6)} flex items-center gap-3 p-4 rounded-[14px] transition-all hover:scale-[1.02] cursor-default`}
                style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(250,250,250,.07)', backdropFilter: 'blur(8px)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(110,255,192,.1)', border: '1px solid rgba(110,255,192,.2)' }}
                >
                  <Icone className="w-5 h-5 text-primary" />
                </div>
                <span className="font-bold text-text-primary flex-1 text-sm truncate font-display">{c.descricao}</span>
                <div className="flex gap-1 shrink-0">
                  <PermissaoGuard permissao="CATEGORIA_EDITAR">
                    <button onClick={() => editar(c)} aria-label={`Editar ${c.descricao}`} className="text-text-primary/30 hover:text-primary p-1.5 rounded-lg hover:bg-primary/10 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </PermissaoGuard>
                  <PermissaoGuard permissao="CATEGORIA_DELETAR">
                    <button onClick={() => deletar(c.id)} aria-label={`Excluir ${c.descricao}`} className="text-text-primary/30 hover:text-error p-1.5 rounded-lg hover:bg-error/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </PermissaoGuard>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmAction && <ConfirmModal {...confirmAction} onCancel={() => setConfirmAction(null)} />}
    </div>
  );
}
