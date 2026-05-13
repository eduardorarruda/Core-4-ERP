import React, { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Repeat, X, CheckCircle } from 'lucide-react';
import { contas as contasApi, assinaturas as assinaturasApi, contasCorrentes as ccApi } from '../lib/api';
import FormField, { inputCls } from '../components/ui/FormField';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import { brl } from '../lib/formatters';
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
        <div className="flex-1 rounded-[18px] p-5" style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(250,250,250,.07)', backdropFilter: 'blur(8px)', boxShadow: '0 1px 3px rgba(0,0,0,.3),0 8px 32px rgba(0,0,0,.2)' }}>
          {/* Navegação mês */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => navegarMes(-1)}
              aria-label="Mês anterior"
              className="p-2 rounded-xl transition-colors text-text-primary/60 hover:text-text-primary"
              style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(250,250,250,.06)' }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-text-primary font-display tracking-wide">
              {MESES[mes]} {ano}
            </span>
            <button
              onClick={() => navegarMes(1)}
              aria-label="Próximo mês"
              className="p-2 rounded-xl transition-colors text-text-primary/60 hover:text-text-primary"
              style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(250,250,250,.06)' }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Cabeçalho dias da semana */}
          <div className="grid grid-cols-7 mb-2">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold uppercase tracking-widest text-text-primary/30 py-2 font-mono">
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
              const atrasado = temAtrasado(dia);

              const cellStyle = isHoje(dia)
                ? { background: 'rgba(110,255,192,.12)', border: '1px solid rgba(110,255,192,.3)' }
                : ativo
                  ? { background: 'rgba(255,255,255,.06)', border: '1px solid rgba(110,255,192,.2)' }
                  : atrasado
                    ? { background: 'rgba(255,180,171,.04)', borderLeft: '2px solid rgba(255,180,171,.5)', borderTop: '1px solid rgba(250,250,250,.04)', borderRight: '1px solid rgba(250,250,250,.04)', borderBottom: '1px solid rgba(250,250,250,.04)' }
                    : { background: 'transparent', border: '1px solid transparent' };

              return (
                <div
                  key={dia}
                  onClick={() => { setDiaSelecionado(dia === diaSelecionado ? null : dia); setBaixaAberta(null); }}
                  className="min-h-[70px] rounded-xl p-1.5 cursor-pointer transition-all hover:scale-[1.03]"
                  style={{ ...cellStyle, ...(!isHoje(dia) && !ativo && !atrasado ? { '--hover-bg': 'rgba(255,255,255,.04)' } : {}) }}
                  onMouseEnter={(e) => { if (!isHoje(dia) && !ativo) e.currentTarget.style.background = 'rgba(255,255,255,.04)'; }}
                  onMouseLeave={(e) => { if (!isHoje(dia) && !ativo) e.currentTarget.style.background = 'transparent'; }}
                >
                  <p className={`text-xs font-bold mb-1 font-mono ${isHoje(dia) ? 'text-primary' : 'text-text-primary/60'}`}>{dia}</p>

                  <div className="flex flex-wrap gap-0.5">
                    {pagar.length > 0 && <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'rgba(255,180,171,.8)' }} title="A Pagar" />}
                    {receber.length > 0 && <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'rgba(172,199,255,.8)' }} title="A Receber" />}
                    {pagos.length > 0 && <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'rgba(110,255,192,.7)' }} title="Pago/Recebido" />}
                    {assinDiaArr.length > 0 && <Repeat className="w-2.5 h-2.5" style={{ color: 'rgba(110,255,192,.6)' }} title="Assinatura" />}
                  </div>

                  {totalDia > 0 && (
                    <p className="text-[9px] text-text-primary/40 mt-0.5 leading-tight font-mono">{brl(totalDia)}</p>
                  )}

                  {contasDiaArr.length + assinDiaArr.length > 2 && (
                    <p className="text-[9px] text-text-primary/30 font-mono">+{contasDiaArr.length + assinDiaArr.length - 2}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-4 mt-5 pt-4" style={{ borderTop: '1px solid rgba(250,250,250,.06)' }}>
            {[
              { color: 'rgba(255,180,171,.8)', label: 'A Pagar' },
              { color: 'rgba(172,199,255,.8)', label: 'A Receber' },
              { color: 'rgba(110,255,192,.7)', label: 'Pago/Recebido' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
                <span className="text-[10px] text-text-primary/40 font-mono uppercase tracking-wider">{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <Repeat className="w-2.5 h-2.5" style={{ color: 'rgba(110,255,192,.6)' }} />
              <span className="text-[10px] text-text-primary/40 font-mono uppercase tracking-wider">Assinatura</span>
            </div>
          </div>
        </div>

        {/* Painel lateral */}
        {diaSelecionado && (
          <div className="w-full lg:w-80 xl:w-96 rounded-[18px] p-5 flex flex-col gap-4" style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(250,250,250,.07)', backdropFilter: 'blur(8px)', boxShadow: '0 1px 3px rgba(0,0,0,.3),0 8px 32px rgba(0,0,0,.2)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-text-primary font-mono">
                  {pad2(diaSelecionado)}/{pad2(mes + 1)}/{ano}
                </h2>
                <p className="text-[10px] text-text-primary/30 uppercase tracking-widest font-mono mt-0.5">
                  {contasDia.length + assinDia.length} evento{contasDia.length + assinDia.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => { setDiaSelecionado(null); setBaixaAberta(null); }}
                aria-label="Fechar painel"
                className="p-1.5 text-text-primary/40 hover:text-text-primary rounded-lg transition-colors"
                style={{ background: 'rgba(255,255,255,.04)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {contasDia.length === 0 && assinDia.length === 0 && (
              <p className="text-sm text-text-primary/30 text-center py-8 font-mono">Nenhum evento neste dia.</p>
            )}

            {contasDia.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-primary/30 font-mono mb-2">Contas</p>
                {contasDia.map((c) => {
                  const isPagar = c.tipo === 'PAGAR';
                  const isAtrasado = c.status === 'ATRASADO';
                  const accentColor = isAtrasado ? 'rgba(255,180,171,.6)' : isPagar ? 'rgba(255,180,171,.4)' : 'rgba(172,199,255,.4)';
                  return (
                    <div key={c.id} className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(255,255,255,.03)', border: `1px solid ${accentColor}` }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-text-primary truncate">{c.descricao}</p>
                          {c.parceiroNome && <p className="text-[10px] text-text-primary/40">{c.parceiroNome}</p>}
                          <p className="text-[10px] text-text-primary/30 font-mono">{c.categoriaDescricao}</p>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <p className="text-xs font-bold font-mono" style={{ color: isPagar ? '#FFB4AB' : '#ACC7FF' }}>R$ {brl(c.valorOriginal)}</p>
                          <Badge variant={STATUS_VARIANT[c.status] ?? 'neutral'} size="sm">{c.status}</Badge>
                        </div>
                      </div>

                      {(c.status === 'PENDENTE' || c.status === 'ATRASADO') && (
                        <>
                          <button
                            onClick={() => baixaAberta === c.id ? setBaixaAberta(null) : abrirBaixa(c)}
                            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors font-mono"
                          >
                            <CheckCircle className="w-3 h-3" />
                            {baixaAberta === c.id ? 'Fechar' : 'Baixar'}
                          </button>

                          {baixaAberta === c.id && (
                            <div className="space-y-2 pt-2" style={{ borderTop: '1px solid rgba(250,250,250,.06)' }}>
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
                                className="w-full font-bold text-[10px] uppercase tracking-widest py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
                                style={{ background: 'linear-gradient(135deg,#6EFFC0,#2bdb96)', color: '#003824' }}
                              >
                                {salvandoBaixa ? 'Baixando...' : 'Confirmar Baixa'}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {assinDia.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-primary/30 font-mono mb-2">Assinaturas</p>
                {assinDia.map((a) => (
                  <div key={a.id} className="rounded-xl p-3 flex items-center justify-between" style={{ background: 'rgba(110,255,192,.04)', border: '1px solid rgba(110,255,192,.15)' }}>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate">{a.descricao}</p>
                      <p className="text-[10px] text-text-primary/30 font-mono">{a.categoriaDescricao}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Repeat className="w-3 h-3 text-primary/60" />
                      <span className="text-xs font-bold text-primary font-mono">R$ {brl(a.valor)}</span>
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
