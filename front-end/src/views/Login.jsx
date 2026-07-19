import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, setLoginState } from '../lib/api';
import { getFirstAccessibleRoute } from '../lib/routeUtils';
import { FloatingInput, FloatingPasswordInput } from '../components/ui/FormField';
import Button from '../components/ui/Button';
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
  const navTimer = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  // Limpa o timer de redirecionamento se o componente desmontar antes do navigate.
  useEffect(() => () => clearTimeout(navTimer.current), []);

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
      const result = await auth.login(email, senha);
      setLoginState(result);
      setSuccess(true);
      const permSet = new Set(result.empresas?.[0]?.permissoes ?? []);
      const check = (cod) => result.adminSistema || permSet.has(cod);
      navTimer.current = setTimeout(() => navigate(getFirstAccessibleRoute(check)), 800);
    } catch (err) {
      setErro(err.message || 'Credenciais inválidas');
    } finally {
      setCarregando(false);
    }
  };

  const errBanner = 'flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-error/10 border border-error/20 text-error text-[13px] mt-3';
  const backBtn = 'flex items-center gap-1.5 text-xs text-text-primary/40 hover:text-text-primary/70 transition-colors mb-7';
  const iconBadge = 'flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 border border-primary/20 mb-5';

  return (
    <div className="relative min-h-dvh flex bg-surface overflow-hidden text-text-primary">
      {/* Background decorativo */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(to right,color-mix(in srgb,var(--color-text-primary) 5%,transparent) 1px,transparent 1px),linear-gradient(to bottom,color-mix(in srgb,var(--color-text-primary) 5%,transparent) 1px,transparent 1px)',
            backgroundSize: '56px 56px',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%,#000 20%,transparent 80%)',
            maskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%,#000 20%,transparent 80%)',
          }}
        />
        <div ref={o1Ref} className="absolute rounded-full bg-primary blur-[80px] opacity-25 -top-36 -left-36 will-change-transform" style={{ width: 520, height: 520 }} />
        <div ref={o2Ref} className="absolute rounded-full bg-secondary blur-[80px] opacity-[.15] -bottom-44 -right-36 will-change-transform" style={{ width: 620, height: 620 }} />
        <div ref={o3Ref} className="absolute rounded-full bg-warning blur-[80px] opacity-10 top-[40%] left-[35%] will-change-transform" style={{ width: 340, height: 340 }} />
        <div
          ref={spotRef}
          className="absolute inset-0 [transition:background_.12s]"
          style={{ background: 'radial-gradient(420px circle at var(--mx,50%) var(--my,50%), color-mix(in srgb, var(--color-primary) 14%, transparent), transparent 60%)' }}
        />
      </div>

      <section className="relative z-[1] w-full max-w-[520px] min-h-dvh bg-surface/60 backdrop-blur-sm border-r border-text-primary/5 flex flex-col justify-start lg:justify-between px-6 py-8 lg:px-12 gap-8 lg:gap-0">
        <BrandMark />

        <div className="w-full max-w-[380px] mx-auto">
          {view === 'login' && (
            <>
              <div className="anim-in inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-text-primary/5 border border-text-primary/10 text-xs text-text-primary/60 mb-5">
                <span className="live-dot" />
                {greetingFor(now.getHours())} — pronto para entrar
              </div>

              <h1 className="anim-in d1 font-display text-[32px] font-bold tracking-tight text-text-primary mb-2">
                Acesse seu <em className="text-primary italic">workspace</em>
              </h1>
              <p className="anim-in d2 text-sm text-text-primary/50 mb-7">
                Entre com sua conta corporativa para continuar.
              </p>

              <form onSubmit={handleLogin}>
                <div className="anim-in d3 mb-3">
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
                <div className="anim-in d4 mb-3">
                  <FloatingPasswordInput
                    id="senha"
                    label="Senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-xs text-primary font-medium py-2 hover:opacity-80 transition-opacity"
                    onClick={() => { setResetEmail(email); setResetErro(''); setView('forgot-email'); }}
                  >
                    Esqueci a senha
                  </button>
                </div>

                {erro && (
                  <div className={errBanner}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><circle cx="12" cy="16" r=".5" fill="currentColor" /></svg>
                    {erro}
                  </div>
                )}

                <div className="anim-in d5">
                  <Button type="submit" loading={carregando} className="w-full h-12 mt-4 text-[15px] font-display font-bold">
                    {carregando ? 'Autenticando…' : 'Entrar no Core 4'}
                  </Button>
                </div>
              </form>

              <div className="anim-in d6 text-center mt-6 text-[13px] text-text-primary/40">
                Primeira vez no Core 4?{' '}
                <Link to="/register" className="text-primary font-semibold hover:opacity-80 transition-opacity">Criar conta</Link>
              </div>
            </>
          )}

          {view === 'forgot-email' && (
            <div className="anim-in">
              <button type="button" onClick={voltarParaLogin} className={backBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                Voltar ao login
              </button>
              <div className={iconBadge}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-primary"><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m2 7 10 6 10-6" /></svg>
              </div>
              <h1 className="font-display text-[26px] font-bold tracking-tight text-text-primary mb-2">Recuperar acesso</h1>
              <p className="text-sm text-text-primary/50 mb-7 leading-relaxed">
                Informe o e-mail cadastrado. Enviaremos um código de verificação.
              </p>
              <form onSubmit={handleEsqueciSenha}>
                <FloatingInput id="reset-email" label="E-mail cadastrado" type="email" value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)} autoComplete="email" required />
                {resetErro && (
                  <div className={errBanner}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><circle cx="12" cy="16" r=".5" fill="currentColor" /></svg>
                    {resetErro}
                  </div>
                )}
                <Button type="submit" loading={resetLoading} className="w-full h-12 mt-4 text-[15px] font-display font-bold">
                  {resetLoading ? 'Enviando…' : 'Enviar código'}
                </Button>
              </form>
            </div>
          )}

          {view === 'forgot-sent' && (
            <div className="anim-in">
              <button type="button" onClick={voltarParaLogin} className={backBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                Voltar ao login
              </button>
              <div className={iconBadge}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-primary"><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m2 7 10 6 10-6" /></svg>
              </div>
              <h1 className="font-display text-[26px] font-bold tracking-tight text-text-primary mb-2">Verifique seu e-mail</h1>
              <p className="text-sm text-text-primary/50 leading-relaxed mb-7">
                Enviamos um link de recuperação para <strong className="text-text-primary">{resetEmail}</strong>.<br />
                Clique no link do e-mail para criar sua nova senha.<br />
                <span className="text-xs text-text-primary/30">O link expira em 60 minutos.</span>
              </p>
              <Button type="button" variant="secondary" onClick={voltarParaLogin} className="w-full h-11 mt-1">
                Voltar ao login
              </Button>
            </div>
          )}
        </div>

        <footer className="flex justify-between text-[10px] text-text-primary/25 font-mono uppercase tracking-widest">
          <span>© 2026 Core 4 · LGPD</span>
        </footer>
      </section>

      <div className="hidden lg:flex flex-1 min-w-0 relative z-[1]">
        <HeroPane />
      </div>

      {success && (
        <div className="fixed inset-0 z-[100] bg-surface/90 backdrop-blur-xl grid place-items-center" style={{ animation: 'fadeIn 300ms both' }}>
          <div className="text-center p-10" style={{ animation: 'scaleSpring 500ms cubic-bezier(.34,1.56,.64,1) both' }}>
            <div className="w-24 h-24 rounded-full bg-primary text-on-primary grid place-items-center mx-auto mb-6" style={{ boxShadow: '0 0 60px color-mix(in srgb, var(--color-primary) 40%, transparent)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <div className="font-display text-[32px] font-bold tracking-tight text-text-primary mb-2">
              Bem-vindo de volta!
            </div>
            <div className="text-text-primary/55 text-sm">
              Redirecionando…
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
