import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, TrendingUp, Zap, BarChart3 } from 'lucide-react';
import { auth, setLoginState } from '../lib/api';
import { getFirstAccessibleRoute } from '../lib/routeUtils';
import { FloatingInput, FloatingPasswordInput } from '../components/ui/FormField';
import PasswordRules, { senhaValida } from '../components/ui/PasswordRules';
import Button from '../components/ui/Button';
import { BrandMark } from '../components/login/HeroPane';

const FEATURES = [
  { icon: ShieldCheck, color: 'text-primary',   label: 'Segurança', value: 'JWT + BCrypt', sub: 'Dados protegidos' },
  { icon: TrendingUp,  color: 'text-secondary', label: 'Módulos',   value: '10+',          sub: 'Módulos integrados' },
  { icon: Zap,         color: 'text-warning',   label: 'Real-time', value: '100%',         sub: 'Dados em tempo real' },
  { icon: BarChart3,   color: 'text-primary',   label: 'Relatórios',value: '∞',            sub: 'Exportação livre' },
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmarSenha: '', telefone: '', tipoConta: 'EMPRESA', nomeEmpresa: '' });
  const [erro, setErro] = useState('');
  const [erroConfirmacao, setErroConfirmacao] = useState('');
  const [erroEmpresa, setErroEmpresa] = useState('');
  const [carregando, setCarregando] = useState(false);
  const o1Ref   = useRef(null);
  const o2Ref   = useRef(null);
  const o3Ref   = useRef(null);
  const spotRef = useRef(null);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const empresaFaltando = form.tipoConta === 'EMPRESA' && !form.nomeEmpresa.trim();

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
    setErroEmpresa('');
    if (empresaFaltando) {
      setErroEmpresa('Informe o nome da empresa para criar uma conta empresarial.');
      return;
    }
    if (form.senha !== form.confirmarSenha) {
      setErroConfirmacao('Senha divergente da senha digitada anteriormente');
      return;
    }
    if (!senhaValida(form.senha)) {
      setErro('A senha não atende aos requisitos mínimos de segurança');
      return;
    }
    setCarregando(true);
    try {
      const telefone = form.telefone ? form.telefone.replace(/\D/g, '') : null;
      const nomeEmpresa = form.tipoConta === 'EMPRESA' ? form.nomeEmpresa.trim() : undefined;
      await auth.registrar(form.nome, form.email, form.senha, telefone, form.tipoConta, nomeEmpresa);
      const result = await auth.login(form.email, form.senha);
      setLoginState(result);
      const permSet = new Set(result.empresas?.[0]?.permissoes ?? []);
      const check = (cod) => result.adminSistema || permSet.has(cod);
      navigate(getFirstAccessibleRoute(check));
    } catch (err) {
      setErro(err.message || 'Erro ao criar conta');
    } finally {
      setCarregando(false);
    }
  };

  const submitDisabled = carregando || empresaFaltando || !senhaValida(form.senha) || form.senha !== form.confirmarSenha;

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
        <div ref={o1Ref} className="absolute rounded-full bg-primary blur-[80px] opacity-20 -top-36 -left-36 will-change-transform" style={{ width: 520, height: 520 }} />
        <div ref={o2Ref} className="absolute rounded-full bg-secondary blur-[80px] opacity-[.12] -bottom-44 -right-36 will-change-transform" style={{ width: 620, height: 620 }} />
        <div ref={o3Ref} className="absolute rounded-full bg-warning blur-[80px] opacity-[.08] top-[40%] left-[35%] will-change-transform" style={{ width: 340, height: 340 }} />
        <div
          ref={spotRef}
          className="absolute inset-0"
          style={{ background: 'radial-gradient(420px circle at var(--mx,50%) var(--my,50%), color-mix(in srgb, var(--color-primary) 10%, transparent), transparent 60%)' }}
        />
      </div>

      {/* Form pane */}
      <section className="relative z-[1] w-full max-w-[520px] min-h-dvh flex flex-col justify-between bg-surface/60 backdrop-blur-sm border-r border-text-primary/5 px-6 py-8 lg:px-12">
        <BrandMark />

        <div className="w-full max-w-[380px] mx-auto py-8">
          <div className="anim-in inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-text-primary/5 border border-text-primary/10 text-xs text-text-primary/60 mb-5">
            <span className="live-dot" />
            Crie seu workspace agora
          </div>

          <h1 className="anim-in d1 font-display text-[32px] font-bold tracking-tight text-text-primary mb-2">
            Criar <em className="text-primary italic">conta</em>
          </h1>
          <p className="anim-in d2 text-sm text-text-primary/50 mb-7">
            Comece a gerenciar suas finanças com inteligência.
          </p>

          <form onSubmit={handleRegistrar}>
            <div className="anim-in d2 mb-3">
              <FloatingInput id="nome" label="Nome completo" type="text" value={form.nome} onChange={set('nome')} autoComplete="name" required />
            </div>
            <div className="anim-in d3 mb-3">
              <FloatingInput id="email" label="Email corporativo" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
            </div>
            <div className="anim-in d4 mb-3">
              <FloatingInput id="telefone" label="Telefone (opcional)" type="tel" value={form.telefone} onChange={set('telefone')} autoComplete="tel" />
            </div>
            <div className="anim-in d4 mb-3">
              <div className="text-[11px] text-text-primary/40 mb-2 font-body">Tipo de conta</div>
              <div className="flex gap-2">
                {[{ value: 'EMPRESA', label: 'Empresa' }, { value: 'PESSOA_FISICA', label: 'Uso Pessoal' }].map(({ value, label }) => {
                  const active = form.tipoConta === value;
                  return (
                    <label
                      key={value}
                      className={`flex-1 flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl border cursor-pointer text-[13px] font-body transition-colors ${active ? 'border-primary bg-primary/[.08] text-primary' : 'border-text-primary/10 bg-surface-low text-text-primary/60'}`}
                    >
                      <input type="radio" name="tipoConta" value={value} checked={active} onChange={(e) => { set('tipoConta')(e); setErroEmpresa(''); }} className="sr-only" />
                      {label}
                    </label>
                  );
                })}
              </div>
            </div>
            {form.tipoConta === 'EMPRESA' && (
              <div className="anim-in d4 mb-3">
                <FloatingInput
                  id="nomeEmpresa"
                  label="Nome da empresa"
                  type="text"
                  value={form.nomeEmpresa}
                  onChange={(e) => { set('nomeEmpresa')(e); setErroEmpresa(''); }}
                  error={erroEmpresa || undefined}
                  required
                />
              </div>
            )}
            <div className="anim-in d5">
              <FloatingPasswordInput id="senha" label="Senha" value={form.senha} onChange={set('senha')} autoComplete="new-password" required />
              <PasswordRules senha={form.senha} className="mt-1.5 ml-1" />
            </div>
            <div className="anim-in d6 mt-3">
              <FloatingPasswordInput id="confirmarSenha" label="Confirmar senha" value={form.confirmarSenha} onChange={(e) => { set('confirmarSenha')(e); setErroConfirmacao(''); }} autoComplete="new-password" required />
              {erroConfirmacao && (
                <span className="text-[11px] text-error mt-1 block pl-1">
                  {erroConfirmacao}
                </span>
              )}
            </div>

            {erro && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-error/10 border border-error/20 text-error text-[13px] mt-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><circle cx="12" cy="16" r=".5" fill="currentColor"/></svg>
                {erro}
              </div>
            )}

            <div className="anim-in d7">
              <Button type="submit" loading={carregando} disabled={submitDisabled} className="w-full h-12 mt-4 text-[15px] font-display font-bold">
                {carregando ? 'Criando conta…' : 'Criar minha conta'}
              </Button>
            </div>
          </form>

          <div className="anim-in d7 text-center mt-6 text-[13px] text-text-primary/40">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-primary font-semibold hover:opacity-80 transition-opacity">Fazer login</Link>
          </div>
        </div>

        <footer className="text-[10px] text-text-primary/25 font-mono uppercase tracking-widest">
          © 2026 Core 4 · LGPD compliant
        </footer>
      </section>

      {/* Hero pane */}
      <div className="hidden lg:flex flex-1 relative z-[1] items-center justify-center pr-12 pl-6 py-10">
        <div className="max-w-[420px] w-full">
          <div className="anim-in inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/[.08] border border-primary/20 text-[10px] text-primary font-mono tracking-widest uppercase mb-6">
            <span className="live-dot" style={{ width: 5, height: 5 }} />
            Comece hoje
          </div>

          <h2 className="anim-in d1 font-display text-[40px] font-bold tracking-tight leading-[1.15] text-text-primary mb-4">
            Controle Total das Suas{' '}
            <em className="italic text-gradient-primary">Finanças</em>
          </h2>

          <p className="anim-in d2 text-[15px] text-text-primary/50 leading-relaxed mb-8">
            Gerencie contas, cartões, investimentos e parceiros em um único lugar inteligente.
          </p>

          <div className="anim-in d3 grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, color, label, value, sub }) => (
              <div key={label} className="bg-text-primary/[.025] border border-text-primary/[.08] rounded-2xl p-5">
                <Icon size={24} className={`${color} mb-3`} />
                <div className="text-[10px] text-text-primary/40 font-mono tracking-widest uppercase mb-1">{label}</div>
                <div className="font-display text-xl font-bold text-text-primary tracking-tight mb-0.5">{value}</div>
                <div className="text-[11px] text-text-primary/40">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
