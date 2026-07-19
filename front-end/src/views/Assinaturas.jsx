import React, { useEffect, useState } from 'react';
import { Repeat, Plus, Pencil, Trash2 } from 'lucide-react';
import { assinaturas as api, categorias as catApi, parceiros as parApi, cartoes as cartoesApi } from '../lib/api';
import ConfirmModal from '../components/ui/ConfirmModal';
import FormField, { inputCls, inputErrorCls } from '../components/ui/FormField';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { brl } from '../lib/formatters';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';

const emptyForm = { descricao: '', valor: '', diaVencimento: '', categoriaId: '', parceiroId: '', cartaoCreditoId: '', ativa: true };

export default function Assinaturas() {
  const toast = useToast();
  const [lista, setLista] = useState([]);
  const [cats, setCats] = useState([]);
  const [pars, setPars] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [errors, setErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    catApi.listar().then(setCats).catch(() => {});
    parApi.listar().then((data) => setPars(data.filter((p) => p.tipo === 'FORNECEDOR' || p.tipo === 'AMBOS'))).catch(() => {});
    cartoesApi.listar().then(setCartoes).catch(() => {});
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    try { setLista(await api.listar()); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  function setF(k) { return (v) => setForm((f) => ({ ...f, [k]: v })); }

  function validate() {
    const e = {};
    if (!form.descricao.trim()) e.descricao = 'Obrigatório';
    if (!form.valor || Number(form.valor) <= 0) e.valor = 'Deve ser maior que zero';
    if (!form.diaVencimento || Number(form.diaVencimento) < 1 || Number(form.diaVencimento) > 31) e.diaVencimento = 'Entre 1 e 31';
    if (!form.categoriaId) e.categoriaId = 'Obrigatório';
    if (!form.parceiroId) e.parceiroId = 'Obrigatório';
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
        cartaoCreditoId: form.cartaoCreditoId ? Number(form.cartaoCreditoId) : null,
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
    setForm({ descricao: a.descricao, valor: String(a.valor), diaVencimento: String(a.diaVencimento), categoriaId: String(a.categoriaId), parceiroId: a.parceiroId ? String(a.parceiroId) : '', cartaoCreditoId: a.cartaoCreditoId ? String(a.cartaoCreditoId) : '', ativa: a.ativa });
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
          <Button onClick={() => { cancelar(); setShowForm((v) => !v); }} leftIcon={<Plus className="w-4 h-4" />} className="text-xs uppercase tracking-widest font-bold">
            Nova Assinatura
          </Button>
        }
      />

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Assinaturas Ativas', value: ativas.length,     currency: false, accent: 'text-primary',    card: 'bg-primary/[0.07] border-primary/20' },
          { label: 'Custo Mensal',       value: totalMensal,       currency: true,  accent: 'text-error',      card: 'bg-error/[0.07] border-error/20' },
          { label: 'Custo Anual',        value: totalMensal * 12,  currency: true,  accent: 'text-amber-400',  card: 'bg-amber-400/[0.07] border-amber-400/20' },
        ].map((s, i) => (
          <div key={s.label} className={cn('anim-in rounded-[18px] px-5 py-4 border backdrop-blur-sm', `d${i + 1}`, s.card)}>
            <p className={cn('text-[9px] font-bold uppercase tracking-widest font-mono mb-2', s.accent)}>{s.label}</p>
            <p className={cn('text-2xl font-bold font-display', s.accent)}>
              {s.currency ? `R$ ${brl(s.value)}` : s.value}
            </p>
          </div>
        ))}
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
                className={errors.descricao ? inputErrorCls : inputCls}
                value={form.descricao}
                onChange={(e) => setF('descricao')(e.target.value)}
                placeholder="Ex: Netflix, Spotify..."
              />
            </FormField>
            <FormField label="Valor Mensal (R$)" required error={errors.valor}>
              <input
                type="number" min="0.01" step="0.01"
                className={errors.valor ? inputErrorCls : inputCls}
                value={form.valor}
                onChange={(e) => setF('valor')(e.target.value)}
                placeholder="0,00"
              />
            </FormField>
            <FormField label="Dia de Vencimento" required error={errors.diaVencimento}>
              <input
                type="number" min="1" max="31"
                className={errors.diaVencimento ? inputErrorCls : inputCls}
                value={form.diaVencimento}
                onChange={(e) => setF('diaVencimento')(e.target.value)}
                placeholder="1 a 31"
              />
            </FormField>
            <FormField label="Categoria" required error={errors.categoriaId}>
              <select
                className={cn(errors.categoriaId ? inputErrorCls : inputCls, 'appearance-none')}
                value={form.categoriaId}
                onChange={(e) => setF('categoriaId')(e.target.value)}
              >
                <option value="">— Selecionar —</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
              </select>
            </FormField>
            <FormField label="Parceiro / Fornecedor" required error={errors.parceiroId}>
              <select className={cn(errors.parceiroId ? inputErrorCls : inputCls, 'appearance-none')} value={form.parceiroId} onChange={(e) => setF('parceiroId')(e.target.value)}>
                <option value="">— Selecionar —</option>
                {pars.map((p) => <option key={p.id} value={p.id}>{p.nomeFantasia || p.razaoSocial}</option>)}
              </select>
            </FormField>
            <FormField label="Cartão de Crédito">
              <select className={`${inputCls} appearance-none`} value={form.cartaoCreditoId} onChange={(e) => setF('cartaoCreditoId')(e.target.value)}>
                <option value="">— Débito em conta —</option>
                {cartoes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </FormField>
            <FormField label="Status">
              <label className="flex items-center gap-3 cursor-pointer mt-2.5">
                <input type="checkbox" checked={form.ativa} onChange={(e) => setF('ativa')(e.target.checked)} className="w-4 h-4 accent-primary" />
                <span className="text-sm text-text-primary">{form.ativa ? 'Ativa' : 'Inativa'}</span>
              </label>
            </FormField>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-3 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={cancelar} className="border border-text-primary/10 text-text-primary/60 hover:text-text-primary">
                Cancelar
              </Button>
              <Button type="submit" loading={salvando} className="text-xs uppercase tracking-widest font-bold">
                {salvando ? 'Salvando...' : editingId ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Ativas */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-surface-medium border border-text-primary/5 animate-pulse" />
          ))}
        </div>
      ) : lista.length === 0 ? (
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
  const custoDiario = Number(a.valor) / 30;
  return (
    <div className="bg-surface-medium border border-text-primary/5 rounded-2xl p-4 flex flex-col gap-3 hover:border-text-primary/10 transition-colors hover:shadow-elevated">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-text-primary text-sm truncate">{a.descricao}</p>
          {a.parceiroNome && <p className="text-xs text-text-primary/40 truncate mt-0.5">{a.parceiroNome}</p>}
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => onEdit(a)} aria-label="Editar assinatura" className="text-text-primary/40 hover:text-primary hover:bg-primary/10">
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(a.id)} aria-label="Remover assinatura" className="text-text-primary/40 hover:text-error hover:bg-error/10">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] text-text-primary/40 uppercase tracking-wider">
            {a.cartaoCreditoNome ? 'Cobrança dia' : 'Vence dia'}
          </p>
          <p className="text-lg font-bold text-text-primary font-display">{a.diaVencimento}</p>
          {a.cartaoCreditoNome && (
            <p className="text-[10px] text-primary/70 mt-0.5">{a.cartaoCreditoNome}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-[10px] text-text-primary/40 uppercase tracking-wider">Por mês</p>
          <p className="text-lg font-bold text-primary font-display">R$ {brl(a.valor)}</p>
          <p className="text-[10px] text-text-primary/30">R$ {brl(custoDiario)}/dia</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={a.ativa ? 'success' : 'neutral'} dot={a.ativa}>
            {a.ativa ? 'Ativa' : 'Inativa'}
          </Badge>
          {a.cartaoCreditoNome && (
            <Badge variant="info">Cartão</Badge>
          )}
        </div>
        <span className="text-[10px] text-text-primary/40">{a.categoriaDescricao}</span>
      </div>
    </div>
  );
}
