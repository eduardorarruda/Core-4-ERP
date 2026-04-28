import React, { useEffect, useState } from 'react';
import { TrendingUp, Plus, X, Loader2, Pencil, Trash2, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import { investimentos as api, contasCorrentes as ccApi } from '../lib/api';
import { inputCls, labelCls } from '../components/ui/FormField';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import ConfirmModal from '../components/ui/ConfirmModal';
import { brl, formatDate } from '../lib/formatters';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';

const TIPO_TRANSACAO = ['APORTE', 'RESGATE', 'RENDIMENTO'];
const TRANSACAO_VARIANT = { APORTE: 'success', RESGATE: 'error', RENDIMENTO: 'info' };

const TRANSACAO_COLUMNS = [
  { key: 'tipoTransacao', label: 'Tipo', render: (v) => <Badge variant={TRANSACAO_VARIANT[v] ?? 'neutral'}>{v}</Badge> },
  { key: 'valor', label: 'Valor', render: (v) => `R$ ${brl(v)}` },
  { key: 'dataTransacao', label: 'Data', render: (v) => formatDate(v) },
];

export default function Investimentos() {
  const toast = useToast();
  const [lista, setLista] = useState([]);
  const [ccs, setCcs] = useState([]);
  const [tiposInv, setTiposInv] = useState([]);
  const [form, setForm] = useState({ nome: '', tipoId: '' });
  const [contaSel, setContaSel] = useState(null);
  const [transacoes, setTransacoes] = useState([]);
  const [tForm, setTForm] = useState({ tipoTransacao: 'APORTE', valor: '', dataTransacao: '', contaCorrenteOrigemId: '' });
  const [salvando, setSalvando] = useState(false);
  const [salvandoTransacao, setSalvandoTransacao] = useState(false);

  // Gerenciar tipos de investimento
  const [tiposAberto, setTiposAberto] = useState(false);
  const [tipoForm, setTipoForm] = useState({ nome: '' });
  const [tipoEditId, setTipoEditId] = useState(null);
  const [salvandoTipo, setSalvandoTipo] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    api.listar().then(setLista).catch((e) => toast.error(e.message));
    ccApi.listar().then(setCcs).catch(() => {});
    carregarTipos();
  }, []);

  async function carregarTipos() {
    try { setTiposInv(await api.tipos.listar()); }
    catch { /* silently ignore */ }
  }

  async function criar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.criar({ ...form, tipoId: Number(form.tipoId) });
      const l = await api.listar();
      setLista(l);
      setForm({ nome: '', tipoId: '' });
      toast.success('Conta de investimento criada!');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function abrir(c) {
    setContaSel(c);
    setTransacoes([]);
    api.transacoes.listar(c.id).then(setTransacoes).catch((e) => toast.error(e.message));
  }

  async function registrar(e) {
    e.preventDefault();
    setSalvandoTransacao(true);
    try {
      await api.transacoes.registrar(contaSel.id, { ...tForm, valor: parseFloat(tForm.valor), contaCorrenteOrigemId: tForm.contaCorrenteOrigemId ? Number(tForm.contaCorrenteOrigemId) : null });
      const updated = await api.buscar(contaSel.id);
      setContaSel(updated);
      const [l, t] = await Promise.all([api.listar(), api.transacoes.listar(contaSel.id)]);
      setLista(l);
      setTransacoes(t);
      setTForm({ tipoTransacao: 'APORTE', valor: '', dataTransacao: '', contaCorrenteOrigemId: '' });
      toast.success('Transação registrada!');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSalvandoTransacao(false);
    }
  }

  // CRUD de tipos de investimento
  async function salvarTipo(e) {
    e.preventDefault();
    setSalvandoTipo(true);
    try {
      if (tipoEditId) {
        await api.tipos.atualizar(tipoEditId, tipoForm);
        toast.success('Tipo atualizado!');
      } else {
        await api.tipos.criar(tipoForm);
        toast.success('Tipo criado!');
      }
      setTipoForm({ nome: '' });
      setTipoEditId(null);
      await carregarTipos();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSalvandoTipo(false);
    }
  }

  function editarTipo(t) {
    setTipoForm({ nome: t.nome });
    setTipoEditId(t.id);
  }

  function deletarTipo(id) {
    setConfirmAction({
      title: 'Excluir tipo de investimento',
      message: 'Tem certeza que deseja excluir este tipo? Contas de investimento vinculadas poderão ser afetadas.',
      confirmLabel: 'Excluir',
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await api.tipos.deletar(id);
          await carregarTipos();
          toast.success('Tipo excluído!');
        } catch (e) {
          toast.error(e.message);
        }
      },
    });
  }

  const totalSaldo = lista.reduce((s, c) => s + Number(c.saldoAtual), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Investimentos" subtitle="Carteira de investimentos e transações" />

      <div className="bg-primary/10 border border-primary/20 rounded-2xl px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-bold mb-1">Patrimônio Total</p>
          <p className="text-3xl font-bold text-text-primary font-display">R$ {brl(totalSaldo)}</p>
        </div>
        <TrendingUp className="w-10 h-10 text-primary opacity-30" />
      </div>

      {/* Seção: Gerenciar Tipos de Investimento */}
      <div className="bg-surface-medium border border-text-primary/5 rounded-2xl overflow-hidden animate-fade-in">
        <button
          type="button"
          onClick={() => setTiposAberto((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-highest/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold uppercase tracking-widest text-text-primary/50">
              Gerenciar Tipos de Investimento
            </span>
            <Badge variant="neutral">{tiposInv.length}</Badge>
          </div>
          {tiposAberto
            ? <ChevronUp className="w-4 h-4 text-text-primary/40" />
            : <ChevronDown className="w-4 h-4 text-text-primary/40" />}
        </button>

        {tiposAberto && (
          <div className="px-6 pb-6 space-y-4 border-t border-text-primary/5 pt-4">
            {/* Formulário de criar/editar tipo */}
            <form onSubmit={salvarTipo} className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <label className={labelCls}>
                  {tipoEditId ? 'Editar Tipo' : 'Novo Tipo'} *
                </label>
                <input
                  className={inputCls}
                  value={tipoForm.nome}
                  onChange={(e) => setTipoForm({ nome: e.target.value })}
                  required
                  placeholder="Ex: CDB, Tesouro Selic, FII"
                />
              </div>
              <button
                type="submit"
                disabled={salvandoTipo}
                className="bg-primary text-on-primary font-bold px-5 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2 shrink-0"
              >
                {salvandoTipo
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Plus className="w-4 h-4" />}
                {salvandoTipo ? 'Salvando...' : tipoEditId ? 'Salvar' : 'Criar'}
              </button>
              {tipoEditId && (
                <button
                  type="button"
                  onClick={() => { setTipoForm({ nome: '' }); setTipoEditId(null); }}
                  className="px-4 py-2.5 rounded-xl border border-text-primary/10 text-text-primary/60 hover:text-text-primary transition-colors shrink-0"
                >
                  Cancelar
                </button>
              )}
            </form>

            {/* Lista de tipos */}
            {tiposInv.length === 0 ? (
              <p className="text-sm text-text-primary/40 text-center py-4">
                Nenhum tipo cadastrado. Crie o primeiro acima.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {tiposInv.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
                      tipoEditId === t.id
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-surface border-text-primary/5 hover:border-text-primary/10'
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/10 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium text-text-primary text-sm flex-1 truncate">
                      {t.nome}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => editarTipo(t)}
                        aria-label={`Editar tipo ${t.nome}`}
                        className="text-text-primary/40 hover:text-primary p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deletarTipo(t.id)}
                        aria-label={`Excluir tipo ${t.nome}`}
                        className="text-text-primary/40 hover:text-error p-1.5 rounded-lg hover:bg-error/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!contaSel && (
        <>
          <form onSubmit={criar} className="bg-surface-medium border border-text-primary/5 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary/50">Nova Conta de Investimento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelCls}>Nome *</label>
                <input className={inputCls} value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required placeholder="Ex: Tesouro Direto" />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Tipo *</label>
                <select className={`${inputCls} appearance-none`} value={form.tipoId} onChange={(e) => setForm((f) => ({ ...f, tipoId: e.target.value }))} required>
                  <option value="">— Selecionar —</option>
                  {tiposInv.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" disabled={salvando} className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {salvando ? 'Criando...' : 'Criar'}
            </button>
          </form>

          {lista.length === 0 ? (
            <EmptyState icon={TrendingUp} title="Nenhuma conta de investimento" description="Crie sua primeira conta para registrar investimentos." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lista.map((c) => {
                const pct = totalSaldo > 0 ? (Number(c.saldoAtual) / totalSaldo) * 100 : 0;
                return (
                  <div
                    key={c.id}
                    onClick={() => abrir(c)}
                    className="bg-surface-medium border border-text-primary/5 rounded-2xl p-5 cursor-pointer hover:border-primary/30 hover:shadow-elevated transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-text-primary">{c.nome}</p>
                        {c.tipoNome && (
                          <Badge variant="info" className="mt-1">{c.tipoNome}</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-text-primary font-display">R$ {brl(c.saldoAtual)}</p>
                    <div className="space-y-1">
                      <div className="h-1.5 w-full bg-surface-highest rounded-full overflow-hidden">
                        <div className="h-full bg-primary/60 rounded-full transition-all duration-700" style={{ width: `${pct.toFixed(1)}%` }} />
                      </div>
                      <p className="text-[10px] text-text-primary/40 text-right">{pct.toFixed(1)}% do patrimônio</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {contaSel && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-text-primary font-display">{contaSel.nome}</h2>
              <p className="text-3xl font-bold text-primary mt-1 font-display">R$ {brl(contaSel.saldoAtual)}</p>
            </div>
            <button
              onClick={() => setContaSel(null)}
              aria-label="Fechar conta"
              className="p-2 text-text-primary/50 hover:text-text-primary hover:bg-surface-medium rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={registrar} className="bg-surface-medium border border-text-primary/5 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary/50">Nova Transação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className={labelCls}>Tipo *</label>
                <select className={`${inputCls} appearance-none`} value={tForm.tipoTransacao} onChange={(e) => setTForm((f) => ({ ...f, tipoTransacao: e.target.value, contaCorrenteOrigemId: '' }))}>
                  {TIPO_TRANSACAO.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Valor (R$) *</label>
                <input type="number" step="0.01" className={inputCls} value={tForm.valor} onChange={(e) => setTForm((f) => ({ ...f, valor: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Data *</label>
                <input type="date" className={inputCls} value={tForm.dataTransacao} onChange={(e) => setTForm((f) => ({ ...f, dataTransacao: e.target.value }))} required />
              </div>
              {tForm.tipoTransacao !== 'RENDIMENTO' && (
                <div className="space-y-1.5">
                  <label className={labelCls}>{tForm.tipoTransacao === 'APORTE' ? 'Conta (débito) *' : 'Conta (crédito) *'}</label>
                  <select required className={`${inputCls} appearance-none`} value={tForm.contaCorrenteOrigemId} onChange={(e) => setTForm((f) => ({ ...f, contaCorrenteOrigemId: e.target.value }))}>
                    <option value="">— Selecione —</option>
                    {ccs.map((c) => <option key={c.id} value={c.id}>{c.descricao} — {c.numeroConta}</option>)}
                  </select>
                </div>
              )}
            </div>
            <button type="submit" disabled={salvandoTransacao} className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
              {salvandoTransacao ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {salvandoTransacao ? 'Registrando...' : 'Registrar'}
            </button>
          </form>

          <DataTable
            columns={TRANSACAO_COLUMNS}
            data={transacoes}
            loading={false}
            aria-label="Histórico de transações"
            emptyState={<EmptyState icon={TrendingUp} title="Nenhuma transação" description="Registre seu primeiro aporte ou resgate." />}
          />
        </div>
      )}

      {confirmAction && <ConfirmModal {...confirmAction} onCancel={() => setConfirmAction(null)} />}
    </div>
  );
}
