import React, { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Repeat, X, CheckCircle } from 'lucide-react';
import { contas as contasApi, assinaturas as assinaturasApi, contasCorrentes as ccApi } from '../lib/api';
import FormField, { inputCls } from '../components/ui/FormField';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import { brl } from '../lib/formatters';
import { useToast } from '../hooks/useToast';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const STATUS_VARIANT = {
  PENDENTE: 'warning',
  ATRASADO: 'error',
  PAGO: 'success',
  RECEBIDO: 'info',
};

const emptyBaixa = { contaCorrenteId: '', dataPagamento: '', juros: 0, multa: 0 };

function pad2(n) { return String(n).padStart(2, '0'); }
function isoDate(y, m, d) { return `${y}-${pad2(m)}-${pad2(d)}`; }

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

  const ano = mesAtual.getFullYear();
  const mes = mesAtual.getMonth();

  const carregarContas = useCallback(async () => {
    try {
      const res = await contasApi.listar({ size: 500 });
      setContas(res.content || []);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    carregarContas();
    assinaturasApi.listar().then(setAssinaturas).catch(() => {});
    ccApi.listar().then(setCcs).catch(() => {});
  }, [carregarContas]);

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

  function navegarMes(delta) {
    setMesAtual((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    setDiaSelecionado(null);
    setBaixaAberta(null);
  }

  function irParaHoje() {
    setMesAtual(new Date(today.getFullYear(), today.getMonth(), 1));
    setDiaSelecionado(today.getDate());
    setBaixaAberta(null);
  }

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
      await carregarContas();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSalvandoBaixa(false);
    }
  }

  function abrirBaixa(conta) {
    const dataHoje = isoDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
    setBaixaForm({ ...emptyBaixa, dataPagamento: dataHoje });
    setBaixaAberta(conta.id);
  }

  const isHoje = (dia) => dia === today.getDate() && mes === today.getMonth() && ano === today.getFullYear();
  const temAtrasado = (dia) => (contasPorDia[dia] || []).some((c) => c.status === 'ATRASADO');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendário Financeiro"
        subtitle={`${MESES[mes]} ${ano}`}
        actions={
          <button
            onClick={irParaHoje}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-text-primary/10 text-text-primary/60 hover:text-text-primary hover:border-text-primary/20 font-bold text-xs uppercase tracking-widest transition-colors"
          >
            <CalendarDays className="w-4 h-4" />
            Hoje
          </button>
        }
      />

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Grid do calendário */}
        <div className="flex-1 bg-surface-medium border border-text-primary/5 rounded-2xl p-4">
          {/* Navegação mês */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navegarMes(-1)}
              aria-label="Mês anterior"
              className="p-2 rounded-xl bg-surface hover:bg-surface-highest transition-colors text-text-primary"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-text-primary font-display">
              {MESES[mes]} {ano}
            </span>
            <button
              onClick={() => navegarMes(1)}
              aria-label="Próximo mês"
              className="p-2 rounded-xl bg-surface hover:bg-surface-highest transition-colors text-text-primary"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Cabeçalho dias da semana */}
          <div className="grid grid-cols-7 mb-2">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold uppercase tracking-widest text-text-primary/40 py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Células */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((dia, idx) => {
              if (dia === null) return <div key={`empty-${idx}`} className="min-h-[70px]" />;

              const contasDiaArr = contasPorDia[dia] || [];
              const assinDiaArr = assinPorDia[dia] || [];
              const pagar = contasDiaArr.filter((c) => c.tipo === 'PAGAR' && (c.status === 'PENDENTE' || c.status === 'ATRASADO'));
              const receber = contasDiaArr.filter((c) => c.tipo === 'RECEBER' && (c.status === 'PENDENTE' || c.status === 'ATRASADO'));
              const pagos = contasDiaArr.filter((c) => c.status === 'PAGO' || c.status === 'RECEBIDO');
              const totalDia = pagar.reduce((s, c) => s + Number(c.valorOriginal), 0)
                + receber.reduce((s, c) => s + Number(c.valorOriginal), 0);
              const ativo = diaSelecionado === dia;

              return (
                <div
                  key={dia}
                  onClick={() => { setDiaSelecionado(dia === diaSelecionado ? null : dia); setBaixaAberta(null); }}
                  className={[
                    'min-h-[70px] rounded-xl p-1.5 cursor-pointer transition-all border',
                    isHoje(dia)
                      ? 'bg-primary/20 border-primary/30'
                      : ativo
                        ? 'bg-surface-highest border-primary/20'
                        : 'border-transparent hover:bg-surface-highest',
                    temAtrasado(dia) ? '!border-l-2 !border-l-error' : '',
                  ].join(' ')}
                >
                  <p className={`text-xs font-bold mb-1 ${isHoje(dia) ? 'text-primary' : 'text-text-primary/70'}`}>{dia}</p>

                  <div className="flex flex-wrap gap-0.5">
                    {pagar.length > 0 && <span className="inline-block w-2 h-2 rounded-full bg-error/70" title="A Pagar" />}
                    {receber.length > 0 && <span className="inline-block w-2 h-2 rounded-full bg-secondary/70" title="A Receber" />}
                    {pagos.length > 0 && <span className="inline-block w-2 h-2 rounded-full bg-green-400/60" title="Pago/Recebido" />}
                    {assinDiaArr.length > 0 && <Repeat className="w-2.5 h-2.5 text-primary/60" title="Assinatura" />}
                  </div>

                  {totalDia > 0 && (
                    <p className="text-[9px] text-text-primary/40 mt-0.5 leading-tight">{brl(totalDia)}</p>
                  )}

                  {contasDiaArr.length + assinDiaArr.length > 2 && (
                    <p className="text-[9px] text-text-primary/30">+{contasDiaArr.length + assinDiaArr.length - 2}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-text-primary/5">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-error/70 inline-block" />
              <span className="text-[10px] text-text-primary/50">A Pagar</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary/70 inline-block" />
              <span className="text-[10px] text-text-primary/50">A Receber</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400/60 inline-block" />
              <span className="text-[10px] text-text-primary/50">Pago/Recebido</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Repeat className="w-2.5 h-2.5 text-primary/60" />
              <span className="text-[10px] text-text-primary/50">Assinatura</span>
            </div>
          </div>
        </div>

        {/* Painel lateral */}
        {diaSelecionado && (
          <div className="w-full lg:w-80 xl:w-96 bg-surface-medium border border-text-primary/5 rounded-2xl p-4 flex flex-col gap-4 animate-slide-in-right">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-text-primary font-display">
                {pad2(diaSelecionado)}/{pad2(mes + 1)}/{ano}
              </h2>
              <button
                onClick={() => { setDiaSelecionado(null); setBaixaAberta(null); }}
                aria-label="Fechar painel"
                className="p-1.5 text-text-primary/40 hover:text-text-primary hover:bg-surface-highest rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {contasDia.length === 0 && assinDia.length === 0 && (
              <p className="text-sm text-text-primary/40 text-center py-6">Nenhum evento neste dia.</p>
            )}

            {contasDia.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 mb-2">Contas</p>
                {contasDia.map((c) => (
                  <div key={c.id} className="bg-surface rounded-xl p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-text-primary truncate">{c.descricao}</p>
                        {c.parceiroNome && <p className="text-[10px] text-text-primary/50">{c.parceiroNome}</p>}
                        <p className="text-[10px] text-text-primary/40">{c.categoriaDescricao}</p>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <p className="text-xs font-bold text-text-primary">R$ {brl(c.valorOriginal)}</p>
                        <Badge variant={STATUS_VARIANT[c.status] ?? 'neutral'} size="sm">{c.status}</Badge>
                      </div>
                    </div>

                    {(c.status === 'PENDENTE' || c.status === 'ATRASADO') && (
                      <>
                        <button
                          onClick={() => baixaAberta === c.id ? setBaixaAberta(null) : abrirBaixa(c)}
                          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                        >
                          <CheckCircle className="w-3 h-3" />
                          {baixaAberta === c.id ? 'Fechar' : 'Baixar'}
                        </button>

                        {baixaAberta === c.id && (
                          <div className="space-y-2 pt-2 border-t border-text-primary/5">
                            <FormField label="Conta Corrente">
                              <select
                                className={`${inputCls} appearance-none text-xs py-2`}
                                value={baixaForm.contaCorrenteId}
                                onChange={(e) => setBaixaForm((f) => ({ ...f, contaCorrenteId: e.target.value }))}
                              >
                                <option value="">— Selecionar —</option>
                                {ccs.map((cc) => <option key={cc.id} value={cc.id}>{cc.descricao}</option>)}
                              </select>
                            </FormField>
                            <FormField label="Data Pagamento">
                              <input
                                type="date"
                                className={`${inputCls} text-xs py-2`}
                                value={baixaForm.dataPagamento}
                                onChange={(e) => setBaixaForm((f) => ({ ...f, dataPagamento: e.target.value }))}
                              />
                            </FormField>
                            <div className="grid grid-cols-2 gap-2">
                              <FormField label="Juros">
                                <input type="number" min="0" step="0.01" className={`${inputCls} text-xs py-2`} value={baixaForm.juros} onChange={(e) => setBaixaForm((f) => ({ ...f, juros: e.target.value }))} />
                              </FormField>
                              <FormField label="Multa">
                                <input type="number" min="0" step="0.01" className={`${inputCls} text-xs py-2`} value={baixaForm.multa} onChange={(e) => setBaixaForm((f) => ({ ...f, multa: e.target.value }))} />
                              </FormField>
                            </div>
                            <button
                              disabled={!baixaForm.contaCorrenteId || !baixaForm.dataPagamento || salvandoBaixa}
                              onClick={() => executarBaixa(c.id)}
                              className="w-full bg-primary text-on-primary font-bold text-[10px] uppercase tracking-widest py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
                            >
                              {salvandoBaixa ? 'Baixando...' : 'Confirmar Baixa'}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {assinDia.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 mb-2">Assinaturas</p>
                {assinDia.map((a) => (
                  <div key={a.id} className="bg-surface rounded-xl p-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate">{a.descricao}</p>
                      <p className="text-[10px] text-text-primary/40">{a.categoriaDescricao}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Repeat className="w-3 h-3 text-primary/60" />
                      <span className="text-xs font-bold text-primary">R$ {brl(a.valor)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
