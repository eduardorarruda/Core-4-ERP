import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Repeat, X, CheckCircle, AlertCircle } from 'lucide-react';
import { contas as contasApi, assinaturas as assinaturasApi, contasCorrentes as ccApi } from '../lib/api';
import FormField, { inputCls } from '../components/ui/FormField';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { brl, formatDate } from '../lib/formatters';
import { useToast } from '../hooks/useToast';
import { MESES_COMPLETOS } from '../lib/constants';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = MESES_COMPLETOS;

const STATUS_VARIANT = {
  PENDENTE: 'warning',
  ATRASADO: 'error',
  PAGO: 'success',
  RECEBIDO: 'info',
};

const emptyBaixa = { contaCorrenteId: '', dataPagamento: '', juros: 0, multa: 0 };

function pad2(n) { return String(n).padStart(2, '0'); }
function isoDate(y, m, d) { return `${y}-${pad2(m)}-${pad2(d)}`; }

/* ── Card de uma conta (usado no painel do desktop e na agenda mobile) ── */
function ContaCard({ conta, ccs, baixaAbertaId, onToggleBaixa, baixaForm, setBaixaForm, salvando, onConfirmar }) {
  const c = conta;
  const isPagar = c.tipo === 'PAGAR';
  const isAtrasado = c.status === 'ATRASADO';
  const podeBaixar = c.status === 'PENDENTE' || c.status === 'ATRASADO';
  const accent = isAtrasado ? 'border-error/60' : isPagar ? 'border-error/30' : 'border-secondary/30';
  const valorCor = isPagar ? 'text-error' : 'text-secondary';
  const aberta = baixaAbertaId === c.id;

  return (
    <div className={`rounded-xl p-3 space-y-2 bg-surface-high/40 border ${accent}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">{c.descricao}</p>
          {c.parceiroNome && <p className="text-xs text-text-primary/60 truncate">{c.parceiroNome}</p>}
          {c.categoriaDescricao && <p className="text-xs text-text-primary/40 truncate">{c.categoriaDescricao}</p>}
        </div>
        <div className="text-right shrink-0 space-y-1">
          <p className={`text-sm font-bold ${valorCor}`}>R$ {brl(c.valorOriginal)}</p>
          <Badge variant={STATUS_VARIANT[c.status] ?? 'neutral'} size="sm">{c.status}</Badge>
        </div>
      </div>

      {podeBaixar && (
        <>
          <button
            onClick={() => onToggleBaixa(c)}
            className="flex items-center gap-1.5 min-h-11 text-xs font-bold uppercase tracking-wide text-primary hover:text-primary/80 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            {aberta ? 'Fechar' : 'Baixar conta'}
          </button>

          {aberta && (
            <div className="space-y-3 pt-2 border-t border-text-primary/10">
              <FormField label="Conta Corrente">
                <select
                  className={`${inputCls} appearance-none min-h-11`}
                  value={baixaForm.contaCorrenteId}
                  onChange={(e) => setBaixaForm((f) => ({ ...f, contaCorrenteId: e.target.value }))}
                >
                  <option value="">— Selecionar —</option>
                  {ccs.map((cc) => <option key={cc.id} value={cc.id}>{cc.descricao}</option>)}
                </select>
              </FormField>
              <FormField label="Data do Pagamento">
                <input
                  type="date"
                  className={`${inputCls} min-h-11`}
                  value={baixaForm.dataPagamento}
                  onChange={(e) => setBaixaForm((f) => ({ ...f, dataPagamento: e.target.value }))}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Juros">
                  <input type="number" min="0" step="0.01" className={`${inputCls} min-h-11`} value={baixaForm.juros} onChange={(e) => setBaixaForm((f) => ({ ...f, juros: e.target.value }))} />
                </FormField>
                <FormField label="Multa">
                  <input type="number" min="0" step="0.01" className={`${inputCls} min-h-11`} value={baixaForm.multa} onChange={(e) => setBaixaForm((f) => ({ ...f, multa: e.target.value }))} />
                </FormField>
              </div>
              <Button
                variant="primary"
                size="md"
                className="w-full"
                loading={salvando}
                disabled={!baixaForm.contaCorrenteId || !baixaForm.dataPagamento}
                onClick={() => onConfirmar(c.id)}
              >
                Confirmar Baixa
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Card de uma assinatura ── */
function AssinaturaCard({ assinatura: a }) {
  return (
    <div className="rounded-xl p-3 flex items-center justify-between bg-primary/5 border border-primary/20">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">{a.descricao}</p>
        {a.categoriaDescricao && <p className="text-xs text-text-primary/40 truncate">{a.categoriaDescricao}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Repeat className="w-4 h-4 text-primary/70" />
        <span className="text-sm font-bold text-primary">R$ {brl(a.valor)}</span>
      </div>
    </div>
  );
}

export default function Calendario() {
  const toast = useToast();
  const today = new Date();
  const [mesAtual, setMesAtual] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [contas, setContas] = useState([]);
  const [assinaturas, setAssinaturas] = useState([]);
  const [ccs, setCcs] = useState([]);
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [baixaAberta, setBaixaAberta] = useState(null);
  const [baixaForm, setBaixaForm] = useState(emptyBaixa);
  const [salvandoBaixa, setSalvandoBaixa] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(false);
  const [scrollHoje, setScrollHoje] = useState(0);

  const hojeRef = useRef(null);

  const ano = mesAtual.getFullYear();
  const mes = mesAtual.getMonth();

  const carregarContas = useCallback(async () => {
    const res = await contasApi.listar({ size: 500 });
    setContas(res.content || []);
  }, []);

  const carregarTudo = useCallback(async () => {
    setCarregando(true);
    setErroCarga(false);
    const resultados = await Promise.allSettled([
      contasApi.listar({ size: 500 }),
      assinaturasApi.listar(),
      ccApi.listar(),
    ]);
    const [rc, ra, rcc] = resultados;
    let falhou = false;
    if (rc.status === 'fulfilled') setContas(rc.value?.content || []); else falhou = true;
    if (ra.status === 'fulfilled') setAssinaturas(ra.value || []); else falhou = true;
    if (rcc.status === 'fulfilled') setCcs(rcc.value || []); else falhou = true;
    if (falhou) {
      setErroCarga(true);
      toast.error('Não foi possível carregar todos os dados do calendário. Verifique sua conexão e tente novamente.');
    }
    setCarregando(false);
  }, [toast]);

  useEffect(() => {
    carregarTudo();
  }, [carregarTudo]);

  const contasDoMes = contas.filter((c) => {
    if (!c.dataVencimento) return false;
    const d = new Date(c.dataVencimento + 'T00:00:00');
    return d.getFullYear() === ano && d.getMonth() === mes;
  });

  const contasPorDia = {};
  for (const c of contasDoMes) {
    const dia = parseInt(c.dataVencimento.split('-')[2], 10);
    if (!contasPorDia[dia]) contasPorDia[dia] = [];
    contasPorDia[dia].push(c);
  }

  const assinPorDia = {};
  for (const a of assinaturas) {
    if (!a.ativa) continue;
    const d = a.diaVencimento;
    if (!assinPorDia[d]) assinPorDia[d] = [];
    assinPorDia[d].push(a);
  }

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < primeiroDia; i++) cells.push(null);
  for (let d = 1; d <= ultimoDia; d++) cells.push(d);

  // Dias do mês (ordenados) que possuem contas ou assinaturas — base da agenda mobile
  const diasComEventos = [...new Set([
    ...Object.keys(contasPorDia).map(Number),
    ...Object.keys(assinPorDia).map(Number),
  ])].sort((a, b) => a - b);

  function navegarMes(delta) {
    setMesAtual((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    setDiaSelecionado(null);
    setBaixaAberta(null);
  }

  function irParaHoje() {
    setMesAtual(new Date(today.getFullYear(), today.getMonth(), 1));
    setDiaSelecionado(today.getDate());
    setBaixaAberta(null);
    setScrollHoje((n) => n + 1);
  }

  // Rola a agenda mobile até o dia de hoje quando o usuário toca em "Hoje"
  useEffect(() => {
    if (scrollHoje && hojeRef.current) {
      hojeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [scrollHoje, diasComEventos.length]);

  const contasDia = diaSelecionado ? (contasPorDia[diaSelecionado] || []) : [];
  const assinDia = diaSelecionado ? (assinPorDia[diaSelecionado] || []) : [];

  async function executarBaixa(contaId) {
    setSalvandoBaixa(true);
    try {
      await contasApi.baixar(contaId, {
        contaCorrenteId: Number(baixaForm.contaCorrenteId),
        dataPagamento: baixaForm.dataPagamento,
        juros: Number(baixaForm.juros) || 0,
        multa: Number(baixaForm.multa) || 0,
        acrescimo: 0,
        desconto: 0,
      });
      toast.success('Conta baixada com sucesso!');
      setBaixaAberta(null);
      setBaixaForm(emptyBaixa);
      try {
        await carregarContas();
      } catch {
        toast.error('A conta foi baixada, mas não foi possível atualizar a lista. Recarregue a página.');
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSalvandoBaixa(false);
    }
  }

  function abrirBaixa(conta) {
    if (baixaAberta === conta.id) { setBaixaAberta(null); return; }
    const dataHoje = isoDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
    setBaixaForm({ ...emptyBaixa, dataPagamento: dataHoje });
    setBaixaAberta(conta.id);
  }

  const isHoje = (dia) => dia === today.getDate() && mes === today.getMonth() && ano === today.getFullYear();
  const temAtrasado = (dia) => (contasPorDia[dia] || []).some((c) => c.status === 'ATRASADO');

  const baixaProps = {
    ccs,
    baixaAbertaId: baixaAberta,
    onToggleBaixa: abrirBaixa,
    baixaForm,
    setBaixaForm,
    salvando: salvandoBaixa,
    onConfirmar: executarBaixa,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendário Financeiro"
        subtitle={`${MESES[mes]} ${ano}`}
        actions={
          <Button variant="secondary" size="sm" leftIcon={<CalendarDays className="w-4 h-4" />} onClick={irParaHoje}>
            Hoje
          </Button>
        }
      />

      {/* Aviso de falha de carregamento */}
      {erroCarga && (
        <div className="flex items-center gap-3 rounded-2xl p-4 bg-error/10 border border-error/30">
          <AlertCircle className="w-5 h-5 text-error shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">Não foi possível carregar os dados do calendário.</p>
            <p className="text-xs text-text-primary/60">Os itens exibidos podem estar incompletos.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={carregarTudo}>Tentar novamente</Button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Card do calendário */}
        <div className="flex-1 rounded-2xl p-4 sm:p-5 bg-surface-low/60 border border-text-primary/10 shadow-card backdrop-blur-sm">
          {/* Navegação de mês */}
          <div className="flex items-center justify-between mb-5">
            <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => navegarMes(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-sm sm:text-base font-bold text-text-primary font-display tracking-wide">
              {MESES[mes]} {ano}
            </span>
            <Button variant="ghost" size="icon" aria-label="Próximo mês" onClick={() => navegarMes(1)}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* ── Grid mensal (somente desktop ≥ lg) ── */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-7 mb-2">
              {DIAS_SEMANA.map((d) => (
                <div key={d} className="text-center text-xs font-bold uppercase tracking-widest text-text-primary/40 py-2">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((dia, idx) => {
                if (dia === null) return <div key={`empty-${idx}`} className="min-h-[72px]" />;

                const contasDiaArr = contasPorDia[dia] || [];
                const assinDiaArr = assinPorDia[dia] || [];
                const pagar = contasDiaArr.filter((c) => c.tipo === 'PAGAR' && (c.status === 'PENDENTE' || c.status === 'ATRASADO'));
                const receber = contasDiaArr.filter((c) => c.tipo === 'RECEBER' && (c.status === 'PENDENTE' || c.status === 'ATRASADO'));
                const pagos = contasDiaArr.filter((c) => c.status === 'PAGO' || c.status === 'RECEBIDO');
                const totalDia = pagar.reduce((s, c) => s + Number(c.valorOriginal), 0)
                  + receber.reduce((s, c) => s + Number(c.valorOriginal), 0);
                const totalEventos = contasDiaArr.length + assinDiaArr.length;
                const ativo = diaSelecionado === dia;
                const atrasado = temAtrasado(dia);
                const hoje = isHoje(dia);

                const stateCls = hoje
                  ? 'bg-primary/10 border border-primary/40'
                  : ativo
                    ? 'bg-surface-high border border-primary/40'
                    : atrasado
                      ? 'bg-error/5 border-l-2 border-l-error/60 border-y border-r border-y-text-primary/5 border-r-text-primary/5'
                      : 'border border-transparent hover:bg-surface-high/50';

                return (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => { setDiaSelecionado(dia === diaSelecionado ? null : dia); setBaixaAberta(null); }}
                    aria-label={`Dia ${dia}${totalEventos > 0 ? `, ${totalEventos} evento${totalEventos !== 1 ? 's' : ''}` : ''}`}
                    aria-pressed={ativo}
                    className={`min-h-[72px] w-full text-left rounded-xl p-1.5 cursor-pointer transition-colors ${stateCls}`}
                  >
                    <p className={`text-xs font-bold mb-1 ${hoje ? 'text-primary' : 'text-text-primary/60'}`}>{dia}</p>

                    <div className="flex flex-wrap items-center gap-1">
                      {pagar.length > 0 && <span className="inline-block w-2 h-2 rounded-full bg-error" aria-hidden="true" />}
                      {receber.length > 0 && <span className="inline-block w-2 h-2 rounded-full bg-secondary" aria-hidden="true" />}
                      {pagos.length > 0 && <span className="inline-block w-2 h-2 rounded-full bg-primary" aria-hidden="true" />}
                      {assinDiaArr.length > 0 && <Repeat className="w-2.5 h-2.5 text-primary/70" aria-hidden="true" />}
                    </div>

                    {totalDia > 0 && (
                      <p className="text-xs text-text-primary/50 mt-1 leading-tight truncate">R$ {brl(totalDia)}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Agenda em lista (somente mobile < lg) ── */}
          <div className="lg:hidden">
            {carregando ? (
              <p className="text-sm text-text-primary/50 text-center py-10">Carregando eventos…</p>
            ) : diasComEventos.length === 0 ? (
              <p className="text-sm text-text-primary/50 text-center py-10">
                {erroCarga ? 'Não foi possível carregar os eventos deste mês.' : 'Nenhuma conta ou assinatura neste mês.'}
              </p>
            ) : (
              <div className="space-y-5">
                {diasComEventos.map((dia) => {
                  const contasDiaArr = contasPorDia[dia] || [];
                  const assinDiaArr = assinPorDia[dia] || [];
                  const totalEventos = contasDiaArr.length + assinDiaArr.length;
                  const iso = isoDate(ano, mes + 1, dia);
                  const dow = new Date(ano, mes, dia).getDay();
                  const hoje = isHoje(dia);

                  return (
                    <div key={dia} ref={hoje ? hojeRef : null} className="space-y-2 scroll-mt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text-primary">
                          {DIAS_SEMANA[dow]}, {formatDate(iso)}
                        </span>
                        {hoje && <Badge variant="success" size="sm">Hoje</Badge>}
                        <span className="ml-auto text-xs text-text-primary/40">
                          {totalEventos} {totalEventos === 1 ? 'item' : 'itens'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {contasDiaArr.map((c) => (
                          <ContaCard key={c.id} conta={c} {...baixaProps} />
                        ))}
                        {assinDiaArr.map((a) => (
                          <AssinaturaCard key={`a-${a.id}`} assinatura={a} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-text-primary/10">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block bg-error" />
              <span className="text-xs text-text-primary/50 uppercase tracking-wider">A Pagar</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block bg-secondary" />
              <span className="text-xs text-text-primary/50 uppercase tracking-wider">A Receber</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block bg-primary" />
              <span className="text-xs text-text-primary/50 uppercase tracking-wider">Pago/Recebido</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Repeat className="w-3 h-3 text-primary/70" />
              <span className="text-xs text-text-primary/50 uppercase tracking-wider">Assinatura</span>
            </div>
          </div>
        </div>

        {/* Painel lateral do dia (somente desktop ≥ lg) */}
        {diaSelecionado && (
          <div className="hidden lg:flex w-full lg:w-80 xl:w-96 rounded-2xl p-5 flex-col gap-4 bg-surface-low/60 border border-text-primary/10 shadow-card backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-text-primary">
                  {formatDate(isoDate(ano, mes + 1, diaSelecionado))}
                </h2>
                <p className="text-xs text-text-primary/40 uppercase tracking-widest mt-0.5">
                  {contasDia.length + assinDia.length} evento{contasDia.length + assinDia.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fechar painel"
                onClick={() => { setDiaSelecionado(null); setBaixaAberta(null); }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {contasDia.length === 0 && assinDia.length === 0 && (
              <p className="text-sm text-text-primary/40 text-center py-8">Nenhum evento neste dia.</p>
            )}

            {contasDia.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-text-primary/40 mb-2">Contas</p>
                {contasDia.map((c) => (
                  <ContaCard key={c.id} conta={c} {...baixaProps} />
                ))}
              </div>
            )}

            {assinDia.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-text-primary/40 mb-2">Assinaturas</p>
                {assinDia.map((a) => (
                  <AssinaturaCard key={a.id} assinatura={a} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
