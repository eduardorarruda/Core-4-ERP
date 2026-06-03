import React, { useEffect, useState } from 'react';
import { Plus, Loader2, X } from 'lucide-react';
import { categorias as catApi, parceiros as parApi } from '../../lib/api';
import FormField, { inputCls, FormSelect } from '../ui/FormField';
import ModalCriacaoRapida from '../ui/ModalCriacaoRapida';

export default function FormularioNovoLancamentoInline({ item, onConfirm, onCancel }) {
  const [form, setForm] = useState({
    descricao: item.ofxMemo || '',
    valor: String(Math.abs(item.ofxValor)),
    dataCompra: item.ofxData || '',
    categoriaId: '',
    parceiroId: '',
  });
  const [cats, setCats] = useState([]);
  const [pars, setPars] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [errors, setErrors] = useState({});
  const [criacaoRapida, setCriacaoRapida] = useState(null);

  useEffect(() => {
    catApi.listar().then(setCats).catch(() => {});
    parApi.listar().then(setPars).catch(() => {});
  }, []);

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target ? e.target.value : e }));

  function validar() {
    const errs = {};
    if (!form.descricao.trim()) errs.descricao = 'Obrigatório';
    if (!form.valor || parseFloat(form.valor) <= 0) errs.valor = 'Maior que zero';
    if (!form.dataCompra) errs.dataCompra = 'Obrigatório';
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
        valor: parseFloat(form.valor),
        dataCompra: form.dataCompra,
        categoriaId: Number(form.categoriaId),
        parceiroId: form.parceiroId ? Number(form.parceiroId) : null,
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="mt-2 p-4 bg-surface-medium border border-primary/20 rounded-xl space-y-4 animate-scale-in">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Novo lançamento no cartão</span>
          <button type="button" onClick={onCancel} className="p-1 rounded-lg text-text-primary/40 hover:text-error hover:bg-error/10 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <FormField label="Descrição" required error={errors.descricao}>
            <input className={inputCls} value={form.descricao} onChange={setF('descricao')} />
          </FormField>
          <FormField label="Valor (R$)" required error={errors.valor}>
            <input type="number" step="0.01" min="0.01" className={inputCls} value={form.valor} onChange={setF('valor')} />
          </FormField>
          <FormField label="Data da Compra" required error={errors.dataCompra}>
            <input type="date" className={inputCls} value={form.dataCompra} onChange={setF('dataCompra')} />
          </FormField>

          <FormField label="Categoria" required error={errors.categoriaId}>
            <div className="flex gap-1.5 items-center">
              <FormSelect error={errors.categoriaId} value={form.categoriaId} onChange={setF('categoriaId')} className="flex-1">
                <option value="">Selecione</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
              </FormSelect>
              <button
                type="button"
                title="Nova categoria"
                onClick={() => setCriacaoRapida('categoria')}
                className="p-2 rounded-lg text-text-primary/40 hover:text-primary hover:bg-primary/10 border border-text-primary/10 transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </FormField>

          <FormField label="Parceiro (opcional)">
            <div className="flex gap-1.5 items-center">
              <FormSelect value={form.parceiroId} onChange={setF('parceiroId')} className="flex-1">
                <option value="">— Nenhum —</option>
                {pars.map((p) => <option key={p.id} value={p.id}>{p.razaoSocial}{p.nomeFantasia ? ` (${p.nomeFantasia})` : ''}</option>)}
              </FormSelect>
              <button
                type="button"
                title="Novo parceiro"
                onClick={() => setCriacaoRapida('parceiro')}
                className="p-2 rounded-lg text-text-primary/40 hover:text-primary hover:bg-primary/10 border border-text-primary/10 transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
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

      {criacaoRapida && (
        <ModalCriacaoRapida
          tipo={criacaoRapida}
          onFechar={() => setCriacaoRapida(null)}
          onCriado={(nova) => {
            if (criacaoRapida === 'categoria') {
              setCats((prev) => [...prev, nova]);
              setForm((f) => ({ ...f, categoriaId: String(nova.id) }));
            } else {
              setPars((prev) => [...prev, nova]);
              setForm((f) => ({ ...f, parceiroId: String(nova.id) }));
            }
            setCriacaoRapida(null);
          }}
        />
      )}
    </>
  );
}
