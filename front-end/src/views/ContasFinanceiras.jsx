import React, { useEffect, useState } from 'react';
import { FileText, Plus, Trash2, CheckCircle, Filter } from 'lucide-react';
import { contas as api, categorias as catApi, parceiros as parApi, contasCorrentes as ccApi } from '../lib/api';

const STATUS_BADGE = { PENDENTE: 'bg-yellow-500/20 text-yellow-400', ATRASADO: 'bg-red-500/20 text-red-400', PAGO: 'bg-green-500/20 text-green-400', RECEBIDO: 'bg-blue-500/20 text-blue-400' };

const emptyForm = { descricao: '', valorOriginal: '', dataVencimento: '', tipo: 'PAGAR', categoriaId: '', parceiroId: '', quantidadeParcelas: 1, dividirValor: false };
const emptyBaixa = { contaCorrenteId: '', dataPagamento: '', juros: 0, multa: 0, acrescimo: 0, desconto: 0 };

export default function ContasFinanceiras() {
  const [contas, setContas] = useState([]);
  const [cats, setCats] = useState([]);
  const [pars, setPars] = useState([]);
  const [ccs, setCcs] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [baixaId, setBaixaId] = useState(null);
  const [baixaForm, setBaixaForm] = useState(emptyBaixa);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregar();
    catApi.listar().then(setCats).catch(() => {});
    parApi.listar().then(setPars).catch(() => {});
    ccApi.listar().then(setCcs).catch(() => {});
  }, [filtroTipo]);

  async function carregar() {
    try {
      const p = filtroTipo ? { tipo: filtroTipo } : {};
      const res = await api.listar(p);
      setContas(res.content || []);
    } catch (e) { setErro(e.message); }
  }

  async function criar(e) {
    e.preventDefault(); setErro('');
    try {
      const dto = { ...form, valorOriginal: parseFloat(form.valorOriginal), categoriaId: Number(form.categoriaId), parceiroId: form.parceiroId ? Number(form.parceiroId) : null, quantidadeParcelas: Number(form.quantidadeParcelas) };
      await api.criar(dto);
      setForm(emptyForm); await carregar();
    } catch (e) { setErro(e.message); }
  }

  async function deletar(id) {
    if (!confirm('Excluir conta?')) return;
    try { await api.deletar(id); await carregar(); } catch (e) { setErro(e.message); }
  }

  async function baixar(e) {
    e.preventDefault(); setErro('');
    try {
      await api.baixar(baixaId, { ...baixaForm, contaCorrenteId: Number(baixaForm.contaCorrenteId), juros: parseFloat(baixaForm.juros || 0), multa: parseFloat(baixaForm.multa || 0), acrescimo: parseFloat(baixaForm.acrescimo || 0), desconto: parseFloat(baixaForm.desconto || 0) });
      setBaixaId(null); setBaixaForm(emptyBaixa); await carregar();
    } catch (e) { setErro(e.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><FileText className="w-6 h-6 text-primary" /><h1 className="text-2xl font-bold text-white">Contas a Pagar / Receber</h1></div>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-zinc-500" />
        {['', 'PAGAR', 'RECEBER'].map(t => (
          <button key={t} onClick={() => setFiltroTipo(t)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filtroTipo === t ? 'bg-primary text-on-primary' : 'border border-white/10 text-zinc-400 hover:text-white'}`}>{t || 'Todos'}</button>
        ))}
      </div>

      {erro && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2">{erro}</p>}

      {/* Novo */}
      <form onSubmit={criar} className="bg-surface-low rounded-2xl p-6 border border-white/5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Nova Conta</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Descrição *" value={form.descricao} onChange={v => setForm(f => ({ ...f, descricao: v }))} required />
          <Field label="Valor (R$) *" type="number" value={form.valorOriginal} onChange={v => setForm(f => ({ ...f, valorOriginal: v }))} required />
          <Field label="Vencimento *" type="date" value={form.dataVencimento} onChange={v => setForm(f => ({ ...f, dataVencimento: v }))} required />
          <SelectField label="Tipo *" value={form.tipo} onChange={v => setForm(f => ({ ...f, tipo: v }))} options={[['PAGAR', 'A Pagar'], ['RECEBER', 'A Receber']]} />
          <SelectField label="Categoria *" value={form.categoriaId} onChange={v => setForm(f => ({ ...f, categoriaId: v }))} options={cats.map(c => [c.id, c.descricao])} placeholder="Selecione" />
          <SelectField label="Parceiro" value={form.parceiroId} onChange={v => setForm(f => ({ ...f, parceiroId: v }))} options={pars.map(p => [p.id, p.nome])} placeholder="— Opcional —" />
          <Field label="Nº Parcelas" type="number" value={form.quantidadeParcelas} onChange={v => setForm(f => ({ ...f, quantidadeParcelas: v }))} />
          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" id="dividir" checked={form.dividirValor} onChange={e => setForm(f => ({ ...f, dividirValor: e.target.checked }))} className="w-4 h-4 rounded" />
            <label htmlFor="dividir" className="text-sm text-zinc-400">Dividir valor entre parcelas</label>
          </div>
        </div>
        <button type="submit" className="bg-primary text-on-primary font-bold px-6 py-2 rounded-xl hover:opacity-90 flex items-center gap-2"><Plus className="w-4 h-4" /> Criar</button>
      </form>

      {/* Baixa */}
      {baixaId && (
        <form onSubmit={baixar} className="bg-surface-low rounded-2xl p-6 border border-primary/20 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Baixar Conta #{baixaId}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SelectField label="Conta Corrente *" value={baixaForm.contaCorrenteId} onChange={v => setBaixaForm(f => ({ ...f, contaCorrenteId: v }))} options={ccs.map(c => [c.id, c.apelido])} placeholder="Selecione" />
            <Field label="Data Pagamento *" type="date" value={baixaForm.dataPagamento} onChange={v => setBaixaForm(f => ({ ...f, dataPagamento: v }))} required />
            {[['Juros', 'juros'], ['Multa', 'multa'], ['Acréscimo', 'acrescimo'], ['Desconto', 'desconto']].map(([lbl, key]) => (
              <Field key={key} label={lbl} type="number" value={baixaForm[key]} onChange={v => setBaixaForm(f => ({ ...f, [key]: v }))} />
            ))}
          </div>
          <div className="flex gap-3">
            <button type="submit" className="bg-green-600 text-white font-bold px-6 py-2 rounded-xl hover:opacity-90 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Confirmar Baixa</button>
            <button type="button" onClick={() => { setBaixaId(null); setBaixaForm(emptyBaixa); }} className="px-6 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white">Cancelar</button>
          </div>
        </form>
      )}

      {/* Lista */}
      <div className="bg-surface-low rounded-2xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-white/5">
            <tr className="text-left text-zinc-500 text-xs uppercase tracking-widest">
              <th className="px-6 py-4">Descrição</th><th className="px-6 py-4">Valor</th><th className="px-6 py-4">Vencimento</th><th className="px-6 py-4">Tipo</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 w-28">Ações</th>
            </tr>
          </thead>
          <tbody>
            {contas.map(c => (
              <tr key={c.id} className="border-b border-white/5 hover:bg-white/2">
                <td className="px-6 py-4 text-white">{c.descricao}{c.totalParcelas > 1 && <span className="ml-2 text-xs text-zinc-500">({c.numeroParcela}/{c.totalParcelas})</span>}</td>
                <td className="px-6 py-4 text-white font-medium">R$ {Number(c.valorOriginal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-6 py-4 text-zinc-400">{c.dataVencimento}</td>
                <td className="px-6 py-4 text-zinc-400">{c.tipo}</td>
                <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE[c.status]}`}>{c.status}</span></td>
                <td className="px-6 py-4 flex gap-2">
                  {(c.status === 'PENDENTE' || c.status === 'ATRASADO') && <button onClick={() => { setBaixaId(c.id); setBaixaForm(emptyBaixa); }} className="text-zinc-400 hover:text-green-400"><CheckCircle className="w-4 h-4" /></button>}
                  <button onClick={() => deletar(c.id)} className="text-zinc-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {contas.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Nenhuma conta encontrada</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">{label}</label>
      <input type={type} step={type === 'number' ? '0.01' : undefined} className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-primary" value={value} onChange={e => onChange(e.target.value)} required={required} />
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">{label}</label>
      <select className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-white outline-none" value={value} onChange={e => onChange(e.target.value)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
