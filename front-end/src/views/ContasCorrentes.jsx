import React, { useEffect, useState } from 'react';
import { Landmark, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { contasCorrentes as api } from '../lib/api';
import ConfirmModal from '../components/ui/ConfirmModal';
import FormField, { inputCls } from '../components/ui/FormField';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import SkeletonCard from '../components/ui/SkeletonCard';
import { brl } from '../lib/formatters';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';

const empty = { numeroConta: '', agencia: '', descricao: '', saldo: '', dataSaldoInicial: '', permitirSaldoNegativo: false };

export default function ContasCorrentes() {
  const toast = useToast();
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setCarregando(true);
    try { setLista(await api.listar()); }
    catch (e) { toast.error(e.message); }
    finally { setCarregando(false); }
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
      message: 'Deseja excluir esta conta corrente? Esta ação não pode ser desfeita.',
      details: [
        'Contas que já possuem transferências ou conciliações não podem ser excluídas — nesse caso a exclusão será bloqueada.',
      ],
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
      />

      {/* Saldo total */}
      <div className="rounded-[18px] px-6 py-5 flex items-center justify-between anim-in d1 bg-primary/10 border border-primary/20 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="live-dot" style={{ width: 5, height: 5 }} />
            <p className="text-xs uppercase tracking-widest text-primary font-bold font-mono">Saldo Consolidado — Todas as Contas</p>
          </div>
          <p className="text-3xl font-bold text-primary font-display">R$ {brl(total)}</p>
          <p className="text-xs text-text-primary/40 font-mono mt-1">{lista.length} conta{lista.length !== 1 ? 's' : ''} cadastrada{lista.length !== 1 ? 's' : ''}</p>
        </div>
        <Landmark className="w-12 h-12 text-primary opacity-20" />
      </div>

      {/* Formulário de conta */}
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

      {/* Lista de contas */}
      {carregando ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} rows={2} />)}
        </div>
      ) : lista.length === 0 ? (
        <EmptyState icon={Landmark} title="Nenhuma conta cadastrada" description="Adicione suas contas bancárias para controlar seus saldos." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lista.map((c, i) => {
            const pos = Number(c.saldo) >= 0;
            return (
              <div
                key={c.id}
                className={cn(
                  `anim-in d${Math.min(i + 1, 6)}`,
                  'rounded-[18px] p-5 flex flex-col gap-3 transition-all hover:scale-[1.01] bg-surface-medium border shadow-lg',
                  pos ? 'border-primary/20' : 'border-error/20'
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <p className="font-bold text-text-primary font-display truncate">{c.descricao}</p>
                    <p className="text-xs text-text-primary/40 mt-0.5 font-mono">
                      Ag. {c.agencia} · Cc. {c.numeroConta}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <Button variant="ghost" size="icon" onClick={() => editar(c)} aria-label="Editar conta" title="Editar" className="text-text-primary/50 hover:text-primary">
                      <Pencil className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deletar(c.id)} aria-label="Excluir conta" title="Excluir" className="text-text-primary/50 hover:text-error">
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <div className={cn('rounded-xl px-4 py-3 border', pos ? 'bg-primary/10 border-primary/20' : 'bg-error/10 border-error/20')}>
                  <p className={cn('text-xs font-bold uppercase tracking-widest font-mono mb-1', pos ? 'text-primary' : 'text-error')}>
                    Saldo Atual
                  </p>
                  <p className={cn('text-2xl font-bold font-display', pos ? 'text-primary' : 'text-error')}>
                    R$ {brl(c.saldo)}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2">
                  {c.dataSaldoInicial && (
                    <p className="text-xs text-text-primary/40 font-mono">Desde {c.dataSaldoInicial}</p>
                  )}
                  {c.permitirSaldoNegativo && (
                    <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full font-mono bg-warning/10 text-warning border border-warning/20">
                      Saldo neg. permitido
                    </span>
                  )}
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
