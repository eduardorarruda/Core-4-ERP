import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, Zap } from 'lucide-react';
import { planos } from '../lib/api';

const FEATURE_MAP = {
  BASICO:       ['1 usuário', '1 empresa', 'Módulos financeiros completos', 'Suporte por e-mail'],
  PROFISSIONAL: ['Até 5 usuários', '1 empresa', 'Tudo do Básico', 'Convite de operadores', 'Auditoria'],
  EMPRESARIAL:  ['Até 20 usuários', 'Até 3 empresas', 'Tudo do Profissional', 'Relatórios avançados'],
  ENTERPRISE:   ['Usuários ilimitados', 'Empresas ilimitadas', 'Tudo do Empresarial', 'SLA garantido', 'Suporte dedicado'],
};

const COLORS = {
  BASICO:       { accent: '#6EFFC0', bg: 'rgba(110,255,192,.08)', border: 'rgba(110,255,192,.2)' },
  PROFISSIONAL: { accent: '#ACC7FF', bg: 'rgba(172,199,255,.08)', border: 'rgba(172,199,255,.2)' },
  EMPRESARIAL:  { accent: '#FFD37A', bg: 'rgba(255,211,122,.08)', border: 'rgba(255,211,122,.2)' },
  ENTERPRISE:   { accent: '#FF9D6E', bg: 'rgba(255,157,110,.08)', border: 'rgba(255,157,110,.2)' },
};

function fmt(valor) {
  if (!valor || Number(valor) === 0) return 'Grátis';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor) + '/mês';
}

export default function VisualizacaoPlanos() {
  const navigate = useNavigate();
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState(null);

  useEffect(() => {
    planos.listarAtivos()
      .then(setLista)
      .catch(() => setLista([]))
      .finally(() => setLoading(false));
  }, []);

  const escolher = (plano) => {
    if (Number(plano.precoMensal) === 0) {
      navigate('/register');
    } else {
      sessionStorage.setItem('planoSelecionado', JSON.stringify(plano));
      navigate('/register');
    }
  };

  const S = {
    shell: { minHeight: '100vh', background: '#0c0c0c', color: '#fafafa', padding: '40px 24px' },
    header: { textAlign: 'center', marginBottom: 48 },
    chip: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'rgba(110,255,192,.08)', border: '1px solid rgba(110,255,192,.2)', fontSize: 11, color: '#6EFFC0', fontFamily: 'monospace', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 20 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, maxWidth: 1100, margin: '0 auto' },
    card: (nome) => ({
      background: COLORS[nome]?.bg ?? 'rgba(255,255,255,.02)',
      border: `1px solid ${selecionado?.nome === nome ? (COLORS[nome]?.accent ?? '#6EFFC0') : (COLORS[nome]?.border ?? 'rgba(255,255,255,.08)')}`,
      borderRadius: 20,
      padding: 28,
      cursor: 'pointer',
      transition: 'all 200ms',
      transform: selecionado?.nome === nome ? 'translateY(-4px)' : 'none',
      boxShadow: selecionado?.nome === nome ? `0 12px 40px ${COLORS[nome]?.bg ?? 'rgba(110,255,192,.1)'}` : 'none',
    }),
    btn: (nome) => ({
      width: '100%',
      marginTop: 24,
      padding: '13px',
      borderRadius: 12,
      background: COLORS[nome]?.accent ?? '#6EFFC0',
      border: 'none',
      color: '#0c0c0c',
      fontWeight: 700,
      fontSize: 14,
      fontFamily: "'Sora', sans-serif",
      cursor: 'pointer',
    }),
  };

  return (
    <>
      <style>{`@keyframes fadeUp { from { opacity:0;transform:translateY(14px) } to { opacity:1;transform:none } } .anim-in { animation:fadeUp 500ms both }`}</style>
      <div style={S.shell}>
        <style>{'body{background:#0c0c0c}'}</style>
        <div style={S.header}>
          <a href="/login" style={{ color: 'rgba(250,250,250,.3)', fontSize: 12, textDecoration: 'none', display: 'inline-block', marginBottom: 32, fontFamily: 'monospace' }}>
            ← Voltar ao login
          </a>
          <div style={S.chip}>
            <Zap size={12} /> Escolha seu plano
          </div>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em', color: '#fafafa', marginBottom: 12 }}>
            Planos e Preços
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(250,250,250,.5)' }}>
            Comece grátis e escale conforme sua necessidade.
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#6EFFC0' }} />
          </div>
        ) : (
          <div style={S.grid}>
            {lista.map((p) => {
              const cor = COLORS[p.nome] ?? COLORS.BASICO;
              const features = FEATURE_MAP[p.nome] ?? [];
              const gratis = Number(p.precoMensal) === 0;
              return (
                <div key={p.id} className="anim-in" style={S.card(p.nome)} onClick={() => setSelecionado(p)}>
                  <div style={{ fontSize: 11, color: cor.accent, fontFamily: 'monospace', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 12 }}>
                    {p.nome}
                  </div>
                  <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 32, fontWeight: 700, color: '#fafafa', letterSpacing: '-0.02em', marginBottom: 4 }}>
                    {gratis ? 'Grátis' : fmt(p.precoMensal)}
                  </div>
                  {!gratis && <div style={{ fontSize: 11, color: 'rgba(250,250,250,.35)', marginBottom: 16 }}>cobrado mensalmente</div>}
                  {p.descricao && <p style={{ fontSize: 13, color: 'rgba(250,250,250,.5)', lineHeight: 1.5, marginBottom: 20, minHeight: 40 }}>{p.descricao}</p>}
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {features.map((f) => (
                      <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(250,250,250,.7)' }}>
                        <CheckCircle2 size={14} style={{ color: cor.accent, flexShrink: 0 }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button style={S.btn(p.nome)} onClick={(e) => { e.stopPropagation(); escolher(p); }}>
                    {gratis ? 'Começar Grátis' : Number(p.precoMensal) === 0 ? 'Consultar' : 'Assinar'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
