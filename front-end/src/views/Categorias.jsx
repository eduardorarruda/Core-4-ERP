import React, { useEffect, useState } from 'react';
import {
  Tag, Plus, Pencil, Trash2, Loader2,
  ShoppingCart, Home, Car, Utensils, Heart, Zap, Wifi,
  GraduationCap, Plane, Music, Gift, Coffee, Dumbbell, Shirt,
  Briefcase, TrendingUp, DollarSign, Landmark, CreditCard, Wallet,
} from 'lucide-react';
import { categorias as api } from '../lib/api';
import ConfirmModal from '../components/ui/ConfirmModal';
import FormField, { inputCls, labelCls } from '../components/ui/FormField';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';

const ICONES = [
  { nome: 'ShoppingCart', componente: ShoppingCart },
  { nome: 'Home', componente: Home },
  { nome: 'Car', componente: Car },
  { nome: 'Utensils', componente: Utensils },
  { nome: 'Heart', componente: Heart },
  { nome: 'Zap', componente: Zap },
  { nome: 'Wifi', componente: Wifi },
  { nome: 'GraduationCap', componente: GraduationCap },
  { nome: 'Plane', componente: Plane },
  { nome: 'Music', componente: Music },
  { nome: 'Gift', componente: Gift },
  { nome: 'Coffee', componente: Coffee },
  { nome: 'Dumbbell', componente: Dumbbell },
  { nome: 'Shirt', componente: Shirt },
  { nome: 'Briefcase', componente: Briefcase },
  { nome: 'TrendingUp', componente: TrendingUp },
  { nome: 'DollarSign', componente: DollarSign },
  { nome: 'Landmark', componente: Landmark },
  { nome: 'CreditCard', componente: CreditCard },
  { nome: 'Wallet', componente: Wallet },
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

      <form onSubmit={salvar} className="bg-surface-medium border border-text-primary/5 rounded-2xl p-6 space-y-5 animate-fade-in">
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
          {lista.map((c) => {
            const entry = ICONES.find((i) => i.nome === c.icone);
            const Icone = entry ? entry.componente : Tag;
            return (
              <div
                key={c.id}
                className="bg-surface-medium border border-text-primary/5 rounded-2xl p-4 flex items-center gap-3 hover:border-text-primary/10 hover:scale-[1.02] transition-all cursor-default"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/10 flex items-center justify-center shrink-0">
                  <Icone className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium text-text-primary flex-1 text-sm truncate">{c.descricao}</span>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => editar(c)}
                    aria-label={`Editar categoria ${c.descricao}`}
                    className="text-text-primary/40 hover:text-primary p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deletar(c.id)}
                    aria-label={`Excluir categoria ${c.descricao}`}
                    className="text-text-primary/40 hover:text-error p-1.5 rounded-lg hover:bg-error/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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
