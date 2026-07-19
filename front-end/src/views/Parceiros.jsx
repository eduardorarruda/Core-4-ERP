import React, { useEffect, useState, useCallback } from 'react';
import { Users, Plus, Pencil, Trash2, Loader2, Search, CheckCircle2 } from 'lucide-react';
import { parceiros as api } from '../lib/api';
import ConfirmModal from '../components/ui/ConfirmModal';
import FormField, { inputCls } from '../components/ui/FormField';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import DataTable from '../components/ui/DataTable';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../hooks/useToast';
import { cn } from '../lib/utils';
import PermissaoGuard from '../components/ui/PermissaoGuard';

const TIPOS = ['CLIENTE', 'FORNECEDOR', 'AMBOS'];
const TIPO_VARIANT = { CLIENTE: 'info', FORNECEDOR: 'warning', AMBOS: 'success' };

const empty = { razaoSocial: '', nomeFantasia: '', cpfCnpj: '', tipo: '', logradouro: '', numero: '', complemento: '', cep: '', bairro: '', municipio: '', uf: '', telefone: '', email: '' };

const TABS_FORM = ['Dados Gerais', 'Endereço', 'Contato'];

// A qual aba pertence cada campo validado — usado para levar o usuário até o primeiro erro.
const FIELD_TAB = { cpfCnpj: 'Dados Gerais', razaoSocial: 'Dados Gerais', tipo: 'Dados Gerais', email: 'Contato' };

function getInitials(nome) {
  if (!nome) return '?';
  return nome.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

export default function Parceiros() {
  const toast = useToast();
  const [lista, setLista] = useState([]);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [activeTab, setActiveTab] = useState('Dados Gerais');
  const [salvando, setSalvando] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [errors, setErrors] = useState({});
  const [autoPreenchido, setAutoPreenchido] = useState(false);
  const [camposAuto, setCamposAuto] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    try { setLista(await api.listar()); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  // Abas que contêm ao menos um campo com erro — usado para o indicador visual nas abas.
  const tabsComErro = new Set(Object.keys(errors).map((f) => FIELD_TAB[f]).filter(Boolean));

  // Fecha o formulário e limpa o estado de edição.
  function fecharForm() {
    setForm(empty);
    setEditId(null);
    setErrors({});
    setAutoPreenchido(false);
    setCamposAuto([]);
    setShowForm(false);
  }

  // Alterna o formulário; ao fechar com dados digitados, confirma o descarte.
  function toggleForm() {
    if (showForm) {
      const temDados = editId || Object.values(form).some((v) => String(v ?? '').trim());
      if (temDados) {
        setConfirmAction({
          title: 'Descartar alterações',
          message: 'Você tem dados que ainda não foram salvos. Deseja descartá-los e fechar o formulário?',
          confirmLabel: 'Descartar',
          onConfirm: () => { setConfirmAction(null); fecharForm(); },
        });
        return;
      }
      fecharForm();
    } else {
      setForm(empty);
      setEditId(null);
      setErrors({});
      setActiveTab('Dados Gerais');
      setShowForm(true);
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const autoCls = (campo) => camposAuto.includes(campo) ? `${inputCls} ring-1 ring-primary/40` : inputCls;

  const handleCpfCnpjChange = useCallback(async (e) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, cpfCnpj: val }));
    const digits = val.replace(/\D/g, '');
    if (digits.length !== 14) return;
    setBuscandoCnpj(true);
    try {
      const data = await api.buscarCnpj(digits);
      const auto = [];
      if (data.razao_social) auto.push('razaoSocial');
      if (data.nome_fantasia) auto.push('nomeFantasia');
      if (data.logradouro) auto.push('logradouro');
      if (data.numero) auto.push('numero');
      if (data.cep) auto.push('cep');
      if (data.bairro) auto.push('bairro');
      if (data.municipio) auto.push('municipio');
      if (data.uf) auto.push('uf');
      setForm((f) => ({
        ...f,
        razaoSocial: data.razao_social || f.razaoSocial,
        nomeFantasia: data.nome_fantasia || f.nomeFantasia,
        logradouro: data.logradouro || f.logradouro,
        numero: data.numero || f.numero,
        complemento: data.complemento || f.complemento,
        cep: data.cep || f.cep,
        bairro: data.bairro || f.bairro,
        municipio: data.municipio || f.municipio,
        uf: data.uf || f.uf,
        telefone: f.telefone || (data.ddd_telefone_1 ? data.ddd_telefone_1.trim() : ''),
        email: f.email || data.email || '',
      }));
      setCamposAuto(auto);
      setAutoPreenchido(true);
    } catch (_) { /* CNPJ não encontrado */ }
    finally { setBuscandoCnpj(false); }
  }, []);

  function validateForm() {
    const errs = {};
    if (!form.razaoSocial.trim()) errs.razaoSocial = 'Obrigatório';
    if (!form.tipo) errs.tipo = 'Selecione o tipo';
    if (!form.cpfCnpj.trim()) {
      errs.cpfCnpj = 'CPF/CNPJ é obrigatório';
    } else {
      const d = form.cpfCnpj.replace(/\D/g, '');
      if (d.length !== 11 && d.length !== 14) errs.cpfCnpj = 'CPF (11) ou CNPJ (14 dígitos)';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email inválido';
    return errs;
  }

  async function salvar(e) {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) {
      setErrors(errs);
      // Leva o usuário até a primeira aba que contém erro (evita falha silenciosa entre abas).
      const abaComErro = TABS_FORM.find((t) => Object.keys(errs).some((f) => FIELD_TAB[f] === t));
      if (abaComErro && abaComErro !== activeTab) setActiveTab(abaComErro);
      toast.error('Verifique os campos destacados antes de salvar.');
      return;
    }
    setErrors({});
    setSalvando(true);
    try {
      if (editId) await api.atualizar(editId, form);
      else await api.criar(form);
      setForm(empty);
      setEditId(null);
      setShowForm(false);
      setAutoPreenchido(false);
      setCamposAuto([]);
      toast.success(editId ? 'Parceiro atualizado!' : 'Parceiro criado!');
      await carregar();
    } catch (err) {
      toast.error(err.message);
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
        try { await api.deletar(id); await carregar(); toast.success('Parceiro excluído!'); }
        catch (e) { toast.error(e.message); }
      },
    });
  }

  function editar(p) {
    setForm({ razaoSocial: p.razaoSocial || '', nomeFantasia: p.nomeFantasia || '', cpfCnpj: p.cpfCnpj || '', tipo: p.tipo || '', logradouro: p.logradouro || '', numero: p.numero || '', complemento: p.complemento || '', cep: p.cep || '', bairro: p.bairro || '', municipio: p.municipio || '', uf: p.uf || '', telefone: p.telefone || '', email: p.email || '' });
    setAutoPreenchido(false);
    setCamposAuto([]);
    setEditId(p.id);
    setActiveTab('Dados Gerais');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const listaFiltrada = lista.filter((p) =>
    !busca || [p.razaoSocial, p.nomeFantasia, p.cpfCnpj].some((v) => v?.toLowerCase().includes(busca.toLowerCase()))
  );

  const columns = [
    {
      key: 'razaoSocial',
      label: 'Razão Social',
      render: (v, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-surface-highest flex items-center justify-center shrink-0 text-[11px] font-bold text-text-primary/60">
            {getInitials(v)}
          </div>
          <div>
            <p className="font-medium text-text-primary">{v}</p>
            {row.nomeFantasia && <p className="text-xs text-text-primary/40">{row.nomeFantasia}</p>}
          </div>
        </div>
      ),
    },
    { key: 'cpfCnpj', label: 'CPF/CNPJ', render: (v) => v || '—' },
    { key: 'tipo', label: 'Tipo', render: (v) => <Badge variant={TIPO_VARIANT[v] ?? 'neutral'}>{v}</Badge> },
    { key: 'municipio', label: 'Cidade', render: (v, row) => v ? `${v}/${row.uf}` : '—' },
    {
      key: 'id',
      label: 'Ações',
      render: (id, row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => editar(row)} aria-label="Editar parceiro" className="text-text-primary/40 hover:text-primary hover:bg-primary/10">
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => deletar(id)} aria-label="Excluir parceiro" className="text-text-primary/40 hover:text-error hover:bg-error/10">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parceiros"
        subtitle="Clientes e fornecedores"
        actions={
          <PermissaoGuard permissao="PARCEIRO_CRIAR">
            <Button onClick={toggleForm} leftIcon={<Plus className="w-4 h-4" />} className="text-xs uppercase tracking-widest font-bold">
              Novo Parceiro
            </Button>
          </PermissaoGuard>
        }
      />

      {/* Form com abas */}
      {showForm && (
        <div className="rounded-[18px] p-6 space-y-5 animate-scale-in bg-surface-medium border border-text-primary/5 shadow-elevated">
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary/50 font-mono">
            {editId ? 'Editar' : 'Novo'} Parceiro
          </h2>

          <div className="flex gap-1 p-1 rounded-xl bg-surface">
            {TABS_FORM.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all font-mono flex items-center justify-center gap-1.5',
                  activeTab === tab
                    ? 'bg-gradient-primary text-on-primary'
                    : 'text-text-primary/40 hover:text-text-primary/70'
                )}
              >
                {tab}
                {tabsComErro.has(tab) && (
                  <span
                    className={cn('w-1.5 h-1.5 rounded-full shrink-0', activeTab === tab ? 'bg-on-primary/70' : 'bg-error animate-pulse-dot')}
                    aria-label="Contém campos com erro"
                  />
                )}
              </button>
            ))}
          </div>

          <form onSubmit={salvar}>
            {activeTab === 'Dados Gerais' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField label="CPF / CNPJ" error={errors.cpfCnpj}>
                  <div className="relative">
                    <input className={cn(inputCls, buscandoCnpj && 'pr-10')} value={form.cpfCnpj} onChange={handleCpfCnpjChange} placeholder="000.000.000-00" />
                    {buscandoCnpj && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary pointer-events-none" aria-label="Buscando dados do CNPJ" />
                    )}
                  </div>
                  {buscandoCnpj && (
                    <div className="flex items-center gap-1.5 mt-1.5 px-1">
                      <span className="text-xs text-primary/80 font-medium">Buscando dados na Receita Federal...</span>
                    </div>
                  )}
                  {autoPreenchido && !buscandoCnpj && (
                    <div className="flex items-center gap-1.5 mt-1.5 px-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-xs text-primary/80 font-medium">Dados carregados da Receita Federal</span>
                    </div>
                  )}
                </FormField>
                <FormField label="Razão Social" required error={errors.razaoSocial}>
                  <input className={autoCls('razaoSocial')} value={form.razaoSocial} onChange={set('razaoSocial')} required />
                </FormField>
                <FormField label="Nome Fantasia">
                  <input className={autoCls('nomeFantasia')} value={form.nomeFantasia} onChange={set('nomeFantasia')} />
                </FormField>
                <FormField label="Tipo" required error={errors.tipo}>
                  <select className={`${inputCls} appearance-none`} value={form.tipo} onChange={set('tipo')} required>
                    <option value="">Selecione</option>
                    {TIPOS.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                  </select>
                </FormField>
              </div>
            )}
            {activeTab === 'Endereço' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField label="CEP"><input className={autoCls('cep')} value={form.cep} onChange={set('cep')} placeholder="00000-000" /></FormField>
                <FormField label="Logradouro"><input className={autoCls('logradouro')} value={form.logradouro} onChange={set('logradouro')} /></FormField>
                <FormField label="Número"><input className={autoCls('numero')} value={form.numero} onChange={set('numero')} /></FormField>
                <FormField label="Complemento"><input className={inputCls} value={form.complemento} onChange={set('complemento')} /></FormField>
                <FormField label="Bairro"><input className={autoCls('bairro')} value={form.bairro} onChange={set('bairro')} /></FormField>
                <FormField label="Município"><input className={autoCls('municipio')} value={form.municipio} onChange={set('municipio')} /></FormField>
                <FormField label="UF"><input className={autoCls('uf')} value={form.uf} onChange={set('uf')} maxLength={2} placeholder="SP" /></FormField>
              </div>
            )}
            {activeTab === 'Contato' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Telefone"><input className={inputCls} value={form.telefone} onChange={set('telefone')} placeholder="(11) 99999-9999" /></FormField>
                <FormField label="Email" error={errors.email}><input type="email" className={inputCls} value={form.email} onChange={set('email')} placeholder="email@empresa.com" /></FormField>
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button type="submit" disabled={salvando} className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {salvando ? 'Gravando...' : editId ? 'Salvar' : 'Criar'}
              </button>
              <button type="button" onClick={fecharForm} className="px-6 py-2.5 rounded-xl border border-text-primary/10 text-text-primary/60 hover:text-text-primary transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-primary/30" />
        <input
          className={`${inputCls} pl-10`}
          placeholder="Buscar por nome ou CNPJ..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <DataTable
        columns={columns}
        data={listaFiltrada}
        loading={loading}
        emptyState={<EmptyState icon={Users} title="Nenhum parceiro" description="Cadastre clientes e fornecedores para associar aos lançamentos." />}
        aria-label="Lista de parceiros"
      />

      {confirmAction && <ConfirmModal {...confirmAction} onCancel={() => setConfirmAction(null)} />}
    </div>
  );
}
