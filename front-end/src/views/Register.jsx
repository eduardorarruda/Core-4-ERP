import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, TrendingUp, Loader2, Zap, BarChart3 } from 'lucide-react';
import { auth, setLoginState } from '../lib/api';
import { FloatingInput, FloatingPasswordInput } from '../components/ui/FormField';

/* ── BrandMark (igual ao Login) ── */
function BrandMark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,rgba(110,255,192,.16),rgba(110,255,192,.04))', border: '1px solid rgba(110,255,192,.22)', display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 20%,rgba(110,255,192,.4),transparent 60%)', opacity: .8 }} />
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none" style={{ position: 'relative', zIndex: 1 }}>
          <rect x="1" y="1" width="9" height="9" rx="2" fill="#6EFFC0"/>
          <rect x="12" y="1" width="9" height="9" rx="2" stroke="#6EFFC0" strokeWidth="1.6"/>
          <rect x="1" y="12" width="9" height="9" rx="2" stroke="#6EFFC0" strokeWidth="1.6"/>
          <rect x="12" y="12" width="9" height="9" rx="2" fill="#6EFFC0" opacity=".4"/>
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

const FEATURES = [
  { icon: ShieldCheck, color: '#6EFFC0', label: 'Segurança', value: 'JWT + BCrypt', sub: 'Dados protegidos' },
  { icon: TrendingUp,  color: '#ACC7FF', label: 'Módulos',   value: '10+',          sub: 'Módulos integrados' },
  { icon: Zap,         color: '#FFD37A', label: 'Real-time', value: '100%',          sub: 'Dados em tempo real' },
  { icon: BarChart3,   color: '#FF9D6E', label: 'Relatórios',value: '∞',             sub: 'Exportação livre' },
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmarSenha: '', telefone: '', tipoConta: 'EMPRESA', nomeEmpresa: '' });
  const [erro, setErro] = useState('');
  const [erroConfirmacao, setErroConfirmacao] = useState('');
  const [carregando, setCarregando] = useState(false);
  const o1Ref   = useRef(null);
  const o2Ref   = useRef(null);
  const o3Ref   = useRef(null);
  const spotRef = useRef(null);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  /* Mouse parallax */
  useEffect(() => {
    const onMove = (e) => {
      const w = window.innerWidth, h = window.innerHeight;
      const dx = (e.clientX / w - 0.5) * 2, dy = (e.clientY / h - 0.5) * 2;
      if (o1Ref.current) o1Ref.current.style.transform = `translate(${dx * 30}px, ${dy * 30}px)`;
      if (o2Ref.current) o2Ref.current.style.transform = `translate(${dx * -40}px, ${dy * -40}px)`;
      if (o3Ref.current) o3Ref.current.style.transform = `translate(${dx * 22}px, ${dy * 22}px)`;
      if (spotRef.current) {
        spotRef.current.style.setProperty('--mx', `${e.clientX}px`);
        spotRef.current.style.setProperty('--my', `${e.clientY}px`);
      }
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const handleRegistrar = async (e) => {
    e.preventDefault();
    setErro('');
    setErroConfirmacao('');
    if (form.senha !== form.confirmarSenha) {
      setErroConfirmacao('Senha divergente da senha digitada anteriormente');
      return;
    }
    const senhaRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!senhaRegex.test(form.senha)) {
      setErro('A senha não atende aos requisitos mínimos de segurança');
      return;
    }
    setCarregando(true);
    try {
      const telefone = form.telefone ? form.telefone.replace(/\D/g, '') : null;
      const nomeEmpresa = form.tipoConta === 'EMPRESA' ? form.nomeEmpresa || undefined : undefined;
      await auth.registrar(form.nome, form.email, form.senha, telefone, form.tipoConta, nomeEmpresa);
      const result = await auth.login(form.email, form.senha);
      setLoginState(result);
      navigate('/dashboard');
    } catch (err) {
      setErro(err.message || 'Erro ao criar conta');
    } finally {
      setCarregando(false);
    }
  };

  const S = {
    shell: { position: 'relative', minHeight: '100vh', display: 'flex', background: '#0c0c0c', overflow: 'hidden', color: '#fafafa' },
    formPane: { position: 'relative', zIndex: 1, width: '100%', maxWidth: 520, minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '32px 48px', background: 'rgba(12,12,12,.6)', backdropFilter: 'blur(4px)', borderRight: '1px solid rgba(255,255,255,.05)' },
    formWrap: { maxWidth: 380, width: '100%', margin: '0 auto' },
    submitBtn: { width: '100%', padding: '15px 24px', borderRadius: 14, background: '#6EFFC0', color: '#003824', fontSize: 15, fontWeight: 700, fontFamily: "'Sora', sans-serif", border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'opacity .15s', marginTop: 20, opacity: carregando ? .7 : 1 },
    errBanner: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,180,171,.08)', border: '1px solid rgba(255,180,171,.2)', color: '#FFB4AB', fontSize: 13, marginTop: 12 },
  };

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:none } }
        @keyframes pulseDot { 0%,100% { opacity:1;transform:scale(1) } 50% { opacity:.6;transform:scale(.85) } }
        @keyframes spin { to { transform:rotate(360deg) } }
        .anim-in { animation: fadeUp 500ms cubic-bezier(.4,0,.2,1) both; }
        .d1 { animation-delay:50ms } .d2 { animation-delay:120ms } .d3 { animation-delay:200ms }
        .d4 { animation-delay:280ms } .d5 { animation-delay:360ms } .d6 { animation-delay:440ms } .d7 { animation-delay:520ms }
        .field-float { position:relative; margin-bottom:12px }
        .field-float input { display:block;width:100%;padding:22px 16px 10px;background:#131313;border:1px solid rgba(250,250,250,.1);border-radius:14px;color:#fafafa;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color 200ms,box-shadow 200ms; }
        .field-float input:focus { border-color:#6EFFC0;box-shadow:0 0 0 3px rgba(110,255,192,.12); }
        .field-float label { position:absolute;left:16px;top:8px;font-size:11px;color:rgba(250,250,250,.4);font-family:'DM Sans',sans-serif;pointer-events:none;transition:color 200ms; }
        .field-float input:focus ~ label { color:#6EFFC0; }
        .field-float .field-icon { position:absolute;right:14px;top:50%;transform:translateY(-50%);color:rgba(250,250,250,.4);cursor:pointer;background:none;border:none;padding:0;display:flex;align-items:center; }
        .live-dot { width:6px;height:6px;border-radius:50%;background:#6EFFC0;box-shadow:0 0 8px #6EFFC0;animation:pulseDot 1.6s ease-in-out infinite;display:inline-block;flex-shrink:0; }
      `}</style>

      <div style={S.shell}>
        {/* Background */}
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to right,rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.04) 1px,transparent 1px)', backgroundSize: '56px 56px', WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%,#000 20%,transparent 80%)' }} />
          <div ref={o1Ref} style={{ position: 'absolute', width: 520, height: 520, borderRadius: '50%', background: '#6EFFC0', filter: 'blur(80px)', opacity: .2, top: -140, left: -140, willChange: 'transform' }} />
          <div ref={o2Ref} style={{ position: 'absolute', width: 620, height: 620, borderRadius: '50%', background: '#ACC7FF', filter: 'blur(80px)', opacity: .12, bottom: -180, right: -140, willChange: 'transform' }} />
          <div ref={o3Ref} style={{ position: 'absolute', width: 340, height: 340, borderRadius: '50%', background: '#FF9D6E', filter: 'blur(80px)', opacity: .08, top: '40%', left: '35%', willChange: 'transform' }} />
          <div ref={spotRef} style={{ position: 'absolute', inset: 0, background: 'radial-gradient(420px circle at var(--mx,50%) var(--my,50%),rgba(110,255,192,.1),transparent 60%)' }} />
        </div>

        {/* Form pane */}
        <section style={S.formPane}>
          <BrandMark />

          <div style={S.formWrap}>
            {/* Chip */}
            <div className="anim-in" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', fontSize: 12, color: 'rgba(250,250,250,.6)', marginBottom: 20 }}>
              <span className="live-dot" />
              Crie seu workspace agora
            </div>

            <h1 className="anim-in d1" style={{ fontFamily: "'Sora', sans-serif", fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#fafafa', marginBottom: 8 }}>
              Criar <em style={{ color: '#6EFFC0', fontStyle: 'italic' }}>conta</em>
            </h1>
            <p className="anim-in d2" style={{ fontSize: 14, color: 'rgba(250,250,250,.5)', marginBottom: 28 }}>
              Comece a gerenciar suas finanças com inteligência.
            </p>

            <form onSubmit={handleRegistrar}>
              <div className="anim-in d2">
                <FloatingInput id="nome" label="Nome completo" type="text" value={form.nome} onChange={set('nome')} autoComplete="name" required />
              </div>
              <div className="anim-in d3">
                <FloatingInput id="email" label="Email corporativo" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
              </div>
              <div className="anim-in d4">
                <FloatingInput id="telefone" label="Telefone (opcional)" type="tel" value={form.telefone} onChange={set('telefone')} autoComplete="tel" />
              </div>
              <div className="anim-in d4" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'rgba(250,250,250,.4)', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>Tipo de conta</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ value: 'EMPRESA', label: 'Empresa' }, { value: 'PESSOA_FISICA', label: 'Uso Pessoal' }].map(({ value, label }) => (
                    <label key={value} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', borderRadius: 14, border: `1px solid ${form.tipoConta === value ? '#6EFFC0' : 'rgba(250,250,250,.1)'}`, background: form.tipoConta === value ? 'rgba(110,255,192,.08)' : '#131313', cursor: 'pointer', fontSize: 13, color: form.tipoConta === value ? '#6EFFC0' : 'rgba(250,250,250,.6)', transition: 'all 200ms', fontFamily: "'DM Sans', sans-serif" }}>
                      <input type="radio" name="tipoConta" value={value} checked={form.tipoConta === value} onChange={set('tipoConta')} style={{ display: 'none' }} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              {form.tipoConta === 'EMPRESA' && (
                <div className="anim-in d4">
                  <FloatingInput id="nomeEmpresa" label="Nome da empresa" type="text" value={form.nomeEmpresa} onChange={set('nomeEmpresa')} />
                </div>
              )}
              <div className="anim-in d5">
                <FloatingPasswordInput id="senha" label="Senha" value={form.senha} onChange={set('senha')} autoComplete="new-password" required />
                <ul style={{ margin: '6px 0 0 4px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[
                    { ok: form.senha.length >= 8,        text: 'Mínimo 8 caracteres' },
                    { ok: /[A-Z]/.test(form.senha),       text: 'Pelo menos uma letra maiúscula' },
                    { ok: /[a-z]/.test(form.senha),       text: 'Pelo menos uma letra minúscula' },
                    { ok: /\d/.test(form.senha),           text: 'Pelo menos um número' },
                  ].map(({ ok, text }) => (
                    <li key={text} style={{ fontSize: 11, color: ok ? '#6EFFC0' : 'rgba(250,250,250,.35)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 10 }}>{ok ? '✓' : '○'}</span> {text}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="anim-in d6">
                <FloatingPasswordInput id="confirmarSenha" label="Confirmar senha" value={form.confirmarSenha} onChange={(e) => { set('confirmarSenha')(e); setErroConfirmacao(''); }} autoComplete="new-password" required />
                {erroConfirmacao && (
                  <span style={{ fontSize: 11, color: 'var(--color-error, #FFB4AB)', marginTop: 4, display: 'block', paddingLeft: 4 }}>
                    {erroConfirmacao}
                  </span>
                )}
              </div>

              {erro && (
                <div style={S.errBanner}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><circle cx="12" cy="16" r=".5" fill="currentColor"/></svg>
                  {erro}
                </div>
              )}

              <div className="anim-in d7">
                <button type="submit" disabled={carregando} style={S.submitBtn}>
                  {carregando && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                  {carregando ? 'Criando conta…' : 'Criar minha conta'}
                </button>
              </div>
            </form>

            <div className="anim-in d7" style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'rgba(250,250,250,.4)' }}>
              Já tem uma conta?{' '}
              <a href="/login" style={{ color: '#6EFFC0', fontWeight: 600, textDecoration: 'none' }}>Fazer login</a>
            </div>
          </div>

          <footer style={{ fontSize: 10, color: 'rgba(250,250,250,.25)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '.1em' }}>
            © 2026 Core 4 · LGPD compliant
          </footer>
        </section>

        {/* Hero pane */}
        <div className="hidden lg:flex" style={{ flex: 1, position: 'relative', zIndex: 1, alignItems: 'center', justifyContent: 'center', padding: '40px 48px 40px 24px' }}>
          <div style={{ maxWidth: 420, width: '100%' }}>
            <div className="anim-in" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, background: 'rgba(110,255,192,.08)', border: '1px solid rgba(110,255,192,.2)', fontSize: 10, color: '#6EFFC0', fontFamily: 'monospace', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 24 }}>
              <span className="live-dot" style={{ width: 5, height: 5 }} />
              Comece hoje
            </div>

            <h2 className="anim-in d1" style={{ fontFamily: "'Sora', sans-serif", fontSize: 40, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15, color: '#fafafa', marginBottom: 16 }}>
              Controle Total das Suas{' '}
              <em style={{ fontStyle: 'italic', background: 'linear-gradient(135deg,#6EFFC0,#ACC7FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Finanças</em>
            </h2>

            <p className="anim-in d2" style={{ fontSize: 15, color: 'rgba(250,250,250,.5)', lineHeight: 1.7, marginBottom: 32 }}>
              Gerencie contas, cartões, investimentos e parceiros em um único lugar inteligente.
            </p>

            <div className="anim-in d3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {FEATURES.map(({ icon: Icon, color, label, value, sub }, i) => (
                <div key={label} className={`d${i + 3}`} style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(250,250,250,.08)', borderRadius: 16, padding: 20 }}>
                  <Icon size={24} style={{ color, marginBottom: 12 }} />
                  <div style={{ fontSize: 10, color: 'rgba(250,250,250,.4)', fontFamily: 'monospace', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: '#fafafa', letterSpacing: '-0.02em', marginBottom: 2 }}>{value}</div>
                  <div style={{ fontSize: 11, color: 'rgba(250,250,250,.4)' }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
