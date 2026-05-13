import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { auth } from '../lib/api';
import { FloatingPasswordInput } from '../components/ui/FormField';

function BrandMark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,rgba(110,255,192,.16),rgba(110,255,192,.04))', border: '1px solid rgba(110,255,192,.22)', display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 20%,rgba(110,255,192,.4),transparent 60%)', opacity: .8 }} />
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none" style={{ position: 'relative', zIndex: 1 }}>
          <rect x="1" y="1" width="9" height="9" rx="2" fill="#6EFFC0" />
          <rect x="12" y="1" width="9" height="9" rx="2" stroke="#6EFFC0" strokeWidth="1.6" />
          <rect x="1" y="12" width="9" height="9" rx="2" stroke="#6EFFC0" strokeWidth="1.6" />
          <rect x="12" y="12" width="9" height="9" rx="2" fill="#6EFFC0" opacity=".4" />
        </svg>
      </div>
      <div>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, letterSpacing: '-0.02em', fontSize: 16, color: '#fafafa' }}>
          Core <span style={{ color: '#6EFFC0' }}>4</span> ERP
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(250,250,250,.3)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
          Enterprise Finance
        </div>
      </div>
    </div>
  );
}

export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (novaSenha.length < 8) { setErro('A senha deve ter no mínimo 8 caracteres.'); return; }
    if (novaSenha !== confirmaSenha) { setErro('As senhas não coincidem.'); return; }
    setErro('');
    setLoading(true);
    try {
      await auth.redefinirSenha(token, novaSenha);
      setSucesso(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err) {
      setErro(err.message || 'Token inválido ou expirado. Solicite um novo link.');
    } finally {
      setLoading(false);
    }
  };

  const S = {
    shell: { position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0c0c0c', color: '#fafafa' },
    bgGrid: { position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(to right,rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.04) 1px,transparent 1px)', backgroundSize: '56px 56px', WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%,#000 20%,transparent 80%)', maskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%,#000 20%,transparent 80%)', pointerEvents: 'none' },
    orb: { position: 'fixed', width: 520, height: 520, borderRadius: '50%', background: '#6EFFC0', filter: 'blur(80px)', opacity: .2, top: -140, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 0 },
    card: { position: 'relative', zIndex: 1, width: '100%', maxWidth: 460, background: 'rgba(19,19,19,.85)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: '40px 40px 36px', backdropFilter: 'blur(12px)', boxShadow: '0 40px 80px -40px rgba(0,0,0,.7)' },
    errBanner: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,180,171,.08)', border: '1px solid rgba(255,180,171,.2)', color: '#FFB4AB', fontSize: 13, marginTop: 12 },
    submitBtn: { width: '100%', padding: '15px 24px', borderRadius: 14, background: '#6EFFC0', color: '#003824', fontSize: 15, fontWeight: 700, fontFamily: "'Sora', sans-serif", border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, transition: 'opacity .15s' },
  };

  if (sucesso) {
    return (
      <div style={S.shell}>
        <div style={S.bgGrid} />
        <div style={S.orb} />
        <div style={{ ...S.card, textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#6EFFC0', color: '#003824', display: 'grid', placeItems: 'center', margin: '0 auto 24px', boxShadow: '0 0 60px rgba(110,255,192,.4)', animation: 'scaleSpring 600ms cubic-bezier(.34,1.56,.64,1) both' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 24, fontWeight: 700, color: '#fafafa', marginBottom: 10 }}>
            Senha redefinida!
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(250,250,250,.5)', lineHeight: 1.6 }}>
            Sua senha foi alterada com sucesso.<br />Redirecionando para o login…
          </p>
        </div>
        <style>{`@keyframes scaleSpring { from { opacity:0; transform:scale(.88) } to { opacity:1; transform:scale(1) } }`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:none } }
        @keyframes spin { to { transform:rotate(360deg) } }
        .field-float { position:relative; margin-bottom:12px }
        .field-float input { display:block;width:100%;padding:22px 16px 10px;background:#131313;border:1px solid rgba(250,250,250,.1);border-radius:14px;color:#fafafa;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color 200ms,box-shadow 200ms; }
        .field-float input:focus { border-color:#6EFFC0;box-shadow:0 0 0 3px rgba(110,255,192,.12); }
        .field-float label { position:absolute;left:16px;top:8px;font-size:11px;color:rgba(250,250,250,.4);font-family:'DM Sans',sans-serif;pointer-events:none;transition:color 200ms; }
        .field-float input:focus ~ label { color:#6EFFC0; }
        .field-float .field-icon { position:absolute;right:14px;top:50%;transform:translateY(-50%);color:rgba(250,250,250,.4);cursor:pointer;background:none;border:none;padding:0;display:flex;align-items:center; }
      `}</style>

      <div style={S.shell}>
        <div style={S.bgGrid} />
        <div style={S.orb} />

        <div style={S.card}>
          <div style={{ marginBottom: 32 }}>
            <BrandMark />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', background: 'rgba(110,255,192,.1)', border: '1px solid rgba(110,255,192,.2)', marginBottom: 20 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6EFFC0" strokeWidth="1.8">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: '#fafafa', marginBottom: 8 }}>
            Nova senha
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(250,250,250,.5)', marginBottom: 28, lineHeight: 1.6 }}>
            Escolha uma senha forte com no mínimo 8 caracteres.
          </p>

          <form onSubmit={handleSubmit}>
            <FloatingPasswordInput
              id="nova-senha"
              label="Nova senha"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              autoComplete="new-password"
              required
            />

            <FloatingPasswordInput
              id="confirma-senha"
              label="Confirmar nova senha"
              value={confirmaSenha}
              onChange={(e) => setConfirmaSenha(e.target.value)}
              autoComplete="new-password"
              required
            />

            {novaSenha.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {[
                  { label: 'Mínimo 8 caracteres', ok: novaSenha.length >= 8 },
                  { label: 'Letras maiúsculas e minúsculas', ok: /[a-z]/.test(novaSenha) && /[A-Z]/.test(novaSenha) },
                  { label: 'Número ou símbolo', ok: /[\d\W]/.test(novaSenha) },
                ].map(({ label, ok }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: ok ? '#6EFFC0' : 'rgba(250,250,250,.35)', marginBottom: 4 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      {ok ? <path d="M20 6 9 17l-5-5" /> : <path d="M18 6 6 18M6 6l12 12" />}
                    </svg>
                    {label}
                  </div>
                ))}
              </div>
            )}

            {erro && (
              <div style={S.errBanner}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><circle cx="12" cy="16" r=".5" fill="currentColor" />
                </svg>
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || novaSenha !== confirmaSenha || novaSenha.length < 8}
              style={{ ...S.submitBtn, opacity: (loading || novaSenha !== confirmaSenha || novaSenha.length < 8) ? .5 : 1 }}
            >
              {loading
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Salvando…</>
                : 'Redefinir senha'
              }
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{ background: 'none', border: 'none', color: 'rgba(250,250,250,.4)', fontSize: 12, cursor: 'pointer' }}
            >
              Voltar ao login
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
