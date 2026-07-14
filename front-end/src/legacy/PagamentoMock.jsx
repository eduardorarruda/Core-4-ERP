import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CreditCard, QrCode, FileText, ShieldCheck } from 'lucide-react';
import { pagamentos } from '../lib/api';

const FORMAS = [
  { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito', icon: CreditCard },
  { value: 'PIX',            label: 'PIX',               icon: QrCode },
  { value: 'BOLETO',         label: 'Boleto',            icon: FileText },
];

function fmt(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

export default function PagamentoMock() {
  const navigate = useNavigate();
  const [plano, setPlano] = useState(null);
  const [forma, setForma] = useState('CARTAO_CREDITO');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('planoSelecionado');
    if (stored) setPlano(JSON.parse(stored));
  }, []);

  const handlePagar = async () => {
    if (!plano) return;
    setErro('');
    setLoading(true);
    try {
      await pagamentos.pagar({ planoId: plano.id, forma });
      setSucesso(true);
      sessionStorage.removeItem('planoSelecionado');
      setTimeout(() => navigate('/dashboard'), 2200);
    } catch (err) {
      setErro(err.message || 'Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const S = {
    shell: { minHeight: '100vh', background: '#0c0c0c', color: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
    card: { background: '#111', border: '1px solid rgba(255,255,255,.07)', borderRadius: 24, padding: 40, maxWidth: 480, width: '100%' },
    formaBtn: (v) => ({
      flex: 1,
      padding: '14px 12px',
      borderRadius: 14,
      border: `1px solid ${forma === v ? '#6EFFC0' : 'rgba(255,255,255,.1)'}`,
      background: forma === v ? 'rgba(110,255,192,.08)' : '#131313',
      color: forma === v ? '#6EFFC0' : 'rgba(250,250,250,.5)',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      fontSize: 11,
      fontFamily: "'DM Sans', sans-serif",
      fontWeight: 600,
      transition: 'all 200ms',
    }),
    input: { display: 'block', width: '100%', padding: '14px 16px', background: '#1a1a1a', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, color: 'rgba(250,250,250,.3)', fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none', marginBottom: 10 },
  };

  if (sucesso) {
    return (
      <div style={{ ...S.shell }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#6EFFC0', display: 'grid', placeItems: 'center', margin: '0 auto 20px', boxShadow: '0 0 50px rgba(110,255,192,.4)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#003824" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 700, color: '#fafafa', marginBottom: 8 }}>Pagamento Aprovado!</h2>
          <p style={{ color: 'rgba(250,250,250,.5)', fontSize: 14 }}>Redirecionando para o dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{'body{background:#0c0c0c} @keyframes spin{to{transform:rotate(360deg)}}'}</style>
      <div style={S.shell}>
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <ShieldCheck size={20} style={{ color: '#6EFFC0' }} />
            <span style={{ fontSize: 12, color: 'rgba(250,250,250,.4)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '.1em' }}>
              Ambiente de Demonstração
            </span>
          </div>

          {plano && (
            <div style={{ background: 'rgba(110,255,192,.06)', border: '1px solid rgba(110,255,192,.15)', borderRadius: 16, padding: '16px 20px', marginBottom: 28 }}>
              <div style={{ fontSize: 11, color: 'rgba(250,250,250,.4)', fontFamily: 'monospace', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>Plano selecionado</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: '#fafafa' }}>{plano.nome}</span>
                <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: '#6EFFC0' }}>{fmt(plano.precoMensal)}<span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(250,250,250,.4)' }}>/mês</span></span>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: 'rgba(250,250,250,.5)', marginBottom: 12, fontFamily: "'DM Sans', sans-serif" }}>Forma de pagamento</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {FORMAS.map(({ value, label, icon: Icon }) => (
                <button key={value} style={S.formaBtn(value)} onClick={() => setForma(value)}>
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {forma === 'CARTAO_CREDITO' && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: 'rgba(250,250,250,.5)', marginBottom: 12, fontFamily: "'DM Sans', sans-serif" }}>Dados do cartão (simulados)</div>
              <input readOnly value="4242 4242 4242 4242" style={S.input} placeholder="Número do cartão" />
              <div style={{ display: 'flex', gap: 10 }}>
                <input readOnly value="12/28" style={{ ...S.input, flex: 1 }} placeholder="Validade" />
                <input readOnly value="123" style={{ ...S.input, flex: 1 }} placeholder="CVV" />
              </div>
              <input readOnly value="Titular Demonstração" style={S.input} placeholder="Nome no cartão" />
            </div>
          )}

          {forma === 'PIX' && (
            <div style={{ textAlign: 'center', padding: '20px 0', marginBottom: 24 }}>
              <div style={{ width: 120, height: 120, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, margin: '0 auto 12px', display: 'grid', placeItems: 'center' }}>
                <QrCode size={60} style={{ color: 'rgba(250,250,250,.3)' }} />
              </div>
              <p style={{ fontSize: 12, color: 'rgba(250,250,250,.4)', fontFamily: "'DM Sans', sans-serif" }}>QR Code simulado — clique em Confirmar para aprovar</p>
            </div>
          )}

          {forma === 'BOLETO' && (
            <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 16, marginBottom: 24, textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: 'rgba(250,250,250,.4)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>Boleto simulado — em ambiente de produção seria gerado um boleto real. Clique em Confirmar para aprovar.</p>
            </div>
          )}

          {erro && (
            <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255,180,171,.08)', border: '1px solid rgba(255,180,171,.2)', color: '#FFB4AB', fontSize: 13, marginBottom: 16 }}>
              {erro}
            </div>
          )}

          <button
            onClick={handlePagar}
            disabled={loading || !plano}
            style={{ width: '100%', padding: '15px', borderRadius: 14, background: '#6EFFC0', border: 'none', color: '#003824', fontWeight: 700, fontSize: 15, fontFamily: "'Sora', sans-serif", cursor: loading || !plano ? 'not-allowed' : 'pointer', opacity: loading || !plano ? .7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {loading ? 'Processando…' : 'Confirmar Pagamento'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(250,250,250,.25)', marginTop: 16, fontFamily: 'monospace' }}>
            * Nenhuma cobrança real será efetuada
          </p>
        </div>
      </div>
    </>
  );
}
