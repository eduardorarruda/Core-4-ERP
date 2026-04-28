import React, { useCallback, useEffect, useState } from 'react';
import { FileText, Plus, Trash2, CheckCircle, Filter, RotateCcw, ChevronDown, Loader2 } from 'lucide-react';
import { contas as api, categorias as catApi, parceiros as parApi, contasCorrentes as ccApi, assinaturas as assinaturasApi } from '../lib/api';
import ConfirmModal from '../components/ui/ConfirmModal';
import FormField, { inputCls } from '../components/ui/FormField';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import { brl, formatDate } from '../lib/formatters';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';

const STATUS_VARIANT = { PENDENTE: 'warning', ATRASADO: 'error', PAGO: 'success', RECEBIDO: 'info' };

const emptyForm = { descricao: '', valorOriginal: '', dataVencimento: '', tipo: 'PAGAR', categoriaId: '', parceiroId: '', quantidadeParcelas: 1, dividirValor: false, numeroDocumento: '', acrescimo: '', desconto: '' };
const emptyBaixa = { contaCorrenteId: '', dataPagamento: '', juros: 0, multa: 0, acrescimo: 0, desconto: 0 };
const emptyFiltros = { tipo: '', status: '', numeroDocumento: '', vencimentoInicio: '', vencimentoFim: '', parceiroId: '', valorMin: '', valorMax: '', categoriaId: '' };

const COLUMNS = [
  { key: 'descricao', label: 'Descrição', render: (v, row) => (
    <div>
      <p className="font-medium text-text-primary">{v}</p>
      {row.totalParcelas > 1 && <span className="text-xs text-text-primary/40">{row.numeroParcela}/{row.totalParcelas}</span>}
      {row.numeroDocumento && <p className="text-xs text-text-primary/40">{row.numeroDocumento}</p>}
    </div>
  )},
  { key: 'valorOriginal', label: 'Valor', sortable: true, render: (v) => `R$ ${brl(v)}` },
  { key: 'dataVencimento', label: 'Vencimento', sortable: true, render: (v) => formatDate(v) },
  { key: 'tipo', label: 'Tipo', render: (v) => <Badge variant={v === 'PAGAR' ? 'error' : 'info'}>{v === 'PAGAR' ? 'Pagar' : 'Receber'}</Badge> },
  { key: 'status', label: 'Status', render: (v) => <Badge variant={STATUS_VARIANT[v] ?? 'neutral'} dot={v === 'ATRASADO'}>{v}</Badge> },
];

export default function ContasFinanceiras() {
  const toast = useToast();
  const [contas, setContas] = useState([]);
  const [cats, setCats] = useState([]);
  const [pars, setPars] = useState([]);
  const [ccs, setCcs] = useState([]);
  const [assinaturasAtivas, setAssinaturasAtivas] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [baixaId, setBaixaId] = useState(null);
  const [baixaForm, setBaixaForm] = useState(emptyBaixa);
  const [filtros, setFiltros] = useState(emptyFiltros);
  const [showFiltros, setShowFiltros] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvandoBaixa, setSalvandoBaixa] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    Promise.all([
      catApi.listar().catch(() => []),
      parApi.listar().catch(() => []),
      ccApi.listar().catch(() => []),
      assinaturasApi.listarAtivas().catch(() => []),
    ]).then(([c, p, cc, a]) => {
      setCats(c);
      setPars(p);
      setCcs(cc);
      setAssinaturasAtivas(a);
    });
    carregar(emptyFiltros);
  }, []);

  const carregar = useCallback(async (f = filtros) => {
    setLoading(true);
    try {
      const p = {};
      if (f.tipo) p.tipo = f.tipo;
      if (f.status) p.status = f.status;
      if (f.numeroDocumento.trim()) p.numeroDocumento = f.numeroDocumento.trim();
      if (f.vencimentoInicio) p.vencimentoInicio = f.vencimentoInicio;
      if (f.vencimentoFim) p.vencimentoFim = f.vencimentoFim;
      if (f.parceiroId) p.parceiroId = f.parceiroId;
      if (f.valorMin) p.valorMin = f.valorMin;
      if (f.valorMax) p.valorMax = f.valorMax;
      if (f.categoriaId) p.categoriaId = f.categoriaId;
      const res = await api.listar(p);
      setContas(res.content || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  const setTipo = (tipo) => { const novo = { ...filtros, tipo }; setFiltros(novo); carregar(novo); };
  const aplicarFiltros = () => carregar(filtros);
  const limparFiltros = () => { setFiltros(emptyFiltros); carregar(emptyFiltros); };

  const valorLiquido = (parseFloat(form.valorOriginal) || 0) + (parseFloat(form.acrescimo) || 0) - (parseFloat(form.desconto) || 0);
  const parsFiltered = pars.filter((p) => form.tipo === 'PAGAR' ? p.tipo === 'FORNECEDOR' || p.tipo === 'AMBOS' : p.tipo === 'CLIENTE' || p.tipo === 'AMBOS');

  function validateForm() {
    const errs = {};
    if (!form.descricao.trim()) errs.descricao = 'Obrigatório';
    if (!form.valorOriginal || parseFloat(form.valorOriginal) <= 0) errs.valorOriginal = 'Maior que zero';
    if (!form.dataVencimento) errs.dataVencimento = 'Obrigatório';
    if (!form.categoriaId) errs.categoriaId = 'Obrigatório';
    if (!form.parceiroId) errs.parceiroId = 'Obrigatório';
    if (Number(form.quantidadeParcelas) < 1) errs.quantidadeParcelas = 'Mínimo 1';
    if (valorLiquido <= 0) errs.valorOriginal = 'Valor líquido inválido';
    return errs;
  }

  async function criar(e) {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSalvando(true);
    try {
      await api.criar({ ...form, valorOriginal: parseFloat(form.valorOriginal), categoriaId: Number(form.categoriaId), parceiroId: form.parceiroId ? Number(form.parceiroId) : null, quantidadeParcelas: Number(form.quantidadeParcelas), acrescimo: parseFloat(form.acrescimo) || 0, desconto: parseFloat(form.desconto) || 0 });
      setForm(emptyForm);
      setShowForm(false);
      toast.success('Conta criada!');
      await carregar();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  }

  const deletar = useCallback((id) => {
    setConfirmAction({
      title: 'Excluir conta',
      message: 'Deseja excluir esta conta permanentemente?',
      confirmLabel: 'Excluir',
      onConfirm: async () => {
        setConfirmAction(null);
        try { await api.deletar(id); await carregar(); toast.success('Conta excluída!'); }
        catch (e) { toast.error(e.message); }
      },
    });
  }, [carregar]);

  const estornar = useCallback((id) => {
    setConfirmAction({
      title: 'Estornar quitação',
      message: 'Cancelar a quitação desta conta? O saldo da conta corrente será estornado.',
      confirmLabel: 'Estornar',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmAction(null);
        try { await api.estornar(id); await carregar(); toast.success('Quitação cancelada!'); }
        catch (e) { toast.error(e.message); }
      },
    });
  }, [carregar]);

  async function baixar(e) {
    e.preventDefault();
    setSalvandoBaixa(true);
    try {
      await api.baixar(baixaId, { ...baixaForm, contaCorrenteId: Number(baixaForm.contaCorrenteId), juros: parseFloat(baixaForm.juros || 0), multa: parseFloat(baixaForm.multa || 0), acrescimo: parseFloat(baixaForm.acrescimo || 0), desconto: parseFloat(baixaForm.desconto || 0) });
      setBaixaId(null);
      setBaixaForm(emptyBaixa);
      toast.success('Baixa registrada!');
      await carregar();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSalvandoBaixa(false);
    }
  }

  const setF = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const columns = [
    ...COLUMNS,
    {
      key: 'id',
      label: 'Ações',
      render: (id, row) => (
        <div className="flex gap-2">
          {(row.status === 'PENDENTE' || row.status === 'ATRASADO') && (
            <button
              onClick={() => { setBaixaId(row.id); setBaixaForm(emptyBaixa); }}
              aria-label="Baixar conta"
              title="Baixar"
              className="p-1.5 text-text-primary/40 hover:text-primary transition-colors rounded-lg hover:bg-primary/10"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          {(row.status === 'PAGO' || row.status === 'RECEBIDO') && (
            <button
              onClick={() => !row.conciliada && estornar(row.id)}
              aria-label="Estornar quitação"
              title={row.conciliada ? 'Conta conciliada — estorno bloqueado' : 'Estornar'}
              disabled={row.conciliada}
              className={`p-1.5 transition-colors rounded-lg ${row.conciliada ? 'text-text-primary/20 cursor-not-allowed' : 'text-text-primary/40 hover:text-amber-400 hover:bg-amber-400/10'}`}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => deletar(row.id)} aria-label="Excluir conta" title="Excluir" className="p-1.5 text-text-primary/40 hover:text-error transition-colors rounded-lg hover:bg-error/10">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lançamentos"
        subtitle="Contas a pagar e a receber"
        actions={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Nova Conta
          </button>
        }
      />

      {/* Filtros */}
      <div className="bg-surface-medium border border-text-primary/5 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowFiltros((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-highest/30 transition-colors"
        >
          <span className="text-sm font-bold uppercase tracking-widest text-text-primary/50 flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filtros
          </span>
          <ChevronDown className={cn('w-4 h-4 text-text-primary/40 transition-transform duration-200', showFiltros && 'rotate-180')} />
        </button>

        {showFiltros && (
          <div className="px-6 pb-6 space-y-4 border-t border-text-primary/5">
            <div className="flex flex-wrap items-center gap-2 pt-4">
              {['', 'PAGAR', 'RECEBER'].map((t) => (
                <button key={t} onClick={() => setTipo(t)} className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all', filtros.tipo === t ? 'bg-primary text-on-primary' : 'border border-text-primary/10 text-text-primary/60 hover:text-text-primary')}>
                  {t || 'Todos'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField label="Nº Documento">
                <input className={inputCls} value={filtros.numeroDocumento} onChange={(e) => setFiltros((f) => ({ ...f, numeroDocumento: e.target.value }))} placeholder="NF-001, Boleto..." />
              </FormField>
              <FormField label="Vencimento de">
                <input type="date" className={inputCls} value={filtros.vencimentoInicio} onChange={(e) => setFiltros((f) => ({ ...f, vencimentoInicio: e.target.value }))} />
              </FormField>
              <FormField label="Vencimento até">
                <input type="date" className={inputCls} value={filtros.vencimentoFim} onChange={(e) => setFiltros((f) => ({ ...f, vencimentoFim: e.target.value }))} />
              </FormField>
              <FormField label="Parceiro">
                <select className={`${inputCls} appearance-none`} value={filtros.parceiroId} onChange={(e) => setFiltros((f) => ({ ...f, parceiroId: e.target.value }))}>
                  <option value="">Todos</option>
                  {pars.map((p) => <option key={p.id} value={p.id}>{p.razaoSocial}{p.nomeFantasia ? ` (${p.nomeFantasia})` : ''}</option>)}
                </select>
              </FormField>
              <FormField label="Valor de (R$)">
                <input type="number" step="0.01" min="0" className={inputCls} value={filtros.valorMin} onChange={(e) => setFiltros((f) => ({ ...f, valorMin: e.target.value }))} placeholder="0,00" />
              </FormField>
              <FormField label="Categoria">
                <select className={`${inputCls} appearance-none`} value={filtros.categoriaId} onChange={(e) => setFiltros((f) => ({ ...f, categoriaId: e.target.value }))}>
                  <option value="">Todas</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
                </select>
              </FormField>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={aplicarFiltros} className="bg-primary text-on-primary font-bold px-6 py-2 rounded-xl hover:opacity-90 flex items-center gap-2">
                <Filter className="w-4 h-4" /> Filtrar
              </button>
              <button type="button" onClick={limparFiltros} className="px-6 py-2 rounded-xl border border-text-primary/10 text-text-primary/60 hover:text-text-primary flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Limpar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-surface-medium border border-text-primary/5 rounded-2xl p-6 space-y-4 animate-scale-in">
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary/50">Nova Conta</h2>
          <form onSubmit={criar}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {assinaturasAtivas.length > 0 && (
                <FormField label="Preencher de Assinatura">
                  <select className={`${inputCls} appearance-none`} value="" onChange={(e) => {
                    const id = Number(e.target.value);
                    if (!id) return;
                    const assin = assinaturasAtivas.find((a) => a.id === id);
                    if (!assin) return;
                    const hoje = new Date();
                    let venc = new Date(hoje.getFullYear(), hoje.getMonth(), assin.diaVencimento);
                    if (venc < hoje) venc = new Date(hoje.getFullYear(), hoje.getMonth() + 1, assin.diaVencimento);
                    setForm((f) => ({ ...f, descricao: assin.descricao, valorOriginal: String(assin.valor), categoriaId: String(assin.categoriaId), parceiroId: assin.parceiroId ? String(assin.parceiroId) : '', dataVencimento: venc.toISOString().split('T')[0], tipo: 'PAGAR' }));
                  }}>
                    <option value="">— Selecionar assinatura —</option>
                    {assinaturasAtivas.map((a) => <option key={a.id} value={a.id}>{a.descricao} — R$ {brl(a.valor)} (dia {a.diaVencimento})</option>)}
                  </select>
                </FormField>
              )}
              <FormField label="Nº Documento">
                <input className={inputCls} value={form.numeroDocumento} onChange={(e) => setF('numeroDocumento')(e.target.value)} placeholder="NF-001..." />
              </FormField>
              <FormField label="Descrição" required error={errors.descricao}>
                <input className={inputCls} value={form.descricao} onChange={(e) => setF('descricao')(e.target.value)} required />
              </FormField>
              <FormField label="Tipo" required>
                <select className={`${inputCls} appearance-none`} value={form.tipo} onChange={(e) => setF('tipo')(e.target.value)}>
                  <option value="PAGAR">A Pagar</option>
                  <option value="RECEBER">A Receber</option>
                </select>
              </FormField>
              <FormField label="Categoria" required error={errors.categoriaId}>
                <select className={`${inputCls} appearance-none`} value={form.categoriaId} onChange={(e) => setF('categoriaId')(e.target.value)} required>
                  <option value="">Selecione</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
                </select>
              </FormField>
              <FormField label={form.tipo === 'PAGAR' ? 'Fornecedor' : 'Cliente'} required error={errors.parceiroId}>
                <select className={`${inputCls} appearance-none`} value={form.parceiroId} onChange={(e) => setF('parceiroId')(e.target.value)}>
                  <option value="">— Selecionar —</option>
                  {parsFiltered.map((p) => <option key={p.id} value={p.id}>{p.razaoSocial}{p.nomeFantasia ? ` (${p.nomeFantasia})` : ''}</option>)}
                </select>
              </FormField>
              <FormField label="Vencimento" required error={errors.dataVencimento}>
                <input type="date" className={inputCls} value={form.dataVencimento} onChange={(e) => setF('dataVencimento')(e.target.value)} required />
              </FormField>
              <FormField label="Valor (R$)" required error={errors.valorOriginal}>
                <input type="number" step="0.01" min="0.01" className={inputCls} value={form.valorOriginal} onChange={(e) => setF('valorOriginal')(e.target.value)} required />
              </FormField>
              <FormField label="Acréscimo (R$)">
                <input type="number" step="0.01" min="0" className={inputCls} value={form.acrescimo} onChange={(e) => setF('acrescimo')(e.target.value)} placeholder="0,00" />
              </FormField>
              <FormField label="Desconto (R$)">
                <input type="number" step="0.01" min="0" className={inputCls} value={form.desconto} onChange={(e) => setF('desconto')(e.target.value)} placeholder="0,00" />
              </FormField>
              <FormField label="Valor Líquido (R$)">
                <input type="text" readOnly className={`${inputCls} opacity-50 cursor-not-allowed`} value={brl(valorLiquido)} />
              </FormField>
              <FormField label="Nº Parcelas" error={errors.quantidadeParcelas}>
                <input type="number" min="1" className={inputCls} value={form.quantidadeParcelas} onChange={(e) => setF('quantidadeParcelas')(e.target.value)} />
              </FormField>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="dividir" checked={form.dividirValor} onChange={(e) => setForm((f) => ({ ...f, dividirValor: e.target.checked }))} className="w-4 h-4 accent-primary" />
                <label htmlFor="dividir" className="text-sm text-text-primary/60">Dividir valor entre parcelas</label>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={salvando} className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {salvando ? 'Criando...' : 'Criar'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl border border-text-primary/10 text-text-primary/60 hover:text-text-primary transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Baixa */}
      {baixaId && (
        <form onSubmit={baixar} className="bg-surface-medium border border-primary/20 rounded-2xl p-6 space-y-4 animate-scale-in">
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Baixar Conta #{baixaId}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Conta Corrente" required>
              <select className={`${inputCls} appearance-none`} value={baixaForm.contaCorrenteId} onChange={(e) => setBaixaForm((f) => ({ ...f, contaCorrenteId: e.target.value }))} required>
                <option value="">Selecione</option>
                {ccs.map((c) => <option key={c.id} value={c.id}>{c.descricao} — {c.numeroConta}</option>)}
              </select>
            </FormField>
            <FormField label="Data Pagamento" required>
              <input type="date" className={inputCls} value={baixaForm.dataPagamento} onChange={(e) => setBaixaForm((f) => ({ ...f, dataPagamento: e.target.value }))} required />
            </FormField>
            {[['Juros', 'juros'], ['Multa', 'multa'], ['Acréscimo', 'acrescimo'], ['Desconto', 'desconto']].map(([lbl, key]) => (
              <FormField key={key} label={lbl}>
                <input type="number" step="0.01" min="0" className={inputCls} value={baixaForm[key]} onChange={(e) => setBaixaForm((f) => ({ ...f, [key]: e.target.value }))} />
              </FormField>
            ))}
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={salvandoBaixa} className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
              {salvandoBaixa ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {salvandoBaixa ? 'Registrando...' : 'Confirmar Baixa'}
            </button>
            <button type="button" onClick={() => { setBaixaId(null); setBaixaForm(emptyBaixa); }} className="px-6 py-2.5 rounded-xl border border-text-primary/10 text-text-primary/60 hover:text-text-primary transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Tabela */}
      <DataTable
        columns={columns}
        data={contas}
        loading={loading}
        aria-label="Lista de contas"
      />

      {confirmAction && <ConfirmModal {...confirmAction} onCancel={() => setConfirmAction(null)} />}
    </div>
  );
}
