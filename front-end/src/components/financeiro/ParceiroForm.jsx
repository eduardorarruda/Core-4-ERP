import React, { useId, useRef, useState } from 'react';
import { BadgeCheck, ChevronDown, LoaderCircle, MapPin, Phone, Plus } from 'lucide-react';
import { parceiros as api } from '../../lib/api';
import { cn } from '../../lib/utils';
import FormField, { FormInput } from '../ui/FormField';
import Button from '../ui/Button';
import { SegmentedControl } from '../ui/Tabs';
import { Revelar } from '../motion/Movimento';
import { documentoValido, mascararCpfCnpj, soDigitos } from './utilsFinanceiro';

const TIPOS = [
  { value: 'FORNECEDOR', label: 'Fornecedor' },
  { value: 'CLIENTE', label: 'Cliente' },
  { value: 'AMBOS', label: 'Os dois' },
];

const VAZIO = {
  cpfCnpj: '', tipo: 'FORNECEDOR', razaoSocial: '', nomeFantasia: '', cep: '', logradouro: '', numero: '',
  complemento: '', bairro: '', municipio: '', uf: '', telefone: '', email: '',
};

/** Campos que a consulta do CNPJ (BrasilAPI) preenche → nome no retorno da API. */
const MAPA_CNPJ = {
  razaoSocial: 'razao_social', nomeFantasia: 'nome_fantasia', cep: 'cep', logradouro: 'logradouro', numero: 'numero',
  complemento: 'complemento', bairro: 'bairro', municipio: 'municipio', uf: 'uf', telefone: 'ddd_telefone_1', email: 'email',
};

function Secao({ id, titulo, icon: Icone, aberta, onAlternar, children, destaque }) {
  return (
    <div className="rounded-2xl border border-border">
      <button
        type="button"
        aria-expanded={aberta}
        aria-controls={id}
        onClick={onAlternar}
        className="w-full min-h-11 flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium text-text-primary/80 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="flex items-center gap-2">
          <Icone className="w-4 h-4 text-text-primary/50" aria-hidden="true" />
          {titulo}
          {destaque && <span className="text-xs font-normal text-primary">{destaque}</span>}
        </span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', aberta && 'rotate-180')} aria-hidden="true" />
      </button>
      <Revelar aberto={aberta} id={id}>
        <div className="px-4 pb-4 pt-1 space-y-4">{children}</div>
      </Revelar>
    </div>
  );
}

/**
 * Formulário de parceiro (cliente/fornecedor). Ao digitar um CNPJ completo, consulta a Receita
 * (BrasilAPI) e preenche nome e endereço — os campos preenchidos ficam destacados.
 * Props: inicial? (ParceiroResponseDto — com id = edição), onSalvo(parceiro), onCancelar().
 */
export default function ParceiroForm({ inicial, onSalvo, onCancelar }) {
  const editando = Boolean(inicial?.id);
  const idEndereco = useId();
  const idContato = useId();
  const consultaRef = useRef(0);
  const [form, setForm] = useState(() => ({
    ...VAZIO,
    ...Object.fromEntries(Object.keys(VAZIO).map((k) => [k, inicial?.[k] ?? VAZIO[k]])),
    cpfCnpj: inicial?.cpfCnpj ? mascararCpfCnpj(inicial.cpfCnpj) : '',
  }));
  const [auto, setAuto] = useState([]);
  const [consultando, setConsultando] = useState(false);
  const [avisoCnpj, setAvisoCnpj] = useState('');
  const [enderecoAberto, setEnderecoAberto] = useState(Boolean(inicial?.logradouro || inicial?.municipio));
  const [contatoAberto, setContatoAberto] = useState(Boolean(inicial?.telefone || inicial?.email));
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState('');
  const [salvando, setSalvando] = useState(false);

  const set = (campo) => (e) => {
    const valor = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [campo]: valor }));
    setAuto((a) => a.filter((c) => c !== campo));
  };

  async function consultarCnpj(digitos) {
    const minha = ++consultaRef.current;
    setConsultando(true);
    setAvisoCnpj('');
    try {
      const dados = await api.buscarCnpj(digitos);
      if (minha !== consultaRef.current) return;
      // Só preenche o que está vazio: não sobrescreve o que a pessoa já digitou
      const preenchidos = Object.entries(MAPA_CNPJ)
        .filter(([campo, chave]) => typeof dados?.[chave] === 'string' && dados[chave].trim() && !String(form[campo] ?? '').trim())
        .map(([campo, chave]) => [campo, dados[chave].trim()]);
      setForm((f) => ({ ...f, ...Object.fromEntries(preenchidos) }));
      setAuto(preenchidos.map(([c]) => c));
      if (preenchidos.some(([c]) => ['cep', 'logradouro', 'municipio'].includes(c))) setEnderecoAberto(true);
      setAvisoCnpj(preenchidos.length ? 'Dados preenchidos pela Receita Federal. Confira antes de salvar.' : '');
    } catch {
      if (minha === consultaRef.current) setAvisoCnpj('CNPJ não encontrado na Receita. Preencha os dados à mão.');
    } finally {
      if (minha === consultaRef.current) setConsultando(false);
    }
  }

  function aoMudarDocumento(e) {
    const mascarado = mascararCpfCnpj(e.target.value);
    setForm((f) => ({ ...f, cpfCnpj: mascarado }));
    const d = soDigitos(mascarado);
    if (d.length === 14 && documentoValido(d)) consultarCnpj(d);
  }

  const classeAuto = (campo) => (auto.includes(campo) ? 'border-primary/60 bg-primary/[0.06]' : undefined);

  async function enviar(e) {
    e.preventDefault();
    e.stopPropagation();
    const d = soDigitos(form.cpfCnpj);
    const novos = {};
    if (!editando || d) {
      if (!d) novos.cpfCnpj = 'Informe o CPF ou o CNPJ.';
      else if (!documentoValido(d)) novos.cpfCnpj = d.length === 11 || d.length === 14 ? 'Número inválido: confira os dígitos.' : 'CPF tem 11 dígitos e CNPJ, 14.';
    }
    if (!form.razaoSocial.trim()) novos.razaoSocial = 'Informe o nome ou a razão social.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) novos.email = 'E-mail inválido (ex.: nome@empresa.com).';
    if (form.uf && !/^[A-Za-z]{2}$/.test(form.uf)) novos.uf = 'Use a sigla (ex.: SP).';
    setErros(novos);
    setErroApi('');
    if (novos.email) setContatoAberto(true);
    if (novos.uf) setEnderecoAberto(true);
    if (Object.keys(novos).length) return;
    const dto = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? (v.trim() || null) : v]));
    dto.cpfCnpj = d || null;
    dto.razaoSocial = form.razaoSocial.trim();
    dto.uf = form.uf ? form.uf.toUpperCase() : null;
    setSalvando(true);
    try {
      const salvo = editando ? await api.atualizar(inicial.id, dto) : await api.criar(dto);
      onSalvo?.(salvo);
    } catch (err) {
      setErroApi(err.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4" aria-label={editando ? 'Editar parceiro' : 'Novo parceiro'}>
      <FormField
        label="CPF ou CNPJ"
        required={!editando}
        error={erros.cpfCnpj}
        help={editando && !inicial?.cpfCnpj ? 'Cadastro antigo sem documento: preencha se tiver.' : 'Com um CNPJ completo, buscamos nome e endereço na Receita.'}
      >
        <div className="relative">
          <FormInput value={form.cpfCnpj} onChange={aoMudarDocumento} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00 ou 00.000.000/0000-00" />
          {consultando && <LoaderCircle className="absolute right-3 top-3.5 w-4 h-4 animate-spin text-primary" aria-hidden="true" />}
        </div>
      </FormField>
      <p className="sr-only" aria-live="polite">{consultando ? 'Consultando CNPJ na Receita Federal…' : avisoCnpj}</p>
      {avisoCnpj && !consultando && (
        <p className={cn('flex items-center gap-2 text-xs', auto.length ? 'text-primary' : 'text-text-primary/65')} aria-hidden="true">
          {auto.length > 0 && <BadgeCheck className="w-4 h-4" />}
          {avisoCnpj}
        </p>
      )}

      <fieldset className="space-y-1.5">
        <legend className="text-[0.8125rem] font-medium text-text-primary/75 mb-1.5">Tipo</legend>
        <SegmentedControl label="Tipo de parceiro" items={TIPOS} value={form.tipo} onChange={set('tipo')} fullWidth />
      </fieldset>

      <FormField label="Nome ou razão social" required error={erros.razaoSocial}>
        <FormInput value={form.razaoSocial} onChange={set('razaoSocial')} maxLength={150} className={classeAuto('razaoSocial')} autoComplete="organization" />
      </FormField>
      <FormField label="Nome fantasia">
        <FormInput value={form.nomeFantasia} onChange={set('nomeFantasia')} maxLength={150} className={classeAuto('nomeFantasia')} autoComplete="off" />
      </FormField>

      <Secao id={idEndereco} titulo="Endereço" icon={MapPin} aberta={enderecoAberto} onAlternar={() => setEnderecoAberto((v) => !v)}
        destaque={auto.some((c) => ['cep', 'logradouro', 'municipio'].includes(c)) ? 'preenchido pela Receita' : null}>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="CEP"><FormInput value={form.cep} onChange={set('cep')} maxLength={10} inputMode="numeric" autoComplete="postal-code" className={classeAuto('cep')} /></FormField>
          <FormField label="Número"><FormInput value={form.numero} onChange={set('numero')} maxLength={20} className={classeAuto('numero')} /></FormField>
        </div>
        <FormField label="Logradouro"><FormInput value={form.logradouro} onChange={set('logradouro')} maxLength={200} autoComplete="address-line1" className={classeAuto('logradouro')} /></FormField>
        <FormField label="Complemento"><FormInput value={form.complemento} onChange={set('complemento')} maxLength={100} autoComplete="address-line2" className={classeAuto('complemento')} /></FormField>
        <FormField label="Bairro"><FormInput value={form.bairro} onChange={set('bairro')} maxLength={100} className={classeAuto('bairro')} /></FormField>
        <div className="grid grid-cols-[1fr_5rem] gap-4">
          <FormField label="Município"><FormInput value={form.municipio} onChange={set('municipio')} maxLength={100} autoComplete="address-level2" className={classeAuto('municipio')} /></FormField>
          <FormField label="UF" error={erros.uf}><FormInput value={form.uf} onChange={set('uf')} maxLength={2} autoComplete="address-level1" className={cn('uppercase', classeAuto('uf'))} /></FormField>
        </div>
      </Secao>

      <Secao id={idContato} titulo="Contato" icon={Phone} aberta={contatoAberto} onAlternar={() => setContatoAberto((v) => !v)}>
        <FormField label="Telefone"><FormInput type="tel" value={form.telefone} onChange={set('telefone')} maxLength={20} autoComplete="tel" className={classeAuto('telefone')} /></FormField>
        <FormField label="E-mail" error={erros.email}><FormInput type="email" value={form.email} onChange={set('email')} maxLength={150} autoComplete="email" className={classeAuto('email')} /></FormField>
      </Secao>

      {erroApi && <p role="alert" className="rounded-xl border border-error/25 bg-error/[0.08] px-3 py-2 text-sm text-error">{erroApi}</p>}

      <div className="sticky bottom-0 -mx-1 px-1 pt-2 pb-1 bg-surface-low flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        {onCancelar && <Button type="button" variant="ghost" onClick={onCancelar}>Cancelar</Button>}
        <Button type="submit" loading={salvando} leftIcon={editando ? null : <Plus className="w-4 h-4" aria-hidden="true" />}>
          {editando ? 'Salvar' : 'Criar parceiro'}
        </Button>
      </div>
    </form>
  );
}
