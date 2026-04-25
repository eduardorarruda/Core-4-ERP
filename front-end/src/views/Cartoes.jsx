import React, { useEffect, useState } from 'react';
import { CreditCard, Plus, Trash2, X, Pencil, Lock } from 'lucide-react';
import { cartoes as api, contasCorrentes as ccApi, categorias as catApi } from '../lib/api';
import Toast from '../components/ui/Toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import FormField, { inputCls, inputSmCls, labelCls } from '../components/ui/FormField';

const emptyLancForm = { descricao: '', valor: '', dataCompra: '', mesFatura: '', anoFatura: '', categoriaId: '', quantidadeParcelas: 1 };

export default function Cartoes() {
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
  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    api.listar().then(setLista).catch(e => setToast({ message: e.message, type: 'error' }));
    ccApi.listar().then(setCcs).catch(() => {});
    catApi.listar().then(setCats).catch(() => {});
  }, []);

  async function recarregarLancamentos() {
    const l = await api.lancamentos.listar(cartaoSel.id);
    setLancamentos(l);
  }

  function validateCartaoForm() {
    const errs = {};
    if (!form.nome.trim()) errs.nome = 'Nome é obrigatório';
    if (!form.limite || parseFloat(form.limite) <= 0) errs.limite = 'Limite deve ser maior que zero';
    const dia1 = Number(form.diaFechamento);
    if (!dia1 || dia1 < 1 || dia1 > 31) errs.diaFechamento = 'Dia deve ser entre 1 e 31';
    const dia2 = Number(form.diaVencimento);
    if (!dia2 || dia2 < 1 || dia2 > 31) errs.diaVencimento = 'Dia deve ser entre 1 e 31';
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
      const l = await api.listar(); setLista(l);
      setToast({ message: 'Cartão criado!', type: 'success' });
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
    finally { setSalvando(false); }
  }

  function deletarCartao(id) {
    setConfirmAction({
      title: 'Excluir cartão',
      message: 'Tem certeza que deseja excluir este cartão? Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      onConfirm: async () => {
        setConfirmAction(null);
        try { await api.deletar(id); api.listar().then(setLista); setToast({ message: 'Cartão excluído!', type: 'success' }); }
        catch (e) { setToast({ message: e.message, type: 'error' }); }
      },
    });
  }

  async function abrirCartao(c) {
    setCartaoSel(c);
    setEditLancId(null);
    setErrors({});
    const l = await api.lancamentos.listar(c.id);
    setLancamentos(l);
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
      setToast({ message: 'Lançamento criado!', type: 'success' });
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
    finally { setSalvandoLanc(false); }
  }

  function iniciarEdicao(l) {
    setEditLancId(l.id);
    setEditForm({ descricao: l.descricao, valor: String(l.valor), dataCompra: l.dataCompra, mesFatura: String(l.mesFatura), anoFatura: String(l.anoFatura), categoriaId: String(l.categoriaId) });
  }

  async function salvarEdicao(e) {
    e.preventDefault();
    setSalvandoEdit(true);
    try {
      await api.lancamentos.atualizar(cartaoSel.id, editLancId, { ...editForm, valor: parseFloat(editForm.valor), mesFatura: Number(editForm.mesFatura), anoFatura: Number(editForm.anoFatura), categoriaId: Number(editForm.categoriaId) });
      await recarregarLancamentos();
      setEditLancId(null);
      setToast({ message: 'Lançamento atualizado!', type: 'success' });
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
    finally { setSalvandoEdit(false); }
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
          setToast({ message: 'Lançamento excluído!', type: 'success' });
        } catch (e) { setToast({ message: e.message, type: 'error' }); }
      },
    });
  }

  async function fecharFatura(e) {
    e.preventDefault();
    setSalvandoFatura(true);
    try {
      await api.fecharFatura(cartaoSel.id, { mes: Number(fechForm.mes), ano: Number(fechForm.ano) });
      await recarregarLancamentos();
      setToast({ message: 'Fatura fechada! Conta a pagar gerada.', type: 'success' });
      setFechForm({ mes: '', ano: '' });
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
    finally { setSalvandoFatura(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-text-primary">Cartões de Crédito</h1>
      </div>

      {/* Formulário de novo cartão */}
      {!cartaoSel && (
        <form onSubmit={criarCartao} className="bg-surface-low rounded-2xl p-6 border border-text-primary/5 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary/60">Novo Cartão</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[['Nome', 'nome', 'text'], ['Limite (R$)', 'limite', 'number'], ['Dia Fechamento', 'diaFechamento', 'number'], ['Dia Vencimento', 'diaVencimento', 'number']].map(([lbl, key, type]) => (
              <FormField key={key} label={lbl} error={errors[key]}>
                <input type={type} step={type === 'number' && key === 'limite' ? '0.01' : '1'} min={key.includes('Dia') ? 1 : undefined} max={key.includes('Dia') ? 31 : undefined} className={inputCls} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required />
              </FormField>
            ))}
            <FormField label="Conta Corrente" required error={errors.contaCorrenteId}>
              <select className={inputCls} value={form.contaCorrenteId} onChange={e => setForm(f => ({ ...f, contaCorrenteId: e.target.value }))} required>
                <option value="">Selecione</option>
                {ccs.map(c => <option key={c.id} value={c.id}>{c.descricao} — {c.numeroConta}</option>)}
              </select>
            </FormField>
          </div>
          <button type="submit" disabled={salvando} className="bg-primary text-on-primary font-bold px-6 py-2 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            <Plus className="w-4 h-4" />{salvando ? 'GRAVANDO...' : 'Criar'}
          </button>
        </form>
      )}

      {/* Lista de cartões */}
      {!cartaoSel && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lista.map(c => (
            <div key={c.id} onClick={() => abrirCartao(c)} className="bg-surface-low rounded-2xl p-6 border border-text-primary/5 cursor-pointer hover:border-primary/30 transition-all space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-text-primary">{c.nome}</p>
                  <p className="text-xs text-text-primary/50">Fecha dia {c.diaFechamento} · Vence dia {c.diaVencimento}</p>
                  <p className="text-xs text-text-primary/40">{c.contaCorrenteDescricao}</p>
                </div>
                <button onClick={ev => { ev.stopPropagation(); deletarCartao(c.id); }} className="text-text-primary/50 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-text-primary/50"><span>Limite</span><span>R$ {Number(c.limite).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                <div className="w-full bg-surface rounded-full h-1.5">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min(100, (Number(c.limiteUsado) / Number(c.limite)) * 100)}%` }} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-red-400">Usado: R$ {Number(c.limiteUsado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <span className="text-green-400">Livre: R$ {Number(c.limiteLivre).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          ))}
          {lista.length === 0 && <p className="text-text-primary/50 col-span-3 text-center py-8">Nenhum cartão cadastrado</p>}
        </div>
      )}

      {/* Detalhe do cartão selecionado */}
      {cartaoSel && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text-primary">{cartaoSel.nome}</h2>
            <button onClick={() => setCartaoSel(null)} className="text-text-primary/60 hover:text-text-primary"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Novo lançamento */}
            <form onSubmit={criarLancamento} className="bg-surface-low rounded-2xl p-6 border border-text-primary/5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary/60">Novo Lançamento</h3>
              <div className="space-y-3">
                {[['Descrição', 'descricao', 'text'], ['Valor (R$)', 'valor', 'number'], ['Data Compra', 'dataCompra', 'date'], ['Mês Fatura (1-12)', 'mesFatura', 'number'], ['Ano Fatura', 'anoFatura', 'number'], ['Nº Parcelas', 'quantidadeParcelas', 'number']].map(([lbl, key, type]) => (
                  <FormField key={key} label={lbl} error={errors[key]}>
                    <input type={type} step={key === 'valor' ? '0.01' : '1'} className={inputSmCls} value={lancForm[key]} onChange={e => setLancForm(f => ({ ...f, [key]: e.target.value }))} required />
                  </FormField>
                ))}
                <FormField label="Categoria" required error={errors.categoriaId}>
                  <select className={inputSmCls} value={lancForm.categoriaId} onChange={e => setLancForm(f => ({ ...f, categoriaId: e.target.value }))} required>
                    <option value="">Selecione</option>{cats.map(c => <option key={c.id} value={c.id}>{c.descricao}</option>)}
                  </select>
                </FormField>
              </div>
              <button type="submit" disabled={salvandoLanc} className="bg-primary text-on-primary font-bold px-4 py-2 rounded-xl hover:opacity-90 disabled:opacity-50 text-sm flex items-center gap-2">
                <Plus className="w-3 h-3" />{salvandoLanc ? 'GRAVANDO...' : 'Lançar'}
              </button>
            </form>

            {/* Fechar fatura */}
            <form onSubmit={fecharFatura} className="bg-surface-low rounded-2xl p-6 border border-text-primary/5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary/60">Fechar Fatura</h3>
              <div className="space-y-3">
                {[['Mês (1-12)', 'mes'], ['Ano', 'ano']].map(([lbl, key]) => (
                  <FormField key={key} label={lbl}>
                    <input type="number" className={inputSmCls} value={fechForm[key]} onChange={e => setFechForm(f => ({ ...f, [key]: e.target.value }))} required />
                  </FormField>
                ))}
              </div>
              <button type="submit" disabled={salvandoFatura} className="bg-orange-600 text-text-primary font-bold px-4 py-2 rounded-xl hover:opacity-90 disabled:opacity-50 text-sm">
                {salvandoFatura ? 'GRAVANDO...' : 'Fechar Fatura'}
              </button>
            </form>
          </div>

          {/* Lançamentos */}
          <div className="bg-surface-low rounded-2xl border border-text-primary/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-text-primary/5">
                <tr className="text-left text-text-primary/50 text-xs uppercase tracking-widest">
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Fatura</th>
                  <th className="px-6 py-4">Parcela</th>
                  <th className="px-6 py-4 w-24">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lancamentos.map(l => (
                  editLancId === l.id ? (
                    <tr key={l.id} className="border-b border-text-primary/5 bg-white/[0.03]">
                      <td colSpan={5} className="px-6 py-4">
                        <form onSubmit={salvarEdicao} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <FormField label="Descrição">
                            <input className={inputSmCls} value={editForm.descricao} onChange={e => setEditForm(f => ({ ...f, descricao: e.target.value }))} required />
                          </FormField>
                          <FormField label="Valor (R$)">
                            <input type="number" step="0.01" className={inputSmCls} value={editForm.valor} onChange={e => setEditForm(f => ({ ...f, valor: e.target.value }))} required />
                          </FormField>
                          <FormField label="Data Compra">
                            <input type="date" className={inputSmCls} value={editForm.dataCompra} onChange={e => setEditForm(f => ({ ...f, dataCompra: e.target.value }))} required />
                          </FormField>
                          <FormField label="Mês Fatura">
                            <input type="number" min="1" max="12" className={inputSmCls} value={editForm.mesFatura} onChange={e => setEditForm(f => ({ ...f, mesFatura: e.target.value }))} required />
                          </FormField>
                          <FormField label="Ano Fatura">
                            <input type="number" className={inputSmCls} value={editForm.anoFatura} onChange={e => setEditForm(f => ({ ...f, anoFatura: e.target.value }))} required />
                          </FormField>
                          <FormField label="Categoria">
                            <select className={inputSmCls} value={editForm.categoriaId} onChange={e => setEditForm(f => ({ ...f, categoriaId: e.target.value }))} required>
                              <option value="">Selecione</option>
                              {cats.map(c => <option key={c.id} value={c.id}>{c.descricao}</option>)}
                            </select>
                          </FormField>
                          <div className="flex items-end gap-2 col-span-2">
                            <button type="submit" disabled={salvandoEdit} className="bg-primary text-on-primary font-bold px-4 py-2 rounded-xl hover:opacity-90 disabled:opacity-50 text-sm">
                              {salvandoEdit ? 'SALVANDO...' : 'Salvar'}
                            </button>
                            <button type="button" onClick={() => setEditLancId(null)} className="px-4 py-2 rounded-xl border border-text-primary/10 text-text-primary/60 hover:text-text-primary text-sm">
                              Cancelar
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  ) : (
                    <tr key={l.id} className="border-b border-text-primary/5 hover:bg-white/[0.02]">
                      <td className="px-6 py-4 text-text-primary">
                        {l.descricao}
                        {l.faturaFechada && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                            <Lock className="w-2.5 h-2.5" /> Fechada
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-text-primary font-medium">R$ {Number(l.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-text-primary/60">{String(l.mesFatura).padStart(2, '0')}/{l.anoFatura}</td>
                      <td className="px-6 py-4 text-text-primary/60">{l.numeroParcela}/{l.totalParcelas}</td>
                      <td className="px-6 py-4 flex gap-2">
                        <button
                          onClick={() => iniciarEdicao(l)}
                          disabled={l.faturaFechada}
                          title={l.faturaFechada ? 'Fatura fechada' : 'Editar'}
                          className="text-text-primary/50 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deletarLancamento(l.id)}
                          disabled={l.faturaFechada}
                          title={l.faturaFechada ? 'Fatura fechada' : 'Excluir'}
                          className="text-text-primary/50 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                ))}
                {lancamentos.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-text-primary/50">Nenhum lançamento</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmAction && <ConfirmModal {...confirmAction} onCancel={() => setConfirmAction(null)} />}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
