import React, { useState } from 'react';
import { CreditCard } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import FormField, { inputCls, FormSelect } from '../ui/FormField';
import { cartoes as cartoesApi } from '../../lib/api';
import { cn } from '../../lib/utils';

/*
 * Criar ou editar um cartão (mesmo formulário). Abre em Modal.
 * Props: open, modo ('criar' | 'editar'), cartao (no editar), contas (contas bancárias para pagar a fatura),
 *        onSalvo(cartao), onFechar.
 */

const VAZIO = { nome: '', limite: '', diaFechamento: '', diaVencimento: '', contaCorrenteId: '' };

function deCartao(c) {
  if (!c) return VAZIO;
  return {
    nome: c.nome ?? '',
    limite: c.limite != null ? String(c.limite) : '',
    diaFechamento: c.diaFechamento != null ? String(c.diaFechamento) : '',
    diaVencimento: c.diaVencimento != null ? String(c.diaVencimento) : '',
    contaCorrenteId: c.contaCorrenteId != null ? String(c.contaCorrenteId) : '',
  };
}

function validar(f) {
  const e = {};
  const dia = (v) => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 31;
  if (!f.nome.trim()) e.nome = 'Dê um nome ao cartão (ex.: Pessoal Visa).';
  if (!(Number(f.limite) > 0)) e.limite = 'Informe um limite maior que zero.';
  if (!dia(f.diaFechamento)) e.diaFechamento = 'Use um dia de 1 a 31.';
  if (!dia(f.diaVencimento)) e.diaVencimento = 'Use um dia de 1 a 31.';
  if (!f.contaCorrenteId) e.contaCorrenteId = 'Escolha a conta que paga a fatura.';
  return e;
}

function Formulario({ modo, cartao, contas, onSalvo, onFechar }) {
  const [form, setForm] = useState(() => deCartao(cartao));
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState('');
  const [salvando, setSalvando] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function salvar(e) {
    e.preventDefault();
    const problemas = validar(form);
    setErros(problemas);
    if (Object.keys(problemas).length) return;
    const dto = {
      nome: form.nome.trim(),
      limite: Number(form.limite),
      diaFechamento: Number(form.diaFechamento),
      diaVencimento: Number(form.diaVencimento),
      contaCorrenteId: Number(form.contaCorrenteId),
    };
    setSalvando(true);
    setErroApi('');
    try {
      const salvo = modo === 'editar' ? await cartoesApi.atualizar(cartao.id, dto) : await cartoesApi.criar(dto);
      onSalvo?.(salvo);
    } catch (err) {
      setErroApi(err?.message || 'Não foi possível salvar o cartão. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} noValidate className="space-y-4">
      {erroApi && <p role="alert" className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{erroApi}</p>}
      <FormField label="Nome do cartão" required error={erros.nome} help="Inclua a bandeira no nome (Visa, Master, Elo) para ver o logotipo no cartão.">
        <input className={inputCls} value={form.nome} onChange={set('nome')} autoComplete="off" maxLength={100} />
      </FormField>
      <FormField label="Limite (R$)" required error={erros.limite}>
        <input type="number" inputMode="decimal" step="0.01" min="0.01" className={cn(inputCls, 'tabular-nums')} value={form.limite} onChange={set('limite')} />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Dia do fechamento" required error={erros.diaFechamento} help="Compras a partir deste dia vão para a próxima fatura.">
          <input type="number" inputMode="numeric" min="1" max="31" className={cn(inputCls, 'tabular-nums')} value={form.diaFechamento} onChange={set('diaFechamento')} />
        </FormField>
        <FormField label="Dia do vencimento" required error={erros.diaVencimento}>
          <input type="number" inputMode="numeric" min="1" max="31" className={cn(inputCls, 'tabular-nums')} value={form.diaVencimento} onChange={set('diaVencimento')} />
        </FormField>
      </div>
      <FormField label="Conta que paga a fatura" required error={erros.contaCorrenteId}>
        <FormSelect value={form.contaCorrenteId} onChange={set('contaCorrenteId')}>
          <option value="">Selecione</option>
          {contas.map((c) => <option key={c.id} value={c.id}>{c.descricao}</option>)}
        </FormSelect>
      </FormField>
      <Modal.Footer>
        <Button type="button" variant="ghost" onClick={onFechar} disabled={salvando}>Cancelar</Button>
        <Button type="submit" loading={salvando}>{modo === 'editar' ? 'Salvar' : 'Adicionar cartão'}</Button>
      </Modal.Footer>
    </form>
  );
}

export default function CartaoFormModal({ open, modo = 'criar', cartao, contas = [], onSalvo, onFechar }) {
  return (
    <Modal
      open={open}
      onClose={onFechar}
      title={modo === 'editar' ? 'Editar cartão' : 'Novo cartão'}
      description={modo === 'editar' ? 'Mudanças no fechamento valem para as próximas faturas.' : 'Cadastre o cartão para lançar compras e acompanhar as faturas.'}
      icon={CreditCard}
    >
      {open && <Formulario key={cartao?.id ?? 'novo'} modo={modo} cartao={cartao} contas={contas} onSalvo={onSalvo} onFechar={onFechar} />}
    </Modal>
  );
}
