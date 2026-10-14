import React, { useState } from 'react';
import { ArrowDown, ArrowRightLeft } from 'lucide-react';
import { contasCorrentes as api } from '../../lib/api';
import { formatarMoeda } from '../../lib/formatters';
import FormField, { FormInput, FormSelect } from '../ui/FormField';
import Button from '../ui/Button';
import { centavos, hojeIso, paraNumero } from './utilsFinanceiro';

/**
 * Transferência entre contas bancárias (criar ou editar). Gera saída na origem e entrada no
 * destino no mesmo instante (backend, §11/§17). Origem e destino não podem ser a mesma conta.
 * Props: contas (lista de contas bancárias), inicial? (TransferenciaResponseDto — com id = edição),
 *        onSalvo(), onCancelar().
 */
export default function TransferenciaForm({ contas = [], inicial, onSalvo, onCancelar }) {
  const editando = Boolean(inicial?.id);
  const [form, setForm] = useState(() => ({
    contaOrigemId: inicial?.contaOrigemId != null ? String(inicial.contaOrigemId) : '',
    contaDestinoId: inicial?.contaDestinoId != null ? String(inicial.contaDestinoId) : '',
    valor: inicial?.valor != null ? String(inicial.valor) : '',
    dataTransferencia: inicial?.dataTransferencia ?? hojeIso(),
  }));
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState('');
  const [salvando, setSalvando] = useState(false);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  const origem = contas.find((c) => String(c.id) === form.contaOrigemId);
  const valor = paraNumero(form.valor);

  async function enviar(e) {
    e.preventDefault();
    e.stopPropagation();
    const novos = {};
    if (!form.contaOrigemId) novos.contaOrigemId = 'Escolha de onde sai o dinheiro.';
    if (!form.contaDestinoId) novos.contaDestinoId = 'Escolha para onde vai o dinheiro.';
    if (form.contaOrigemId && form.contaOrigemId === form.contaDestinoId) novos.contaDestinoId = 'Escolha uma conta diferente da origem.';
    if (valor <= 0) novos.valor = 'Informe um valor maior que zero.';
    if (!form.dataTransferencia) novos.dataTransferencia = 'Escolha a data.';
    setErros(novos);
    setErroApi('');
    if (Object.keys(novos).length) return;
    const dto = {
      contaOrigemId: Number(form.contaOrigemId),
      contaDestinoId: Number(form.contaDestinoId),
      valor: centavos(valor),
      dataTransferencia: form.dataTransferencia,
    };
    setSalvando(true);
    try {
      if (editando) await api.transferencias.atualizar(inicial.id, dto);
      else await api.transferir(dto);
      onSalvo?.();
    } catch (err) {
      setErroApi(err.message || 'Não foi possível transferir.');
    } finally {
      setSalvando(false);
    }
  }

  const opcoes = (excluirId) => contas
    .filter((c) => String(c.id) !== excluirId)
    .map((c) => <option key={c.id} value={c.id}>{c.descricao} · saldo {formatarMoeda(c.saldo)}</option>);

  return (
    <form onSubmit={enviar} noValidate className="space-y-4" aria-label={editando ? 'Editar transferência' : 'Nova transferência'}>
      <FormField label="Sai de" required error={erros.contaOrigemId}>
        <FormSelect value={form.contaOrigemId} onChange={set('contaOrigemId')}>
          <option value="">Escolha a conta de origem</option>
          {opcoes(form.contaDestinoId)}
        </FormSelect>
      </FormField>
      <div className="flex justify-center -my-1" aria-hidden="true">
        <span className="w-8 h-8 grid place-items-center rounded-full border border-border bg-surface-medium text-text-primary/60">
          <ArrowDown className="w-4 h-4" />
        </span>
      </div>
      <FormField label="Vai para" required error={erros.contaDestinoId}>
        <FormSelect value={form.contaDestinoId} onChange={set('contaDestinoId')}>
          <option value="">Escolha a conta de destino</option>
          {opcoes(form.contaOrigemId)}
        </FormSelect>
      </FormField>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Valor (R$)" required error={erros.valor}>
          <FormInput type="number" inputMode="decimal" step="0.01" min="0.01" value={form.valor} onChange={set('valor')} placeholder="0,00" />
        </FormField>
        <FormField label="Data" required error={erros.dataTransferencia}>
          <FormInput type="date" value={form.dataTransferencia} onChange={set('dataTransferencia')} />
        </FormField>
      </div>

      {origem && valor > 0 && !editando && (
        <p className={Number(origem.saldo) - valor < 0 ? 'text-xs text-warning' : 'text-xs text-text-primary/60'} role="status">
          Saldo de {origem.descricao} depois: <span className="tabular-nums valor-privado">{formatarMoeda(Number(origem.saldo) - valor)}</span>
        </p>
      )}

      {erroApi && <p role="alert" className="rounded-xl border border-error/25 bg-error/[0.08] px-3 py-2 text-sm text-error">{erroApi}</p>}

      <div className="sticky bottom-0 -mx-1 px-1 pt-2 pb-1 bg-surface-low flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        {onCancelar && <Button type="button" variant="ghost" onClick={onCancelar}>Cancelar</Button>}
        <Button type="submit" loading={salvando} leftIcon={<ArrowRightLeft className="w-4 h-4" aria-hidden="true" />}>
          {editando ? 'Salvar' : 'Transferir'}
        </Button>
      </div>
    </form>
  );
}
