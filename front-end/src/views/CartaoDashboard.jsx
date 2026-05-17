import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, TrendingUp, Wallet, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { cartoes as cartoesApi } from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import { brl } from '../lib/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const CATEGORY_COLORS = [
  '#6EFFC0', '#ACC7FF', '#FFB4AB', '#FFD580', '#C8A4FF',
  '#80E5FF', '#FF9F80', '#B5E8A0', '#FF80AB', '#80C7FF',
];

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

export default function CartaoDashboard() {
  const navigate = useNavigate();
  const [cartoes, setCartoes] = useState([]);
  const [resumo, setResumo] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      cartoesApi.listar(),
      cartoesApi.dashboard(),
    ])
      .then(([lista, res]) => {
        setCartoes(lista);
        setResumo(res);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
        subtitle="Visão geral dos seus cartões de crédito"
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
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-primary/40 font-mono mb-3">Cartões</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cartoes.map((c) => {
              const usado = parseFloat(c.limiteUsado ?? 0);
              const limite = parseFloat(c.limite ?? 0);
              const pct = limite > 0 ? Math.min(100, (usado / limite) * 100) : 0;
              const corBarra = pct >= 80 ? '#FFB4AB' : pct >= 50 ? '#FFD580' : '#6EFFC0';
              return (
                <div
                  key={c.id}
                  className="rounded-2xl p-5 space-y-4"
                  style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(250,250,250,.07)' }}
                >
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
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: corBarra }}
                      />
                    </div>
                    <p className="text-[10px] text-text-primary/40 font-mono text-right">{pct.toFixed(1)}% utilizado</p>
                  </div>

                  <button
                    onClick={() => navigate('/cartoes')}
                    className="w-full text-center text-xs font-bold uppercase tracking-widest text-primary hover:underline py-1"
                  >
                    Ver lançamentos →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gráfico por categoria */}
      {chartData.length > 0 && cats.length > 0 && (
        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(250,250,250,.07)' }}>
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-primary/40 font-mono mb-5">
            Gastos por Categoria (últimos 3 meses)
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'rgba(255,255,255,.4)', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,.4)', fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${brl(v)}`} />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, fontSize: 12 }}
                formatter={(v, name) => [`R$ ${brl(v)}`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace', paddingTop: 12 }} />
              {cats.map((cat, idx) => (
                <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} radius={idx === cats.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {cartoes.length === 0 && (
        <div className="text-center py-20 text-text-primary/40 space-y-3">
          <CreditCard className="w-10 h-10 mx-auto opacity-20" />
          <p className="text-sm">Nenhum cartão cadastrado ainda.</p>
          <button
            onClick={() => navigate('/cartoes')}
            className="text-primary font-bold text-xs uppercase tracking-widest hover:underline"
          >
            Cadastrar cartão
          </button>
        </div>
      )}
    </div>
  );
}
