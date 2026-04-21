import React, { useEffect, useState, useCallback } from 'react';
import { Users, Plus, Pencil, Trash2 } from 'lucide-react';
import { parceiros as api } from '../lib/api';
import Toast from '../components/ui/Toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import FormField, { inputCls, labelCls } from '../components/ui/FormField';

const TIPOS = ['CLIENTE', 'FORNECEDOR', 'AMBOS'];

const empty = {
  razaoSocial: '', nomeFantasia: '', cpfCnpj: '', tipo: '',
  logradouro: '', numero: '', complemento: '', cep: '',
  bairro: '', municipio: '', uf: '', telefone: '', email: '',
};

export default function Parceiros() {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try { setLista(await api.listar()); }
    catch (e) { setToast({ message: e.message, type: 'error' }); }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleCpfCnpjChange = useCallback(async (e) => {
    const val = e.target.value;
    setForm(f => ({ ...f, cpfCnpj: val }));
    const digits = val.replace(/\D/g, '');
    if (digits.length !== 14) return;

    setBuscandoCnpj(true);
    try {
      const data = await api.buscarCnpj(digits);
      setForm(f => ({
        ...f,
        razaoSocial:  data.razao_social  || f.razaoSocial,
        nomeFantasia: data.nome_fantasia  || f.nomeFantasia,
        logradouro:   data.logradouro    || f.logradouro,
        numero:       data.numero        || f.numero,
        complemento:  data.complemento  || f.complemento,
        cep:          data.cep           || f.cep,
        bairro:       data.bairro        || f.bairro,
        municipio:    data.municipio     || f.municipio,
        uf:           data.uf            || f.uf,
        telefone:     f.telefone || (data.ddd_telefone_1 ? data.ddd_telefone_1.trim() : ''),
        email:        f.email    || data.email || '',
      }));
    } catch (_) { /* CNPJ não encontrado — silencioso */ }
    finally { setBuscandoCnpj(false); }
  }, []);

  function validateForm() {
    const errs = {};
    if (!form.razaoSocial.trim()) errs.razaoSocial = 'Razão social é obrigatória';
    if (!form.tipo) errs.tipo = 'Selecione o tipo';
    if (form.cpfCnpj) {
      const digits = form.cpfCnpj.replace(/\D/g, '');
      if (digits.length !== 11 && digits.length !== 14) errs.cpfCnpj = 'CPF deve ter 11 dígitos ou CNPJ 14';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Formato de email inválido';
    return errs;
  }

  async function salvar(e) {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSalvando(true);
    try {
      if (editId) await api.atualizar(editId, form);
      else await api.criar(form);
      setForm(empty); setEditId(null);
      setToast({ message: editId ? 'Parceiro atualizado!' : 'Parceiro criado!', type: 'success' });
      await carregar();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setSalvando(false);
    }
  }

  function deletar(id) {
    setConfirmAction({
      title: 'Excluir parceiro',
      message: 'Tem certeza que deseja excluir este parceiro?',
      confirmLabel: 'Excluir',
      onConfirm: async () => {
        setConfirmAction(null);
        try { await api.deletar(id); await carregar(); setToast({ message: 'Parceiro excluído!', type: 'success' }); }
        catch (e) { setToast({ message: e.message, type: 'error' }); }
      },
    });
  }

  function editar(p) {
    setForm({
      razaoSocial: p.razaoSocial || '', nomeFantasia: p.nomeFantasia || '',
      cpfCnpj: p.cpfCnpj || '', tipo: p.tipo || '',
      logradouro: p.logradouro || '', numero: p.numero || '',
      complemento: p.complemento || '', cep: p.cep || '',
      bairro: p.bairro || '', municipio: p.municipio || '',
      uf: p.uf || '', telefone: p.telefone || '', email: p.email || '',
    });
    setEditId(p.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-white">Parceiros</h1>
      </div>

      <form onSubmit={salvar} className="bg-surface-low rounded-2xl p-6 border border-white/5 space-y-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">{editId ? 'Editar' : 'Novo'} Parceiro</h2>

        {/* Dados Gerais */}
        <div>
          <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold mb-3">Dados Gerais</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField label="CPF / CNPJ" error={errors.cpfCnpj}>
              <div className="relative">
                <input className={inputCls} value={form.cpfCnpj} onChange={handleCpfCnpjChange} placeholder="000.000.000-00" />
                {buscandoCnpj && <span className="absolute right-3 top-3 text-xs text-primary animate-pulse">Buscando...</span>}
              </div>
            </FormField>
            <FormField label="Razão Social" required error={errors.razaoSocial}>
              <input className={inputCls} value={form.razaoSocial} onChange={set('razaoSocial')} required />
            </FormField>
            <FormField label="Nome Fantasia">
              <input className={inputCls} value={form.nomeFantasia} onChange={set('nomeFantasia')} />
            </FormField>
            <FormField label="Tipo" required error={errors.tipo}>
              <select className={inputCls} value={form.tipo} onChange={set('tipo')} required>
                <option value="">Selecione</option>
                {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
              </select>
            </FormField>
          </div>
        </div>

        {/* Endereço */}
        <div>
          <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold mb-3">Endereço</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField label="CEP">
              <input className={inputCls} value={form.cep} onChange={set('cep')} placeholder="00000-000" maxLength={9} />
            </FormField>
            <FormField label="Logradouro">
              <input className={inputCls} value={form.logradouro} onChange={set('logradouro')} />
            </FormField>
            <FormField label="Número">
              <input className={inputCls} value={form.numero} onChange={set('numero')} />
            </FormField>
            <FormField label="Complemento">
              <input className={inputCls} value={form.complemento} onChange={set('complemento')} />
            </FormField>
            <FormField label="Bairro / Distrito">
              <input className={inputCls} value={form.bairro} onChange={set('bairro')} />
            </FormField>
            <FormField label="Município">
              <input className={inputCls} value={form.municipio} onChange={set('municipio')} />
            </FormField>
            <FormField label="UF">
              <input className={inputCls} value={form.uf} onChange={set('uf')} maxLength={2} placeholder="SP" />
            </FormField>
          </div>
        </div>

        {/* Contato */}
        <div>
          <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold mb-3">Contato</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Telefone">
              <input className={inputCls} value={form.telefone} onChange={set('telefone')} placeholder="(11) 99999-9999" />
            </FormField>
            <FormField label="Email" error={errors.email}>
              <input type="email" className={inputCls} value={form.email} onChange={set('email')} placeholder="email@empresa.com.br" />
            </FormField>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={salvando} className="bg-primary text-on-primary font-bold px-6 py-2 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            <Plus className="w-4 h-4" />{salvando ? 'GRAVANDO...' : editId ? 'Salvar' : 'Criar'}
          </button>
          {editId && (
            <button type="button" onClick={() => { setForm(empty); setEditId(null); }} className="px-6 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white">
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Lista */}
      <div className="bg-surface-low rounded-2xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-zinc-500">
              <th className="text-left px-6 py-3 text-xs font-bold uppercase tracking-widest">Razão Social</th>
              <th className="text-left px-6 py-3 text-xs font-bold uppercase tracking-widest">CPF/CNPJ</th>
              <th className="text-left px-6 py-3 text-xs font-bold uppercase tracking-widest">Tipo</th>
              <th className="text-left px-6 py-3 text-xs font-bold uppercase tracking-widest">Município/UF</th>
              <th className="text-left px-6 py-3 text-xs font-bold uppercase tracking-widest">Contato</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {lista.map(p => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-white">{p.razaoSocial}</p>
                  {p.nomeFantasia && <p className="text-xs text-zinc-500">{p.nomeFantasia}</p>}
                </td>
                <td className="px-6 py-4 text-zinc-400">{p.cpfCnpj || '—'}</td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">{p.tipo}</span>
                </td>
                <td className="px-6 py-4 text-zinc-400">{p.municipio ? `${p.municipio}/${p.uf}` : '—'}</td>
                <td className="px-6 py-4 text-zinc-400 text-xs">
                  {p.telefone && <div>{p.telefone}</div>}
                  {p.email && <div>{p.email}</div>}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => editar(p)} className="text-zinc-500 hover:text-primary"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => deletar(p.id)} className="text-zinc-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-zinc-500">Nenhum parceiro cadastrado</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {confirmAction && <ConfirmModal {...confirmAction} onCancel={() => setConfirmAction(null)} />}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
