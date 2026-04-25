import React, { useEffect, useState } from 'react';
import { FileText, Plus, Trash2, CheckCircle, Filter, RotateCcw, ChevronDown } from 'lucide-react';
import { contas as api, categorias as catApi, parceiros as parApi, contasCorrentes as ccApi } from '../lib/api';
import Toast from '../components/ui/Toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import FormField, { inputCls, labelCls } from '../components/ui/FormField';

const STATUS_BADGE = {
  PENDENTE: 'bg-yellow-500/20 text-yellow-400',
  ATRASADO: 'bg-red-500/20 text-red-400',
  PAGO: 'bg-green-500/20 text-green-400',
  RECEBIDO: 'bg-blue-500/20 text-blue-400',
};

const emptyForm = {
  descricao: '', valorOriginal: '', dataVencimento: '', tipo: 'PAGAR',
  categoriaId: '', parceiroId: '', quantidadeParcelas: 1, dividirValor: false,
  numeroDocumento: '', acrescimo: '', desconto: '',
};
const emptyBaixa = { contaCorrenteId: '', dataPagamento: '', juros: 0, multa: 0, acrescimo: 0, desconto: 0 };
const emptyFiltros = { tipo: '', numeroDocumento: '', vencimentoInicio: '', vencimentoFim: '', parceiroId: '', valorMin: '', valorMax: '', categoriaId: '' };

export default function ContasFinanceiras() {
  const [contas, setContas] = useState([]);
  const [cats, setCats] = useState([]);
  const [pars, setPars] = useState([]);
  const [ccs, setCcs] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [baixaId, setBaixaId] = useState(null);
  const [baixaForm, setBaixaForm] = useState(emptyBaixa);
  const [filtros, setFiltros] = useState(emptyFiltros);
  const [showFiltros, setShowFiltros] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvandoBaixa, setSalvandoBaixa] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    catApi.listar().then(setCats).catch(() => {});
    parApi.listar().then(setPars).catch(() => {});
    ccApi.listar().then(setCcs).catch(() => {});
    carregar(emptyFiltros);
  }, []);

  async function carregar(f = filtros) {
    try {
      const p = {};
      if (f.tipo) p.tipo = f.tipo;
      const res = await api.listar(p);
      let lista = res.content || [];

      if (f.numeroDocumento.trim())
        lista = lista.filter(c => c.numeroDocumento?.toLowerCase().includes(f.numeroDocumento.trim().toLowerCase()));
      if (f.vencimentoInicio)
        lista = lista.filter(c => c.dataVencimento >= f.vencimentoInicio);
      if (f.vencimentoFim)
        lista = lista.filter(c => c.dataVencimento <= f.vencimentoFim);
      if (f.parceiroId)
        lista = lista.filter(c => String(c.parceiroId) === String(f.parceiroId));
      if (f.valorMin)
        lista = lista.filter(c => Number(c.valorOriginal) >= Number(f.valorMin));
      if (f.valorMax)
        lista = lista.filter(c => Number(c.valorOriginal) <= Number(f.valorMax));
      if (f.categoriaId)
        lista = lista.filter(c => String(c.categoriaId) === String(f.categoriaId));

      setContas(lista);
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
  }

  function setTipo(tipo) {
    const novo = { ...filtros, tipo };
    setFiltros(novo);
    carregar(novo);
  }

  function aplicarFiltros() { carregar(filtros); }

  function limparFiltros() {
    setFiltros(emptyFiltros);
    carregar(emptyFiltros);
  }

  const valorLiquido = (parseFloat(form.valorOriginal) || 0)
    + (parseFloat(form.acrescimo) || 0)
    - (parseFloat(form.desconto) || 0);

  const parsFiltered = pars.filter(p =>
    form.tipo === 'PAGAR'
      ? p.tipo === 'FORNECEDOR' || p.tipo === 'AMBOS'
      : p.tipo === 'CLIENTE' || p.tipo === 'AMBOS'
  );

  function validateForm() {
    const errs = {};
    if (!form.descricao.trim()) errs.descricao = 'Descrição é obrigatória';
    if (!form.valorOriginal || parseFloat(form.valorOriginal) <= 0) errs.valorOriginal = 'Valor deve ser maior que zero';
    if (!form.dataVencimento) errs.dataVencimento = 'Data de vencimento é obrigatória';
    if (!form.categoriaId) errs.categoriaId = 'Selecione uma categoria';
    const parc = Number(form.quantidadeParcelas);
    if (parc < 1) errs.quantidadeParcelas = 'Mínimo 1 parcela';
    if (valorLiquido <= 0) errs.valorOriginal = 'Valor líquido deve ser maior que zero';
    return errs;
  }

  async function criar(e) {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSalvando(true);
    try {
      const dto = {
        ...form,
        valorOriginal: parseFloat(form.valorOriginal),
        categoriaId: Number(form.categoriaId),
        parceiroId: form.parceiroId ? Number(form.parceiroId) : null,
        quantidadeParcelas: Number(form.quantidadeParcelas),
        acrescimo: parseFloat(form.acrescimo) || 0,
        desconto: parseFloat(form.desconto) || 0,
      };
      await api.criar(dto);
      setForm(emptyForm);
      setToast({ message: 'Conta criada!', type: 'success' });
      await carregar();
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    } finally {
      setSalvando(false);
    }
  }

  function deletar(id) {
    setConfirmAction({
      title: 'Excluir conta',
      message: 'Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      onConfirm: async () => {
        setConfirmAction(null);
        try { await api.deletar(id); await carregar(); setToast({ message: 'Conta excluída!', type: 'success' }); }
        catch (e) { setToast({ message: e.message, type: 'error' }); }
      },
    });
  }

  function estornar(id) {
    setConfirmAction({
      title: 'Estornar quitação',
      message: 'Cancelar a quitação desta conta? O saldo da conta corrente será estornado.',
      confirmLabel: 'Estornar',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await api.estornar(id);
          await carregar();
          setToast({ message: 'Quitação cancelada! Saldo estornado.', type: 'success' });
        } catch (e) { setToast({ message: e.message, type: 'error' }); }
      },
    });
  }

  async function baixar(e) {
    e.preventDefault();
    setSalvandoBaixa(true);
    try {
      await api.baixar(baixaId, {
        ...baixaForm,
        contaCorrenteId: Number(baixaForm.contaCorrenteId),
        juros: parseFloat(baixaForm.juros || 0),
        multa: parseFloat(baixaForm.multa || 0),
        acrescimo: parseFloat(baixaForm.acrescimo || 0),
        desconto: parseFloat(baixaForm.desconto || 0),
      });
      setBaixaId(null); setBaixaForm(emptyBaixa);
      setToast({ message: 'Baixa registrada!', type: 'success' });
      await carregar();
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    } finally {
      setSalvandoBaixa(false);
    }
  }

  const setF = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-text-primary">Contas a Pagar / Receber</h1>
      </div>

      <div className="bg-surface-low rounded-2xl border border-text-primary/5 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowFiltros(v => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
        >
          <span className="text-sm font-bold uppercase tracking-widest text-text-primary/60 flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filtros
          </span>
          <ChevronDown className={`w-4 h-4 text-text-primary/40 transition-transform duration-200 ${showFiltros ? 'rotate-180' : ''}`} />
        </button>

        {showFiltros && (
          <div className="px-6 pb-6 space-y-4 border-t border-text-primary/5">
            <div className="flex items-center gap-3 pt-4">
              {['', 'PAGAR', 'RECEBER'].map(t => (
                <button key={t} onClick={() => setTipo(t)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filtros.tipo === t ? 'bg-primary text-on-primary' : 'border border-text-primary/10 text-text-primary/60 hover:text-text-primary'}`}>
                  {t || 'Todos'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField label="Nº Documento">
                <input className={inputCls} value={filtros.numeroDocumento} onChange={e => setFiltros(f => ({ ...f, numeroDocumento: e.target.value }))} placeholder="NF-001, Boleto..." />
              </FormField>

              <FormField label="Vencimento de">
                <input type="date" className={inputCls} value={filtros.vencimentoInicio} onChange={e => setFiltros(f => ({ ...f, vencimentoInicio: e.target.value }))} />
              </FormField>

              <FormField label="Vencimento até">
                <input type="date" className={inputCls} value={filtros.vencimentoFim} onChange={e => setFiltros(f => ({ ...f, vencimentoFim: e.target.value }))} />
              </FormField>

              <FormField label="Parceiro">
                <select className={inputCls} value={filtros.parceiroId} onChange={e => setFiltros(f => ({ ...f, parceiroId: e.target.value }))}>
                  <option value="">Todos</option>
                  {pars.map(p => <option key={p.id} value={p.id}>{p.razaoSocial}{p.nomeFantasia ? ` (${p.nomeFantasia})` : ''}</option>)}
                </select>
              </FormField>

              <FormField label="Valor de (R$)">
                <input type="number" step="0.01" min="0" className={inputCls} value={filtros.valorMin} onChange={e => setFiltros(f => ({ ...f, valorMin: e.target.value }))} placeholder="0,00" />
              </FormField>

              <FormField label="Valor até (R$)">
                <input type="number" step="0.01" min="0" className={inputCls} value={filtros.valorMax} onChange={e => setFiltros(f => ({ ...f, valorMax: e.target.value }))} placeholder="0,00" />
              </FormField>

              <FormField label="Categoria">
                <select className={inputCls} value={filtros.categoriaId} onChange={e => setFiltros(f => ({ ...f, categoriaId: e.target.value }))}>
                  <option value="">Todas</option>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.descricao}</option>)}
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

      {/* Formulário de criação */}
      <form onSubmit={criar} className="bg-surface-low rounded-2xl p-6 border border-text-primary/5 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary/60">Nova Conta</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          <FormField label="Nº Documento">
            <input className={inputCls} value={form.numeroDocumento} onChange={e => setF('numeroDocumento')(e.target.value)} placeholder="NF-001, Boleto..." />
          </FormField>

          <FormField label="Descrição" required error={errors.descricao}>
            <input className={inputCls} value={form.descricao} onChange={e => setF('descricao')(e.target.value)} required />
          </FormField>

          <FormField label="Tipo de Cobrança" required>
            <select className={inputCls} value={form.tipo} onChange={e => setF('tipo')(e.target.value)} required>
              <option value="PAGAR">A Pagar</option>
              <option value="RECEBER">A Receber</option>
            </select>
          </FormField>

          <FormField label="Categoria" required error={errors.categoriaId}>
            <select className={inputCls} value={form.categoriaId} onChange={e => setF('categoriaId')(e.target.value)} required>
              <option value="">Selecione</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.descricao}</option>)}
            </select>
          </FormField>

          <FormField label={form.tipo === 'PAGAR' ? 'Fornecedor' : 'Cliente'}>
            <select className={inputCls} value={form.parceiroId} onChange={e => setF('parceiroId')(e.target.value)}>
              <option value="">— Opcional —</option>
              {parsFiltered.map(p => <option key={p.id} value={p.id}>{p.razaoSocial}{p.nomeFantasia ? ` (${p.nomeFantasia})` : ''}</option>)}
            </select>
          </FormField>

          <FormField label="Vencimento" required error={errors.dataVencimento}>
            <input type="date" className={inputCls} value={form.dataVencimento} onChange={e => setF('dataVencimento')(e.target.value)} required />
          </FormField>

          <FormField label="Valor (R$)" required error={errors.valorOriginal}>
            <input type="number" step="0.01" min="0.01" className={inputCls} value={form.valorOriginal} onChange={e => setF('valorOriginal')(e.target.value)} required />
          </FormField>

          <FormField label="Acréscimo (R$)">
            <input type="number" step="0.01" min="0" className={inputCls} value={form.acrescimo} onChange={e => setF('acrescimo')(e.target.value)} placeholder="0,00" />
          </FormField>

          <FormField label="Desconto (R$)">
            <input type="number" step="0.01" min="0" className={inputCls} value={form.desconto} onChange={e => setF('desconto')(e.target.value)} placeholder="0,00" />
          </FormField>

          <FormField label="Valor Líquido (R$)">
            <input type="text" readOnly className={`${inputCls} bg-surface-highest text-text-primary/60 cursor-not-allowed`}
              value={valorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} />
          </FormField>

          <FormField label="Nº Parcelas" error={errors.quantidadeParcelas}>
            <input type="number" min="1" className={inputCls} value={form.quantidadeParcelas} onChange={e => setF('quantidadeParcelas')(e.target.value)} />
          </FormField>

          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" id="dividir" checked={form.dividirValor} onChange={e => setForm(f => ({ ...f, dividirValor: e.target.checked }))} className="w-4 h-4 rounded" />
            <label htmlFor="dividir" className="text-sm text-text-primary/60">Dividir valor entre parcelas</label>
          </div>
        </div>

        <button type="submit" disabled={salvando} className="bg-primary text-on-primary font-bold px-6 py-2 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
          <Plus className="w-4 h-4" />{salvando ? 'GRAVANDO...' : 'Criar'}
        </button>
      </form>

      {/* Modal Baixa */}
      {baixaId && (
        <form onSubmit={baixar} className="bg-surface-low rounded-2xl p-6 border border-primary/20 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Baixar Conta #{baixaId}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Conta Corrente" required>
              <select className={inputCls} value={baixaForm.contaCorrenteId} onChange={e => setBaixaForm(f => ({ ...f, contaCorrenteId: e.target.value }))} required>
                <option value="">Selecione</option>
                {ccs.map(c => <option key={c.id} value={c.id}>{c.descricao} — {c.numeroConta}</option>)}
              </select>
            </FormField>
            <FormField label="Data Pagamento" required>
              <input type="date" className={inputCls} value={baixaForm.dataPagamento} onChange={e => setBaixaForm(f => ({ ...f, dataPagamento: e.target.value }))} required />
            </FormField>
            {[['Juros', 'juros'], ['Multa', 'multa'], ['Acréscimo', 'acrescimo'], ['Desconto', 'desconto']].map(([lbl, key]) => (
              <FormField key={key} label={lbl}>
                <input type="number" step="0.01" min="0" className={inputCls} value={baixaForm[key]} onChange={e => setBaixaForm(f => ({ ...f, [key]: e.target.value }))} />
              </FormField>
            ))}
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={salvandoBaixa} className="bg-green-600 text-text-primary font-bold px-6 py-2 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />{salvandoBaixa ? 'GRAVANDO...' : 'Confirmar Baixa'}
            </button>
            <button type="button" onClick={() => { setBaixaId(null); setBaixaForm(emptyBaixa); }} className="px-6 py-2 rounded-xl border border-text-primary/10 text-text-primary/60 hover:text-text-primary">Cancelar</button>
          </div>
        </form>
      )}

      {/* Lista */}
      <div className="bg-surface-low rounded-2xl border border-text-primary/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-text-primary/5">
            <tr className="text-left text-text-primary/50 text-xs uppercase tracking-widest">
              <th className="px-6 py-4">Descrição</th>
              <th className="px-6 py-4">Valor</th>
              <th className="px-6 py-4">Vencimento</th>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 w-28">Ações</th>
            </tr>
          </thead>
          <tbody>
            {contas.map(c => (
              <tr key={c.id} className="border-b border-text-primary/5 hover:bg-white/[0.02]">
                <td className="px-6 py-4 text-text-primary">
                  {c.descricao}
                  {c.totalParcelas > 1 && <span className="ml-2 text-xs text-text-primary/50">({c.numeroParcela}/{c.totalParcelas})</span>}
                  {c.numeroDocumento && <div className="text-xs text-text-primary/50">{c.numeroDocumento}</div>}
                </td>
                <td className="px-6 py-4 text-text-primary font-medium">R$ {Number(c.valorOriginal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-6 py-4 text-text-primary/60">{c.dataVencimento}</td>
                <td className="px-6 py-4 text-text-primary/60">{c.tipo}</td>
                <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE[c.status]}`}>{c.status}</span></td>
                <td className="px-6 py-4 flex gap-2">
                  {(c.status === 'PENDENTE' || c.status === 'ATRASADO') && (
                    <button onClick={() => { setBaixaId(c.id); setBaixaForm(emptyBaixa); }} className="text-text-primary/60 hover:text-green-400" title="Baixar">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  {(c.status === 'PAGO' || c.status === 'RECEBIDO') && (
                    <button onClick={() => estornar(c.id)} className="text-text-primary/60 hover:text-orange-400" title="Estornar quitação">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => deletar(c.id)} className="text-text-primary/60 hover:text-red-400" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {contas.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-text-primary/50">Nenhuma conta encontrada</td></tr>}
          </tbody>
        </table>
      </div>

      {confirmAction && <ConfirmModal {...confirmAction} onCancel={() => setConfirmAction(null)} />}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
