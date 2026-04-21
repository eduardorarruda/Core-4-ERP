import React, { useEffect, useState } from 'react';
import {
  Tag, Plus, Pencil, Trash2,
  ShoppingCart, Home, Car, Utensils, Heart, Zap, Wifi,
  GraduationCap, Plane, Music, Gift, Coffee, Dumbbell, Shirt,
  Briefcase, TrendingUp, DollarSign, Landmark, CreditCard, Wallet,
} from 'lucide-react';
import { categorias as api } from '../lib/api';
import Toast from '../components/ui/Toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import FormField, { inputCls, labelCls } from '../components/ui/FormField';

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

export function IconeCategoria({ nome, className = 'w-5 h-5' }) {
  const entry = ICONES.find(i => i.nome === nome);
  if (!entry) return <Tag className={className} />;
  const Icone = entry.componente;
  return <Icone className={className} />;
}

const empty = { descricao: '', icone: '' };

export default function Categorias() {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try { setLista(await api.listar()); }
    catch (e) { setToast({ message: e.message, type: 'error' }); }
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      if (editId) await api.atualizar(editId, form);
      else await api.criar(form);
      setForm(empty); setEditId(null);
      setToast({ message: editId ? 'Categoria atualizada!' : 'Categoria criada!', type: 'success' });
      await carregar();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
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
        try { await api.deletar(id); await carregar(); setToast({ message: 'Categoria excluída!', type: 'success' }); }
        catch (e) { setToast({ message: e.message, type: 'error' }); }
      },
    });
  }

  function editar(c) { setForm({ descricao: c.descricao, icone: c.icone || '' }); setEditId(c.id); }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Tag className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-white">Categorias</h1>
      </div>

      <form onSubmit={salvar} className="bg-surface-low rounded-2xl p-6 border border-white/5 space-y-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">{editId ? 'Editar' : 'Nova'} Categoria</h2>

        <div className="space-y-1 max-w-sm">
          <label className={labelCls}>Descrição *</label>
          <input className={inputCls} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} required placeholder="Ex: Alimentação" />
        </div>

        <div className="space-y-3">
          <label className={labelCls}>Ícone</label>
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {ICONES.map(({ nome, componente: Icone }) => (
              <button
                key={nome}
                type="button"
                onClick={() => setForm(f => ({ ...f, icone: nome }))}
                title={nome}
                className={`p-3 rounded-xl border transition-all ${
                  form.icone === nome
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-surface border-white/5 text-zinc-500 hover:border-white/20 hover:text-zinc-300'
                }`}
              >
                <Icone className="w-5 h-5 mx-auto" />
              </button>
            ))}
          </div>
          {form.icone && (
            <p className="text-xs text-zinc-500">Selecionado: <span className="text-primary font-medium">{form.icone}</span></p>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={salvando} className="bg-primary text-on-primary font-bold px-6 py-2 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            <Plus className="w-4 h-4" />{salvando ? 'GRAVANDO...' : editId ? 'Salvar' : 'Criar'}
          </button>
          {editId && <button type="button" onClick={() => { setForm(empty); setEditId(null); }} className="px-6 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white">Cancelar</button>}
        </div>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {lista.map(c => {
          const entry = ICONES.find(i => i.nome === c.icone);
          const Icone = entry ? entry.componente : Tag;
          return (
            <div key={c.id} className="bg-surface-low rounded-2xl p-4 border border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icone className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-white flex-1 text-sm">{c.descricao}</span>
              <div className="flex gap-1">
                <button onClick={() => editar(c)} className="text-zinc-500 hover:text-primary p-1"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => deletar(c.id)} className="text-zinc-500 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          );
        })}
        {lista.length === 0 && <p className="text-zinc-500 col-span-4 text-center py-8">Nenhuma categoria cadastrada</p>}
      </div>

      {confirmAction && <ConfirmModal {...confirmAction} onCancel={() => setConfirmAction(null)} />}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
