import React, { useEffect, useState } from 'react';
import { TrendingUp, Plus, X, Loader2 } from 'lucide-react';
import { investimentos as api, contasCorrentes as ccApi } from '../lib/api';
import { inputCls, labelCls } from '../components/ui/FormField';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import { brl, formatDate } from '../lib/formatters';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';

const TIPOS = ['RENDA_FIXA', 'RENDA_VARIAVEL', 'FUNDOS', 'CRIPTO', 'OUTROS'];
const TIPO_TRANSACAO = ['APORTE', 'RESGATE', 'RENDIMENTO'];

const TIPO_LABEL = { RENDA_FIXA: 'Renda Fixa', RENDA_VARIAVEL: 'Renda Variável', FUNDOS: 'Fundos', CRIPTO: 'Cripto', OUTROS: 'Outros' };
const TIPO_VARIANT = { RENDA_FIXA: 'info', RENDA_VARIAVEL: 'success', FUNDOS: 'warning', CRIPTO: 'neutral', OUTROS: 'neutral' };
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
  const [form, setForm] = useState({ nome: '', tipo: 'RENDA_FIXA' });
  const [contaSel, setContaSel] = useState(null);
  const [transacoes, setTransacoes] = useState([]);
  const [tForm, setTForm] = useState({ tipoTransacao: 'APORTE', valor: '', dataTransacao: '', contaCorrenteOrigemId: '' });
  const [salvando, setSalvando] = useState(false);
  const [salvandoTransacao, setSalvandoTransacao] = useState(false);

  useEffect(() => {
    api.listar().then(setLista).catch((e) => toast.error(e.message));
    ccApi.listar().then(setCcs).catch(() => {});
  }, []);

  async function criar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.criar(form);
      const l = await api.listar();
      setLista(l);
      setForm({ nome: '', tipo: 'RENDA_FIXA' });
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
                <select className={`${inputCls} appearance-none`} value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
                  {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
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
                        <Badge variant={TIPO_VARIANT[c.tipo] ?? 'neutral'} className="mt-1">
                          {TIPO_LABEL[c.tipo] ?? c.tipo}
                        </Badge>
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
    </div>
  );
}
