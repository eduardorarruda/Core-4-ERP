import React, { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { categorias as catApi, parceiros as parApi } from '../../lib/api';
import FormField, { inputCls } from './FormField';

export default function ModalCriacaoRapida({ tipo, onCriado, onFechar }) {
  const isCat = tipo === 'categoria';
  const [form, setForm] = useState({ descricao: '', nomeFantasia: '', razaoSocial: '' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      let criado;
      if (isCat) {
        if (!form.descricao.trim()) { setErro('Descrição obrigatória'); return; }
        criado = await catApi.criar({ descricao: form.descricao.trim(), icone: '' });
      } else {
        if (!form.nomeFantasia.trim() && !form.razaoSocial.trim()) {
          setErro('Informe ao menos o nome fantasia ou razão social');
          return;
        }
        criado = await parApi.criar({
          nomeFantasia: form.nomeFantasia.trim() || null,
          razaoSocial: form.razaoSocial.trim() || form.nomeFantasia.trim(),
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
            <FormField label="Descrição" required>
              <input
                className={inputCls}
                placeholder="Ex: Alimentação"
                value={form.descricao}
                onChange={setF('descricao')}
                autoFocus
              />
            </FormField>
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
