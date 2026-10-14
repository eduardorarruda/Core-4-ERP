import React, { useState } from 'react';
import { Plus, Tag, Users } from 'lucide-react';
import { categorias as catApi, parceiros as parApi } from '../../lib/api';
import FormField, { inputCls } from './FormField';
import IconDropdown from './IconDropdown';
import Modal from './Modal';
import Button from './Button';

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

  function validar() {
    if (isCat) return form.descricao.trim() ? '' : 'Informe a descrição da categoria.';
    if (!form.razaoSocial.trim() && !form.nomeFantasia.trim()) {
      return 'Informe ao menos o nome fantasia ou a razão social.';
    }
    if (!form.cpfCnpj.trim()) return 'Informe o CPF ou CNPJ.';
    const digits = form.cpfCnpj.replace(/\D/g, '');
    if (digits.length !== 11 && digits.length !== 14) return 'O CPF deve ter 11 dígitos e o CNPJ, 14.';
    return '';
  }

  async function salvar(e) {
    e.preventDefault();
    // O modal vive num portal, mas o evento React ainda sobe pela árvore de componentes
    e.stopPropagation();
    const problema = validar();
    setErro(problema);
    if (problema) return;

    setSalvando(true);
    try {
      const criado = isCat
        ? await catApi.criar({ descricao: form.descricao.trim(), icone: form.icone || '' })
        : await parApi.criar({
          nomeFantasia: form.nomeFantasia.trim() || null,
          razaoSocial: form.razaoSocial.trim() || form.nomeFantasia.trim(),
          cpfCnpj: form.cpfCnpj.replace(/\D/g, ''),
          tipo: form.tipoParceiro,
        });
      onCriado(criado);
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      open
      onClose={onFechar}
      size="sm"
      icon={isCat ? Tag : Users}
      title={isCat ? 'Nova categoria' : 'Novo parceiro'}
      description={isCat
        ? 'Crie a categoria sem sair do lançamento — ela já fica selecionada.'
        : 'Cadastre o cliente ou fornecedor sem sair do lançamento — ele já fica selecionado.'}
    >
      <form onSubmit={salvar} className="space-y-3" noValidate>
        {isCat ? (
          <>
            <FormField label="Descrição" required>
              <input
                className={inputCls}
                placeholder="Ex.: Alimentação"
                value={form.descricao}
                onChange={setF('descricao')}
              />
            </FormField>
            <FormField label="Ícone">
              <IconDropdown value={form.icone} onChange={(v) => setForm((f) => ({ ...f, icone: v }))} />
            </FormField>
          </>
        ) : (
          <>
            <FormField label="Nome fantasia">
              <input
                className={inputCls}
                placeholder="Ex.: Supermercado Bom Preço"
                value={form.nomeFantasia}
                onChange={setF('nomeFantasia')}
              />
            </FormField>
            <FormField label="Razão social">
              <input
                className={inputCls}
                placeholder="Ex.: Comércio Ltda"
                value={form.razaoSocial}
                onChange={setF('razaoSocial')}
              />
            </FormField>
            <FormField label="CPF / CNPJ" required>
              <input
                className={inputCls}
                inputMode="numeric"
                placeholder="Somente números"
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

        {erro && (
          <p role="alert" className="rounded-xl border border-error/25 bg-error/[0.08] px-3 py-2 text-sm text-error">
            {erro}
          </p>
        )}

        <Modal.Footer>
          <Button variant="ghost" onClick={onFechar}>Cancelar</Button>
          <Button type="submit" loading={salvando} leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>
            {salvando ? 'Criando...' : 'Criar'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
