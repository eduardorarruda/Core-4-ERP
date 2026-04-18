import React, { useEffect, useState } from 'react';
import { Landmark, Plus, Pencil, Trash2, ArrowRightLeft } from 'lucide-react';
import { contasCorrentes as api } from '../lib/api';
import Toast from '../components/ui/Toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import FormField, { inputCls, labelCls } from '../components/ui/FormField';

const empty = { numeroConta: '', agencia: '', descricao: '', saldo: '' };

export default function ContasCorrentes() {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [transf, setTransf] = useState({ contaOrigemId: '', contaDestinoId: '', valor: '' });
  const [showTransf, setShowTransf] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvandoTransf, setSalvandoTransf] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try { setLista(await api.listar()); } catch (e) { setToast({ message: e.message, type: 'error' }); }
  }

  function validateForm() {
    const errs = {};
    if (!form.numeroConta.trim()) errs.numeroConta = 'Número da conta é obrigatório';
    if (!form.agencia.trim()) errs.agencia = 'Agência é obrigatória';
    if (!form.descricao.trim()) errs.descricao = 'Descrição é obrigatória';
    if (form.saldo === '' || isNaN(parseFloat(form.saldo))) errs.saldo = 'Saldo deve ser um número válido';
    return errs;
  }

  async function salvar(e) {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSalvando(true);
    try {
      const dto = { ...form, saldo: parseFloat(form.saldo) };
      if (editId) await api.atualizar(editId, dto); else await api.criar(dto);
      setForm(empty); setEditId(null);
      setToast({ message: editId ? 'Conta atualizada!' : 'Conta criada!', type: 'success' });
      await carregar();
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    } finally {
      setSalvando(false);
    }
  }

  function deletar(id) {
    setConfirmAction({
      title: 'Excluir conta corrente',
      message: 'Tem certeza que deseja excluir esta conta corrente?',
      confirmLabel: 'Excluir',
      onConfirm: async () => {
        setConfirmAction(null);
        try { await api.deletar(id); await carregar(); setToast({ message: 'Conta excluída!', type: 'success' }); }
        catch (e) { setToast({ message: e.message, type: 'error' }); }
      },
    });
  }

  async function transferir(e) {
    e.preventDefault();
    setSalvandoTransf(true);
    try {
      await api.transferir({ contaOrigemId: Number(transf.contaOrigemId), contaDestinoId: Number(transf.contaDestinoId), valor: parseFloat(transf.valor) });
      setTransf({ contaOrigemId: '', contaDestinoId: '', valor: '' }); setShowTransf(false);
      setToast({ message: 'Transferência realizada!', type: 'success' });
      await carregar();
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    } finally {
      setSalvandoTransf(false);
    }
  }

  function editar(c) {
    setForm({ numeroConta: c.numeroConta, agencia: c.agencia, descricao: c.descricao, saldo: String(c.saldo) });
    setEditId(c.id);
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const total = lista.reduce((s, c) => s + Number(c.saldo), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Landmark className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-white">Contas Correntes</h1>
        </div>
        <button onClick={() => setShowTransf(v => !v)} className="flex items-center gap-2 border border-white/10 text-zinc-300 px-4 py-2 rounded-xl hover:bg-white/5 text-sm">
          <ArrowRightLeft className="w-4 h-4" /> Transferir
        </button>
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded-2xl px-6 py-4">
        <p className="text-xs uppercase tracking-widest text-primary font-bold mb-1">Saldo Total</p>
        <p className="text-3xl font-bold text-white">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>

      {showTransf && (
        <form onSubmit={transferir} className="bg-surface-low rounded-2xl p-6 border border-white/5 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Transferência</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Origem">
              <select className={inputCls} value={transf.contaOrigemId} onChange={e => setTransf(f => ({ ...f, contaOrigemId: e.target.value }))} required>
                <option value="">Selecione</option>
                {lista.map(c => <option key={c.id} value={c.id}>{c.descricao} — Ag. {c.agencia}</option>)}
              </select>
            </FormField>
            <FormField label="Destino">
              <select className={inputCls} value={transf.contaDestinoId} onChange={e => setTransf(f => ({ ...f, contaDestinoId: e.target.value }))} required>
                <option value="">Selecione</option>
                {lista.map(c => <option key={c.id} value={c.id}>{c.descricao} — Ag. {c.agencia}</option>)}
              </select>
            </FormField>
            <FormField label="Valor (R$)">
              <input type="number" step="0.01" min="0.01" className={inputCls} value={transf.valor} onChange={e => setTransf(f => ({ ...f, valor: e.target.value }))} required />
            </FormField>
          </div>
          <button type="submit" disabled={salvandoTransf} className="bg-primary text-on-primary font-bold px-6 py-2 rounded-xl hover:opacity-90 disabled:opacity-50">
            {salvandoTransf ? 'GRAVANDO...' : 'Transferir'}
          </button>
        </form>
      )}

      <form onSubmit={salvar} className="bg-surface-low rounded-2xl p-6 border border-white/5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">{editId ? 'Editar' : 'Nova'} Conta</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField label="Número da Conta" required error={errors.numeroConta}>
            <input className={inputCls} value={form.numeroConta} onChange={set('numeroConta')} required placeholder="Ex: 12345-6" />
          </FormField>
          <FormField label="Agência" required error={errors.agencia}>
            <input className={inputCls} value={form.agencia} onChange={set('agencia')} required placeholder="Ex: 0001" />
          </FormField>
          <FormField label="Descrição" required error={errors.descricao}>
            <input className={inputCls} value={form.descricao} onChange={set('descricao')} required placeholder="Ex: Conta Principal" />
          </FormField>
          <FormField label="Saldo Inicial (R$)" required error={errors.saldo}>
            <input type="number" step="0.01" className={inputCls} value={form.saldo} onChange={set('saldo')} required placeholder="0,00" />
          </FormField>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={salvando} className="bg-primary text-on-primary font-bold px-6 py-2 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            <Plus className="w-4 h-4" />{salvando ? 'GRAVANDO...' : editId ? 'Salvar' : 'Criar'}
          </button>
          {editId && <button type="button" onClick={() => { setForm(empty); setEditId(null); }} className="px-6 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white">Cancelar</button>}
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lista.map(c => (
          <div key={c.id} className="bg-surface-low rounded-2xl p-6 border border-white/5 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-white">{c.descricao}</p>
                <p className="text-xs text-zinc-500">Conta: {c.numeroConta} · Ag: {c.agencia}</p>
              </div>
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

      {confirmAction && <ConfirmModal {...confirmAction} onCancel={() => setConfirmAction(null)} />}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
