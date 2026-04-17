import React, { useEffect, useState } from 'react';
import { CreditCard, Plus, Trash2, X } from 'lucide-react';
import { cartoes as api, contasCorrentes as ccApi, categorias as catApi } from '../lib/api';

export default function Cartoes() {
  const [lista, setLista] = useState([]);
  const [ccs, setCcs] = useState([]);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({ nome: '', limite: '', diaFechamento: '', diaVencimento: '', contaCorrenteId: '' });
  const [cartaoSel, setCartaoSel] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [lancForm, setLancForm] = useState({ descricao: '', valor: '', dataCompra: '', mesFatura: '', anoFatura: '', categoriaId: '', quantidadeParcelas: 1 });
  const [fechForm, setFechForm] = useState({ mes: '', ano: '' });
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.listar().then(setLista).catch(e => setErro(e.message));
    ccApi.listar().then(setCcs).catch(() => {});
    catApi.listar().then(setCats).catch(() => {});
  }, []);

  async function criarCartao(e) {
    e.preventDefault(); setErro('');
    try {
      await api.criar({ ...form, limite: parseFloat(form.limite), diaFechamento: Number(form.diaFechamento), diaVencimento: Number(form.diaVencimento), contaCorrenteId: Number(form.contaCorrenteId) });
      setForm({ nome: '', limite: '', diaFechamento: '', diaVencimento: '', contaCorrenteId: '' });
      api.listar().then(setLista);
    } catch (e) { setErro(e.message); }
  }

  async function deletarCartao(id) {
    if (!confirm('Excluir cartão?')) return;
    try { await api.deletar(id); api.listar().then(setLista); } catch (e) { setErro(e.message); }
  }

  async function abrirCartao(c) {
    setCartaoSel(c);
    const l = await api.lancamentos.listar(c.id);
    setLancamentos(l);
  }

  async function criarLancamento(e) {
    e.preventDefault(); setErro('');
    try {
      await api.lancamentos.criar(cartaoSel.id, { ...lancForm, valor: parseFloat(lancForm.valor), mesFatura: Number(lancForm.mesFatura), anoFatura: Number(lancForm.anoFatura), categoriaId: Number(lancForm.categoriaId), quantidadeParcelas: Number(lancForm.quantidadeParcelas) });
      const l = await api.lancamentos.listar(cartaoSel.id);
      setLancamentos(l);
      setLancForm({ descricao: '', valor: '', dataCompra: '', mesFatura: '', anoFatura: '', categoriaId: '', quantidadeParcelas: 1 });
    } catch (e) { setErro(e.message); }
  }

  async function fecharFatura(e) {
    e.preventDefault(); setErro('');
    try {
      await api.fecharFatura(cartaoSel.id, { mes: Number(fechForm.mes), ano: Number(fechForm.ano) });
      alert('Fatura fechada! Conta a pagar gerada.');
    } catch (e) { setErro(e.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><CreditCard className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold text-white">Cartões de Crédito</h1></div>
      {erro && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2">{erro}</p>}

      {/* Formulário de novo cartão */}
      {!cartaoSel && (
        <form onSubmit={criarCartao} className="bg-surface-low rounded-2xl p-6 border border-white/5 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Novo Cartão</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[['Nome', 'nome', 'text'], ['Limite (R$)', 'limite', 'number'], ['Dia Fechamento', 'diaFechamento', 'number'], ['Dia Vencimento', 'diaVencimento', 'number']].map(([lbl, key, type]) => (
              <div key={key} className="space-y-1"><label className="text-xs font-bold uppercase tracking-widest text-zinc-500">{lbl}</label>
                <input type={type} step={type === 'number' && key === 'limite' ? '0.01' : '1'} min={key.includes('Dia') ? 1 : undefined} max={key.includes('Dia') ? 31 : undefined} className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-primary" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required />
              </div>
            ))}
            <div className="space-y-1"><label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Conta Corrente *</label>
              <select className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-white outline-none" value={form.contaCorrenteId} onChange={e => setForm(f => ({ ...f, contaCorrenteId: e.target.value }))} required>
                <option value="">Selecione</option>{ccs.map(c => <option key={c.id} value={c.id}>{c.apelido}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="bg-primary text-on-primary font-bold px-6 py-2 rounded-xl hover:opacity-90 flex items-center gap-2"><Plus className="w-4 h-4" /> Criar</button>
        </form>
      )}

      {/* Lista de cartões */}
      {!cartaoSel && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lista.map(c => (
            <div key={c.id} onClick={() => abrirCartao(c)} className="bg-surface-low rounded-2xl p-6 border border-white/5 cursor-pointer hover:border-primary/30 transition-all space-y-3">
              <div className="flex justify-between items-start">
                <div><p className="font-bold text-white">{c.nome}</p><p className="text-xs text-zinc-500">Fecha dia {c.diaFechamento} · Vence dia {c.diaVencimento}</p></div>
                <button onClick={ev => { ev.stopPropagation(); deletarCartao(c.id); }} className="text-zinc-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-zinc-500"><span>Limite</span><span>R$ {Number(c.limite).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                <div className="w-full bg-surface rounded-full h-1.5"><div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min(100, (Number(c.limiteUsado) / Number(c.limite)) * 100)}%` }} /></div>
                <div className="flex justify-between text-xs"><span className="text-red-400">Usado: R$ {Number(c.limiteUsado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span><span className="text-green-400">Livre: R$ {Number(c.limiteLivre).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
              </div>
            </div>
          ))}
          {lista.length === 0 && <p className="text-zinc-500 col-span-3 text-center py-8">Nenhum cartão cadastrado</p>}
        </div>
      )}

      {/* Detalhe do cartão selecionado */}
      {cartaoSel && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">{cartaoSel.nome}</h2>
            <button onClick={() => setCartaoSel(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Novo lançamento */}
            <form onSubmit={criarLancamento} className="bg-surface-low rounded-2xl p-6 border border-white/5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Novo Lançamento</h3>
              <div className="space-y-3">
                {[['Descrição', 'descricao', 'text'], ['Valor (R$)', 'valor', 'number'], ['Data Compra', 'dataCompra', 'date'], ['Mês Fatura (1-12)', 'mesFatura', 'number'], ['Ano Fatura', 'anoFatura', 'number'], ['Nº Parcelas', 'quantidadeParcelas', 'number']].map(([lbl, key, type]) => (
                  <div key={key} className="space-y-1"><label className="text-xs font-bold uppercase tracking-widest text-zinc-500">{lbl}</label>
                    <input type={type} step={key === 'valor' ? '0.01' : '1'} className="w-full bg-surface border border-white/5 rounded-xl px-4 py-2 text-white outline-none focus:ring-1 focus:ring-primary text-sm" value={lancForm[key]} onChange={e => setLancForm(f => ({ ...f, [key]: e.target.value }))} required />
                  </div>
                ))}
                <div className="space-y-1"><label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Categoria *</label>
                  <select className="w-full bg-surface border border-white/5 rounded-xl px-4 py-2 text-white outline-none text-sm" value={lancForm.categoriaId} onChange={e => setLancForm(f => ({ ...f, categoriaId: e.target.value }))} required>
                    <option value="">Selecione</option>{cats.map(c => <option key={c.id} value={c.id}>{c.descricao}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="bg-primary text-on-primary font-bold px-4 py-2 rounded-xl hover:opacity-90 text-sm flex items-center gap-2"><Plus className="w-3 h-3" /> Lançar</button>
            </form>

            {/* Fechar fatura */}
            <form onSubmit={fecharFatura} className="bg-surface-low rounded-2xl p-6 border border-white/5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Fechar Fatura</h3>
              <div className="space-y-3">
                {[['Mês (1-12)', 'mes'], ['Ano', 'ano']].map(([lbl, key]) => (
                  <div key={key} className="space-y-1"><label className="text-xs font-bold uppercase tracking-widest text-zinc-500">{lbl}</label>
                    <input type="number" className="w-full bg-surface border border-white/5 rounded-xl px-4 py-2 text-white outline-none focus:ring-1 focus:ring-primary text-sm" value={fechForm[key]} onChange={e => setFechForm(f => ({ ...f, [key]: e.target.value }))} required />
                  </div>
                ))}
              </div>
              <button type="submit" className="bg-orange-600 text-white font-bold px-4 py-2 rounded-xl hover:opacity-90 text-sm">Fechar Fatura</button>
            </form>
          </div>

          {/* Lançamentos */}
          <div className="bg-surface-low rounded-2xl border border-white/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-white/5"><tr className="text-left text-zinc-500 text-xs uppercase tracking-widest">
                <th className="px-6 py-4">Descrição</th><th className="px-6 py-4">Valor</th><th className="px-6 py-4">Fatura</th><th className="px-6 py-4">Parcela</th>
              </tr></thead>
              <tbody>
                {lancamentos.map(l => (
                  <tr key={l.id} className="border-b border-white/5 hover:bg-white/2">
                    <td className="px-6 py-4 text-white">{l.descricao}</td>
                    <td className="px-6 py-4 text-white font-medium">R$ {Number(l.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-zinc-400">{String(l.mesFatura).padStart(2, '0')}/{l.anoFatura}</td>
                    <td className="px-6 py-4 text-zinc-400">{l.numeroParcela}/{l.totalParcelas}</td>
                  </tr>
                ))}
                {lancamentos.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-zinc-500">Nenhum lançamento</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
