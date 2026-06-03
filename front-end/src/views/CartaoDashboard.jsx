import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, TrendingUp, Wallet, AlertCircle, FileText, Loader2,
  AlertTriangle, PieChart as PieIcon, BarChart2, Calendar,
} from 'lucide-react';
import { cartoes as cartoesApi } from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import PeriodoSelector from '../components/ui/PeriodoSelector';
import { brl } from '../lib/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const COLORS = ['#6EFFC0', '#ACC7FF', '#FFB4AB', '#FFD580', '#C8A4FF', '#80E5FF', '#FF9F80'];

function buildChartData(resumo) {
  const meses = [...new Set(resumo.map((r) => `${r.mes}/${r.ano}`))];
  const cats = [...new Set(resumo.map((r) => r.categoriaNome))];
  return {
    data: meses.map((m) => {
      const [mes, ano] = m.split('/').map(Number);
      const entry = { mes: `${MONTH_NAMES[mes - 1]}/${String(ano).slice(2)}` };
      cats.forEach((cat) => {
        const row = resumo.find((r) => r.mes === mes && r.ano === ano && r.categoriaNome === cat);
        entry[cat] = row ? parseFloat(row.totalGasto) : 0;
      });
      return entry;
    }),
    cats,
  };
}

const cardSurface = { background: 'rgba(255,255,255,.025)', border: '1px solid rgba(250,250,250,.07)' };
const h2Cls = 'text-xs font-bold uppercase tracking-widest text-text-primary/40 font-mono mb-4';
const emptyVal = { mesInicio: null, anoInicio: null, mesFim: null, anoFim: null };

export default function CartaoDashboard() {
  const navigate = useNavigate();
  const [cartoes, setCartoes] = useState([]);
  const [resumo, setResumo] = useState([]);
  const [bi, setBi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingBi, setLoadingBi] = useState(false);
  const [periodo, setPeriodo] = useState(emptyVal);

  const carregarBi = useCallback(async (p) => {
    setLoadingBi(true);
    try {
      const params = new URLSearchParams();
      if (p.mesInicio) params.set('mesInicio', p.mesInicio);
      if (p.anoInicio) params.set('anoInicio', p.anoInicio);
      if (p.mesFim) params.set('mesFim', p.mesFim);
      if (p.anoFim) params.set('anoFim', p.anoFim);
      const res = await cartoesApi.dashboardBI(params.toString());
      setBi(res);
    } catch {
      setBi(null);
    } finally {
      setLoadingBi(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      cartoesApi.listar(),
      cartoesApi.dashboard(),
    ])
      .then(([lista, res]) => { setCartoes(lista); setResumo(res); })
      .catch(() => {})
      .finally(() => setLoading(false));
    carregarBi(emptyVal);
  }, [carregarBi]);

  const totalLimite = cartoes.reduce((acc, c) => acc + parseFloat(c.limite ?? 0), 0);
  const totalUsado = cartoes.reduce((acc, c) => acc + parseFloat(c.limiteUsado ?? 0), 0);
  const totalDisponivel = totalLimite - totalUsado;
  const { data: chartData, cats } = buildChartData(resumo);

  const metricas = [
    { label: 'Total de Cartões', value: cartoes.length, icon: CreditCard, color: 'text-text-primary', bg: 'rgba(255,255,255,.04)', border: 'rgba(250,250,250,.08)' },
    { label: 'Limite Total', value: `R$ ${brl(totalLimite)}`, icon: Wallet, color: 'text-primary', bg: 'rgba(110,255,192,.07)', border: 'rgba(110,255,192,.2)' },
    { label: 'Limite Usado', value: `R$ ${brl(totalUsado)}`, icon: TrendingUp, color: 'text-error', bg: 'rgba(255,180,171,.07)', border: 'rgba(255,180,171,.2)' },
    { label: 'Disponível', value: `R$ ${brl(totalDisponivel)}`, icon: AlertCircle, color: 'text-secondary', bg: 'rgba(172,199,255,.07)', border: 'rgba(172,199,255,.2)' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-text-primary/40">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard de Cartões"
        subtitle="Visão geral e análise dos seus cartões de crédito"
        icon={<CreditCard className="w-5 h-5" />}
        actions={
          <button
            onClick={() => navigate('/cartoes')}
            className="flex items-center gap-2 border border-text-primary/10 text-text-primary/60 hover:text-text-primary font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-colors"
          >
            <FileText className="w-4 h-4" /> Lançamentos
          </button>
        }
      />

      {/* §8 — Alertas de fechamento iminente */}
      {bi?.alertasFechamento?.length > 0 && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-300">Faturas fechando em breve</p>
            <ul className="mt-1 space-y-0.5">
              {bi.alertasFechamento.map((a) => (
                <li key={a.cartaoId} className="text-xs text-text-primary/70">
                  {a.nomeCartao} — fecha em {a.diasRestantes === 0 ? 'hoje' : `${a.diasRestantes} dia(s)`}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricas.map((m) => (
          <div key={m.label} className="rounded-2xl p-5" style={{ background: m.bg, border: `1px solid ${m.border}` }}>
            <div className="flex items-center gap-2 mb-3">
              <m.icon className={`w-4 h-4 ${m.color}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 font-mono">{m.label}</span>
            </div>
            <p className={`text-2xl font-bold font-mono ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Cards individuais */}
      {cartoes.length > 0 && (
        <div>
          <h2 className={h2Cls}>Cartões</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cartoes.map((c) => {
              const usado = parseFloat(c.limiteUsado ?? 0);
              const limite = parseFloat(c.limite ?? 0);
              const pct = limite > 0 ? Math.min(100, (usado / limite) * 100) : 0;
              const corBarra = pct >= 80 ? '#FFB4AB' : pct >= 50 ? '#FFD580' : '#6EFFC0';
              return (
                <div key={c.id} className="rounded-2xl p-5 space-y-4" style={cardSurface}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-text-primary">{c.nome}</p>
                      <p className="text-xs text-text-primary/40 mt-0.5">
                        Fecha dia {c.diaFechamento} · Vence dia {c.diaVencimento}
                      </p>
                    </div>
                    <CreditCard className="w-5 h-5 text-text-primary/20" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-text-primary/50">Usado</span>
                      <span className="text-text-primary font-bold">R$ {brl(usado)} / R$ {brl(limite)}</span>
                    </div>
                    <div className="h-2 bg-surface-highest rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: corBarra }} />
                    </div>
                    <p className="text-[10px] text-text-primary/40 font-mono text-right">{pct.toFixed(1)}% utilizado</p>
                  </div>
                  <button onClick={() => navigate('/cartoes')} className="w-full text-center text-xs font-bold uppercase tracking-widest text-primary hover:underline py-1">
                    Ver lançamentos →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gráfico por categoria (resumo) */}
      {chartData.length > 0 && cats.length > 0 && (
        <div className="rounded-2xl p-6" style={cardSurface}>
          <h2 className={h2Cls}>Gastos por Categoria (período recente)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'rgba(255,255,255,.4)', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,.4)', fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${brl(v)}`} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 12 }} formatter={(v, name) => [`R$ ${brl(v)}`, name]} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace', paddingTop: 12 }} />
              {cats.map((cat, idx) => (
                <Bar key={cat} dataKey={cat} stackId="a" fill={COLORS[idx % COLORS.length]} radius={idx === cats.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── §7 — Painéis BI ──────────────────────────────────────────── */}
      <div className="rounded-2xl p-6" style={cardSurface}>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-secondary" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-text-primary/50 font-mono">Análise BI — Período Personalizado</h2>
          </div>
          <PeriodoSelector value={periodo} onChange={(p) => { setPeriodo(p); carregarBi(p); }} />
        </div>

        {loadingBi ? (
          <div className="flex items-center justify-center py-12 gap-3 text-text-primary/40">
            <Loader2 className="w-5 h-5 animate-spin" /> <span className="text-sm">Carregando análises...</span>
          </div>
        ) : bi ? (
          <div className="space-y-8">

            {/* Painel 1 — Evolução Mensal */}
            {bi.evolucaoMensal?.length > 0 && (
              <div>
                <h3 className={h2Cls}>Evolução Mensal da Fatura</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={bi.evolucaoMensal.map((d) => ({ ...d, label: `${MONTH_NAMES[d.mes - 1]}/${String(d.ano).slice(2)}`, total: parseFloat(d.totalLiquido) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgba(255,255,255,.4)', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,.4)', fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${brl(v)}`} />
                    <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 12 }} formatter={(v) => [`R$ ${brl(v)}`, 'Total líquido']} />
                    <Line type="monotone" dataKey="total" stroke="#6EFFC0" strokeWidth={2} dot={{ fill: '#6EFFC0', r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Painéis 2 e 3 lado a lado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Painel 2 — Distribuição de Limite */}
              {bi.distribuicaoLimite?.length > 0 && (
                <div>
                  <h3 className={h2Cls}>Distribuição de Limite</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={bi.distribuicaoLimite.map((d) => ({ name: d.nomeCartao, value: parseFloat(d.limite) }))} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {bi.distribuicaoLimite.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `R$ ${brl(v)}`} contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Painel 3 — Gastos por Parceiro */}
              {bi.gastosPorParceiro?.length > 0 && (
                <div>
                  <h3 className={h2Cls}>Top 10 Parceiros</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={bi.gastosPorParceiro.map((d) => ({ nome: d.nomeParceiro.length > 15 ? d.nomeParceiro.slice(0, 15) + '…' : d.nomeParceiro, total: parseFloat(d.total) }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,.4)', fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${brl(v)}`} />
                      <YAxis type="category" dataKey="nome" width={90} tick={{ fontSize: 10, fill: 'rgba(255,255,255,.6)', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 12 }} formatter={(v) => [`R$ ${brl(v)}`, 'Total']} />
                      <Bar dataKey="total" fill="#ACC7FF" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Painéis 4 e 5 lado a lado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Painel 4 — Próximas Faturas */}
              {bi.proximasFaturas?.length > 0 && (
                <div>
                  <h3 className={h2Cls}>Próximas Faturas</h3>
                  <ul className="space-y-2">
                    {bi.proximasFaturas.map((f, i) => {
                      const cor = f.diasRestantes <= 3 ? 'text-error border-error/20 bg-error/5' : f.diasRestantes <= 7 ? 'text-amber-400 border-amber-400/20 bg-amber-400/5' : 'text-primary border-primary/20 bg-primary/5';
                      return (
                        <li key={i} className={`rounded-xl px-4 py-3 border ${cor} flex justify-between items-center`}>
                          <div>
                            <p className="text-sm font-bold">{f.nomeCartao}</p>
                            <p className="text-xs opacity-70">Vence em {f.diasRestantes === 0 ? 'hoje' : `${f.diasRestantes} dia(s)`}</p>
                          </div>
                          <span className="font-mono font-bold text-sm">R$ {brl(f.valorAcumulado)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Painel 5 — Projeção do Mês */}
              {bi.projecaoMes && (
                <div>
                  <h3 className={h2Cls}>Projeção do Mês Corrente</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Acumulado até hoje', value: bi.projecaoMes.totalAcumulado, color: 'text-text-primary' },
                      { label: 'Média diária', value: bi.projecaoMes.mediaDiaria, color: 'text-secondary' },
                      { label: 'Projeção final', value: bi.projecaoMes.projecaoFinal, color: 'text-error' },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between items-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                        <span className="text-xs text-text-primary/60">{item.label}</span>
                        <span className={`font-mono font-bold text-sm ${item.color}`}>R$ {brl(item.value)}</span>
                      </div>
                    ))}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-text-primary/40 mb-1">
                        <span>{bi.projecaoMes.diasDecorridos} dias decorridos</span>
                        <span>{bi.projecaoMes.diasRestantes} dias restantes</span>
                      </div>
                      <div className="h-2 bg-surface-highest rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${Math.min(100, (bi.projecaoMes.diasDecorridos / (bi.projecaoMes.diasDecorridos + bi.projecaoMes.diasRestantes)) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Painel 6 — Impacto de Parcelamentos */}
            {bi.impactoParcelamentos?.length > 0 && (
              <div>
                <h3 className={h2Cls}>Comprometimento Futuro por Parcelamentos</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={bi.impactoParcelamentos.map((d) => ({ label: `${MONTH_NAMES[d.mes - 1]}/${String(d.ano).slice(2)}`, total: parseFloat(d.totalComprometido), parcelas: d.qtdParcelas }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgba(255,255,255,.4)', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,.4)', fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${brl(v)}`} />
                    <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 12 }} formatter={(v, name) => [name === 'total' ? `R$ ${brl(v)}` : v, name === 'total' ? 'Total comprometido' : 'Qtd parcelas']} />
                    <Bar dataKey="total" fill="#C8A4FF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Painel 7 — Assinaturas vs. Avulsos */}
            {bi.assinaturasVsAvulsos && (
              <div>
                <h3 className={h2Cls}>Assinaturas vs. Gastos Avulsos</h3>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Assinaturas', value: parseFloat(bi.assinaturasVsAvulsos.totalAssinaturas) },
                          { name: 'Avulsos', value: parseFloat(bi.assinaturasVsAvulsos.totalAvulsos) },
                        ]}
                        cx="50%" cy="50%" outerRadius={65} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        <Cell fill="#6EFFC0" />
                        <Cell fill="#ACC7FF" />
                      </Pie>
                      <Tooltip formatter={(v) => `R$ ${brl(v)}`} contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 text-sm w-full md:w-auto">
                    <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-primary inline-block shrink-0" /><span className="text-text-primary/60">Assinaturas:</span><span className="font-mono font-bold text-primary">R$ {brl(bi.assinaturasVsAvulsos.totalAssinaturas)}</span></div>
                    <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-secondary inline-block shrink-0" /><span className="text-text-primary/60">Avulsos:</span><span className="font-mono font-bold text-secondary">R$ {brl(bi.assinaturasVsAvulsos.totalAvulsos)}</span></div>
                  </div>
                </div>
              </div>
            )}

          </div>
        ) : (
          <p className="text-sm text-text-primary/40 text-center py-8">Sem dados para o período selecionado.</p>
        )}
      </div>

      {cartoes.length === 0 && (
        <div className="text-center py-20 text-text-primary/40 space-y-3">
          <CreditCard className="w-10 h-10 mx-auto opacity-20" />
          <p className="text-sm">Nenhum cartão cadastrado ainda.</p>
          <button onClick={() => navigate('/cartoes')} className="text-primary font-bold text-xs uppercase tracking-widest hover:underline">
            Cadastrar cartão
          </button>
        </div>
      )}
    </div>
  );
}
