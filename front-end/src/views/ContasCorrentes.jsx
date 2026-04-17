import React, { useEffect, useState } from 'react';
import { Landmark, Plus, Pencil, Trash2, ArrowRightLeft } from 'lucide-react';
import { contasCorrentes as api } from '../lib/api';

const empty = { apelido: '', descricao: '', saldo: '' };

export default function ContasCorrentes() {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [transf, setTransf] = useState({ contaOrigemId: '', contaDestinoId: '', valor: '' });
  const [showTransf, setShowTransf] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try { setLista(await api.listar()); } catch (e) { setErro(e.message); }
  }

  async function salvar(e) {
    e.preventDefault(); setErro('');
    try {
      const dto = { ...form, saldo: parseFloat(form.saldo) };
      if (editId) await api.atualizar(editId, dto); else await api.criar(dto);
      setForm(empty); setEditId(null); await carregar();
    } catch (e) { setErro(e.message); }
  }

  async function deletar(id) {
    if (!confirm('Excluir conta?')) return;
    try { await api.deletar(id); await carregar(); } catch (e) { setErro(e.message); }
  }

  async function transferir(e) {
    e.preventDefault(); setErro('');
    try {
      await api.transferir({ contaOrigemId: Number(transf.contaOrigemId), contaDestinoId: Number(transf.contaDestinoId), valor: parseFloat(transf.valor) });
      setTransf({ contaOrigemId: '', contaDestinoId: '', valor: '' }); setShowTransf(false); await carregar();
    } catch (e) { setErro(e.message); }
  }

  function editar(c) { setForm({ apelido: c.apelido, descricao: c.descricao, saldo: String(c.saldo) }); setEditId(c.id); }

  const total = lista.reduce((s, c) => s + Number(c.saldo), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Landmark className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold text-white">Contas Correntes</h1></div>
        <button onClick={() => setShowTransf(v => !v)} className="flex items-center gap-2 border border-white/10 text-zinc-300 px-4 py-2 rounded-xl hover:bg-white/5 text-sm">
          <ArrowRightLeft className="w-4 h-4" /> Transferir
        </button>
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded-2xl px-6 py-4">
        <p className="text-xs uppercase tracking-widest text-primary font-bold mb-1">Saldo Total</p>
        <p className="text-3xl font-bold text-white">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>

      {erro && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2">{erro}</p>}

      {showTransf && (
        <form onSubmit={transferir} className="bg-surface-low rounded-2xl p-6 border border-white/5 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Transferência</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1"><label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Origem</label>
              <select className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-white outline-none" value={transf.contaOrigemId} onChange={e => setTransf(f => ({ ...f, contaOrigemId: e.target.value }))} required>
                <option value="">Selecione</option>{lista.map(c => <option key={c.id} value={c.id}>{c.apelido}</option>)}
              </select>
            </div>
            <div className="space-y-1"><label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Destino</label>
              <select className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-white outline-none" value={transf.contaDestinoId} onChange={e => setTransf(f => ({ ...f, contaDestinoId: e.target.value }))} required>
                <option value="">Selecione</option>{lista.map(c => <option key={c.id} value={c.id}>{c.apelido}</option>)}
              </select>
            </div>
            <div className="space-y-1"><label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Valor (R$)</label>
              <input type="number" step="0.01" min="0.01" className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-white outline-none" value={transf.valor} onChange={e => setTransf(f => ({ ...f, valor: e.target.value }))} required />
            </div>
          </div>
          <button type="submit" className="bg-primary text-on-primary font-bold px-6 py-2 rounded-xl hover:opacity-90">Transferir</button>
        </form>
      )}

      <form onSubmit={salvar} className="bg-surface-low rounded-2xl p-6 border border-white/5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">{editId ? 'Editar' : 'Nova'} Conta</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[['Apelido', 'apelido', 'text'], ['Descrição', 'descricao', 'text'], ['Saldo inicial (R$)', 'saldo', 'number']].map(([lbl, key, type]) => (
            <div key={key} className="space-y-1"><label className="text-xs font-bold uppercase tracking-widest text-zinc-500">{lbl}</label>
              <input type={type} step={type === 'number' ? '0.01' : undefined} className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-primary" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required />
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button type="submit" className="bg-primary text-on-primary font-bold px-6 py-2 rounded-xl hover:opacity-90 flex items-center gap-2"><Plus className="w-4 h-4" />{editId ? 'Salvar' : 'Criar'}</button>
          {editId && <button type="button" onClick={() => { setForm(empty); setEditId(null); }} className="px-6 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white">Cancelar</button>}
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lista.map(c => (
          <div key={c.id} className="bg-surface-low rounded-2xl p-6 border border-white/5 space-y-2">
            <div className="flex justify-between items-start">
              <div><p className="font-bold text-white">{c.apelido}</p><p className="text-xs text-zinc-500">{c.descricao}</p></div>
              <div className="flex gap-2">
                <button onClick={() => editar(c)} className="text-zinc-500 hover:text-primary"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => deletar(c.id)} className="text-zinc-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <p className="text-2xl font-bold text-white">R$ {Number(c.saldo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        ))}
        {lista.length === 0 && <p className="text-zinc-500 col-span-3 text-center py-8">Nenhuma conta cadastrada</p>}
      </div>
    </div>
  );
}
