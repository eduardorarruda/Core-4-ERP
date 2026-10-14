import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Receipt, GitMerge, CreditCard, FileBarChart } from 'lucide-react';
import { auth, setLoginState } from '../lib/api';
import { getFirstAccessibleRoute } from '../lib/routeUtils';
import { FloatingInput, FloatingPasswordInput } from '../components/ui/FormField';
import PasswordRules from '../components/ui/PasswordRules';
import { senhaValida } from '../lib/senha';
import Button from '../components/ui/Button';
import BrandMark from '../components/ui/BrandMark';
import LinksLegais from '../components/legal/LinksLegais';
import { VERSAO_TERMOS } from '../content/legal';
import { usePageMeta } from '../hooks/usePageMeta';
import { usePrefersReducedMotion } from '../hooks/useMediaQuery';

// O que o sistema faz de fato — sem números de marketing
const RECURSOS = [
  { icon: Receipt,      color: 'text-primary',   titulo: 'Contas a pagar e receber', texto: 'Vencimentos, baixas e categorias.' },
  { icon: GitMerge,     color: 'text-secondary', titulo: 'Conciliação bancária',     texto: 'Importe o extrato OFX e vincule.' },
  { icon: CreditCard,   color: 'text-warning',   titulo: 'Cartões de crédito',       texto: 'Parcelas, faturas e limite.' },
  { icon: FileBarChart, color: 'text-primary',   titulo: 'Relatórios',               texto: 'DRE, fluxo de caixa, PDF e Excel.' },
];

const LINK_TEXTO = 'text-primary underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

export default function Register() {
  usePageMeta({
    title: 'Criar conta',
    canonical: '/register',
    description: 'Crie sua conta gratuita no Core 4 ERP e organize contas a pagar e receber, cartões de crédito, conciliação bancária e relatórios.',
  });
  const navigate = useNavigate();
  const reduzirMovimento = usePrefersReducedMotion();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmarSenha: '', telefone: '', tipoConta: 'EMPRESA', nomeEmpresa: '' });
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState('');
  const [erroConfirmacao, setErroConfirmacao] = useState('');
  const [erroEmpresa, setErroEmpresa] = useState('');
  const [erroAceite, setErroAceite] = useState('');
  const [carregando, setCarregando] = useState(false);
  const o1Ref   = useRef(null);
  const o2Ref   = useRef(null);
  const o3Ref   = useRef(null);
  const spotRef = useRef(null);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const empresaFaltando = form.tipoConta === 'EMPRESA' && !form.nomeEmpresa.trim();

  /* Parallax do fundo: desligado com "reduzir movimento", 1 atualização por quadro */
  useEffect(() => {
    if (reduzirMovimento) return undefined;
    let quadro = 0;
    let ultimo = null;
    const aplicar = () => {
      quadro = 0;
      if (!ultimo) return;
      const w = window.innerWidth, h = window.innerHeight;
      const dx = (ultimo.x / w - 0.5) * 2, dy = (ultimo.y / h - 0.5) * 2;
      if (o1Ref.current) o1Ref.current.style.transform = `translate(${dx * 30}px, ${dy * 30}px)`;
      if (o2Ref.current) o2Ref.current.style.transform = `translate(${dx * -40}px, ${dy * -40}px)`;
      if (o3Ref.current) o3Ref.current.style.transform = `translate(${dx * 22}px, ${dy * 22}px)`;
      if (spotRef.current) {
        spotRef.current.style.setProperty('--mx', `${ultimo.x}px`);
        spotRef.current.style.setProperty('--my', `${ultimo.y}px`);
      }
    };
    const onMove = (e) => {
      ultimo = { x: e.clientX, y: e.clientY };
      if (!quadro) quadro = requestAnimationFrame(aplicar);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (quadro) cancelAnimationFrame(quadro);
    };
  }, [reduzirMovimento]);

  const handleRegistrar = async (e) => {
    e.preventDefault();
    setErro('');
    setErroConfirmacao('');
    setErroEmpresa('');
    setErroAceite('');
    if (empresaFaltando) {
      setErroEmpresa('Informe o nome da empresa para criar uma conta empresarial.');
      return;
    }
    if (form.senha !== form.confirmarSenha) {
      setErroConfirmacao('As senhas não coincidem.');
      return;
    }
    if (!senhaValida(form.senha)) {
      setErro('A senha não atende aos requisitos mínimos de segurança.');
      return;
    }
    if (!aceite) {
      setErroAceite('Para criar a conta, é preciso aceitar os Termos de Uso e a Política de Privacidade.');
      return;
    }
    setCarregando(true);
    try {
      const telefone = form.telefone ? form.telefone.replace(/\D/g, '') : null;
      const nomeEmpresa = form.tipoConta === 'EMPRESA' ? form.nomeEmpresa.trim() : undefined;
      await auth.registrar(form.nome, form.email, form.senha, telefone, form.tipoConta, nomeEmpresa, VERSAO_TERMOS);
      const result = await auth.login(form.email, form.senha);
      setLoginState(result);
      const permSet = new Set(result.empresas?.[0]?.permissoes ?? []);
      const check = (cod) => result.adminSistema || permSet.has(cod);
      navigate(getFirstAccessibleRoute(check));
    } catch (err) {
      setErro(err.message || 'Não foi possível criar a conta.');
    } finally {
      setCarregando(false);
    }
  };

  const submitDisabled = carregando || empresaFaltando || !senhaValida(form.senha) || form.senha !== form.confirmarSenha;

  return (
    <div className="relative min-h-dvh flex bg-surface overflow-hidden text-text-primary">
      {/* Background decorativo */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
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
          <h1 className="anim-in d1 font-display text-[32px] font-bold tracking-tight text-text-primary mb-2">
            Criar <em className="text-primary italic">conta</em>
          </h1>
          <p className="anim-in d2 text-sm text-text-primary/70 mb-7">
            É gratuito. Leva menos de um minuto.
          </p>

          <form onSubmit={handleRegistrar} noValidate>
            <div className="anim-in d2 mb-3">
              <FloatingInput id="nome" label="Nome completo" type="text" value={form.nome} onChange={set('nome')} autoComplete="name" required />
            </div>
            <div className="anim-in d3 mb-3">
              <FloatingInput id="email" label="E-mail" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
            </div>
            <div className="anim-in d4 mb-3">
              <FloatingInput id="telefone" label="Telefone (opcional)" type="tel" value={form.telefone} onChange={set('telefone')} autoComplete="tel" />
            </div>
            <fieldset className="anim-in d4 mb-3">
              <legend className="text-xs text-text-primary/70 mb-2 font-body">Tipo de conta</legend>
              <div className="flex gap-2">
                {[{ value: 'EMPRESA', label: 'Empresa' }, { value: 'PESSOA_FISICA', label: 'Uso pessoal' }].map(({ value, label }) => {
                  const active = form.tipoConta === value;
                  return (
                    <label
                      key={value}
                      className={`flex-1 flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl border cursor-pointer text-[13px] font-body transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${active ? 'border-primary bg-primary/[.08] text-primary' : 'border-text-primary/15 bg-surface-low text-text-primary/70'}`}
                    >
                      <input type="radio" name="tipoConta" value={value} checked={active} onChange={(e) => { set('tipoConta')(e); setErroEmpresa(''); }} className="sr-only" />
                      {label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
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
              <FloatingPasswordInput
                id="confirmarSenha"
                label="Confirmar senha"
                value={form.confirmarSenha}
                onChange={(e) => { set('confirmarSenha')(e); setErroConfirmacao(''); }}
                autoComplete="new-password"
                error={erroConfirmacao || undefined}
                required
              />
            </div>

            {/* Consentimento (LGPD art. 8º): caixa desmarcada por padrão, obrigatória */}
            <div className="anim-in d6 mt-4">
              <div className="flex items-start gap-3">
                <input
                  id="aceiteTermos"
                  type="checkbox"
                  checked={aceite}
                  onChange={(e) => { setAceite(e.target.checked); setErroAceite(''); }}
                  required
                  aria-invalid={erroAceite ? true : undefined}
                  aria-describedby={erroAceite ? 'aceiteTermos-erro' : undefined}
                  className="mt-0.5 w-5 h-5 shrink-0 accent-[var(--color-primary)] cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <label htmlFor="aceiteTermos" className="text-[13px] text-text-primary/80 leading-relaxed cursor-pointer">
                  Li e aceito os{' '}
                  <Link to="/termos" target="_blank" rel="noopener" className={LINK_TEXTO}>
                    Termos de Uso<span className="sr-only"> (abre em nova aba)</span>
                  </Link>
                  {' '}e a{' '}
                  <Link to="/privacidade" target="_blank" rel="noopener" className={LINK_TEXTO}>
                    Política de Privacidade<span className="sr-only"> (abre em nova aba)</span>
                  </Link>.
                </label>
              </div>
              {erroAceite && (
                <p id="aceiteTermos-erro" role="alert" className="text-xs text-error mt-1.5">{erroAceite}</p>
              )}
            </div>

            {erro && (
              <div role="alert" className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-error/10 border border-error/20 text-error text-[13px] mt-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><circle cx="12" cy="16" r=".5" fill="currentColor"/></svg>
                {erro}
              </div>
            )}

            <div className="anim-in d7">
              <Button type="submit" loading={carregando} disabled={submitDisabled} className="w-full h-12 mt-4 text-[15px] font-display font-bold">
                {carregando ? 'Criando conta…' : 'Criar minha conta'}
              </Button>
            </div>
          </form>

          <div className="anim-in d7 text-center mt-6 text-[13px] text-text-primary/70">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-primary font-semibold hover:opacity-80 transition-opacity">Entrar</Link>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-primary/70">
          <span>© 2026 Core 4 ERP</span>
          <LinksLegais />
        </footer>
      </section>

      {/* Painel lateral (desktop) */}
      <div className="hidden lg:flex flex-1 relative z-[1] items-center justify-center pr-12 pl-6 py-10">
        <div className="max-w-[420px] w-full">
          <h2 className="anim-in d1 font-display text-[40px] font-bold tracking-tight leading-[1.15] text-text-primary mb-4">
            Suas finanças{' '}
            <em className="italic text-gradient-primary">em um só lugar</em>
          </h2>

          <p className="anim-in d2 text-[15px] text-text-primary/70 leading-relaxed mb-8">
            Para uso pessoal ou para a sua empresa, com perfis de acesso para quem trabalha com você.
          </p>

          <ul className="anim-in d3 grid grid-cols-2 gap-3">
            {RECURSOS.map(({ icon: Icon, color, titulo, texto }) => (
              <li key={titulo} className="bg-text-primary/[.025] border border-text-primary/[.08] rounded-2xl p-5">
                <Icon size={24} className={`${color} mb-3`} aria-hidden="true" />
                <div className="font-display text-sm font-bold text-text-primary tracking-tight mb-1">{titulo}</div>
                <div className="text-xs text-text-primary/70">{texto}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
