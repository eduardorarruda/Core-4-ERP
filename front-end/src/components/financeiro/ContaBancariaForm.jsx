import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { contasCorrentes as api } from '../../lib/api';
import { formatarMoeda, formatDate } from '../../lib/formatters';
import FormField, { FormInput } from '../ui/FormField';
import Button from '../ui/Button';
import { centavos, hojeIso, paraNumero } from './utilsFinanceiro';

/**
 * Formulário de conta bancária (criar/editar). Na edição, saldo inicial e data ficam só para
 * leitura: o saldo é calculado pelas movimentações e o backend ignora esse campo no update.
 * Props: inicial? (ContaCorrenteResponseDto — com id = edição), onSalvo(conta), onCancelar().
 */
export default function ContaBancariaForm({ inicial, onSalvo, onCancelar }) {
  const editando = Boolean(inicial?.id);
  const [form, setForm] = useState(() => ({
    descricao: inicial?.descricao ?? '',
    agencia: inicial?.agencia ?? '',
    numeroConta: inicial?.numeroConta ?? '',
    saldo: '',
    dataSaldoInicial: inicial?.dataSaldoInicial ?? hojeIso(),
    permitirSaldoNegativo: Boolean(inicial?.permitirSaldoNegativo),
  }));
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState('');
  const [salvando, setSalvando] = useState(false);

  const set = (campo) => (e) => {
    const valor = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [campo]: valor }));
  };

  async function enviar(e) {
    e.preventDefault();
    e.stopPropagation();
    const novos = {};
    if (!form.descricao.trim()) novos.descricao = 'Dê um nome para a conta (ex.: Nubank PJ).';
    if (!form.agencia.trim()) novos.agencia = 'Informe a agência.';
    if (!form.numeroConta.trim()) novos.numeroConta = 'Informe o número da conta.';
    if (!editando && form.saldo !== '' && !Number.isFinite(paraNumero(form.saldo))) novos.saldo = 'Use só números.';
    if (!editando && !form.dataSaldoInicial) novos.dataSaldoInicial = 'Escolha a data do saldo.';
    setErros(novos);
    setErroApi('');
    if (Object.keys(novos).length) return;

    const dto = {
      descricao: form.descricao.trim(),
      agencia: form.agencia.trim(),
      numeroConta: form.numeroConta.trim(),
      // Na edição o backend exige o campo mas não o usa: reenviamos o valor atual
      saldo: editando ? Number(inicial.saldo) : centavos(paraNumero(form.saldo)),
      dataSaldoInicial: editando ? (inicial.dataSaldoInicial ?? hojeIso()) : form.dataSaldoInicial,
      permitirSaldoNegativo: form.permitirSaldoNegativo,
    };
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
    <form onSubmit={enviar} noValidate className="space-y-4" aria-label={editando ? 'Editar conta bancária' : 'Nova conta bancária'}>
      <FormField label="Nome da conta" required error={erros.descricao}>
        <FormInput value={form.descricao} onChange={set('descricao')} maxLength={150} placeholder="Ex.: Banco do Brasil — principal" autoComplete="off" />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Agência" required error={erros.agencia}>
          <FormInput value={form.agencia} onChange={set('agencia')} maxLength={10} inputMode="numeric" placeholder="0001" autoComplete="off" />
        </FormField>
        <FormField label="Número da conta" required error={erros.numeroConta}>
          <FormInput value={form.numeroConta} onChange={set('numeroConta')} maxLength={20} placeholder="12345-6" autoComplete="off" />
        </FormField>
      </div>

      {editando ? (
        <p className="rounded-xl border border-border bg-surface-medium/60 px-4 py-3 text-sm text-text-primary/75">
          Saldo inicial registrado em {formatDate(inicial.dataSaldoInicial)}. O saldo atual
          (<span className="tabular-nums valor-privado">{formatarMoeda(inicial.saldo)}</span>) é calculado pelas baixas e
          transferências e não pode ser editado aqui.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Saldo inicial (R$)" error={erros.saldo} help="O saldo na data ao lado. Pode ser negativo.">
            <FormInput type="number" inputMode="decimal" step="0.01" value={form.saldo} onChange={set('saldo')} placeholder="0,00" />
          </FormField>
          <FormField label="Data do saldo" required error={erros.dataSaldoInicial}>
            <FormInput type="date" value={form.dataSaldoInicial} onChange={set('dataSaldoInicial')} />
          </FormField>
        </div>
      )}

      <label className="flex items-start gap-3 min-h-11 cursor-pointer text-sm text-text-primary/85">
        <input type="checkbox" checked={form.permitirSaldoNegativo} onChange={set('permitirSaldoNegativo')} className="mt-0.5 w-5 h-5 accent-primary" />
        <span>
          Pode ficar com saldo negativo
          <span className="block text-xs text-text-primary/60">Para cheque especial. Sem isso, pagamentos maiores que o saldo são recusados.</span>
        </span>
      </label>

      {erroApi && <p role="alert" className="rounded-xl border border-error/25 bg-error/[0.08] px-3 py-2 text-sm text-error">{erroApi}</p>}

      <div className="sticky bottom-0 -mx-1 px-1 pt-2 pb-1 bg-surface-low flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        {onCancelar && <Button type="button" variant="ghost" onClick={onCancelar}>Cancelar</Button>}
        <Button type="submit" loading={salvando} leftIcon={editando ? null : <Plus className="w-4 h-4" aria-hidden="true" />}>
          {editando ? 'Salvar' : 'Adicionar conta'}
        </Button>
      </div>
    </form>
  );
}
