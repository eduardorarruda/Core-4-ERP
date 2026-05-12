import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { auth, setUsuario } from '../lib/api';
import { FloatingInput, FloatingPasswordInput } from '../components/ui/FormField';
import HeroPane, { BrandMark } from '../components/login/HeroPane';

function greetingFor(h) {
  if (h < 5) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [success, setSuccess] = useState(false);
  const [now, setNow] = useState(new Date());

  const [view, setView] = useState('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetErro, setResetErro] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const spotRef = useRef(null);
  const o1Ref = useRef(null);
  const o2Ref = useRef(null);
  const o3Ref = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      const w = window.innerWidth, h = window.innerHeight;
      const x = e.clientX, y = e.clientY;
      const dx = (x / w - 0.5) * 2, dy = (y / h - 0.5) * 2;
      if (spotRef.current) {
        spotRef.current.style.setProperty('--mx', `${x}px`);
        spotRef.current.style.setProperty('--my', `${y}px`);
      }
      if (o1Ref.current) o1Ref.current.style.transform = `translate(${dx * 30}px, ${dy * 30}px)`;
      if (o2Ref.current) o2Ref.current.style.transform = `translate(${dx * -40}px, ${dy * -40}px)`;
      if (o3Ref.current) o3Ref.current.style.transform = `translate(${dx * 22}px, ${dy * 22}px)`;
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  function voltarParaLogin() {
    setView('login');
    setResetErro('');
    setResetEmail('');
  }

  const handleEsqueciSenha = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      setResetErro('Informe um e-mail válido.');
      return;
    }
    setResetErro('');
    setResetLoading(true);
    try {
      await auth.esqueciSenha(resetEmail);
      setView('forgot-sent');
    } catch (err) {
      setResetErro(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e?.preventDefault?.();
    setErro('');
    if (!emailValid) { setErro('Informe um email válido.'); return; }
    setCarregando(true);
    try {
      const usuario = await auth.login(email, senha);
      setUsuario(usuario);
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2400);
    } catch (err) {
      setErro(err.message || 'Credenciais inválidas');
    } finally {
      setCarregando(false);
    }
  };

  const S = {
    shell: { position: 'relative', minHeight: '100vh', display: 'flex', background: '#0c0c0c', overflow: 'hidden', color: '#fafafa' },
    bgStage: { position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' },
    bgGrid: { position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to right,rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.04) 1px,transparent 1px)', backgroundSize: '56px 56px', WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%,#000 20%,transparent 80%)', maskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%,#000 20%,transparent 80%)' },
    orb1: { position: 'absolute', width: 520, height: 520, borderRadius: '50%', background: '#6EFFC0', filter: 'blur(80px)', opacity: .25, top: -140, left: -140, willChange: 'transform' },
    orb2: { position: 'absolute', width: 620, height: 620, borderRadius: '50%', background: '#ACC7FF', filter: 'blur(80px)', opacity: .15, bottom: -180, right: -140, willChange: 'transform' },
    orb3: { position: 'absolute', width: 340, height: 340, borderRadius: '50%', background: '#FF9D6E', filter: 'blur(80px)', opacity: .10, top: '40%', left: '35%', willChange: 'transform' },
    bgSpot: { position: 'absolute', inset: 0, background: 'radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgba(110,255,192,.14), transparent 60%)', transition: 'background .12s' },
    bgScan: { position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg,transparent 0 3px,rgba(255,255,255,.012) 3px 4px)', mixBlendMode: 'overlay' },
    formPane: { position: 'relative', zIndex: 1, width: '100%', maxWidth: 520, minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '32px 48px', background: 'rgba(12,12,12,.6)', backdropFilter: 'blur(4px)', borderRight: '1px solid rgba(255,255,255,.05)' },
    formWrap: { maxWidth: 380, width: '100%', margin: '0 auto' },
    greetingChip: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', fontSize: 12, color: 'rgba(250,250,250,.6)', marginBottom: 20 },
    submitBtn: { width: '100%', padding: '15px 24px', borderRadius: 14, background: '#6EFFC0', color: '#003824', fontSize: 15, fontWeight: 700, fontFamily: "'Sora', sans-serif", border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'opacity .15s, transform .1s', position: 'relative', overflow: 'hidden', marginTop: 20 },
    rowBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    check: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(250,250,250,.6)', cursor: 'pointer' },
    forgotLink: { fontSize: 12, color: '#6EFFC0', textDecoration: 'none', fontWeight: 500 },
    errBanner: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,180,171,.08)', border: '1px solid rgba(255,180,171,.2)', color: '#FFB4AB', fontSize: 13, marginTop: 12 },
    successOverlay: { position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(12,12,12,.92)', backdropFilter: 'blur(20px)', display: 'grid', placeItems: 'center', animation: 'fadeIn 300ms both' },
    successCard: { textAlign: 'center', padding: 40, animation: 'scaleSpring 500ms cubic-bezier(.34,1.56,.64,1) both' },
    successIcon: { width: 96, height: 96, borderRadius: '50%', background: '#6EFFC0', color: '#003824', display: 'grid', placeItems: 'center', margin: '0 auto 24px', boxShadow: '0 0 60px rgba(110,255,192,.4)' },
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes scaleSpring { from { opacity:0; transform:scale(.88) } to { opacity:1; transform:scale(1) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:none } }
        @keyframes ticker { from { transform:translateX(0) } to { transform:translateX(-50%) } }
        @keyframes pulseDot { 0%,100% { opacity:1;transform:scale(1) } 50% { opacity:.6;transform:scale(.85) } }
        @keyframes spin { to { transform:rotate(360deg) } }
        .ticker-scroll { animation: ticker 40s linear infinite; }
        .live-dot { width:6px;height:6px;border-radius:50%;background:#6EFFC0;box-shadow:0 0 8px #6EFFC0;animation:pulseDot 1.6s ease-in-out infinite;display:inline-block;flex-shrink:0; }
        .anim-in { animation: fadeUp 500ms cubic-bezier(.4,0,.2,1) both; }
        .d1 { animation-delay:50ms } .d2 { animation-delay:120ms } .d3 { animation-delay:200ms }
        .d4 { animation-delay:280ms } .d5 { animation-delay:360ms } .d6 { animation-delay:440ms }
        .field-float { position:relative; margin-bottom:12px }
        .field-float input { display:block;width:100%;padding:22px 16px 10px;background:#131313;border:1px solid rgba(250,250,250,.1);border-radius:14px;color:#fafafa;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color 200ms,box-shadow 200ms; }
        .field-float input:focus { border-color:#6EFFC0;box-shadow:0 0 0 3px rgba(110,255,192,.12); }
        .field-float label { position:absolute;left:16px;top:8px;font-size:11px;color:rgba(250,250,250,.4);font-family:'DM Sans',sans-serif;pointer-events:none;transition:color 200ms; }
        .field-float input:focus ~ label { color:#6EFFC0; }
        .field-float .field-icon { position:absolute;right:14px;top:50%;transform:translateY(-50%);color:rgba(250,250,250,.4);cursor:pointer;background:none;border:none;padding:0;display:flex;align-items:center; }
        .field-float .field-icon.valid { color:#6EFFC0; }
      `}</style>

      <div style={S.shell}>
        <div style={S.bgStage}>
          <div style={S.bgGrid} />
          <div ref={o1Ref} style={S.orb1} />
          <div ref={o2Ref} style={S.orb2} />
          <div ref={o3Ref} style={S.orb3} />
          <div ref={spotRef} style={S.bgSpot} />
          <div style={S.bgScan} />
        </div>

        <section style={S.formPane}>
          <BrandMark />

          <div style={S.formWrap}>
            {view === 'login' && (
              <>
                <div className="anim-in" style={S.greetingChip}>
                  <span className="live-dot" />
                  {greetingFor(now.getHours())} — pronto para entrar
                </div>

                <h1 className="anim-in d1" style={{ fontFamily: "'Sora', sans-serif", fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#fafafa', marginBottom: 8 }}>
                  Acesse seu <em style={{ color: '#6EFFC0', fontStyle: 'italic' }}>workspace</em>
                </h1>
                <p className="anim-in d2" style={{ fontSize: 14, color: 'rgba(250,250,250,.5)', marginBottom: 28 }}>
                  Entre com sua conta corporativa para continuar.
                </p>

                <form onSubmit={handleLogin}>
                  <div className="anim-in d3">
                    <FloatingInput
                      id="email"
                      label="Email corporativo"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                      validIcon={emailValid
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
                        : null}
                    />
                  </div>
                  <div className="anim-in d4">
                    <FloatingPasswordInput
                      id="senha"
                      label="Senha"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </div>

                  <div style={S.rowBetween}>
                    <label style={S.check}>
                      <input type="checkbox" defaultChecked style={{ accentColor: '#6EFFC0' }} />
                      Confiar neste dispositivo
                    </label>
                    <button type="button" style={{ ...S.forgotLink, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      onClick={() => { setResetEmail(email); setResetErro(''); setView('forgot-email'); }}>
                      Esqueci a senha
                    </button>
                  </div>

                  {erro && (
                    <div style={S.errBanner}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><circle cx="12" cy="16" r=".5" fill="currentColor" /></svg>
                      {erro}
                    </div>
                  )}

                  <div className="anim-in d5">
                    <button type="submit" disabled={carregando} style={{ ...S.submitBtn, opacity: carregando ? .7 : 1 }}>
                      {carregando
                        ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Autenticando…</>
                        : 'Entrar no Core 4'}
                    </button>
                  </div>
                </form>

                <div className="anim-in d6" style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'rgba(250,250,250,.4)' }}>
                  Primeira vez no Core 4?{' '}
                  <a href="/register" style={{ color: '#6EFFC0', fontWeight: 600, textDecoration: 'none' }}>Criar conta</a>
                </div>
              </>
            )}

            {view === 'forgot-email' && (
              <div className="anim-in">
                <button type="button" onClick={voltarParaLogin} style={{ background: 'none', border: 'none', color: 'rgba(250,250,250,.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 28, padding: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                  Voltar ao login
                </button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', background: 'rgba(110,255,192,.1)', border: '1px solid rgba(110,255,192,.2)', marginBottom: 20 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6EFFC0" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m2 7 10 6 10-6" /></svg>
                </div>
                <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: '#fafafa', marginBottom: 8 }}>Recuperar acesso</h1>
                <p style={{ fontSize: 14, color: 'rgba(250,250,250,.5)', marginBottom: 28, lineHeight: 1.6 }}>
                  Informe o e-mail cadastrado. Enviaremos um código de verificação.
                </p>
                <form onSubmit={handleEsqueciSenha}>
                  <FloatingInput id="reset-email" label="E-mail cadastrado" type="email" value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)} autoComplete="email" required />
                  {resetErro && (
                    <div style={{ ...S.errBanner, marginBottom: 12 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><circle cx="12" cy="16" r=".5" fill="currentColor" /></svg>
                      {resetErro}
                    </div>
                  )}
                  <button type="submit" disabled={resetLoading} style={{ ...S.submitBtn, marginTop: 8, opacity: resetLoading ? .7 : 1 }}>
                    {resetLoading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Enviando…</> : 'Enviar código'}
                  </button>
                </form>
              </div>
            )}

            {view === 'forgot-sent' && (
              <div className="anim-in">
                <button type="button" onClick={voltarParaLogin} style={{ background: 'none', border: 'none', color: 'rgba(250,250,250,.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 28, padding: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                  Voltar ao login
                </button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', background: 'rgba(110,255,192,.1)', border: '1px solid rgba(110,255,192,.2)', marginBottom: 20 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6EFFC0" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m2 7 10 6 10-6" /></svg>
                </div>
                <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: '#fafafa', marginBottom: 8 }}>Verifique seu e-mail</h1>
                <p style={{ fontSize: 14, color: 'rgba(250,250,250,.5)', lineHeight: 1.7, marginBottom: 28 }}>
                  Enviamos um link de recuperação para <strong style={{ color: '#fafafa' }}>{resetEmail}</strong>.<br />
                  Clique no link do e-mail para criar sua nova senha.<br />
                  <span style={{ fontSize: 12, color: 'rgba(250,250,250,.3)' }}>O link expira em 60 minutos.</span>
                </p>
                <button type="button" onClick={voltarParaLogin}
                  style={{ width: '100%', marginTop: 12, padding: '12px', borderRadius: 14, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(250,250,250,.5)', fontSize: 13, cursor: 'pointer' }}>
                  Voltar ao login
                </button>
              </div>
            )}
          </div>

          <footer style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(250,250,250,.25)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '.1em' }}>
            <span>© 2026 Core 4 · LGPD</span>
            <span style={{ display: 'flex', gap: 14 }}>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Termos</a>
              <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacidade</a>
            </span>
          </footer>
        </section>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', position: 'relative', zIndex: 1 }} className="hidden lg:flex">
          <HeroPane />
        </div>

        {success && (
          <div style={S.successOverlay}>
            <div style={S.successCard}>
              <div style={S.successIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', color: '#fafafa', marginBottom: 8 }}>
                Bem-vindo de volta!
              </div>
              <div style={{ color: 'rgba(250,250,250,.55)', fontSize: 14 }}>
                Redirecionando para o dashboard…
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
