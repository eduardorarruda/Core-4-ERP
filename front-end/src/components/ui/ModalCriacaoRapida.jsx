import React, { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { categorias as catApi, parceiros as parApi } from '../../lib/api';
import FormField, { inputCls } from './FormField';
import IconDropdown from './IconDropdown';

const TIPOS_PARCEIRO = [
  { value: 'FORNECEDOR', label: 'Fornecedor' },
  { value: 'CLIENTE',    label: 'Cliente' },
  { value: 'AMBOS',      label: 'Ambos' },
];

export default function ModalCriacaoRapida({ tipo, onCriado, onFechar }) {
  const isCat = tipo === 'categoria';
  const [form, setForm] = useState({
    descricao: '',
    icone: '',
    nomeFantasia: '',
    razaoSocial: '',
    cpfCnpj: '',
    tipoParceiro: 'FORNECEDOR',
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function salvar(e) {
    e.preventDefault();
    setErro('');

    if (isCat) {
      if (!form.descricao.trim()) { setErro('Descrição obrigatória'); return; }
    } else {
      if (!form.razaoSocial.trim() && !form.nomeFantasia.trim()) {
        setErro('Informe ao menos o nome fantasia ou razão social');
        return;
      }
      if (!form.cpfCnpj.trim()) { setErro('CPF/CNPJ é obrigatório'); return; }
      const digits = form.cpfCnpj.replace(/\D/g, '');
      if (digits.length !== 11 && digits.length !== 14) {
        setErro('CPF deve ter 11 dígitos ou CNPJ 14 dígitos');
        return;
      }
    }

    setSalvando(true);
    try {
      let criado;
      if (isCat) {
        criado = await catApi.criar({
          descricao: form.descricao.trim(),
          icone: form.icone || '',
        });
      } else {
        criado = await parApi.criar({
          nomeFantasia: form.nomeFantasia.trim() || null,
          razaoSocial: form.razaoSocial.trim() || form.nomeFantasia.trim(),
          cpfCnpj: form.cpfCnpj.replace(/\D/g, ''),
          tipo: form.tipoParceiro,
        });
      }
      onCriado(criado);
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{ background: 'rgba(20,20,30,.97)', border: '1px solid rgba(250,250,250,.1)', boxShadow: '0 24px 64px rgba(0,0,0,.5)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary/70">
            {isCat ? 'Nova Categoria' : 'Novo Parceiro'}
          </h2>
          <button onClick={onFechar} className="p-1.5 rounded-lg text-text-primary/40 hover:text-error hover:bg-error/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={salvar} className="space-y-3">
          {isCat ? (
            <>
              <FormField label="Descrição" required>
                <input
                  className={inputCls}
                  placeholder="Ex: Alimentação"
                  value={form.descricao}
                  onChange={setF('descricao')}
                  autoFocus
                />
              </FormField>
              <FormField label="Ícone">
                <IconDropdown value={form.icone} onChange={(v) => setForm((f) => ({ ...f, icone: v }))} />
              </FormField>
            </>
          ) : (
            <>
              <FormField label="Nome Fantasia">
                <input
                  className={inputCls}
                  placeholder="Ex: Supermercado Bom Preço"
                  value={form.nomeFantasia}
                  onChange={setF('nomeFantasia')}
                  autoFocus
                />
              </FormField>
              <FormField label="Razão Social">
                <input
                  className={inputCls}
                  placeholder="Ex: Comércio Ltda"
                  value={form.razaoSocial}
                  onChange={setF('razaoSocial')}
                />
              </FormField>
              <FormField label="CPF / CNPJ" required>
                <input
                  className={inputCls}
                  placeholder="000.000.000-00 ou CNPJ"
                  value={form.cpfCnpj}
                  onChange={setF('cpfCnpj')}
                />
              </FormField>
              <FormField label="Tipo" required>
                <select className={`${inputCls} appearance-none`} value={form.tipoParceiro} onChange={setF('tipoParceiro')}>
                  {TIPOS_PARCEIRO.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </FormField>
            </>
          )}

          {erro && <p className="text-xs text-error">{erro}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={salvando}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {salvando ? 'Criando...' : 'Criar'}
            </button>
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-2.5 rounded-xl border border-text-primary/10 text-text-primary/60 hover:text-text-primary transition-colors text-xs"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
