import React, { useEffect, useState, useCallback } from 'react';
import { CreditCard, Plus, Trash2, X, Pencil, Lock, Loader2 } from 'lucide-react';
import { cartoes as api, contasCorrentes as ccApi, categorias as catApi } from '../lib/api';
import ConfirmModal from '../components/ui/ConfirmModal';
import FormField, { inputCls } from '../components/ui/FormField';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import { brl } from '../lib/formatters';
import { useToast } from '../hooks/useToast';

const emptyLancForm = { descricao: '', valor: '', dataCompra: '', mesFatura: '', anoFatura: '', categoriaId: '', quantidadeParcelas: 1 };

const GRADIENTS = [
  'from-violet-600 to-indigo-700',
  'from-rose-500 to-pink-700',
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-700',
  'from-sky-500 to-blue-700',
];

function cardGradient(id) {
  return GRADIENTS[(id - 1) % GRADIENTS.length];
}

export default function Cartoes() {
  const toast = useToast();
  const [lista, setLista] = useState([]);
  const [ccs, setCcs] = useState([]);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({ nome: '', limite: '', diaFechamento: '', diaVencimento: '', contaCorrenteId: '' });
  const [cartaoSel, setCartaoSel] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [lancForm, setLancForm] = useState(emptyLancForm);
  const [editLancId, setEditLancId] = useState(null);
  const [editForm, setEditForm] = useState({ descricao: '', valor: '', dataCompra: '', mesFatura: '', anoFatura: '', categoriaId: '' });
  const [fechForm, setFechForm] = useState({ mes: '', ano: '' });
  const [salvando, setSalvando] = useState(false);
  const [salvandoLanc, setSalvandoLanc] = useState(false);
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [salvandoFatura, setSalvandoFatura] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [errors, setErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [filterMes, setFilterMes] = useState('');
  const [filterAno, setFilterAno] = useState('');

  useEffect(() => {
    Promise.all([api.listar(), ccApi.listar(), catApi.listar()])
      .then(([l, cs, ca]) => { setLista(l); setCcs(cs); setCats(ca); })
      .catch((e) => toast.error(e.message));
  }, []);

  async function recarregarLancamentos() {
    if (!cartaoSel) return;
    const l = await api.lancamentos.listar(cartaoSel.id);
    setLancamentos(l);
  }

  function validateCartaoForm() {
    const errs = {};
    if (!form.nome.trim()) errs.nome = 'Nome é obrigatório';
    if (!form.limite || parseFloat(form.limite) <= 0) errs.limite = 'Limite deve ser maior que zero';
    const d1 = Number(form.diaFechamento);
    if (!d1 || d1 < 1 || d1 > 31) errs.diaFechamento = 'Dia deve ser entre 1 e 31';
    const d2 = Number(form.diaVencimento);
    if (!d2 || d2 < 1 || d2 > 31) errs.diaVencimento = 'Dia deve ser entre 1 e 31';
    if (!form.contaCorrenteId) errs.contaCorrenteId = 'Selecione uma conta corrente';
    return errs;
  }

  function validateLancForm() {
    const errs = {};
    if (!lancForm.descricao.trim()) errs.descricao = 'Descrição é obrigatória';
    if (!lancForm.valor || parseFloat(lancForm.valor) <= 0) errs.valor = 'Valor deve ser maior que zero';
    if (!lancForm.dataCompra) errs.dataCompra = 'Data é obrigatória';
    const mes = Number(lancForm.mesFatura);
    if (!mes || mes < 1 || mes > 12) errs.mesFatura = 'Mês deve ser entre 1 e 12';
    if (!lancForm.anoFatura || Number(lancForm.anoFatura) < 2000) errs.anoFatura = 'Ano inválido';
    if (!lancForm.categoriaId) errs.categoriaId = 'Selecione uma categoria';
    const parc = Number(lancForm.quantidadeParcelas);
    if (!parc || parc < 1) errs.quantidadeParcelas = 'Mínimo 1 parcela';
    return errs;
  }

  async function criarCartao(e) {
    e.preventDefault();
    const errs = validateCartaoForm();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSalvando(true);
    try {
      await api.criar({ ...form, limite: parseFloat(form.limite), diaFechamento: Number(form.diaFechamento), diaVencimento: Number(form.diaVencimento), contaCorrenteId: Number(form.contaCorrenteId) });
      setForm({ nome: '', limite: '', diaFechamento: '', diaVencimento: '', contaCorrenteId: '' });
      setShowForm(false);
      setLista(await api.listar());
      toast.success('Cartão criado!');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  }

  function deletarCartao(id) {
    setConfirmAction({
      title: 'Excluir cartão',
      message: 'Tem certeza que deseja excluir este cartão? Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await api.deletar(id);
          setLista(await api.listar());
          toast.success('Cartão excluído!');
        } catch (e) {
          toast.error(e.message);
        }
      },
    });
  }

  async function abrirCartao(c) {
    setCartaoSel(c);
    setEditLancId(null);
    setErrors({});
    setLancamentos(await api.lancamentos.listar(c.id));
  }

  async function criarLancamento(e) {
    e.preventDefault();
    const errs = validateLancForm();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSalvandoLanc(true);
    try {
      await api.lancamentos.criar(cartaoSel.id, { ...lancForm, valor: parseFloat(lancForm.valor), mesFatura: Number(lancForm.mesFatura), anoFatura: Number(lancForm.anoFatura), categoriaId: Number(lancForm.categoriaId), quantidadeParcelas: Number(lancForm.quantidadeParcelas) });
      await recarregarLancamentos();
      setLancForm(emptyLancForm);
      toast.success('Lançamento criado!');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSalvandoLanc(false);
    }
  }

  function iniciarEdicao(l) {
    setEditLancId(l.id);
    setEditForm({ descricao: l.descricao, valor: String(l.valor), dataCompra: l.dataCompra, mesFatura: String(l.mesFatura), anoFatura: String(l.anoFatura), categoriaId: String(l.categoriaId) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function salvarEdicao(e) {
    e.preventDefault();
    setSalvandoEdit(true);
    try {
      await api.lancamentos.atualizar(cartaoSel.id, editLancId, { ...editForm, valor: parseFloat(editForm.valor), mesFatura: Number(editForm.mesFatura), anoFatura: Number(editForm.anoFatura), categoriaId: Number(editForm.categoriaId) });
      await recarregarLancamentos();
      setEditLancId(null);
      toast.success('Lançamento atualizado!');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSalvandoEdit(false);
    }
  }

  function deletarLancamento(id) {
    setConfirmAction({
      title: 'Excluir lançamento',
      message: 'Tem certeza que deseja excluir este lançamento?',
      confirmLabel: 'Excluir',
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await api.lancamentos.deletar(cartaoSel.id, id);
          await recarregarLancamentos();
          toast.success('Lançamento excluído!');
        } catch (e) {
          toast.error(e.message);
        }
      },
    });
  }

  async function fecharFatura(e) {
    e.preventDefault();
    setSalvandoFatura(true);
    try {
      await api.fecharFatura(cartaoSel.id, { mes: Number(fechForm.mes), ano: Number(fechForm.ano) });
      await recarregarLancamentos();
      toast.success('Fatura fechada! Conta a pagar gerada.');
      setFechForm({ mes: '', ano: '' });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSalvandoFatura(false);
    }
  }

  const lancsFiltrados = lancamentos.filter((l) => {
    if (filterMes && String(l.mesFatura) !== filterMes) return false;
    if (filterAno && String(l.anoFatura) !== filterAno) return false;
    return true;
  });

  const columns = [
    {
      key: 'descricao',
      label: 'Descrição',
      render: (v, row) => (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-text-primary font-medium">{v}</span>
          {row.faturaFechada && (
            <Badge variant="warning">
              <span className="flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Fechada</span>
            </Badge>
          )}
        </div>
      ),
    },
    { key: 'valor', label: 'Valor', render: (v) => <span className="font-medium text-text-primary">R$ {brl(v)}</span> },
    { key: 'mesFatura', label: 'Fatura', render: (v, row) => `${String(v).padStart(2, '0')}/${row.anoFatura}` },
    { key: 'numeroParcela', label: 'Parcela', render: (v, row) => `${v}/${row.totalParcelas}` },
    {
      key: 'id',
      label: 'Ações',
      render: (id, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => iniciarEdicao(row)}
            disabled={row.faturaFechada}
            aria-label="Editar lançamento"
            title={row.faturaFechada ? 'Fatura fechada' : 'Editar'}
            className="p-1.5 text-text-primary/40 hover:text-primary rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => deletarLancamento(id)}
            disabled={row.faturaFechada}
            aria-label="Excluir lançamento"
            title={row.faturaFechada ? 'Fatura fechada' : 'Excluir'}
            className="p-1.5 text-text-primary/40 hover:text-error rounded-lg hover:bg-error/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cartões de Crédito"
        subtitle="Gerencie seus cartões e lançamentos"
        actions={
          !cartaoSel && (
            <button
              onClick={() => { setForm({ nome: '', limite: '', diaFechamento: '', diaVencimento: '', contaCorrenteId: '' }); setErrors({}); setShowForm((v) => !v); }}
              className="flex items-center gap-2 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Novo Cartão
            </button>
          )
        }
      />

      {/* Form novo cartão */}
      {!cartaoSel && showForm && (
        <div className="bg-surface-medium border border-text-primary/5 rounded-2xl p-6 space-y-4 animate-scale-in">
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary/50">Novo Cartão</h2>
          <form onSubmit={criarCartao}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <FormField label="Nome" required error={errors.nome}>
                <input className={inputCls} value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required />
              </FormField>
              <FormField label="Limite (R$)" required error={errors.limite}>
                <input type="number" step="0.01" className={inputCls} value={form.limite} onChange={(e) => setForm((f) => ({ ...f, limite: e.target.value }))} required />
              </FormField>
              <FormField label="Dia Fechamento" required error={errors.diaFechamento}>
                <input type="number" min="1" max="31" className={inputCls} value={form.diaFechamento} onChange={(e) => setForm((f) => ({ ...f, diaFechamento: e.target.value }))} required />
              </FormField>
              <FormField label="Dia Vencimento" required error={errors.diaVencimento}>
                <input type="number" min="1" max="31" className={inputCls} value={form.diaVencimento} onChange={(e) => setForm((f) => ({ ...f, diaVencimento: e.target.value }))} required />
              </FormField>
              <FormField label="Conta Corrente" required error={errors.contaCorrenteId}>
                <select className={`${inputCls} appearance-none`} value={form.contaCorrenteId} onChange={(e) => setForm((f) => ({ ...f, contaCorrenteId: e.target.value }))} required>
                  <option value="">Selecione</option>
                  {ccs.map((c) => <option key={c.id} value={c.id}>{c.descricao} — {c.numeroConta}</option>)}
                </select>
              </FormField>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={salvando} className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {salvando ? 'Criando...' : 'Criar Cartão'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl border border-text-primary/10 text-text-primary/60 hover:text-text-primary transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de cartões */}
      {!cartaoSel && (
        lista.length === 0 ? (
          <EmptyState icon={CreditCard} title="Nenhum cartão cadastrado" description="Adicione seus cartões de crédito para controlar os gastos." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lista.map((c) => {
              const usoPct = Math.min(100, (Number(c.limiteUsado) / Number(c.limite)) * 100);
              return (
                <div
                  key={c.id}
                  onClick={() => abrirCartao(c)}
                  className="group relative rounded-2xl overflow-hidden cursor-pointer hover:shadow-elevated transition-all hover:-translate-y-0.5"
                >
                  <div className={`bg-gradient-to-br ${cardGradient(c.id)} p-5 space-y-4`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-white text-base drop-shadow">{c.nome}</p>
                        <p className="text-white/60 text-xs mt-0.5">Fecha dia {c.diaFechamento} · Vence dia {c.diaVencimento}</p>
                        <p className="text-white/50 text-xs">{c.contaCorrenteDescricao}</p>
                      </div>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); deletarCartao(c.id); }}
                        aria-label="Excluir cartão"
                        className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <CreditCard className="w-8 h-8 text-white/25" />

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-white/70">
                        <span>Limite total</span>
                        <span className="font-bold text-white">R$ {brl(c.limite)}</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-white/80 rounded-full transition-all duration-700"
                          style={{ width: `${usoPct.toFixed(1)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-white/60">Usado R$ {brl(c.limiteUsado)}</span>
                        <span className="text-white/80 font-medium">Livre R$ {brl(c.limiteLivre)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Detalhe do cartão selecionado */}
      {cartaoSel && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-text-primary font-display">{cartaoSel.nome}</h2>
              <p className="text-sm text-text-primary/50 mt-0.5">
                Limite R$ {brl(cartaoSel.limite)} · Usado R$ {brl(cartaoSel.limiteUsado)} · Livre R$ {brl(cartaoSel.limiteLivre)}
              </p>
            </div>
            <button
              onClick={() => { setCartaoSel(null); setEditLancId(null); }}
              aria-label="Fechar cartão"
              className="p-2 text-text-primary/50 hover:text-text-primary hover:bg-surface-medium rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Formulário de edição inline */}
          {editLancId && (
            <div className="bg-surface-medium border border-primary/20 rounded-2xl p-6 space-y-4 animate-scale-in">
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary/70">Editar Lançamento</h3>
              <form onSubmit={salvarEdicao}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <FormField label="Descrição">
                    <input className={inputCls} value={editForm.descricao} onChange={(e) => setEditForm((f) => ({ ...f, descricao: e.target.value }))} required />
                  </FormField>
                  <FormField label="Valor (R$)">
                    <input type="number" step="0.01" className={inputCls} value={editForm.valor} onChange={(e) => setEditForm((f) => ({ ...f, valor: e.target.value }))} required />
                  </FormField>
                  <FormField label="Data Compra">
                    <input type="date" className={inputCls} value={editForm.dataCompra} onChange={(e) => setEditForm((f) => ({ ...f, dataCompra: e.target.value }))} required />
                  </FormField>
                  <FormField label="Mês Fatura">
                    <input type="number" min="1" max="12" className={inputCls} value={editForm.mesFatura} onChange={(e) => setEditForm((f) => ({ ...f, mesFatura: e.target.value }))} required />
                  </FormField>
                  <FormField label="Ano Fatura">
                    <input type="number" className={inputCls} value={editForm.anoFatura} onChange={(e) => setEditForm((f) => ({ ...f, anoFatura: e.target.value }))} required />
                  </FormField>
                  <FormField label="Categoria">
                    <select className={`${inputCls} appearance-none`} value={editForm.categoriaId} onChange={(e) => setEditForm((f) => ({ ...f, categoriaId: e.target.value }))} required>
                      <option value="">Selecione</option>
                      {cats.map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
                    </select>
                  </FormField>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={salvandoEdit} className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                    {salvandoEdit && <Loader2 className="w-4 h-4 animate-spin" />}
                    {salvandoEdit ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button type="button" onClick={() => setEditLancId(null)} className="px-6 py-2.5 rounded-xl border border-text-primary/10 text-text-primary/60 hover:text-text-primary transition-colors">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Novo lançamento */}
            <form onSubmit={criarLancamento} className="bg-surface-medium border border-text-primary/5 rounded-2xl p-6 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary/50">Novo Lançamento</h3>
              <FormField label="Descrição" error={errors.descricao}>
                <input className={inputCls} value={lancForm.descricao} onChange={(e) => setLancForm((f) => ({ ...f, descricao: e.target.value }))} required />
              </FormField>
              <FormField label="Valor (R$)" error={errors.valor}>
                <input type="number" step="0.01" className={inputCls} value={lancForm.valor} onChange={(e) => setLancForm((f) => ({ ...f, valor: e.target.value }))} required />
              </FormField>
              <FormField label="Data Compra" error={errors.dataCompra}>
                <input type="date" className={inputCls} value={lancForm.dataCompra} onChange={(e) => setLancForm((f) => ({ ...f, dataCompra: e.target.value }))} required />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Mês Fatura (1-12)" error={errors.mesFatura}>
                  <input type="number" min="1" max="12" className={inputCls} value={lancForm.mesFatura} onChange={(e) => setLancForm((f) => ({ ...f, mesFatura: e.target.value }))} required />
                </FormField>
                <FormField label="Ano Fatura" error={errors.anoFatura}>
                  <input type="number" className={inputCls} value={lancForm.anoFatura} onChange={(e) => setLancForm((f) => ({ ...f, anoFatura: e.target.value }))} required />
                </FormField>
              </div>
              <FormField label="Nº Parcelas" error={errors.quantidadeParcelas}>
                <input type="number" min="1" className={inputCls} value={lancForm.quantidadeParcelas} onChange={(e) => setLancForm((f) => ({ ...f, quantidadeParcelas: e.target.value }))} required />
              </FormField>
              <FormField label="Categoria" required error={errors.categoriaId}>
                <select className={`${inputCls} appearance-none`} value={lancForm.categoriaId} onChange={(e) => setLancForm((f) => ({ ...f, categoriaId: e.target.value }))} required>
                  <option value="">Selecione</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
                </select>
              </FormField>
              <button type="submit" disabled={salvandoLanc} className="bg-primary text-on-primary font-bold px-4 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 text-sm flex items-center gap-2">
                {salvandoLanc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {salvandoLanc ? 'Lançando...' : 'Lançar'}
              </button>
            </form>

            {/* Fechar fatura */}
            <form onSubmit={fecharFatura} className="bg-surface-medium border border-text-primary/5 rounded-2xl p-6 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary/50">Fechar Fatura</h3>
              <FormField label="Mês (1-12)">
                <input type="number" min="1" max="12" className={inputCls} value={fechForm.mes} onChange={(e) => setFechForm((f) => ({ ...f, mes: e.target.value }))} required />
              </FormField>
              <FormField label="Ano">
                <input type="number" className={inputCls} value={fechForm.ano} onChange={(e) => setFechForm((f) => ({ ...f, ano: e.target.value }))} required />
              </FormField>
              <button type="submit" disabled={salvandoFatura} className="bg-amber-500 text-white font-bold px-4 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 text-sm flex items-center gap-2">
                {salvandoFatura ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                {salvandoFatura ? 'Fechando...' : 'Fechar Fatura'}
              </button>
            </form>
          </div>

          {/* Filtro de lançamentos */}
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-xs font-bold uppercase tracking-widest text-text-primary/40">Filtrar:</p>
            <select
              className={`${inputCls} !w-auto min-w-[90px]`}
              value={filterMes}
              onChange={(e) => setFilterMes(e.target.value)}
            >
              <option value="">Mês</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
              ))}
            </select>
            <input
              type="number"
              className={`${inputCls} !w-auto min-w-[90px]`}
              placeholder="Ano"
              value={filterAno}
              onChange={(e) => setFilterAno(e.target.value)}
            />
            {(filterMes || filterAno) && (
              <button onClick={() => { setFilterMes(''); setFilterAno(''); }} className="text-xs text-text-primary/40 hover:text-text-primary transition-colors underline underline-offset-2">
                Limpar filtros
              </button>
            )}
          </div>

          <DataTable
            columns={columns}
            data={lancsFiltrados}
            loading={false}
            aria-label="Lançamentos do cartão"
            emptyState={<EmptyState icon={CreditCard} title="Nenhum lançamento" description="Adicione o primeiro lançamento neste cartão." />}
          />
        </div>
      )}

      {confirmAction && <ConfirmModal {...confirmAction} onCancel={() => setConfirmAction(null)} />}
    </div>
  );
}
