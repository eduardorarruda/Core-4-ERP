import React, { useEffect, useState } from 'react';
import { Landmark, Plus, Pencil, Trash2, ArrowRightLeft, Loader2 } from 'lucide-react';
import { contasCorrentes as api } from '../lib/api';
import ConfirmModal from '../components/ui/ConfirmModal';
import FormField, { inputCls } from '../components/ui/FormField';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import { brl } from '../lib/formatters';
import { useToast } from '../hooks/useToast';

const empty = { numeroConta: '', agencia: '', descricao: '', saldo: '', dataSaldoInicial: '', permitirSaldoNegativo: false };

export default function ContasCorrentes() {
  const toast = useToast();
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [transf, setTransf] = useState({ contaOrigemId: '', contaDestinoId: '', valor: '' });
  const [showTransf, setShowTransf] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvandoTransf, setSalvandoTransf] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try { setLista(await api.listar()); }
    catch (e) { toast.error(e.message); }
  }

  function validateForm() {
    const errs = {};
    if (!form.numeroConta.trim()) errs.numeroConta = 'Número da conta é obrigatório';
    if (!form.agencia.trim()) errs.agencia = 'Agência é obrigatória';
    if (!form.descricao.trim()) errs.descricao = 'Descrição é obrigatória';
    if (form.saldo === '' || isNaN(parseFloat(form.saldo))) errs.saldo = 'Saldo deve ser um número válido';
    if (!form.dataSaldoInicial) errs.dataSaldoInicial = 'Data do saldo inicial é obrigatória';
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
      if (editId) await api.atualizar(editId, dto);
      else await api.criar(dto);
      setForm(empty);
      setEditId(null);
      toast.success(editId ? 'Conta atualizada!' : 'Conta criada!');
      await carregar();
    } catch (e) {
      toast.error(e.message);
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
        try {
          await api.deletar(id);
          await carregar();
          toast.success('Conta excluída!');
        } catch (e) {
          toast.error(e.message);
        }
      },
    });
  }

  async function transferir(e) {
    e.preventDefault();
    setSalvandoTransf(true);
    try {
      await api.transferir({ contaOrigemId: Number(transf.contaOrigemId), contaDestinoId: Number(transf.contaDestinoId), valor: parseFloat(transf.valor) });
      setTransf({ contaOrigemId: '', contaDestinoId: '', valor: '' });
      setShowTransf(false);
      toast.success('Transferência realizada!');
      await carregar();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSalvandoTransf(false);
    }
  }

  function editar(c) {
    setForm({ numeroConta: c.numeroConta, agencia: c.agencia, descricao: c.descricao, saldo: String(c.saldo), dataSaldoInicial: c.dataSaldoInicial || '', permitirSaldoNegativo: !!c.permitirSaldoNegativo });
    setEditId(c.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const total = lista.reduce((s, c) => s + Number(c.saldo), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas Correntes"
        subtitle="Gerencie suas contas bancárias"
        actions={
          <button
            onClick={() => setShowTransf((v) => !v)}
            className="flex items-center gap-2 border border-text-primary/10 text-text-primary/70 font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl hover:bg-surface-medium transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Transferir
          </button>
        }
      />

      {/* Saldo total */}
      <div className="bg-primary/10 border border-primary/20 rounded-2xl px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-bold mb-1">Saldo Total</p>
          <p className="text-3xl font-bold text-text-primary font-display">R$ {brl(total)}</p>
        </div>
        <Landmark className="w-10 h-10 text-primary opacity-30" />
      </div>

      {/* Transferência */}
      {showTransf && (
        <form onSubmit={transferir} className="bg-surface-medium border border-text-primary/5 rounded-2xl p-6 space-y-4 animate-scale-in">
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary/50">Transferência entre Contas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Origem">
              <select className={`${inputCls} appearance-none`} value={transf.contaOrigemId} onChange={(e) => setTransf((f) => ({ ...f, contaOrigemId: e.target.value }))} required>
                <option value="">Selecione</option>
                {lista.map((c) => <option key={c.id} value={c.id}>{c.descricao} — Ag. {c.agencia}</option>)}
              </select>
            </FormField>
            <FormField label="Destino">
              <select className={`${inputCls} appearance-none`} value={transf.contaDestinoId} onChange={(e) => setTransf((f) => ({ ...f, contaDestinoId: e.target.value }))} required>
                <option value="">Selecione</option>
                {lista.map((c) => <option key={c.id} value={c.id}>{c.descricao} — Ag. {c.agencia}</option>)}
              </select>
            </FormField>
            <FormField label="Valor (R$)">
              <input type="number" step="0.01" min="0.01" className={inputCls} value={transf.valor} onChange={(e) => setTransf((f) => ({ ...f, valor: e.target.value }))} required />
            </FormField>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={salvandoTransf} className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
              {salvandoTransf ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
              {salvandoTransf ? 'Transferindo...' : 'Transferir'}
            </button>
            <button type="button" onClick={() => setShowTransf(false)} className="px-6 py-2.5 rounded-xl border border-text-primary/10 text-text-primary/60 hover:text-text-primary transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Formulário */}
      <form onSubmit={salvar} className="bg-surface-medium border border-text-primary/5 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary/50">{editId ? 'Editar' : 'Nova'} Conta</h2>
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
          <FormField label="Data do Saldo Inicial" required error={errors.dataSaldoInicial}>
            <input type="date" className={inputCls} value={form.dataSaldoInicial} onChange={set('dataSaldoInicial')} required />
          </FormField>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.permitirSaldoNegativo}
            onChange={(e) => setForm((f) => ({ ...f, permitirSaldoNegativo: e.target.checked }))}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm text-text-primary">Permitir saldo negativo nesta conta</span>
        </label>
        <div className="flex gap-3">
          <button type="submit" disabled={salvando} className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {salvando ? 'Gravando...' : editId ? 'Salvar' : 'Criar'}
          </button>
          {editId && (
            <button type="button" onClick={() => { setForm(empty); setEditId(null); }} className="px-6 py-2.5 rounded-xl border border-text-primary/10 text-text-primary/60 hover:text-text-primary transition-colors">
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Lista */}
      {lista.length === 0 ? (
        <EmptyState icon={Landmark} title="Nenhuma conta cadastrada" description="Adicione suas contas bancárias para controlar seus saldos." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lista.map((c) => (
            <div key={c.id} className="bg-surface-medium border border-text-primary/5 rounded-2xl p-5 space-y-3 hover:border-text-primary/10 hover:shadow-elevated transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-text-primary">{c.descricao}</p>
                  <p className="text-xs text-text-primary/50 mt-0.5">Conta: {c.numeroConta} · Ag: {c.agencia}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => editar(c)}
                    aria-label="Editar conta"
                    className="p-1.5 text-text-primary/40 hover:text-primary rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deletar(c.id)}
                    aria-label="Excluir conta"
                    className="p-1.5 text-text-primary/40 hover:text-error rounded-lg hover:bg-error/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-2xl font-bold text-text-primary font-display">R$ {brl(c.saldo)}</p>
              {c.dataSaldoInicial && (
                <p className="text-xs text-text-primary/40">Saldo desde: {c.dataSaldoInicial}</p>
              )}
              {c.permitirSaldoNegativo && (
                <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-500">Saldo negativo permitido</span>
              )}
            </div>
          ))}
        </div>
      )}

      {confirmAction && <ConfirmModal {...confirmAction} onCancel={() => setConfirmAction(null)} />}
    </div>
  );
}
