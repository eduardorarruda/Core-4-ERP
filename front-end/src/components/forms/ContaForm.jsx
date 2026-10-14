import React, { useEffect, useId, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronDown, Plus, Repeat, Sparkles } from 'lucide-react';
import {
  assinaturas as assinaturasApi,
  categorias as catApi,
  contas as contasApi,
  parceiros as parApi,
} from '../../lib/api';
import { usePermissao } from '../../hooks/usePermissao';
import { useToast } from '../../hooks/useToast';
import { formatarMoeda } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import FormField, { FormInput, FormSelect } from '../ui/FormField';
import CategoriaOptions from '../ui/CategoriaOptions';
import Button from '../ui/Button';
import ModalCriacaoRapida from '../ui/ModalCriacaoRapida';
import { SegmentedControl } from '../ui/Tabs';
import { Revelar } from '../motion/Movimento';
import { centavos, hojeIso, paraNumero, proximaCobranca } from '../financeiro/utilsFinanceiro';

/**
 * Formulário ÚNICO de conta a pagar / a receber (criar, editar e versão compacta da conciliação).
 * Substitui os três formulários antigos (criação e edição em ContasFinanceiras e o inline da
 * conciliação). Não abre modal sozinho: coloque-o dentro de um <Drawer> ou <Modal>.
 *
 * Props (API estável — usada por Contas, Calendário e Conciliação):
 * - modo: 'criar' (padrão) | 'editar' | 'compacto'
 *     criar    → todos os campos + "Mais opções" (nº documento, parcelas, ajustes) + "Preencher com assinatura"
 *     editar   → só o que o backend aceita alterar (tipo, descrição, valor, vencimento, categoria, parceiro).
 *                Exige `inicial.id`. Conta paga/recebida ou conciliada não pode ser editada (o backend recusa).
 *     compacto → campos essenciais, sem "Mais opções" (ex.: criar conta a partir de um item do extrato)
 * - inicial?: valores iniciais — mesmo formato do ContaResponseDto
 *     { id, descricao, valorOriginal, dataVencimento, tipo, categoriaId, parceiroId, numeroDocumento }
 * - tipo?: 'PAGAR' | 'RECEBER' — tipo inicial quando `inicial.tipo` não vier (padrão 'PAGAR')
 * - onSalvo(resultado): chamado após salvar. criar → array de contas criadas (uma por parcela);
 *     editar → conta atualizada; com `salvar` → o que a sua função devolver.
 * - onCancelar(): botão Cancelar (se omitido, o botão não aparece)
 * - salvar?: async (dto) => any — substitui a chamada padrão à API (ex.: conciliação "Criar e vincular").
 *     `dto` segue o ContaCreateDto: { descricao, valorOriginal, dataVencimento, tipo, categoriaId,
 *     parceiroId|null, quantidadeParcelas, intervaloMeses, dividirValor, numeroDocumento|null, acrescimo, desconto }
 * - rotuloSalvar?: texto do botão principal (padrão "Criar conta" / "Salvar")
 * - categorias?, parceiros?: listas já carregadas (evita nova requisição); sem elas o form carrega sozinho
 * - className?
 *
 * Exemplo:
 *   <Drawer open={aberto} onClose={fechar} title="Nova conta">
 *     <ContaForm tipo="PAGAR" onSalvo={() => { fechar(); recarregar(); }} onCancelar={fechar} />
 *   </Drawer>
 */
const VAZIO = {
  tipo: 'PAGAR',
  descricao: '',
  valorOriginal: '',
  dataVencimento: '',
  categoriaId: '',
  parceiroId: '',
  numeroDocumento: '',
  quantidadeParcelas: '1',
  intervaloMeses: '1',
  dividirValor: false,
  acrescimo: '',
  desconto: '',
};

const TIPOS = [
  { value: 'PAGAR', label: 'A pagar', icon: ArrowUpRight },
  { value: 'RECEBER', label: 'A receber', icon: ArrowDownLeft },
];

function estadoInicial(inicial, tipo) {
  return {
    ...VAZIO,
    tipo: inicial?.tipo ?? tipo ?? 'PAGAR',
    descricao: inicial?.descricao ?? '',
    valorOriginal: inicial?.valorOriginal != null ? String(inicial.valorOriginal) : '',
    dataVencimento: inicial?.dataVencimento ?? hojeIso(),
    categoriaId: inicial?.categoriaId != null ? String(inicial.categoriaId) : '',
    parceiroId: inicial?.parceiroId != null ? String(inicial.parceiroId) : '',
    numeroDocumento: inicial?.numeroDocumento ?? '',
  };
}

/** Parceiros compatíveis com o tipo (fornecedor paga, cliente recebe; "ambos" serve aos dois). */
function parceirosDoTipo(lista, tipo) {
  const aceitos = tipo === 'RECEBER' ? ['CLIENTE', 'AMBOS'] : ['FORNECEDOR', 'AMBOS'];
  return lista.filter((p) => p.ativo !== false && (!p.tipo || aceitos.includes(p.tipo)));
}

function validar(form, valorParcela) {
  const erros = {};
  if (!form.descricao.trim()) erros.descricao = 'Escreva uma descrição.';
  if (paraNumero(form.valorOriginal) <= 0) erros.valorOriginal = 'Informe um valor maior que zero.';
  if (!form.dataVencimento) erros.dataVencimento = 'Escolha a data de vencimento.';
  if (!form.categoriaId) erros.categoriaId = 'Escolha uma categoria.';
  const parcelas = Number(form.quantidadeParcelas);
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 360) erros.quantidadeParcelas = 'Use de 1 a 360 parcelas.';
  if (paraNumero(form.desconto) < 0 || paraNumero(form.acrescimo) < 0) erros.ajustes = 'Ajustes não podem ser negativos.';
  if (paraNumero(form.valorOriginal) > 0 && valorParcela <= 0) erros.desconto = 'O desconto não pode ser maior que o valor.';
  return erros;
}

function montarDto(form, modo) {
  const base = {
    descricao: form.descricao.trim(),
    valorOriginal: centavos(paraNumero(form.valorOriginal)),
    dataVencimento: form.dataVencimento,
    tipo: form.tipo,
    categoriaId: Number(form.categoriaId),
    parceiroId: form.parceiroId ? Number(form.parceiroId) : null,
  };
  if (modo === 'editar') return { ...base, quantidadeParcelas: 1 };
  return {
    ...base,
    quantidadeParcelas: Number(form.quantidadeParcelas) || 1,
    intervaloMeses: Math.max(1, Number(form.intervaloMeses) || 1),
    dividirValor: Boolean(form.dividirValor),
    numeroDocumento: form.numeroDocumento.trim() || null,
    acrescimo: centavos(paraNumero(form.acrescimo)),
    desconto: centavos(paraNumero(form.desconto)),
  };
}

function BotaoMais({ rotulo, onClick }) {
  return (
    <Button type="button" variant="secondary" size="icon" onClick={onClick} aria-label={rotulo} title={rotulo}>
      <Plus className="w-4 h-4" aria-hidden="true" />
    </Button>
  );
}

export default function ContaForm({
  modo = 'criar',
  inicial,
  tipo,
  onSalvo,
  onCancelar,
  salvar,
  rotuloSalvar,
  categorias,
  parceiros,
  className,
}) {
  const toast = useToast();
  const pode = usePermissao();
  const idMais = useId();
  const editando = modo === 'editar';
  const completo = modo === 'criar';

  const [form, setForm] = useState(() => estadoInicial(inicial, tipo));
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [sugerindo, setSugerindo] = useState(false);
  const [maisAberto, setMaisAberto] = useState(false);
  const [criacaoRapida, setCriacaoRapida] = useState(null);
  const [cats, setCats] = useState(categorias ?? []);
  const [pars, setPars] = useState(parceiros ?? []);
  const [assinaturasAtivas, setAssinaturasAtivas] = useState([]);

  const podeVerAssinaturas = completo && pode('ASSINATURA_VISUALIZAR');

  // Carrega listas que não vieram por props (respostas descartadas se o form fechar antes)
  useEffect(() => {
    let vigente = true;
    if (!categorias) catApi.listar().then((l) => vigente && setCats(l ?? []), () => {});
    if (!parceiros) parApi.listar().then((l) => vigente && setPars(l ?? []), () => {});
    if (podeVerAssinaturas) assinaturasApi.listarAtivas().then((l) => vigente && setAssinaturasAtivas(l ?? []), () => {});
    return () => { vigente = false; };
  }, [categorias, parceiros, podeVerAssinaturas]);

  const set = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const setEv = (campo) => (e) => set(campo)(e.target.type === 'checkbox' ? e.target.checked : e.target.value);

  const parcelas = Math.max(1, Number(form.quantidadeParcelas) || 1);
  const valorBase = paraNumero(form.valorOriginal);
  const valorPorParcela = form.dividirValor && parcelas > 1 ? valorBase / parcelas : valorBase;
  const valorParcela = centavos(valorPorParcela + paraNumero(form.acrescimo) - paraNumero(form.desconto));
  const temAjuste = paraNumero(form.acrescimo) > 0 || paraNumero(form.desconto) > 0 || parcelas > 1;

  const parceirosVisiveis = useMemo(() => {
    const lista = parceirosDoTipo(pars, form.tipo);
    // Mantém o parceiro já escolhido na lista mesmo que o tipo dele não combine
    const atual = pars.find((p) => String(p.id) === form.parceiroId);
    return atual && !lista.includes(atual) ? [atual, ...lista] : lista;
  }, [pars, form.tipo, form.parceiroId]);

  async function sugerirCategoria() {
    if (!form.descricao.trim()) {
      setErros((e) => ({ ...e, descricao: 'Escreva a descrição antes de pedir uma sugestão.' }));
      return;
    }
    setSugerindo(true);
    try {
      const par = pars.find((p) => String(p.id) === form.parceiroId);
      const s = await catApi.sugerir({ descricao: form.descricao, parceiroNome: par ? (par.nomeFantasia || par.razaoSocial) : null });
      if (s?.encontrou) {
        set('categoriaId')(String(s.categoriaId));
        toast.success(`Categoria sugerida: ${s.categoriaDescricao}.`);
      } else {
        toast.info('Não encontrei uma categoria com segurança. Escolha na lista.');
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSugerindo(false);
    }
  }

  function preencherComAssinatura(id) {
    const a = assinaturasAtivas.find((x) => String(x.id) === id);
    if (!a) return;
    setForm((f) => ({
      ...f,
      tipo: 'PAGAR',
      descricao: a.descricao ?? f.descricao,
      valorOriginal: a.valor != null ? String(a.valor) : f.valorOriginal,
      categoriaId: a.categoriaId != null ? String(a.categoriaId) : f.categoriaId,
      parceiroId: a.parceiroId != null ? String(a.parceiroId) : f.parceiroId,
      dataVencimento: a.diaVencimento ? hojeIso(proximaCobranca(a.diaVencimento)) : f.dataVencimento,
    }));
  }

  async function enviar(e) {
    e.preventDefault();
    // O form pode viver num portal (Drawer/Modal) dentro de outro <form>: não deixa o submit subir
    e.stopPropagation();
    const novosErros = validar(form, valorParcela);
    setErros(novosErros);
    setErroApi('');
    if (Object.keys(novosErros).length) {
      if (novosErros.quantidadeParcelas || novosErros.ajustes || novosErros.desconto) setMaisAberto(true);
      return;
    }
    const dto = montarDto(form, modo);
    setSalvando(true);
    try {
      let resultado;
      if (salvar) resultado = await salvar(dto);
      else if (editando) resultado = await contasApi.atualizar(inicial.id, dto);
      else resultado = await contasApi.criar(dto);
      onSalvo?.(resultado);
    } catch (err) {
      setErroApi(err.message || 'Não foi possível salvar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  const rotuloParceiro = form.tipo === 'RECEBER' ? 'Cliente' : 'Fornecedor';
  const textoBotao = rotuloSalvar ?? (editando ? 'Salvar' : 'Criar conta');

  return (
    <>
      <form onSubmit={enviar} noValidate className={cn('space-y-4', className)} aria-label={editando ? 'Editar conta' : 'Nova conta'}>
        {podeVerAssinaturas && assinaturasAtivas.length > 0 && (
          <FormField label="Preencher com uma assinatura" help="Opcional: copia descrição, valor, categoria e o próximo vencimento.">
            <FormSelect value="" onChange={(e) => preencherComAssinatura(e.target.value)}>
              <option value="">Escolher assinatura…</option>
              {assinaturasAtivas.map((a) => (
                <option key={a.id} value={a.id}>{a.descricao} · {formatarMoeda(a.valor)} · dia {a.diaVencimento}</option>
              ))}
            </FormSelect>
          </FormField>
        )}

        <fieldset className="space-y-1.5">
          <legend className="text-[0.8125rem] font-medium text-text-primary/75 mb-1.5">Tipo</legend>
          <SegmentedControl label="Tipo da conta" items={TIPOS} value={form.tipo} onChange={set('tipo')} fullWidth />
        </fieldset>

        <FormField label="Descrição" required error={erros.descricao}>
          <FormInput value={form.descricao} onChange={setEv('descricao')} maxLength={255} autoComplete="off" placeholder="Ex.: Aluguel de outubro" />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={parcelas > 1 && !form.dividirValor ? 'Valor de cada parcela (R$)' : 'Valor (R$)'} required error={erros.valorOriginal}>
            <FormInput type="number" inputMode="decimal" step="0.01" min="0.01" value={form.valorOriginal} onChange={setEv('valorOriginal')} placeholder="0,00" />
          </FormField>
          <FormField label="Vencimento" required error={erros.dataVencimento}>
            <FormInput type="date" value={form.dataVencimento} onChange={setEv('dataVencimento')} />
          </FormField>
        </div>

        <FormField label="Categoria" required error={erros.categoriaId}>
          <div className="flex gap-2">
            <FormSelect value={form.categoriaId} onChange={setEv('categoriaId')} className="flex-1">
              <option value="">Escolha uma categoria</option>
              <CategoriaOptions cats={cats} />
            </FormSelect>
            <Button
              type="button"
              variant="secondary"
              onClick={sugerirCategoria}
              loading={sugerindo}
              leftIcon={<Sparkles className="w-4 h-4" aria-hidden="true" />}
              title="Sugere a categoria pela descrição"
            >
              Sugerir
            </Button>
            {pode('CATEGORIA_CRIAR') && <BotaoMais rotulo="Criar categoria" onClick={() => setCriacaoRapida('categoria')} />}
          </div>
        </FormField>

        <FormField label={`${rotuloParceiro} (opcional)`} help={parceirosVisiveis.length ? undefined : `Nenhum ${rotuloParceiro.toLowerCase()} cadastrado ainda.`}>
          <div className="flex gap-2">
            <FormSelect value={form.parceiroId} onChange={setEv('parceiroId')} className="flex-1">
              <option value="">Sem {rotuloParceiro.toLowerCase()}</option>
              {parceirosVisiveis.map((p) => (
                <option key={p.id} value={p.id}>{p.nomeFantasia || p.razaoSocial}</option>
              ))}
            </FormSelect>
            {pode('PARCEIRO_CRIAR') && <BotaoMais rotulo={`Criar ${rotuloParceiro.toLowerCase()}`} onClick={() => setCriacaoRapida('parceiro')} />}
          </div>
        </FormField>

        {completo && (
          <div className="rounded-2xl border border-border">
            <button
              type="button"
              aria-expanded={maisAberto}
              aria-controls={idMais}
              onClick={() => setMaisAberto((v) => !v)}
              className="w-full min-h-11 flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium text-text-primary/80 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-text-primary/50" aria-hidden="true" />
                Mais opções
                <span className="text-xs font-normal text-text-primary/55">documento, parcelas, desconto</span>
              </span>
              <ChevronDown className={cn('w-4 h-4 transition-transform', maisAberto && 'rotate-180')} aria-hidden="true" />
            </button>
            <Revelar aberto={maisAberto} id={idMais}>
              <div className="px-4 pb-4 pt-1 space-y-4">
                <FormField label="Nº do documento" help="Nota fiscal, boleto ou contrato (opcional).">
                  <FormInput value={form.numeroDocumento} onChange={setEv('numeroDocumento')} maxLength={50} autoComplete="off" placeholder="Ex.: NF-001" />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Parcelas" error={erros.quantidadeParcelas}>
                    <FormInput type="number" inputMode="numeric" min="1" max="360" step="1" value={form.quantidadeParcelas} onChange={setEv('quantidadeParcelas')} />
                  </FormField>
                  <FormField label="A cada (meses)">
                    <FormInput type="number" inputMode="numeric" min="1" max="12" step="1" value={form.intervaloMeses} onChange={setEv('intervaloMeses')} disabled={parcelas < 2} />
                  </FormField>
                </div>
                {parcelas > 1 && (
                  <label className="flex items-start gap-3 min-h-11 cursor-pointer text-sm text-text-primary/80">
                    <input type="checkbox" checked={form.dividirValor} onChange={setEv('dividirValor')} className="mt-0.5 w-5 h-5 accent-primary" />
                    <span>
                      Dividir o valor entre as parcelas
                      <span className="block text-xs text-text-primary/55">Desmarcado: cada parcela tem o valor informado.</span>
                    </span>
                  </label>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Acréscimo (R$)" help="Somado a cada parcela." error={erros.ajustes}>
                    <FormInput type="number" inputMode="decimal" step="0.01" min="0" value={form.acrescimo} onChange={setEv('acrescimo')} placeholder="0,00" />
                  </FormField>
                  <FormField label="Desconto (R$)" help="Subtraído de cada parcela." error={erros.desconto}>
                    <FormInput type="number" inputMode="decimal" step="0.01" min="0" value={form.desconto} onChange={setEv('desconto')} placeholder="0,00" />
                  </FormField>
                </div>
              </div>
            </Revelar>
          </div>
        )}

        {completo && temAjuste && valorBase > 0 && (
          <p className="text-sm text-text-primary/75" aria-live="polite">
            {parcelas > 1 ? `${parcelas} parcelas de ` : 'Total: '}
            <strong className="font-semibold tabular-nums text-text-primary">{formatarMoeda(valorParcela)}</strong>
            {parcelas > 1 && <> · total <span className="tabular-nums">{formatarMoeda(valorParcela * parcelas)}</span></>}
          </p>
        )}

        {editando && (
          <p className="text-xs text-text-primary/60">
            Nº do documento, parcelas e ajustes ficam como foram criados. Para mudar uma conta já paga, estorne a baixa antes.
          </p>
        )}

        {erroApi && (
          <p role="alert" className="rounded-xl border border-error/25 bg-error/[0.08] px-3 py-2 text-sm text-error">{erroApi}</p>
        )}

        <div className="sticky bottom-0 -mx-1 px-1 pt-2 pb-1 bg-surface-low flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          {onCancelar && <Button type="button" variant="ghost" onClick={onCancelar}>Cancelar</Button>}
          <Button type="submit" loading={salvando} leftIcon={editando ? null : <Plus className="w-4 h-4" aria-hidden="true" />}>
            {textoBotao}
          </Button>
        </div>
      </form>

      {criacaoRapida && (
        <ModalCriacaoRapida
          tipo={criacaoRapida}
          onFechar={() => setCriacaoRapida(null)}
          onCriado={(novo) => {
            if (criacaoRapida === 'categoria') {
              setCats((l) => [...l, novo]);
              set('categoriaId')(String(novo.id));
            } else {
              setPars((l) => [...l, novo]);
              set('parceiroId')(String(novo.id));
            }
            setCriacaoRapida(null);
          }}
        />
      )}
    </>
  );
}
