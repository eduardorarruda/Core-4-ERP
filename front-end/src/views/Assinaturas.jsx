import React, { useEffect, useState } from 'react';
import { Repeat, Plus, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { assinaturas as api, categorias as catApi, parceiros as parApi } from '../lib/api';
import Toast from '../components/ui/Toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import FormField, { inputCls, labelCls } from '../components/ui/FormField';

const emptyForm = {
  descricao: '', valor: '', diaVencimento: '', categoriaId: '', parceiroId: '', ativa: true,
};

function brl(v) {
  return Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

export default function Assinaturas() {
  const [lista, setLista] = useState([]);
  const [cats, setCats] = useState([]);
  const [pars, setPars] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [errors, setErrors] = useState({});
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    catApi.listar().then(setCats).catch(() => {});
    parApi.listar().then(data => setPars(
      data.filter(p => p.tipo === 'FORNECEDOR' || p.tipo === 'AMBOS')
    )).catch(() => {});
    carregar();
  }, []);

  async function carregar() {
    try {
      const data = await api.listar();
      setLista(data);
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
  }

  function setF(k) { return (v) => setForm(f => ({ ...f, [k]: v })); }

  function validate() {
    const e = {};
    if (!form.descricao.trim()) e.descricao = 'Obrigatório';
    if (!form.valor || Number(form.valor) <= 0) e.valor = 'Deve ser maior que zero';
    if (!form.diaVencimento || Number(form.diaVencimento) < 1 || Number(form.diaVencimento) > 31)
      e.diaVencimento = 'Entre 1 e 31';
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
        setToast({ message: 'Assinatura atualizada!', type: 'success' });
      } else {
        await api.criar(dto);
        setToast({ message: 'Assinatura criada!', type: 'success' });
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
      carregar();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setSalvando(false);
    }
  }

  function editar(a) {
    setForm({
      descricao: a.descricao,
      valor: String(a.valor),
      diaVencimento: String(a.diaVencimento),
      categoriaId: String(a.categoriaId),
      parceiroId: a.parceiroId ? String(a.parceiroId) : '',
      ativa: a.ativa,
    });
    setEditingId(a.id);
    setErrors({});
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelar() {
    setForm(emptyForm);
    setEditingId(null);
    setErrors({});
    setShowForm(false);
  }

  async function confirmarExclusao() {
    try {
      await api.deletar(confirmId);
      setToast({ message: 'Assinatura removida.', type: 'success' });
      carregar();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setConfirmId(null);
    }
  }

  const ativas = lista.filter(a => a.ativa);
  const totalMensal = ativas.reduce((s, a) => s + Number(a.valor), 0);
  const totalAnual = totalMensal * 12;

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

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

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Repeat className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-text-primary">Assinaturas Recorrentes</h1>
        </div>
        <button
          onClick={() => { cancelar(); setShowForm(v => !v); }}
          className="flex items-center gap-2 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Nova Assinatura
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-medium border border-text-primary/5 rounded-2xl p-4">
          <p className={`${labelCls} mb-1`}>Assinaturas Ativas</p>
          <p className="text-2xl font-bold text-text-primary">{ativas.length}</p>
        </div>
        <div className="bg-surface-medium border border-text-primary/5 rounded-2xl p-4">
          <p className={`${labelCls} mb-1`}>Custo Mensal</p>
          <p className="text-2xl font-bold text-primary">R$ {brl(totalMensal)}</p>
        </div>
        <div className="bg-surface-medium border border-text-primary/5 rounded-2xl p-4">
          <p className={`${labelCls} mb-1`}>Custo Anual Projetado</p>
          <p className="text-2xl font-bold text-text-primary">R$ {brl(totalAnual)}</p>
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-surface-medium border border-text-primary/5 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-text-primary mb-4">
            {editingId ? 'Editar Assinatura' : 'Nova Assinatura'}
          </h2>
          <form onSubmit={salvar} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label="Descrição" required error={errors.descricao}>
              <input
                className={errors.descricao ? 'w-full bg-surface border border-error/40 rounded-xl px-4 py-3 text-text-primary outline-none focus:ring-1 focus:ring-error text-sm transition-all' : inputCls}
                value={form.descricao}
                onChange={e => setF('descricao')(e.target.value)}
                placeholder="Ex: Netflix, Spotify..."
              />
            </FormField>

            <FormField label="Valor Mensal (R$)" required error={errors.valor}>
              <input
                type="number" min="0.01" step="0.01"
                className={errors.valor ? 'w-full bg-surface border border-error/40 rounded-xl px-4 py-3 text-text-primary outline-none focus:ring-1 focus:ring-error text-sm transition-all' : inputCls}
                value={form.valor}
                onChange={e => setF('valor')(e.target.value)}
                placeholder="0,00"
              />
            </FormField>

            <FormField label="Dia de Vencimento" required error={errors.diaVencimento}>
              <input
                type="number" min="1" max="31"
                className={errors.diaVencimento ? 'w-full bg-surface border border-error/40 rounded-xl px-4 py-3 text-text-primary outline-none focus:ring-1 focus:ring-error text-sm transition-all' : inputCls}
                value={form.diaVencimento}
                onChange={e => setF('diaVencimento')(e.target.value)}
                placeholder="1 a 31"
              />
            </FormField>

            <FormField label="Categoria" required error={errors.categoriaId}>
              <select
                className={errors.categoriaId ? 'w-full bg-surface border border-error/40 rounded-xl px-4 py-3 text-text-primary outline-none focus:ring-1 focus:ring-error text-sm transition-all appearance-none' : `${inputCls} appearance-none`}
                value={form.categoriaId}
                onChange={e => setF('categoriaId')(e.target.value)}
              >
                <option value="">— Selecionar —</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.descricao}</option>)}
              </select>
            </FormField>

            <FormField label="Parceiro / Fornecedor">
              <select
                className={`${inputCls} appearance-none`}
                value={form.parceiroId}
                onChange={e => setF('parceiroId')(e.target.value)}
              >
                <option value="">— Nenhum —</option>
                {pars.map(p => <option key={p.id} value={p.id}>{p.nomeFantasia || p.razaoSocial}</option>)}
              </select>
            </FormField>

            <FormField label="Status">
              <label className="flex items-center gap-3 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={form.ativa}
                  onChange={e => setF('ativa')(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-text-primary">{form.ativa ? 'Ativa' : 'Inativa'}</span>
              </label>
            </FormField>

            <div className="sm:col-span-2 lg:col-span-3 flex gap-3 justify-end pt-2">
              <button type="button" onClick={cancelar}
                className="px-4 py-2 text-sm font-bold uppercase tracking-widest text-text-primary/60 hover:text-text-primary transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={salvando}
                className="bg-primary text-on-primary font-bold text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                {salvando ? 'Salvando...' : editingId ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista em grid */}
      {lista.length === 0 ? (
        <div className="text-center py-16 text-text-primary/40">
          <Repeat className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma assinatura cadastrada ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lista.map(a => (
            <div
              key={a.id}
              className={`bg-surface-medium border border-text-primary/5 rounded-2xl p-4 flex flex-col gap-3 transition-opacity ${a.ativa ? '' : 'opacity-60'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-text-primary text-sm truncate">{a.descricao}</p>
                  {a.parceiroNome && (
                    <p className="text-xs text-text-primary/50 truncate">{a.parceiroNome}</p>
                  )}
                  <p className="text-xs text-text-primary/40 mt-0.5">{a.categoriaDescricao}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => editar(a)}
                    className="p-1.5 text-text-primary/40 hover:text-primary transition-colors rounded-lg hover:bg-primary/10">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setConfirmId(a.id)}
                    className="p-1.5 text-text-primary/40 hover:text-error transition-colors rounded-lg hover:bg-error/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-text-primary/50">Vence todo dia</p>
                  <p className="text-lg font-bold text-text-primary">{a.diaVencimento}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-primary/50">Por mês</p>
                  <p className="text-lg font-bold text-primary">R$ {brl(a.valor)}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {a.ativa ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-text-primary/30" />
                )}
                <span className={`text-xs font-bold uppercase tracking-widest ${a.ativa ? 'text-green-400' : 'text-text-primary/30'}`}>
                  {a.ativa ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
