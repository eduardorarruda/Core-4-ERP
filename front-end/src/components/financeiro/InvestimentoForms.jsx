import React, { useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Check, Pencil, Plus, Sprout, Trash2, X } from 'lucide-react';
import { investimentos as api } from '../../lib/api';
import { formatarMoeda } from '../../lib/formatters';
import { useConfirm } from '../../hooks/useConfirm';
import FormField, { FormInput, FormSelect } from '../ui/FormField';
import Button from '../ui/Button';
import { SegmentedControl } from '../ui/Tabs';
import { centavos, hojeIso, paraNumero } from './utilsFinanceiro';

function ErroApi({ mensagem }) {
  if (!mensagem) return null;
  return <p role="alert" className="rounded-xl border border-error/25 bg-error/[0.08] px-3 py-2 text-sm text-error">{mensagem}</p>;
}

function Rodape({ onCancelar, salvando, rotulo, icone }) {
  return (
    <div className="sticky bottom-0 -mx-1 px-1 pt-2 pb-1 bg-surface-low flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
      {onCancelar && <Button type="button" variant="ghost" onClick={onCancelar}>Cancelar</Button>}
      <Button type="submit" loading={salvando} leftIcon={icone}>{rotulo}</Button>
    </div>
  );
}

/**
 * Carteira de investimento (criar/editar).
 * Props: inicial? (com id = edição), tipos [{id, nome}], onSalvo(), onCancelar().
 */
export function CarteiraForm({ inicial, tipos = [], onSalvo, onCancelar }) {
  const editando = Boolean(inicial?.id);
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [tipoId, setTipoId] = useState(inicial?.tipoId != null ? String(inicial.tipoId) : '');
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    e.stopPropagation();
    const novos = {};
    if (!nome.trim()) novos.nome = 'Dê um nome (ex.: Reserva de emergência).';
    if (!tipoId) novos.tipoId = 'Escolha o tipo.';
    setErros(novos);
    setErroApi('');
    if (Object.keys(novos).length) return;
    setSalvando(true);
    try {
      const dto = { nome: nome.trim(), tipoId: Number(tipoId) };
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
    <form onSubmit={enviar} noValidate className="space-y-4" aria-label={editando ? 'Editar carteira' : 'Nova carteira'}>
      <FormField label="Nome da carteira" required error={erros.nome}>
        <FormInput value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Reserva de emergência" autoComplete="off" />
      </FormField>
      <FormField label="Tipo" required error={erros.tipoId}
        help={tipos.length ? undefined : 'Nenhum tipo cadastrado. Peça para quem administra criar em "Tipos de investimento".'}>
        <FormSelect value={tipoId} onChange={(e) => setTipoId(e.target.value)}>
          <option value="">Escolha o tipo</option>
          {tipos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </FormSelect>
      </FormField>
      {!editando && <p className="text-xs text-text-primary/60">A carteira começa vazia. Depois, registre o primeiro aporte.</p>}
      <ErroApi mensagem={erroApi} />
      <Rodape onCancelar={onCancelar} salvando={salvando} rotulo={editando ? 'Salvar' : 'Criar carteira'} icone={editando ? null : <Plus className="w-4 h-4" aria-hidden="true" />} />
    </form>
  );
}

const TIPOS_MOV = [
  { value: 'APORTE', label: 'Aporte', icon: ArrowDownToLine },
  { value: 'RESGATE', label: 'Resgate', icon: ArrowUpFromLine },
  { value: 'RENDIMENTO', label: 'Rendimento', icon: Sprout },
];

/**
 * Movimentação de uma carteira: aporte (pode sair de uma conta bancária), resgate ou rendimento.
 * Props: carteira, contasBancarias (lista ou null sem permissão), onSalvo(), onCancelar().
 */
export function MovimentacaoForm({ carteira, contasBancarias, onSalvo, onCancelar }) {
  const [form, setForm] = useState({ tipoTransacao: 'APORTE', valor: '', dataTransacao: hojeIso(), contaCorrenteOrigemId: '' });
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState('');
  const [salvando, setSalvando] = useState(false);
  const set = (campo) => (v) => setForm((f) => ({ ...f, [campo]: v?.target ? v.target.value : v }));
  const valor = paraNumero(form.valor);
  const tipo = form.tipoTransacao;
  const saldo = Number(carteira?.saldoAtual) || 0;

  async function enviar(e) {
    e.preventDefault();
    e.stopPropagation();
    const novos = {};
    if (tipo === 'RENDIMENTO' ? valor === 0 : valor <= 0) novos.valor = tipo === 'RENDIMENTO' ? 'Informe o valor (negativo para perda).' : 'Informe um valor maior que zero.';
    if (tipo === 'RESGATE' && valor > saldo) novos.valor = `O resgate não pode passar do saldo (${formatarMoeda(saldo)}).`;
    if (!form.dataTransacao) novos.dataTransacao = 'Escolha a data.';
    setErros(novos);
    setErroApi('');
    if (Object.keys(novos).length) return;
    setSalvando(true);
    try {
      await api.transacoes.registrar(carteira.id, {
        tipoTransacao: tipo,
        valor: centavos(valor),
        dataTransacao: form.dataTransacao,
        contaCorrenteOrigemId: tipo === 'APORTE' && form.contaCorrenteOrigemId ? Number(form.contaCorrenteOrigemId) : null,
      });
      onSalvo?.();
    } catch (err) {
      setErroApi(err.message || 'Não foi possível registrar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4" aria-label="Nova movimentação">
      <fieldset className="space-y-1.5">
        <legend className="text-[0.8125rem] font-medium text-text-primary/75 mb-1.5">O que aconteceu?</legend>
        <SegmentedControl label="Tipo de movimentação" items={TIPOS_MOV} value={tipo} onChange={set('tipoTransacao')} fullWidth />
      </fieldset>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Valor (R$)" required error={erros.valor}>
          <FormInput type="number" inputMode="decimal" step="0.01" min={tipo === 'RENDIMENTO' ? undefined : '0.01'} value={form.valor} onChange={set('valor')} placeholder="0,00" />
        </FormField>
        <FormField label="Data" required error={erros.dataTransacao}>
          <FormInput type="date" value={form.dataTransacao} onChange={set('dataTransacao')} />
        </FormField>
      </div>
      {tipo === 'APORTE' && contasBancarias && (
        <FormField label="Saiu da conta bancária (opcional)" help="Se escolher, o valor é descontado do saldo dessa conta.">
          <FormSelect value={form.contaCorrenteOrigemId} onChange={set('contaCorrenteOrigemId')}>
            <option value="">Não descontar de nenhuma conta</option>
            {contasBancarias.map((c) => <option key={c.id} value={c.id}>{c.descricao} · saldo {formatarMoeda(c.saldo)}</option>)}
          </FormSelect>
        </FormField>
      )}
      {tipo === 'RESGATE' && (
        <p className="text-xs text-text-primary/65">O resgate diminui o saldo da carteira. Ele não entra sozinho numa conta bancária: se quiser, registre o valor como conta a receber.</p>
      )}
      {tipo === 'RENDIMENTO' && (
        <p className="text-xs text-text-primary/65">Juros ou dividendos que ficaram na carteira. Para uma perda, use valor negativo.</p>
      )}
      <ErroApi mensagem={erroApi} />
      <Rodape onCancelar={onCancelar} salvando={salvando} rotulo="Registrar" icone={<Check className="w-4 h-4" aria-hidden="true" />} />
    </form>
  );
}

/** Gestão dos tipos de investimento (lista + criar/renomear/excluir). Exige INVESTIMENTO_TIPO_GERENCIAR. */
export function TiposInvestimento({ tipos = [], onMudou }) {
  const confirmar = useConfirm();
  const [novo, setNovo] = useState('');
  const [editId, setEditId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function executar(acao) {
    setErro('');
    setSalvando(true);
    try { await acao(); onMudou?.(); return true; } catch (e) { setErro(e.message); return false; } finally { setSalvando(false); }
  }

  async function criar(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!novo.trim()) { setErro('Escreva o nome do tipo.'); return; }
    if (await executar(() => api.tipos.criar({ nome: novo.trim() }))) setNovo('');
  }

  async function salvarEdicao(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!editNome.trim()) { setErro('O nome não pode ficar vazio.'); return; }
    if (await executar(() => api.tipos.atualizar(editId, { nome: editNome.trim() }))) setEditId(null);
  }

  async function excluir(t) {
    const ok = await confirmar({
      title: `Excluir o tipo "${t.nome}"?`,
      message: 'Tipos usados por alguma carteira não podem ser excluídos.',
      confirmLabel: 'Excluir',
    });
    if (ok) executar(() => api.tipos.deletar(t.id));
  }

  return (
    <div className="space-y-4">
      <form onSubmit={criar} className="flex gap-2 items-end" noValidate>
        <div className="flex-1">
          <FormField label="Novo tipo">
            <FormInput value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Ex.: CDB, Tesouro Selic, FII" autoComplete="off" />
          </FormField>
        </div>
        <Button type="submit" loading={salvando && !editId} leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>Adicionar</Button>
      </form>
      <ErroApi mensagem={erro} />
      {tipos.length === 0 ? (
        <p className="text-sm text-text-primary/65 text-center py-4">Nenhum tipo ainda. Crie o primeiro acima.</p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {tipos.map((t) => (
            <li key={t.id} className="flex items-center gap-2 px-3 py-1.5 min-h-12">
              {editId === t.id ? (
                <form onSubmit={salvarEdicao} className="flex flex-1 items-center gap-1" noValidate>
                  <label className="sr-only" htmlFor={`tipo-${t.id}`}>Nome do tipo</label>
                  <FormInput small id={`tipo-${t.id}`} value={editNome} onChange={(e) => setEditNome(e.target.value)} autoFocus />
                  <Button type="submit" variant="ghost" size="icon-sm" aria-label="Salvar nome"><Check className="w-4 h-4" aria-hidden="true" /></Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Cancelar edição" onClick={() => setEditId(null)}><X className="w-4 h-4" aria-hidden="true" /></Button>
                </form>
              ) : (
                <>
                  <span className="flex-1 truncate">{t.nome}</span>
                  <Button variant="ghost" size="icon-sm" aria-label={`Renomear ${t.nome}`} onClick={() => { setEditId(t.id); setEditNome(t.nome); }}>
                    <Pencil className="w-4 h-4" aria-hidden="true" />
                  </Button>
                  <Button variant="danger-ghost" size="icon-sm" aria-label={`Excluir ${t.nome}`} onClick={() => excluir(t)}>
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
