import React, { useEffect, useId, useState } from 'react';
import { CheckCircle2, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { contas as contasApi, contasCorrentes as ccApi } from '../../lib/api';
import { formatarMoeda, formatDate } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import FormField, { FormInput, FormSelect } from '../ui/FormField';
import Button from '../ui/Button';
import { Revelar } from '../motion/Movimento';
import {
  PREF_ULTIMA_CONTA_BANCARIA, centavos, gravarPreferencia, hojeIso, lerPreferencia, paraNumero,
} from '../financeiro/utilsFinanceiro';

/**
 * Formulário ÚNICO de baixa (pagar/receber uma conta). Usado em Contas a pagar e receber
 * ("Paguei"/"Recebi"), no Calendário e onde mais for preciso. Coloque dentro de Drawer/Modal.
 *
 * Campos (BaixaRequestDto): conta bancária · data · ajustes recolhidos (juros, multa, desconto).
 * O campo "acréscimo" do DTO sobrepunha juros/multa e não aparece mais — é enviado como 0.
 * Valor final = valor da conta + juros + multa − desconto (mesma conta que o backend faz).
 *
 * Props (API estável):
 * - conta: { id, descricao, valorOriginal, tipo: 'PAGAR'|'RECEBER', dataVencimento? } (obrigatória)
 * - onSalvo(contaAtualizada): após a baixa (a conta volta com status PAGO/RECEBIDO)
 * - onCancelar(): botão Cancelar (se omitido, não aparece)
 * - contasBancarias?: lista já carregada de contas bancárias (senão o form carrega)
 * - className?
 *
 * Lembra a última conta bancária usada neste navegador para pré-selecionar na próxima baixa.
 *
 *   <Drawer open={!!conta} onClose={fechar} title="Registrar pagamento">
 *     {conta && <BaixaForm conta={conta} onSalvo={() => { fechar(); recarregar(); }} onCancelar={fechar} />}
 *   </Drawer>
 */
export default function BaixaForm({ conta, onSalvo, onCancelar, contasBancarias, className }) {
  const idAjustes = useId();
  const receber = conta?.tipo === 'RECEBER';
  const [ccs, setCcs] = useState(contasBancarias ?? []);
  const [carregandoCcs, setCarregandoCcs] = useState(!contasBancarias);
  const [form, setForm] = useState(() => ({
    contaCorrenteId: lerPreferencia(PREF_ULTIMA_CONTA_BANCARIA, ''),
    dataPagamento: hojeIso(),
    juros: '',
    multa: '',
    desconto: '',
  }));
  const [ajustesAbertos, setAjustesAbertos] = useState(false);
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (contasBancarias) return undefined;
    let vigente = true;
    ccApi.listar()
      .then((l) => { if (vigente) setCcs(l ?? []); })
      .catch((e) => { if (vigente) setErroApi(e.message || 'Não foi possível carregar as contas bancárias.'); })
      .finally(() => { if (vigente) setCarregandoCcs(false); });
    return () => { vigente = false; };
  }, [contasBancarias]);

  // Pré-seleção só vale se a conta lembrada ainda existe; com uma conta só, ela já vem marcada
  const idsValidos = ccs.map((c) => String(c.id));
  const contaCorrenteId = idsValidos.includes(form.contaCorrenteId)
    ? form.contaCorrenteId
    : (ccs.length === 1 ? String(ccs[0].id) : '');

  const juros = paraNumero(form.juros);
  const multa = paraNumero(form.multa);
  const desconto = paraNumero(form.desconto);
  const valorConta = Number(conta?.valorOriginal) || 0;
  const valorFinal = centavos(valorConta + juros + multa - desconto);
  const temAjuste = juros > 0 || multa > 0 || desconto > 0;
  const contaEscolhida = ccs.find((c) => String(c.id) === contaCorrenteId);
  const saldoDepois = contaEscolhida ? centavos(Number(contaEscolhida.saldo) + (receber ? valorFinal : -valorFinal)) : null;
  const ficaNegativo = !receber && saldoDepois != null && saldoDepois < 0;

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  async function enviar(e) {
    e.preventDefault();
    e.stopPropagation();
    const novos = {};
    if (!contaCorrenteId) novos.contaCorrenteId = 'Escolha a conta bancária.';
    if (!form.dataPagamento) novos.dataPagamento = 'Escolha a data.';
    if ([juros, multa, desconto].some((v) => v < 0)) novos.ajustes = 'Ajustes não podem ser negativos.';
    if (valorFinal <= 0) novos.ajustes = 'O desconto não pode ser igual ou maior que o valor.';
    setErros(novos);
    setErroApi('');
    if (Object.keys(novos).length) {
      if (novos.ajustes) setAjustesAbertos(true);
      return;
    }
    setSalvando(true);
    try {
      const atualizada = await contasApi.baixar(conta.id, {
        contaCorrenteId: Number(contaCorrenteId),
        dataPagamento: form.dataPagamento,
        juros: centavos(juros),
        multa: centavos(multa),
        acrescimo: 0,
        desconto: centavos(desconto),
      });
      gravarPreferencia(PREF_ULTIMA_CONTA_BANCARIA, contaCorrenteId);
      onSalvo?.(atualizada);
    } catch (err) {
      setErroApi(err.message || 'Não foi possível registrar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  if (!conta) return null;

  return (
    <form onSubmit={enviar} noValidate className={cn('space-y-4', className)} aria-label={receber ? 'Registrar recebimento' : 'Registrar pagamento'}>
      <div className="rounded-2xl border border-border bg-surface-medium/60 p-4">
        <p className="text-sm text-text-primary/70 truncate">{conta.descricao}</p>
        <p className={cn('mt-1 font-display text-2xl font-semibold tabular-nums valor-privado', receber ? 'text-income' : 'text-expense')}>
          {receber ? '+' : '−'}{formatarMoeda(valorFinal)}
        </p>
        {conta.dataVencimento && (
          <p className="mt-1 text-xs text-text-primary/60">Vencimento {formatDate(conta.dataVencimento)}</p>
        )}
        {temAjuste && (
          <p className="mt-1 text-xs text-text-primary/60 tabular-nums">
            Conta {formatarMoeda(valorConta)}
            {juros > 0 && ` + juros ${formatarMoeda(juros)}`}
            {multa > 0 && ` + multa ${formatarMoeda(multa)}`}
            {desconto > 0 && ` − desconto ${formatarMoeda(desconto)}`}
          </p>
        )}
      </div>

      <FormField
        label={receber ? 'Recebido na conta bancária' : 'Pago com a conta bancária'}
        required
        error={erros.contaCorrenteId}
        help={!carregandoCcs && ccs.length === 0 ? 'Cadastre uma conta bancária em "Contas bancárias" para registrar a baixa.' : undefined}
      >
        <FormSelect value={contaCorrenteId} onChange={set('contaCorrenteId')} disabled={carregandoCcs}>
          <option value="">{carregandoCcs ? 'Carregando…' : 'Escolha a conta'}</option>
          {ccs.map((c) => (
            <option key={c.id} value={c.id}>{c.descricao} · saldo {formatarMoeda(c.saldo)}</option>
          ))}
        </FormSelect>
      </FormField>

      {ficaNegativo && (
        <p className={cn('text-xs', contaEscolhida?.permitirSaldoNegativo ? 'text-warning' : 'text-error')} role="status">
          {contaEscolhida?.permitirSaldoNegativo
            ? `O saldo desta conta fica em ${formatarMoeda(saldoDepois)}.`
            : `Saldo insuficiente: esta conta não pode ficar negativa (ficaria em ${formatarMoeda(saldoDepois)}). Escolha outra.`}
        </p>
      )}

      <FormField label={receber ? 'Data do recebimento' : 'Data do pagamento'} required error={erros.dataPagamento}>
        <FormInput type="date" value={form.dataPagamento} onChange={set('dataPagamento')} />
      </FormField>

      <div className="rounded-2xl border border-border">
        <button
          type="button"
          aria-expanded={ajustesAbertos}
          aria-controls={idAjustes}
          onClick={() => setAjustesAbertos((v) => !v)}
          className="w-full min-h-11 flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium text-text-primary/80 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-text-primary/50" aria-hidden="true" />
            Juros, multa ou desconto (R$)
            {temAjuste && <span className="text-xs font-normal text-text-primary/55">(com ajuste)</span>}
          </span>
          <ChevronDown className={cn('w-4 h-4 transition-transform', ajustesAbertos && 'rotate-180')} aria-hidden="true" />
        </button>
        <Revelar aberto={ajustesAbertos} id={idAjustes}>
          <div className="grid grid-cols-3 gap-3 px-4 pb-4 pt-1">
            <FormField label="Juros">
              <FormInput type="number" inputMode="decimal" step="0.01" min="0" value={form.juros} onChange={set('juros')} placeholder="0,00" />
            </FormField>
            <FormField label="Multa">
              <FormInput type="number" inputMode="decimal" step="0.01" min="0" value={form.multa} onChange={set('multa')} placeholder="0,00" />
            </FormField>
            <FormField label="Desconto" error={erros.ajustes}>
              <FormInput type="number" inputMode="decimal" step="0.01" min="0" value={form.desconto} onChange={set('desconto')} placeholder="0,00" />
            </FormField>
          </div>
        </Revelar>
      </div>

      {erroApi && (
        <p role="alert" className="rounded-xl border border-error/25 bg-error/[0.08] px-3 py-2 text-sm text-error">{erroApi}</p>
      )}

      <div className="sticky bottom-0 -mx-1 px-1 pt-2 pb-1 bg-surface-low flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        {onCancelar && <Button type="button" variant="ghost" onClick={onCancelar}>Cancelar</Button>}
        <Button type="submit" loading={salvando} disabled={carregandoCcs || ccs.length === 0} leftIcon={<CheckCircle2 className="w-4 h-4" aria-hidden="true" />}>
          {receber ? 'Confirmar recebimento' : 'Confirmar pagamento'}
        </Button>
      </div>
    </form>
  );
}
