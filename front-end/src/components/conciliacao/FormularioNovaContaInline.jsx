import React, { useEffect, useState } from 'react';
import { Plus, Loader2, X } from 'lucide-react';
import { categorias as catApi, parceiros as parApi } from '../../lib/api';
import FormField, { inputCls } from '../ui/FormField';

export default function FormularioNovaContaInline({ item, onConfirm, onCancel }) {
  const tipoSugerido = item.ofxValor < 0 ? 'PAGAR' : 'RECEBER';
  const [form, setForm] = useState({
    descricao: item.ofxMemo || '',
    valorOriginal: String(Math.abs(item.ofxValor)),
    dataVencimento: item.ofxData || '',
    tipo: tipoSugerido,
    categoriaId: '',
    parceiroId: '',
  });
  const [cats, setCats] = useState([]);
  const [pars, setPars] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    catApi.listar().then(setCats).catch(() => {});
    parApi.listar().then(setPars).catch(() => {});
  }, []);

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target ? e.target.value : e }));

  function validar() {
    const errs = {};
    if (!form.descricao.trim()) errs.descricao = 'Obrigatório';
    if (!form.valorOriginal || parseFloat(form.valorOriginal) <= 0) errs.valorOriginal = 'Maior que zero';
    if (!form.dataVencimento) errs.dataVencimento = 'Obrigatório';
    if (!form.categoriaId) errs.categoriaId = 'Obrigatório';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validar();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSalvando(true);
    try {
      await onConfirm({
        descricao: form.descricao,
        valorOriginal: parseFloat(form.valorOriginal),
        dataVencimento: form.dataVencimento,
        tipo: form.tipo,
        categoriaId: Number(form.categoriaId),
        parceiroId: form.parceiroId ? Number(form.parceiroId) : null,
      });
    } finally {
      setSalvando(false);
    }
  }

  const parsFiltered = pars.filter((p) =>
    form.tipo === 'PAGAR' ? p.tipo === 'FORNECEDOR' || p.tipo === 'AMBOS' : p.tipo === 'CLIENTE' || p.tipo === 'AMBOS'
  );

  return (
    <form onSubmit={handleSubmit} className="mt-2 p-4 bg-surface-medium border border-primary/20 rounded-xl space-y-4 animate-scale-in">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold uppercase tracking-widest text-primary">Novo lançamento</span>
        <button type="button" onClick={onCancel} className="p-1 rounded-lg text-text-primary/40 hover:text-error hover:bg-error/10 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <FormField label="Descrição" required error={errors.descricao}>
          <input className={inputCls} value={form.descricao} onChange={setF('descricao')} />
        </FormField>
        <FormField label="Tipo" required>
          <select className={`${inputCls} appearance-none`} value={form.tipo} onChange={setF('tipo')}>
            <option value="PAGAR">A Pagar</option>
            <option value="RECEBER">A Receber</option>
          </select>
        </FormField>
        <FormField label="Valor (R$)" required error={errors.valorOriginal}>
          <input type="number" step="0.01" min="0.01" className={inputCls} value={form.valorOriginal} onChange={setF('valorOriginal')} />
        </FormField>
        <FormField label="Vencimento" required error={errors.dataVencimento}>
          <input type="date" className={inputCls} value={form.dataVencimento} onChange={setF('dataVencimento')} />
        </FormField>
        <FormField label="Categoria" required error={errors.categoriaId}>
          <select className={`${inputCls} appearance-none`} value={form.categoriaId} onChange={setF('categoriaId')}>
            <option value="">Selecione</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
          </select>
        </FormField>
        <FormField label={form.tipo === 'PAGAR' ? 'Fornecedor' : 'Cliente'}>
          <select className={`${inputCls} appearance-none`} value={form.parceiroId} onChange={setF('parceiroId')}>
            <option value="">— Opcional —</option>
            {parsFiltered.map((p) => <option key={p.id} value={p.id}>{p.razaoSocial}{p.nomeFantasia ? ` (${p.nomeFantasia})` : ''}</option>)}
          </select>
        </FormField>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={salvando} className="flex items-center gap-2 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity">
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {salvando ? 'Criando...' : 'Criar e Vincular'}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl border border-text-primary/10 text-text-primary/60 hover:text-text-primary transition-colors text-xs font-bold uppercase tracking-widest">
          Cancelar
        </button>
      </div>
    </form>
  );
}
