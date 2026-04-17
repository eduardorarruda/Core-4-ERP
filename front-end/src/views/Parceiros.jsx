import React, { useEffect, useState } from 'react';
import { Users, Plus, Trash2, Pencil } from 'lucide-react';
import { parceiros as api } from '../lib/api';

const TIPOS = ['CLIENTE', 'FORNECEDOR', 'AMBOS'];

const empty = { nome: '', tipo: 'CLIENTE', razaoSocial: '', nomeFantasia: '', cpfCnpj: '', endereco: '' };

export default function Parceiros() {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try { setLista(await api.listar()); } catch (e) { setErro(e.message); }
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      if (editId) await api.atualizar(editId, form);
      else await api.criar(form);
      setForm(empty);
      setEditId(null);
      await carregar();
    } catch (e) { setErro(e.message); }
    finally { setCarregando(false); }
  }

  async function deletar(id) {
    if (!confirm('Excluir parceiro?')) return;
    try { await api.deletar(id); await carregar(); } catch (e) { setErro(e.message); }
  }

  function editar(p) { setForm({ nome: p.nome, tipo: p.tipo, razaoSocial: p.razaoSocial || '', nomeFantasia: p.nomeFantasia || '', cpfCnpj: p.cpfCnpj || '', endereco: p.endereco || '' }); setEditId(p.id); }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-white">Parceiros</h1>
      </div>

      {/* Formulário */}
      <form onSubmit={salvar} className="bg-surface-low rounded-2xl p-6 border border-white/5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">{editId ? 'Editar' : 'Novo'} Parceiro</h2>
        {erro && <p className="text-red-400 text-sm">{erro}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nome *" value={form.nome} onChange={v => setForm(f => ({ ...f, nome: v }))} required />
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Tipo *</label>
            <select className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-white outline-none" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Field label="CPF / CNPJ" value={form.cpfCnpj} onChange={v => setForm(f => ({ ...f, cpfCnpj: v }))} />
          <Field label="Razão Social" value={form.razaoSocial} onChange={v => setForm(f => ({ ...f, razaoSocial: v }))} />
          <Field label="Nome Fantasia" value={form.nomeFantasia} onChange={v => setForm(f => ({ ...f, nomeFantasia: v }))} />
          <Field label="Endereço" value={form.endereco} onChange={v => setForm(f => ({ ...f, endereco: v }))} />
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={carregando} className="bg-primary text-on-primary font-bold px-6 py-2 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            <Plus className="w-4 h-4" /> {editId ? 'Salvar' : 'Criar'}
          </button>
          {editId && <button type="button" onClick={() => { setForm(empty); setEditId(null); }} className="px-6 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white">Cancelar</button>}
        </div>
      </form>

      {/* Lista */}
      <div className="bg-surface-low rounded-2xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-white/5">
            <tr className="text-left text-zinc-500 text-xs uppercase tracking-widest">
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4">CPF/CNPJ</th>
              <th className="px-6 py-4 w-24">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map(p => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/2">
                <td className="px-6 py-4 text-white font-medium">{p.nome}</td>
                <td className="px-6 py-4 text-zinc-400">{p.tipo}</td>
                <td className="px-6 py-4 text-zinc-400">{p.cpfCnpj || '—'}</td>
                <td className="px-6 py-4 flex gap-2">
                  <button onClick={() => editar(p)} className="text-zinc-400 hover:text-primary"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => deletar(p.id)} className="text-zinc-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {lista.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-zinc-500">Nenhum parceiro cadastrado</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">{label}</label>
      <input className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-primary" value={value} onChange={e => onChange(e.target.value)} required={required} />
    </div>
  );
}
