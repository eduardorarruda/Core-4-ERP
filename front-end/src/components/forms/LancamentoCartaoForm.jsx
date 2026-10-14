/**
 * LancamentoCartaoForm — o ÚNICO formulário de lançamento do cartão (criar e editar).
 * Substitui as 3 cópias antigas (criação e edição em Cartoes.jsx e o
 * FormularioNovoLancamentoInline da conciliação de cartão).
 *
 * ── API (estável) ────────────────────────────────────────────────────────────────────
 *   <LancamentoCartaoForm
 *     modo="criar" | "editar"          // padrão 'criar'
 *     cartaoId={1}                     // obrigatório quando não houver `enviar` (usa a API do cartão)
 *     inicial={{ id, descricao, valor, dataCompra, categoriaId, parceiroId, tipo,
 *                quantidadeParcelas, dividirValor }}   // tudo opcional; `id` é exigido em 'editar'
 *     onSalvo={(resposta, dto) => …}   // depois de salvar com sucesso
 *     onCancelar={() => …}             // botão Cancelar (omitido = sem botão)
 *
 *     // opcionais
 *     enviar={(dto) => Promise}        // persistência própria (ex.: conciliação cria e vincula).
 *                                      // Sem ela: POST/PUT /api/cartoes/{cartaoId}/lancamentos.
 *     diaFechamento={3}                // mostra "Entra na fatura de nov/26" (regra do FaturaHelper)
 *     parceiroObrigatorio={true}       // conciliação: false (rótulo vira "Parceiro (opcional)")
 *     mostrarTipo={true}               // Saída/Entrada
 *     mostrarParcelas={modo==='criar'} // nº de parcelas + dividir valor
 *     rotuloSalvar="Criar e vincular"  // padrão: 'Adicionar lançamento' | 'Salvar'
 *     categorias={[…]} parceiros={[…]} // listas já carregadas (senão o form busca)
 *     compacto                         // 1 coluna (drawer estreito / linha de conciliação)
 *   />
 *
 * dto enviado: { descricao, valor, dataCompra, categoriaId, parceiroId|null, tipo,
 *                quantidadeParcelas?, dividirValor? } — parcelas só quando `mostrarParcelas`.
 * Erros da API aparecem dentro do formulário (role="alert"); o form não dispara toast.
 * Botões de "+" abrem o ModalCriacaoRapida (nova categoria / novo parceiro).
 */
import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Plus } from 'lucide-react';
import { cartoes as cartoesApi, categorias as catApi, parceiros as parApi } from '../../lib/api';
import { useCarga } from '../../hooks/useCarga';
import { formatarMoeda } from '../../lib/formatters';
import FormField, { inputCls, FormSelect } from '../ui/FormField';
import CategoriaOptions from '../ui/CategoriaOptions';
import Button from '../ui/Button';
import { SegmentedControl } from '../ui/Tabs';
import ModalCriacaoRapida from '../ui/ModalCriacaoRapida';
import { faturaDaCompra, rotuloFatura } from '../cartoes/faturas';
import { cn } from '../../lib/utils';

const hojeIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const TIPOS = [
  { value: 'SAIDA', label: 'Compra', icon: ArrowUpRight },
  { value: 'ENTRADA', label: 'Estorno ou crédito', icon: ArrowDownLeft },
];

const nomeParceiro = (p) => p.nomeFantasia || p.razaoSocial || 'Sem nome';
const ehFornecedor = (p) => !p.tipo || p.tipo === 'FORNECEDOR' || p.tipo === 'AMBOS';

function estadoInicial(inicial, modo) {
  return {
    descricao: inicial?.descricao ?? '',
    valor: inicial?.valor != null ? String(Math.abs(Number(inicial.valor))) : '',
    dataCompra: inicial?.dataCompra ?? (modo === 'criar' ? hojeIso() : ''),
    categoriaId: inicial?.categoriaId != null ? String(inicial.categoriaId) : '',
    parceiroId: inicial?.parceiroId != null ? String(inicial.parceiroId) : '',
    tipo: inicial?.tipo ?? 'SAIDA',
    quantidadeParcelas: String(inicial?.quantidadeParcelas ?? 1),
    dividirValor: inicial?.dividirValor ?? true,
  };
}

function validar(f, { parceiroObrigatorio, mostrarParcelas }) {
  const e = {};
  if (!f.descricao.trim()) e.descricao = 'Diga o que foi comprado.';
  if (!(Number(f.valor) > 0)) e.valor = 'Informe um valor maior que zero.';
  if (!f.dataCompra) e.dataCompra = 'Informe a data da compra.';
  if (!f.categoriaId) e.categoriaId = 'Escolha uma categoria.';
  if (parceiroObrigatorio && !f.parceiroId) e.parceiroId = 'Escolha onde a compra foi feita.';
  const n = Number(f.quantidadeParcelas);
  if (mostrarParcelas && (!Number.isInteger(n) || n < 1 || n > 48)) e.quantidadeParcelas = 'Use de 1 a 48 parcelas.';
  return e;
}

function BotaoCriar({ rotulo, onClick }) {
  return (
    <Button type="button" variant="secondary" size="icon" onClick={onClick} aria-label={rotulo} title={rotulo} className="shrink-0">
      <Plus className="w-4 h-4" aria-hidden="true" />
    </Button>
  );
}

export default function LancamentoCartaoForm({
  modo = 'criar',
  cartaoId,
  inicial,
  onSalvo,
  onCancelar,
  enviar,
  diaFechamento,
  parceiroObrigatorio = true,
  mostrarTipo = true,
  mostrarParcelas,
  rotuloSalvar,
  categorias,
  parceiros,
  compacto = false,
}) {
  const comParcelas = mostrarParcelas ?? modo === 'criar';
  const [form, setForm] = useState(() => estadoInicial(inicial, modo));
  const [erros, setErros] = useState({});
  const [erroApi, setErroApi] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [criacao, setCriacao] = useState(null);
  const [novasCats, setNovasCats] = useState([]);
  const [novosPars, setNovosPars] = useState([]);

  const cargaCats = useCarga(() => catApi.listar(), ['cats'], { ativo: !categorias, inicial: [] });
  const cargaPars = useCarga(() => parApi.listar(), ['pars'], { ativo: !parceiros, inicial: [] });
  const listaCats = useMemo(() => [...(categorias ?? cargaCats.dados ?? []), ...novasCats], [categorias, cargaCats.dados, novasCats]);
  const listaPars = useMemo(() => {
    const todos = [...(parceiros ?? cargaPars.dados ?? []), ...novosPars];
    return todos
      .filter((p) => ehFornecedor(p) || String(p.id) === form.parceiroId)
      .sort((a, b) => nomeParceiro(a).localeCompare(nomeParceiro(b), 'pt-BR'));
  }, [parceiros, cargaPars.dados, novosPars, form.parceiroId]);

  const set = (campo) => (e) => {
    const valor = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setForm((f) => ({ ...f, [campo]: valor }));
    if (erros[campo]) setErros((x) => ({ ...x, [campo]: undefined }));
  };

  const parcelas = Number(form.quantidadeParcelas) || 1;
  const valorNum = Number(form.valor) || 0;
  const fatura = diaFechamento ? faturaDaCompra(form.dataCompra, diaFechamento) : null;
  const resumoParcelas = comParcelas && parcelas > 1 && valorNum > 0
    ? (form.dividirValor
      ? `${parcelas}× de ${formatarMoeda(valorNum / parcelas)} (total ${formatarMoeda(valorNum)})`
      : `${parcelas}× de ${formatarMoeda(valorNum)} (total ${formatarMoeda(valorNum * parcelas)})`)
    : null;

  async function salvar(e) {
    e.preventDefault();
    e.stopPropagation();
    const problemas = validar(form, { parceiroObrigatorio, mostrarParcelas: comParcelas });
    setErros(problemas);
    if (Object.keys(problemas).length) return;

    const dto = {
      descricao: form.descricao.trim(),
      valor: Number(form.valor),
      dataCompra: form.dataCompra,
      categoriaId: Number(form.categoriaId),
      parceiroId: form.parceiroId ? Number(form.parceiroId) : null,
      tipo: form.tipo,
      ...(comParcelas ? { quantidadeParcelas: parcelas, dividirValor: Boolean(form.dividirValor) } : {}),
    };

    setSalvando(true);
    setErroApi('');
    try {
      let resposta;
      if (enviar) resposta = await enviar(dto);
      else if (modo === 'editar') resposta = await cartoesApi.lancamentos.atualizar(cartaoId, inicial?.id, dto);
      else resposta = await cartoesApi.lancamentos.criar(cartaoId, dto);
      onSalvo?.(resposta, dto);
    } catch (err) {
      setErroApi(err?.message || 'Não foi possível salvar o lançamento. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  const grade = compacto ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 sm:grid-cols-2 gap-4';

  return (
    <>
      <form onSubmit={salvar} noValidate className="space-y-5">
        {erroApi && (
          <p role="alert" className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {erroApi}
          </p>
        )}

        {mostrarTipo && (
          <SegmentedControl label="Tipo do lançamento" value={form.tipo} onChange={set('tipo')} items={TIPOS} fullWidth />
        )}

        <div className={grade}>
          <div className={compacto ? '' : 'sm:col-span-2'}>
            <FormField label="Descrição" required error={erros.descricao}>
              <input className={inputCls} value={form.descricao} onChange={set('descricao')} autoComplete="off" maxLength={255} />
            </FormField>
          </div>

          <FormField label={comParcelas && parcelas > 1 && form.dividirValor ? 'Valor total (R$)' : 'Valor (R$)'} required error={erros.valor}>
            <input type="number" inputMode="decimal" step="0.01" min="0.01" className={cn(inputCls, 'tabular-nums')} value={form.valor} onChange={set('valor')} />
          </FormField>

          <FormField
            label="Data da compra"
            required
            error={erros.dataCompra}
            help={fatura ? `Entra na fatura de ${rotuloFatura(fatura.ano, fatura.mes, { curto: false })}.` : undefined}
          >
            <input type="date" className={inputCls} value={form.dataCompra} onChange={set('dataCompra')} />
          </FormField>

          <FormField label="Categoria" required error={erros.categoriaId}>
            <div className="flex gap-2 items-start">
              <FormSelect value={form.categoriaId} onChange={set('categoriaId')} className="flex-1 min-w-0">
                <option value="">{cargaCats.carregando ? 'Carregando…' : 'Selecione'}</option>
                <CategoriaOptions cats={listaCats} />
              </FormSelect>
              <BotaoCriar rotulo="Nova categoria" onClick={() => setCriacao('categoria')} />
            </div>
          </FormField>

          <FormField label={parceiroObrigatorio ? 'Onde comprou (parceiro)' : 'Parceiro (opcional)'} required={parceiroObrigatorio} error={erros.parceiroId}>
            <div className="flex gap-2 items-start">
              <FormSelect value={form.parceiroId} onChange={set('parceiroId')} className="flex-1 min-w-0">
                <option value="">{cargaPars.carregando ? 'Carregando…' : parceiroObrigatorio ? 'Selecione' : 'Nenhum'}</option>
                {listaPars.map((p) => <option key={p.id} value={p.id}>{nomeParceiro(p)}</option>)}
              </FormSelect>
              <BotaoCriar rotulo="Novo parceiro" onClick={() => setCriacao('parceiro')} />
            </div>
          </FormField>

          {comParcelas && (
            <FormField label="Parcelas" required error={erros.quantidadeParcelas} help={resumoParcelas ?? 'Use 1 para compra à vista.'}>
              <input type="number" inputMode="numeric" min="1" max="48" step="1" className={cn(inputCls, 'tabular-nums')} value={form.quantidadeParcelas} onChange={set('quantidadeParcelas')} />
            </FormField>
          )}

          {comParcelas && parcelas > 1 && (
            <label className="flex items-center gap-3 min-h-11 self-end cursor-pointer text-sm text-text-primary/80">
              <input type="checkbox" checked={Boolean(form.dividirValor)} onChange={set('dividirValor')} className="w-5 h-5 accent-[var(--color-primary)]" />
              Dividir o valor entre as parcelas
            </label>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          {onCancelar && (
            <Button type="button" variant="ghost" onClick={onCancelar} disabled={salvando}>Cancelar</Button>
          )}
          <Button type="submit" loading={salvando}>
            {rotuloSalvar ?? (modo === 'editar' ? 'Salvar' : 'Adicionar lançamento')}
          </Button>
        </div>
      </form>

      {criacao && (
        <ModalCriacaoRapida
          tipo={criacao}
          onFechar={() => setCriacao(null)}
          onCriado={(novo) => {
            if (criacao === 'categoria') {
              setNovasCats((l) => [...l, novo]);
              setForm((f) => ({ ...f, categoriaId: String(novo.id) }));
            } else {
              setNovosPars((l) => [...l, novo]);
              setForm((f) => ({ ...f, parceiroId: String(novo.id) }));
            }
            setCriacao(null);
          }}
        />
      )}
    </>
  );
}
