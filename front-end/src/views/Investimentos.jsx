import React, { useEffect, useState } from 'react';
import { TrendingUp, Plus, X } from 'lucide-react';
import { investimentos as api, contasCorrentes as ccApi } from '../lib/api';

const TIPOS = ['RENDA_FIXA', 'RENDA_VARIAVEL', 'FUNDOS', 'CRIPTO', 'OUTROS'];
const TIPO_TRANSACAO = ['APORTE', 'RESGATE', 'RENDIMENTO'];

export default function Investimentos() {
  const [lista, setLista] = useState([]);
  const [ccs, setCcs] = useState([]);
  const [form, setForm] = useState({ nome: '', tipo: 'RENDA_FIXA' });
  const [contaSel, setContaSel] = useState(null);
  const [transacoes, setTransacoes] = useState([]);
  const [tForm, setTForm] = useState({ tipoTransacao: 'APORTE', valor: '', dataTransacao: '', contaCorrenteOrigemId: '' });
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.listar().then(setLista).catch(e => setErro(e.message));
    ccApi.listar().then(setCcs).catch(() => {});
  }, []);

  async function criar(e) {
    e.preventDefault(); setErro('');
    try { await api.criar(form); api.listar().then(setLista); setForm({ nome: '', tipo: 'RENDA_FIXA' }); }
    catch (e) { setErro(e.message); }
  }

  async function abrir(c) {
    setContaSel(c);
    api.transacoes.listar(c.id).then(setTransacoes).catch(e => setErro(e.message));
  }

  async function registrar(e) {
    e.preventDefault(); setErro('');
    try {
      await api.transacoes.registrar(contaSel.id, { ...tForm, valor: parseFloat(tForm.valor), contaCorrenteOrigemId: tForm.contaCorrenteOrigemId ? Number(tForm.contaCorrenteOrigemId) : null });
      const updated = await api.buscar(contaSel.id);
      setContaSel(updated);
      api.listar().then(setLista);
      api.transacoes.listar(contaSel.id).then(setTransacoes);
      setTForm({ tipoTransacao: 'APORTE', valor: '', dataTransacao: '', contaCorrenteOrigemId: '' });
    } catch (e) { setErro(e.message); }
  }

  const totalSaldo = lista.reduce((s, c) => s + Number(c.saldoAtual), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><TrendingUp className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold text-white">Investimentos</h1></div>

      <div className="bg-primary/10 border border-primary/20 rounded-2xl px-6 py-4">
        <p className="text-xs uppercase tracking-widest text-primary font-bold mb-1">Patrimônio Total</p>
        <p className="text-3xl font-bold text-white">R$ {totalSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>

      {erro && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2">{erro}</p>}

      {!contaSel && (
        <>
          <form onSubmit={criar} className="bg-surface-low rounded-2xl p-6 border border-white/5 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Nova Conta de Investimento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Nome *</label>
                <input className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-primary" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
              </div>
              <div className="space-y-1"><label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Tipo *</label>
                <select className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-white outline-none" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  {TIPOS.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="bg-primary text-on-primary font-bold px-6 py-2 rounded-xl hover:opacity-90 flex items-center gap-2"><Plus className="w-4 h-4" /> Criar</button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lista.map(c => (
              <div key={c.id} onClick={() => abrir(c)} className="bg-surface-low rounded-2xl p-6 border border-white/5 cursor-pointer hover:border-primary/30 transition-all space-y-2">
                <p className="font-bold text-white">{c.nome}</p>
                <p className="text-xs text-zinc-500">{c.tipo.replace('_', ' ')}</p>
                <p className="text-2xl font-bold text-white">R$ {Number(c.saldoAtual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            ))}
            {lista.length === 0 && <p className="col-span-3 text-center text-zinc-500 py-8">Nenhuma conta de investimento</p>}
          </div>
        </>
      )}

      {contaSel && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div><h2 className="text-xl font-bold text-white">{contaSel.nome}</h2>
              <p className="text-3xl font-bold text-primary mt-1">R$ {Number(contaSel.saldoAtual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <button onClick={() => setContaSel(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>

          <form onSubmit={registrar} className="bg-surface-low rounded-2xl p-6 border border-white/5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Nova Transação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1"><label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Tipo *</label>
                <select className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-white outline-none" value={tForm.tipoTransacao} onChange={e => setTForm(f => ({ ...f, tipoTransacao: e.target.value }))}>
                  {TIPO_TRANSACAO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1"><label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Valor (R$) *</label>
                <input type="number" step="0.01" className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-primary" value={tForm.valor} onChange={e => setTForm(f => ({ ...f, valor: e.target.value }))} required />
              </div>
              <div className="space-y-1"><label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Data *</label>
                <input type="date" className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-primary" value={tForm.dataTransacao} onChange={e => setTForm(f => ({ ...f, dataTransacao: e.target.value }))} required />
              </div>
              {tForm.tipoTransacao === 'APORTE' && (
                <div className="space-y-1"><label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Conta Corrente (débito)</label>
                  <select className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-white outline-none" value={tForm.contaCorrenteOrigemId} onChange={e => setTForm(f => ({ ...f, contaCorrenteOrigemId: e.target.value }))}>
                    <option value="">— Opcional —</option>{ccs.map(c => <option key={c.id} value={c.id}>{c.apelido}</option>)}
                  </select>
                </div>
              )}
            </div>
            <button type="submit" className="bg-primary text-on-primary font-bold px-6 py-2 rounded-xl hover:opacity-90 text-sm">Registrar</button>
          </form>

          <div className="bg-surface-low rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-white/5"><tr className="text-left text-zinc-500 text-xs uppercase tracking-widest">
                <th className="px-6 py-4">Tipo</th><th className="px-6 py-4">Valor</th><th className="px-6 py-4">Data</th>
              </tr></thead>
              <tbody>
                {transacoes.map(t => (
                  <tr key={t.id} className="border-b border-white/5">
                    <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${t.tipoTransacao === 'APORTE' ? 'bg-green-500/20 text-green-400' : t.tipoTransacao === 'RESGATE' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>{t.tipoTransacao}</span></td>
                    <td className="px-6 py-4 text-white font-medium">R$ {Number(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-zinc-400">{t.dataTransacao}</td>
                  </tr>
                ))}
                {transacoes.length === 0 && <tr><td colSpan={3} className="px-6 py-8 text-center text-zinc-500">Nenhuma transação</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
