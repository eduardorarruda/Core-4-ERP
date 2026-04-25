import React, { useEffect, useState } from 'react';
import { Repeat, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { assinaturas as api, categorias as catApi, parceiros as parApi } from '../lib/api';
import ConfirmModal from '../components/ui/ConfirmModal';
import FormField, { inputCls, labelCls } from '../components/ui/FormField';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { brl } from '../lib/formatters';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';

const emptyForm = { descricao: '', valor: '', diaVencimento: '', categoriaId: '', parceiroId: '', ativa: true };

export default function Assinaturas() {
  const toast = useToast();
  const [lista, setLista] = useState([]);
  const [cats, setCats] = useState([]);
  const [pars, setPars] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [errors, setErrors] = useState({});
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    catApi.listar().then(setCats).catch(() => {});
    parApi.listar().then((data) => setPars(data.filter((p) => p.tipo === 'FORNECEDOR' || p.tipo === 'AMBOS'))).catch(() => {});
    carregar();
  }, []);

  async function carregar() {
    try { setLista(await api.listar()); }
    catch (e) { toast.error(e.message); }
  }

  function setF(k) { return (v) => setForm((f) => ({ ...f, [k]: v })); }

  function validate() {
    const e = {};
    if (!form.descricao.trim()) e.descricao = 'Obrigatório';
    if (!form.valor || Number(form.valor) <= 0) e.valor = 'Deve ser maior que zero';
    if (!form.diaVencimento || Number(form.diaVencimento) < 1 || Number(form.diaVencimento) > 31) e.diaVencimento = 'Entre 1 e 31';
    if (!form.categoriaId) e.categoriaId = 'Obrigatório';
    return e;
  }

  async function salvar(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSalvando(true);
    try {
      const dto = {
        descricao: form.descricao.trim(),
        valor: Number(form.valor),
        diaVencimento: Number(form.diaVencimento),
        ativa: form.ativa,
        categoriaId: Number(form.categoriaId),
        parceiroId: form.parceiroId ? Number(form.parceiroId) : null,
      };
      if (editingId) {
        await api.atualizar(editingId, dto);
        toast.success('Assinatura atualizada!');
      } else {
        await api.criar(dto);
        toast.success('Assinatura criada!');
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      carregar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSalvando(false);
    }
  }

  function editar(a) {
    setForm({ descricao: a.descricao, valor: String(a.valor), diaVencimento: String(a.diaVencimento), categoriaId: String(a.categoriaId), parceiroId: a.parceiroId ? String(a.parceiroId) : '', ativa: a.ativa });
    setEditingId(a.id);
    setErrors({});
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelar() { setForm(emptyForm); setEditingId(null); setErrors({}); setShowForm(false); }

  async function confirmarExclusao() {
    try {
      await api.deletar(confirmId);
      toast.success('Assinatura removida.');
      carregar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setConfirmId(null);
    }
  }

  const ativas = lista.filter((a) => a.ativa).sort((a, b) => Number(b.valor) - Number(a.valor));
  const inativas = lista.filter((a) => !a.ativa);
  const totalMensal = ativas.reduce((s, a) => s + Number(a.valor), 0);

  return (
    <div className="space-y-6">
      {confirmId && (
        <ConfirmModal
          title="Remover Assinatura"
          message="Deseja remover esta assinatura permanentemente?"
          confirmLabel="Remover"
          variant="danger"
          onConfirm={confirmarExclusao}
          onCancel={() => setConfirmId(null)}
        />
      )}

      <PageHeader
        title="Assinaturas"
        subtitle="Assinaturas e custos recorrentes"
        actions={
          <button
            onClick={() => { cancelar(); setShowForm((v) => !v); }}
            className="flex items-center gap-2 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Nova Assinatura
          </button>
        }
      />

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-medium border border-text-primary/5 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-primary/50 mb-1">Ativas</p>
          <p className="text-2xl font-bold text-text-primary font-display">{ativas.length}</p>
        </div>
        <div className="bg-surface-medium border border-text-primary/5 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-primary/50 mb-1">Custo Mensal</p>
          <p className="text-2xl font-bold text-primary font-display">R$ {brl(totalMensal)}</p>
        </div>
        <div className="bg-surface-medium border border-text-primary/5 rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-primary/50 mb-1">Custo Anual</p>
          <p className="text-2xl font-bold text-text-primary font-display">R$ {brl(totalMensal * 12)}</p>
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-surface-medium border border-text-primary/5 rounded-2xl p-6 animate-scale-in">
          <h2 className="text-sm font-bold text-text-primary mb-4 font-display">
            {editingId ? 'Editar Assinatura' : 'Nova Assinatura'}
          </h2>
          <form onSubmit={salvar} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label="Descrição" required error={errors.descricao}>
              <input
                className={errors.descricao ? 'w-full bg-surface border border-error/40 rounded-xl px-4 py-3 text-text-primary outline-none text-sm' : inputCls}
                value={form.descricao}
                onChange={(e) => setF('descricao')(e.target.value)}
                placeholder="Ex: Netflix, Spotify..."
              />
            </FormField>
            <FormField label="Valor Mensal (R$)" required error={errors.valor}>
              <input
                type="number" min="0.01" step="0.01"
                className={errors.valor ? 'w-full bg-surface border border-error/40 rounded-xl px-4 py-3 text-text-primary outline-none text-sm' : inputCls}
                value={form.valor}
                onChange={(e) => setF('valor')(e.target.value)}
                placeholder="0,00"
              />
            </FormField>
            <FormField label="Dia de Vencimento" required error={errors.diaVencimento}>
              <input
                type="number" min="1" max="31"
                className={errors.diaVencimento ? 'w-full bg-surface border border-error/40 rounded-xl px-4 py-3 text-text-primary outline-none text-sm' : inputCls}
                value={form.diaVencimento}
                onChange={(e) => setF('diaVencimento')(e.target.value)}
                placeholder="1 a 31"
              />
            </FormField>
            <FormField label="Categoria" required error={errors.categoriaId}>
              <select
                className={cn(errors.categoriaId ? 'w-full bg-surface border border-error/40 rounded-xl px-4 py-3 text-text-primary outline-none text-sm appearance-none' : `${inputCls} appearance-none`)}
                value={form.categoriaId}
                onChange={(e) => setF('categoriaId')(e.target.value)}
              >
                <option value="">— Selecionar —</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
              </select>
            </FormField>
            <FormField label="Parceiro / Fornecedor">
              <select className={`${inputCls} appearance-none`} value={form.parceiroId} onChange={(e) => setF('parceiroId')(e.target.value)}>
                <option value="">— Nenhum —</option>
                {pars.map((p) => <option key={p.id} value={p.id}>{p.nomeFantasia || p.razaoSocial}</option>)}
              </select>
            </FormField>
            <FormField label="Status">
              <label className="flex items-center gap-3 cursor-pointer mt-2.5">
                <input type="checkbox" checked={form.ativa} onChange={(e) => setF('ativa')(e.target.checked)} className="w-4 h-4 accent-primary" />
                <span className="text-sm text-text-primary">{form.ativa ? 'Ativa' : 'Inativa'}</span>
              </label>
            </FormField>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-3 justify-end pt-2">
              <button type="button" onClick={cancelar} className="px-4 py-2 text-sm font-bold border border-text-primary/10 text-text-primary/60 hover:text-text-primary rounded-xl transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={salvando} className="bg-primary text-on-primary font-bold text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
                {salvando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {salvando ? 'Salvando...' : editingId ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ativas */}
      {lista.length === 0 ? (
        <EmptyState icon={Repeat} title="Nenhuma assinatura" description="Cadastre suas assinaturas recorrentes para controlar seus gastos." />
      ) : (
        <>
          {ativas.length > 0 && (
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-text-primary/50 mb-4">Ativas ({ativas.length})</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ativas.map((a) => (
                  <AssinaturaCard key={a.id} a={a} onEdit={editar} onDelete={setConfirmId} />
                ))}
              </div>
            </div>
          )}
          {inativas.length > 0 && (
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-text-primary/50 mb-4">Inativas ({inativas.length})</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                {inativas.map((a) => (
                  <AssinaturaCard key={a.id} a={a} onEdit={editar} onDelete={setConfirmId} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AssinaturaCard({ a, onEdit, onDelete }) {
  const custoDiario = (Number(a.valor) / 30).toFixed(2);
  return (
    <div className="bg-surface-medium border border-text-primary/5 rounded-2xl p-4 flex flex-col gap-3 hover:border-text-primary/10 transition-colors hover:shadow-elevated">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-text-primary text-sm truncate">{a.descricao}</p>
          {a.parceiroNome && <p className="text-xs text-text-primary/40 truncate mt-0.5">{a.parceiroNome}</p>}
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onEdit(a)} aria-label="Editar assinatura" className="p-1.5 text-text-primary/40 hover:text-primary transition-colors rounded-lg hover:bg-primary/10">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(a.id)} aria-label="Remover assinatura" className="p-1.5 text-text-primary/40 hover:text-error transition-colors rounded-lg hover:bg-error/10">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] text-text-primary/40 uppercase tracking-wider">Vence dia</p>
          <p className="text-lg font-bold text-text-primary font-display">{a.diaVencimento}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-text-primary/40 uppercase tracking-wider">Por mês</p>
          <p className="text-lg font-bold text-primary font-display">R$ {brl(a.valor)}</p>
          <p className="text-[10px] text-text-primary/30">R$ {custoDiario}/dia</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Badge variant={a.ativa ? 'success' : 'neutral'} dot={a.ativa}>
          {a.ativa ? 'Ativa' : 'Inativa'}
        </Badge>
        <span className="text-[10px] text-text-primary/40">{a.categoriaDescricao}</span>
      </div>
    </div>
  );
}
