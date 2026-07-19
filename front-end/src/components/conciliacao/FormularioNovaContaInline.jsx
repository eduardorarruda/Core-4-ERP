import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { categorias as catApi, parceiros as parApi } from '../../lib/api';
import FormField, { inputCls, FormSelect } from '../ui/FormField';
import Button from '../ui/Button';
import ModalCriacaoRapida from '../ui/ModalCriacaoRapida';

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
  const [criacaoRapida, setCriacaoRapida] = useState(null);

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
    if (!form.parceiroId) errs.parceiroId = 'Obrigatório';
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
        parceiroId: Number(form.parceiroId),
      });
    } finally {
      setSalvando(false);
    }
  }

  const parsFiltered = pars.filter((p) =>
    form.tipo === 'PAGAR' ? p.tipo === 'FORNECEDOR' || p.tipo === 'AMBOS' : p.tipo === 'CLIENTE' || p.tipo === 'AMBOS'
  );

  return (
    <>
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
            <FormSelect value={form.tipo} onChange={setF('tipo')}>
              <option value="PAGAR">A Pagar</option>
              <option value="RECEBER">A Receber</option>
            </FormSelect>
          </FormField>
          <FormField label="Valor (R$)" required error={errors.valorOriginal}>
            <input type="number" step="0.01" min="0.01" className={inputCls} value={form.valorOriginal} onChange={setF('valorOriginal')} />
          </FormField>
          <FormField label="Vencimento" required error={errors.dataVencimento}>
            <input type="date" className={inputCls} value={form.dataVencimento} onChange={setF('dataVencimento')} />
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

          <FormField label={form.tipo === 'PAGAR' ? 'Fornecedor' : 'Cliente'} required error={errors.parceiroId}>
            <div className="flex gap-1.5 items-center">
              <FormSelect error={errors.parceiroId} value={form.parceiroId} onChange={setF('parceiroId')} className="flex-1">
                <option value="">— Selecionar —</option>
                {parsFiltered.map((p) => <option key={p.id} value={p.id}>{p.razaoSocial}{p.nomeFantasia ? ` (${p.nomeFantasia})` : ''}</option>)}
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

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          <Button type="submit" loading={salvando} leftIcon={<Plus className="w-4 h-4" />} className="w-full sm:w-auto">
            {salvando ? 'Criando...' : 'Criar e Vincular'}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} className="w-full sm:w-auto">
            Cancelar
          </Button>
        </div>
      </form>

      {criacaoRapida && (
        <ModalCriacaoRapida
          tipo={criacaoRapida}
          onFechar={() => setCriacaoRapida(null)}
          onCriado={(novo) => {
            if (criacaoRapida === 'categoria') {
              setCats((prev) => [...prev, novo]);
              setForm((f) => ({ ...f, categoriaId: String(novo.id) }));
            } else {
              setPars((prev) => [...prev, novo]);
              setForm((f) => ({ ...f, parceiroId: String(novo.id) }));
            }
            setCriacaoRapida(null);
          }}
        />
      )}
    </>
  );
}
