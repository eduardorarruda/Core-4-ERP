import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { assinaturas as api } from '../../lib/api';
import { formatarMoeda } from '../../lib/formatters';
import FormField, { FormInput, FormSelect } from '../ui/FormField';
import CategoriaOptions from '../ui/CategoriaOptions';
import Button from '../ui/Button';
import { centavos, paraNumero } from './utilsFinanceiro';

/**
 * Formulário de assinatura (criar/editar). Parceiro e cartão são opcionais (backend aceita sem).
 * Props: inicial? (AssinaturaResponseDto — com id = edição), categorias, parceiros, cartoes
 *        (lista ou null quando o usuário não vê cartões), onSalvo(), onCancelar().
 */
export default function AssinaturaForm({ inicial, categorias = [], parceiros = [], cartoes, onSalvo, onCancelar }) {
  const editando = Boolean(inicial?.id);
  const [form, setForm] = useState(() => ({
    descricao: inicial?.descricao ?? '',
    valor: inicial?.valor != null ? String(inicial.valor) : '',
    diaVencimento: inicial?.diaVencimento != null ? String(inicial.diaVencimento) : String(new Date().getDate()),
    categoriaId: inicial?.categoriaId != null ? String(inicial.categoriaId) : '',
    parceiroId: inicial?.parceiroId != null ? String(inicial.parceiroId) : '',
    cartaoCreditoId: inicial?.cartaoCreditoId != null ? String(inicial.cartaoCreditoId) : '',
    ativa: inicial?.ativa ?? true,
  }));
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState('');
  const [salvando, setSalvando] = useState(false);

  const set = (campo) => (e) => {
    const valor = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [campo]: valor }));
  };
  const valor = paraNumero(form.valor);
  const fornecedores = parceiros.filter((p) => !p.tipo || p.tipo === 'FORNECEDOR' || p.tipo === 'AMBOS' || String(p.id) === form.parceiroId);

  async function enviar(e) {
    e.preventDefault();
    e.stopPropagation();
    const dia = Number(form.diaVencimento);
    const novos = {};
    if (!form.descricao.trim()) novos.descricao = 'Dê um nome (ex.: Netflix, internet).';
    if (valor <= 0) novos.valor = 'Informe um valor maior que zero.';
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) novos.diaVencimento = 'Use um dia de 1 a 31.';
    if (!form.categoriaId) novos.categoriaId = 'Escolha uma categoria.';
    setErros(novos);
    setErroApi('');
    if (Object.keys(novos).length) return;
    const dto = {
      descricao: form.descricao.trim(),
      valor: centavos(valor),
      diaVencimento: dia,
      ativa: Boolean(form.ativa),
      categoriaId: Number(form.categoriaId),
      parceiroId: form.parceiroId ? Number(form.parceiroId) : null,
      cartaoCreditoId: form.cartaoCreditoId ? Number(form.cartaoCreditoId) : null,
    };
    setSalvando(true);
    try {
      if (editando) await api.atualizar(inicial.id, dto);
      else await api.criar(dto);
      onSalvo?.();
    } catch (err) {
      setErroApi(err.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4" aria-label={editando ? 'Editar assinatura' : 'Nova assinatura'}>
      <FormField label="Nome" required error={erros.descricao}>
        <FormInput value={form.descricao} onChange={set('descricao')} maxLength={150} placeholder="Ex.: Spotify Família" autoComplete="off" />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Valor por mês (R$)" required error={erros.valor}>
          <FormInput type="number" inputMode="decimal" step="0.01" min="0.01" value={form.valor} onChange={set('valor')} placeholder="0,00" />
        </FormField>
        <FormField label="Dia da cobrança" required error={erros.diaVencimento} help="Em meses mais curtos, vale o último dia.">
          <FormInput type="number" inputMode="numeric" min="1" max="31" step="1" value={form.diaVencimento} onChange={set('diaVencimento')} />
        </FormField>
      </div>
      {valor > 0 && (
        <p className="text-sm text-text-primary/70" aria-live="polite">
          Custa <strong className="font-semibold tabular-nums text-text-primary">{formatarMoeda(valor * 12)}</strong> por ano.
        </p>
      )}
      <FormField label="Categoria" required error={erros.categoriaId}>
        <FormSelect value={form.categoriaId} onChange={set('categoriaId')}>
          <option value="">Escolha uma categoria</option>
          <CategoriaOptions cats={categorias} />
        </FormSelect>
      </FormField>
      <FormField label="Fornecedor (opcional)">
        <FormSelect value={form.parceiroId} onChange={set('parceiroId')}>
          <option value="">Sem fornecedor</option>
          {fornecedores.map((p) => <option key={p.id} value={p.id}>{p.nomeFantasia || p.razaoSocial}</option>)}
        </FormSelect>
      </FormField>
      {cartoes && (
        <FormField label="Cobrada no cartão (opcional)" help="Sem cartão, a assinatura vira uma conta a pagar no dia da cobrança.">
          <FormSelect value={form.cartaoCreditoId} onChange={set('cartaoCreditoId')}>
            <option value="">Não, é paga por conta a pagar</option>
            {cartoes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </FormSelect>
        </FormField>
      )}
      <label className="flex items-start gap-3 min-h-11 cursor-pointer text-sm text-text-primary/85">
        <input type="checkbox" checked={form.ativa} onChange={set('ativa')} className="mt-0.5 w-5 h-5 accent-primary" />
        <span>
          Ativa
          <span className="block text-xs text-text-primary/60">Pausada, ela não gera cobranças até ser reativada.</span>
        </span>
      </label>

      {erroApi && <p role="alert" className="rounded-xl border border-error/25 bg-error/[0.08] px-3 py-2 text-sm text-error">{erroApi}</p>}

      <div className="sticky bottom-0 -mx-1 px-1 pt-2 pb-1 bg-surface-low flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        {onCancelar && <Button type="button" variant="ghost" onClick={onCancelar}>Cancelar</Button>}
        <Button type="submit" loading={salvando} leftIcon={editando ? null : <Plus className="w-4 h-4" aria-hidden="true" />}>
          {editando ? 'Salvar' : 'Criar assinatura'}
        </Button>
      </div>
    </form>
  );
}
